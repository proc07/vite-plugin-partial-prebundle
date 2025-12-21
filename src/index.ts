import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { ModuleNode, Plugin, ResolvedConfig, ViteDevServer } from 'vite';
import { normalizePath } from 'vite';
import * as esbuild from 'esbuild';
import vueEsbuild from 'unplugin-vue/esbuild';

export interface PartialPrebundleOptions {
  includes: string[];
  excludes?: string[];
  injectStyles?: boolean;
  cacheDir?: string;
  external?: string[];
}

type EntryMeta = {
  output: string;
  deps: Set<string>;
  hash: string;
  virtualId: string;
  styleId: string;
};

const VIRTUAL_PREFIX = '\0vp:';
const DEFAULT_EXTERNAL = ['vue', 'react', 'react-dom'];

const stripQuery = (id: string): string => id.split('?')[0];

const stableHash = (input: string): string => {
  return crypto.createHash('md5').update(input).digest('hex').slice(0, 8);
};

const styleInjector = (styleId: string, css: string): string => {
  const styleContent = JSON.stringify(css);
  const styleKey = JSON.stringify(styleId);
  return [
    `const __vp_style = ${styleContent};`,
    `if (typeof document !== 'undefined' && !document.getElementById(${styleKey})) {`,
    `  const el = document.createElement('style');`,
    `  el.id = ${styleKey};`,
    `  el.textContent = __vp_style;`,
    `  document.head.appendChild(el);`,
    `}`,
  ].join('\n');
};

