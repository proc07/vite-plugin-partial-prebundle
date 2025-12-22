import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { ModuleNode, Plugin, ResolvedConfig, ViteDevServer } from 'vite';
import { normalizePath } from 'vite';
import * as esbuild from 'esbuild';
import vueEsbuild from 'unplugin-vue/esbuild';
import vueJsx from 'unplugin-vue-jsx/esbuild';

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
// Adjusting type for serialization (Set -> Array)
type EntryMetaSerialized = Omit<EntryMeta, 'deps'> & { deps: string[] };

const VIRTUAL_PREFIX = 'virtual:vp:';
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

const buildVueHmrSnippet = (entry: string, code: string): string => {
  const findDefaultRef = () => {
    const m1 = code.match(/export\s+default\s+([A-Za-z0-9_$]+)/);
    if (m1) return m1[1];
    const m2 = code.match(/export\s+\{\s*([A-Za-z0-9_$]+)\s+as\s+default\s*\}/);
    if (m2) return m2[1];
    return null;
  };

  const defaultRef = findDefaultRef();
  const hmrId = JSON.stringify(entry);
  return [
    `if (import.meta.hot) {`,
    defaultRef
      ? [
          `  const __vp_component = typeof ${defaultRef} !== 'undefined' ? ${defaultRef} : undefined;`,
          `  if (__vp_component && typeof __VUE_HMR_RUNTIME__ !== 'undefined') {`,
          `    __vp_component.__hmrId = ${hmrId};`,
          `    if (!__VUE_HMR_RUNTIME__.createRecord(${hmrId}, __vp_component)) {`,
          `      __VUE_HMR_RUNTIME__.reload(${hmrId}, __vp_component);`,
          `    }`,
          `  }`,
        ].join('\n')
      : `  // no default export reference found for HMR bootstrap`,
    `  import.meta.hot.accept((mod) => {`,
    `    const __next = mod && mod.default;`,
    `    if (__next && typeof __VUE_HMR_RUNTIME__ !== 'undefined') {`,
    `      __next.__hmrId = ${hmrId};`,
    `      __VUE_HMR_RUNTIME__.reload(${hmrId}, __next);`,
    `    }`,
    `  });`,
    `}`,
  ].join('\n');
};