export function partialPrebundle(options: PartialPrebundleOptions): Plugin {
  let config: ResolvedConfig;
  let root = '';
  let cacheBase = '';
  let serveMode = false;

  const includeRaw = options.includes ?? [];
  const excludeRaw = options.excludes ?? [];
  const includes = new Set<string>();
  const excludes = new Set<string>();
  const entryMeta = new Map<string, EntryMeta>();
  const depToEntries = new Map<string, Set<string>>();
  const inflightBuilds = new Map<string, Promise<void>>();

  const resolveAbs = (p: string) =>
    normalizePath(path.isAbsolute(p) ? p : path.resolve(root, p));

  const refreshEntrySets = () => {
    excludes.clear();
    excludeRaw.forEach((p) => excludes.add(resolveAbs(p)));

    includes.clear();
    for (const inc of includeRaw) {
      const abs = resolveAbs(inc);
      if (!excludes.has(abs)) {
        includes.add(abs);
      }
    }
  };

  const updateDepIndex = (entry: string, deps: Set<string>) => {
    const prev = entryMeta.get(entry)?.deps ?? new Set<string>();
    for (const oldDep of prev) {
      if (!deps.has(oldDep)) {
        const bucket = depToEntries.get(oldDep);
        if (!bucket) continue;
        bucket.delete(entry);
        if (bucket.size === 0) depToEntries.delete(oldDep);
      }
    }
    for (const dep of deps) {
      let bucket = depToEntries.get(dep);
      if (!bucket) {
        bucket = new Set();
        depToEntries.set(dep, bucket);
      }
      bucket.add(entry);
    }
  };

  const collectDepsFromMetafile = (
    entry: string,
    metafile?: esbuild.Metafile,
  ): Set<string> => {
    const deps = new Set<string>();
    if (metafile?.inputs) {
      for (const input of Object.keys(metafile.inputs)) {
        const abs = path.isAbsolute(input)
          ? input
          : path.resolve(root, input);
        deps.add(normalizePath(abs));
      }
    }
    deps.add(entry);
    return deps;
  };

  const collectCss = (files: esbuild.OutputFile[]): string => {
    return files
      .filter((file) => file.path.endsWith('.css'))
      .map((file) => file.text)
      .join('\n');
  };

  const buildEntry = async (entry: string) => {
    const hash = stableHash(entry);
    const outFile = normalizePath(path.join(cacheBase, `vp-${hash}.js`));
    const styleId = `vp-style-${hash}`;
    const virtualId = `${VIRTUAL_PREFIX}${entry}`;

    const buildResult = await esbuild.build({
      absWorkingDir: root,
      entryPoints: [entry],
      outfile: outFile,
      bundle: true,
      format: 'esm',
      platform: 'browser',
      target: 'esnext',
      splitting: false,
      sourcemap: false,
      write: false,
      metafile: true,
      external: options.external ?? DEFAULT_EXTERNAL,
      plugins: [vueEsbuild()],
      loader: {
        '.vue': 'ts',
        '.tsx': 'tsx',
        '.jsx': 'jsx',
      },
    });

    const js = buildResult.outputFiles.find((f) => f.path.endsWith('.js'));
    if (!js) {
      throw new Error(`Failed to build ${entry}: missing JS output.`);
    }

    const cssText = collectCss(buildResult.outputFiles);
    let contents = js.text;
    if (options.injectStyles !== false && cssText.trim().length > 0) {
      contents = `${styleInjector(styleId, cssText)}\n${contents}`;
    }

    await fs.mkdir(cacheBase, { recursive: true });
    await fs.writeFile(outFile, contents, 'utf8');

    const deps = collectDepsFromMetafile(entry, buildResult.metafile);
    updateDepIndex(entry, deps);

    entryMeta.set(entry, {
      output: outFile,
      deps,
      hash,
      virtualId,
      styleId,
    });
  };

  const ensureBuild = async (entry: string) => {
    let build = inflightBuilds.get(entry);
    if (!build) {
      build = buildEntry(entry)
        .catch((err) => {
          config?.logger.error(
            `[vite-plugin-partial-prebundle] ${String(err.message || err)}`,
          );
          throw err;
        })
        .finally(() => inflightBuilds.delete(entry));
      inflightBuilds.set(entry, build);
    }
    return build;
  };

  const buildAll = async () => {
    if (!includes.size) return;
    await Promise.all([...includes].map((entry) => ensureBuild(entry)));
  };

  const matchEntry = async (
    source: string,
    importer: string | undefined,
    resolver: Plugin['resolveId'],
    context: any,
  ): Promise<string | null> => {
    const check = (candidate: string | null | undefined) => {
      if (!candidate) return null;
      const normalized = normalizePath(candidate);
      return includes.has(normalized) ? normalized : null;
    };

    if (path.isAbsolute(source)) {
      const hit = check(source);
      if (hit) return hit;
    }

    if (importer && source.startsWith('.')) {
      const base = normalizePath(path.dirname(stripQuery(importer)));
      const target = check(path.resolve(base, source));
      if (target) return target;
    }

    const resolveFn: ((this: any, ...args: any[]) => any) | null =
      typeof resolver === 'function'
        ? resolver
        : resolver && typeof resolver === 'object'
          ? (resolver as any).handler
          : null;

    const resolved = resolveFn
      ? await resolveFn.call(context, source, importer, { skipSelf: true })
      : null;
    const hit = check(resolved ? stripQuery(resolved.id) : null);
    if (hit) return hit;
    return null;
  };

  const invalidateAndCollect = (entry: string, ctx: ViteDevServer) => {
    const meta = entryMeta.get(entry);
    if (!meta) return null;
    const mod = ctx.moduleGraph.getModuleById(meta.virtualId);
    if (!mod) return null;
    ctx.moduleGraph.invalidateModule(mod);
    return mod;
  };

  return {
    name: 'vite-plugin-partial-prebundle',
    apply: 'serve',
    enforce: 'pre',

    configResolved(resolved) {
      config = resolved;
      serveMode = resolved.command === 'serve';
      root = normalizePath(resolved.root);
      cacheBase = normalizePath(
        options.cacheDir ??
          path.join(resolved.cacheDir ?? path.join(root, 'node_modules/.vite'), 'code-partial'),
      );
      refreshEntrySets();
      if (!includes.size) {
        resolved.logger.warn(
          '[vite-plugin-partial-prebundle] `includes` is empty, plugin is idle.',
        );
      }
    },

    configureServer(devServer) {
      if (!serveMode) return;
      buildAll().catch((err) => {
        config.logger.error(
          `[vite-plugin-partial-prebundle] initial build failed: ${String(
            err.message || err,
          )}`,
        );
      });
    },

    async resolveId(source, importer, options) {
      if (!serveMode || options?.ssr) return null;
      const entry = await matchEntry(source, importer, this.resolve, this);
      if (!entry) return null;
      await ensureBuild(entry);
      return `${VIRTUAL_PREFIX}${entry}`;
    },

    async load(id) {
      if (!serveMode || !id.startsWith(VIRTUAL_PREFIX)) return null;
      const entry = id.slice(VIRTUAL_PREFIX.length);
      if (!includes.has(entry)) return null;
      await ensureBuild(entry);
      const meta = entryMeta.get(entry);
      if (!meta) return null;
      return fs.readFile(meta.output, 'utf8');
    },

    async handleHotUpdate(ctx) {
      if (!serveMode) return;
      const file = normalizePath(ctx.file);
      const targets = depToEntries.get(file);
      if (!targets || targets.size === 0) return;

      const updated: ModuleNode[] = [];
      for (const entry of targets) {
        await ensureBuild(entry);
        const mod = invalidateAndCollect(entry, ctx.server);
        if (mod) updated.push(mod);
      }

      if (updated.length) return updated;
    },
  };
}

export default partialPrebundle;