export function partialPrebundle(options: PartialPrebundleOptions): Plugin {
  let config: ResolvedConfig;
  let root = '';
  let cacheBase = '';
  let metadataPath = '';
  // 多次并发写入导致内容被覆盖，改为串行写入
  let metadataWrite: Promise<void> = Promise.resolve();
  let serveMode = false;

  const includeRaw = options.includes ?? [];
  const excludeRaw = options.excludes ?? [];
  const includes = new Set<string>();
  const excludes = new Set<string>();
  const entryMeta = new Map<string, EntryMeta>();
  const depToEntries = new Map<string, Set<string>>();
  const inflightBuilds = new Map<string, Promise<void>>();

  const toRelative = (p: string): string => {
    if (!p) return p;
    const idx = p.indexOf(root);
    if (idx === 0) {
      return normalizePath(path.relative(root, p)) || '.';
    }
    if (idx > 0) {
      const prefix = p.slice(0, idx);
      const suffix = p.slice(idx);
      return normalizePath(prefix + path.relative(root, suffix));
    }
    return normalizePath(p);
  };

  const toAbsolute = (p: string): string => {
    if (!p) return p;
    if (path.isAbsolute(p)) return normalizePath(p);
    const colonIdx = p.indexOf(':');
    if (colonIdx > 0 && colonIdx < p.length - 1) {
      const prefix = p.slice(0, colonIdx + 1);
      const tail = p.slice(colonIdx + 1);
      const rebuilt = tail.startsWith('/')
        ? tail
        : normalizePath(path.join(root, tail));
      return normalizePath(prefix + rebuilt);
    }
    return normalizePath(path.join(root, p));
  };

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

  const getEntryPaths = (entry: string) => {
    const hash = stableHash(entry);
    const output = normalizePath(path.join(cacheBase, `vp-${hash}.js`));
    const styleId = `vp-style-${hash}`;
    const virtualId = `${VIRTUAL_PREFIX}${entry}.js`;
    return { hash, output, styleId, virtualId };
  };

  const saveMetadata = async () => {
    if (!metadataPath) return;

    const entries: Record<string, EntryMetaSerialized> = {};
    for (const [entry, meta] of entryMeta) {
      const relEntry = toRelative(entry);
      entries[relEntry] = {
        output: toRelative(meta.output),
        deps: [...meta.deps].map(toRelative),
        hash: meta.hash,
        virtualId: toRelative(meta.virtualId),
        styleId: meta.styleId,
      };
    }

    const payload = JSON.stringify({ entries }, null, 2);
    await fs.mkdir(cacheBase, { recursive: true });
    await fs.writeFile(metadataPath, payload, 'utf8');
  };

  // 串行执行写入
  const queueMetadataSave = () => {
    metadataWrite = metadataWrite
      .then(() => saveMetadata())
      .catch((err) => {
        config?.logger.warn?.(
          `[vite-plugin-partial-prebundle] failed to write metadata: ${String(
            err?.message || err,
          )}`,
        );
      });
    return metadataWrite;
  };

  const loadMetadata = async () => {
    try {
      const raw = await fs.readFile(metadataPath, 'utf8');
      const json = JSON.parse(raw) as {
        entries?: Record<string, EntryMetaSerialized>;
      };

      if (!json.entries) return;

      for (const [relEntry, meta] of Object.entries(json.entries)) {
        const entry = toAbsolute(relEntry);
        if (!includes.has(entry)) continue;

        entryMeta.set(entry, {
          output: toAbsolute(meta.output),
          deps: new Set([...meta.deps].map(toAbsolute)),
          hash: meta.hash,
          virtualId: toAbsolute(meta.virtualId),
          styleId: meta.styleId,
        });

        for (const dep of meta.deps ?? []) {
          const absDep = toAbsolute(dep);
          let bucket = depToEntries.get(absDep);
          if (!bucket) {
            bucket = new Set();
            depToEntries.set(absDep, bucket);
          }
          bucket.add(entry);
        }
      }
    } catch {
      // ignore missing/invalid metadata
    }
  };

  const collectCss = (files: esbuild.OutputFile[]): string => {
    const stripSourceMap = (css: string) =>
      css
        // Strip both block and line sourceMappingURL comments to avoid PostCSS errors
        .replace(
          /\/\*[#@]\s*sourceMappingURL=[\s\S]*?\*\/|^[ \t]*\/\/[#@]\s*sourceMappingURL=.*$/gm,
          '',
        )
        .trim();

    return files
      .filter((file) => file.path.endsWith('.css'))
      .map((file) => stripSourceMap(file.text))
      .filter(Boolean)
      .join('\n');
  };

  const hydrateLineText = (errors: esbuild.PartialMessage[]) => {
    for (const msg of errors) {
      const loc = msg.location;
      if (!loc || loc.lineText) continue;
      try {
        const filePath = path.isAbsolute(loc.file)
          ? loc.file
          : path.resolve(root, loc.file);
        const contents = readFileSync(filePath, 'utf8');
        const lines = contents.split(/\r?\n/);
        const idx = (loc.line ?? 1) - 1;
        if (lines[idx]) loc.lineText = lines[idx];
      } catch {
        // do nothing
      }
    }
  };

  const formatBuildError = (failure: esbuild.BuildFailure): string => {
    if (failure && typeof failure === 'object' && 'errors' in failure) {
      hydrateLineText(failure.errors ?? []);
      const messages = esbuild.formatMessagesSync(failure.errors, {
        kind: 'error',
        color: false,
      });
      return messages.filter(Boolean).join('\n');
    }

    return typeof failure?.message === 'string'
        ? failure.message
        : JSON.stringify(failure, null, 2);
  };

  const buildEntry = async (entry: string) => {
    const { hash, output: outFile, styleId, virtualId } = getEntryPaths(entry);

    const isVue = entry.endsWith('.vue');
    const buildResult = await esbuild.build({
      absWorkingDir: root,
      entryPoints: [entry],
      outfile: outFile,
      bundle: true,
      format: 'esm',
      platform: 'browser',
      target: 'esnext',
      splitting: false,
      sourcemap: 'inline',
      write: false,
      metafile: true,
      external: options.external ?? DEFAULT_EXTERNAL,
      plugins: isVue ? [vueEsbuild({ sourceMap: false }), vueJsx()] : [],
      jsx: isVue ? undefined : 'automatic',
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

    if (isVue) {
      contents = `${contents}\n${buildVueHmrSnippet(entry, contents)}`;
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
    await queueMetadataSave();
  };

  const ensureBuild = async (entry: string) => {
    let build = inflightBuilds.get(entry);

    if (!build) {
      build = buildEntry(entry)
        .catch((err) => {
          const message = formatBuildError(err);
          config?.logger.error(`[vite-plugin-partial-prebundle] ${message}`);

          throw new Error(message);
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
      metadataPath = normalizePath(path.join(cacheBase, '_metadata.json'));

      refreshEntrySets();
      loadMetadata().catch(() => {});

      if (!includes.size) {
        resolved.logger.warn(
          '[vite-plugin-partial-prebundle] `includes` is empty, plugin is idle.',
        );
      }
    },

    async resolveId(source, importer, options) {
      if (!serveMode || options?.ssr) return null;
      const entry = await matchEntry(source, importer, this.resolve, this);

      if (!entry) return null;

      return `${VIRTUAL_PREFIX}${entry}.js`;
    },

    async load(id) {
      if (!serveMode || !id.startsWith(VIRTUAL_PREFIX)) return null;
      
      const request = id.slice(VIRTUAL_PREFIX.length);
      const entry = request.endsWith('.js')
        ? request.slice(0, -3)
        : request;

      if (!includes.has(entry)) return null;

      const meta = entryMeta.get(entry);
      if (!meta) {
        await ensureBuild(entry);
      };

      const output = meta?.output || entryMeta.get(entry)?.output;
      if (!output) {
        return null;
      }

      return await fs.readFile(output, 'utf8');
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
