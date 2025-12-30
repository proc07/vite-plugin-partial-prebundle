import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import glob from 'fast-glob';
import type { Alias, ModuleNode, Plugin, ResolvedConfig, ViteDevServer } from 'vite';
import { normalizePath } from 'vite';
import * as esbuild from 'esbuild';
import vueEsbuild from 'unplugin-vue/esbuild';
import vueJsx from 'unplugin-vue-jsx/esbuild';
import {VITE_CACHE_DIR, ASSET_EXTENSIONS, generateAssetLoaders} from './utils/constants.js'
import {collectCss} from './utils/css.js'
import {styleInjector, buildVueHmrSnippet} from './utils/hmr.js'
import type {EntryMeta, EntryMetaSerialized} from './types.js'
import {stripQuery, stableHash, resolveExternalPkgs} from './utils/path-utils.js'
import { getAllComponentPaths } from './scripts/gen-includes.js';

export { getAllComponentPaths };

export interface PartialPrebundleOptions {
  includes: string[];
  excludes?: string[];
  injectStyles?: boolean;
  cacheDir?: string;
  internal?: string[];
  external?: string[];
}

const VIRTUAL_PREFIX = 'virtual:vp:';

export function partialPrebundle(options: PartialPrebundleOptions): Plugin {
  let config: ResolvedConfig;
  let root = '';
  let cacheBase = '';
  let metadataPath = '';
  // 多次并发写入导致内容被覆盖，改为串行写入
  let metadataWrite: Promise<void> = Promise.resolve();
  let serveMode = false;
  let externalPkgs: string[] = ['react/jsx-runtime'];
  let aliasEntries: Alias[] = [];

  const includeRaw = options.includes ?? [];
  const excludeRaw = options.excludes ?? [];
  const targetEntries = new Set<string>();
  const entryMeta = new Map<string, EntryMeta>();
  const depToEntries = new Map<string, Set<string>>();
  const outputCache = new Map<string, string>();
  // 防止同一个入口被并发重复构建
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
    if (path.isAbsolute(p)) {
      // 路径以 / 开头但不含 root 时，视为相对 root 的绝对形式
      if (!p.startsWith(root)) {
        return normalizePath(path.join(root, p.slice(1)));
      }
      return normalizePath(p);
    }
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

  const expandPatterns = async (patterns: string[]): Promise<Set<string>> => {
    if (!patterns.length) return new Set<string>();
    const matches = await glob(patterns, {
      cwd: root,
      absolute: true,
      onlyFiles: true,
      dot: true,
    });
    return new Set(matches.map((m) => normalizePath(resolveAbs(m))));
  };

  const refreshEntryTargets = async () => {
    targetEntries.clear();
    const includeSet = await expandPatterns(includeRaw);
    const excludeSet = await expandPatterns(excludeRaw);
    includeSet.forEach((p) => {
      if (!excludeSet.has(p)) targetEntries.add(p);
    });
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
    const relEntry = toRelative(entry);
    const virtualSuffix = relEntry.startsWith('/')
      ? relEntry
      : `/${relEntry}`;
    const virtualId = `${VIRTUAL_PREFIX}${virtualSuffix}`;
    return { hash, output, styleId, virtualId, relEntry };
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

        entryMeta.set(entry, {
          output: toAbsolute(meta.output),
          deps: new Set([...meta.deps].map(toAbsolute)),
          hash: meta.hash,
          virtualId: meta.virtualId,
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

  const removeEntry = async (entry: string) => {
    const meta = entryMeta.get(entry);
    if (!meta) return;

    entryMeta.delete(entry);

    for (const dep of meta.deps) {
      const bucket = depToEntries.get(dep);
      if (!bucket) continue;
      bucket.delete(entry);
      if (bucket.size === 0) depToEntries.delete(dep);
    }
    try {
      await fs.unlink(meta.output);
      outputCache.delete(meta.output);
    } catch {
      // ignore
    }
    queueMetadataSave();
  };

  const buildEntry = async (entry: string) => {
    const { hash, output: outFile, styleId, virtualId, relEntry } = getEntryPaths(entry);
    const isVue = entry.endsWith('.vue');
    const entryDir = normalizePath(path.dirname(entry));

    // 为避免组件间互相内嵌，检测到 import 指向其他 targetEntries，会将该导入重写为 virtual:vp:<abs>.js 并标记 external。
    const ENTRY_EXTS = ['.ts', '.tsx', '.jsx', '.vue', '.js', '.mjs', '.cjs'];
    const resolveWithAlias = (importer: string, spec: string) => {
      let applied = spec;
      for (const a of aliasEntries) {
        if (typeof a.find === 'string') {
          if (applied.startsWith(a.find)) {
            applied = applied.replace(a.find, a.replacement);
            break;
          }
        } else if (a.find.test(applied)) {
          applied = applied.replace(a.find, a.replacement);
          break;
        }
      }

      if (!path.isAbsolute(applied) && applied.startsWith('/')) {
        applied = path.join(root, applied.slice(1));
      }

      const base = path.dirname(importer);
      return normalizePath(
        path.isAbsolute(applied) ? applied : path.resolve(base, applied),
      );
    };

    const entryLinkerPlugin: esbuild.Plugin = {
      name: 'vp-entry-linker',
      setup(build) {
        build.onResolve({ filter: /.*/ }, async (args) => {
          if (!args.importer) return null;
          if (externalPkgs.includes(args.path)) return null;
          if (options?.internal?.includes(args.path)) return { path: args.path, external: false };

          const rawPath = resolveWithAlias(args.importer, args.path);

          if (ASSET_EXTENSIONS.some((ext) => rawPath.endsWith(`.${ext}`))) {
            const rel = toRelative(rawPath);
            const shortPath = rel.startsWith('/') ? rel : `/${rel}`;
            return { path: shortPath, external: true };
          }
          // case: rawPath = '.../file.types' -> '.../file.types.ts'
          // case: rawPath = '.../component' -> '.../component.tsx'
          const hasKnownExt = ENTRY_EXTS.some((ext) => rawPath.endsWith(ext));
          const candidates = hasKnownExt
            ? [rawPath]
            : [rawPath, ...ENTRY_EXTS.map((ext) => `${rawPath}${ext}`)];

          for (const candidate of candidates) {
            if (targetEntries.has(candidate)) {
              return {
                path: `${VIRTUAL_PREFIX}/${toRelative(candidate)}`,
                external: true,
              };
            }

            try {
              await fs.access(candidate);
              const inEntryScope =
                candidate === entry ||
                candidate.startsWith(`${entryDir}/`);
              if (inEntryScope) {
                // bundle 组件目录内的依赖
                return { path: candidate, external: false };
              }

              const rel = normalizePath(path.relative(root, candidate));
              const shortPath = rel.startsWith('/')
                ? rel
                : `/${rel}`;
              return { path: shortPath, external: true };
            } catch {
              // not found, continue
            }
          }

          return null;
        });
      },
    };

    const buildResult = await esbuild.build({
      absWorkingDir: root,
      entryPoints: [entry],
      outfile: outFile,
      bundle: true,
      format: 'esm',
      platform: 'browser',
      target: 'esnext',
      charset: 'utf8',
      splitting: false,
      sourcemap: 'inline',
      write: false,
      metafile: true,
      external: externalPkgs,
      plugins: [
        entryLinkerPlugin,
        ...(isVue ? [vueEsbuild({ sourceMap: false }), vueJsx()] : []),
      ],
      jsx: isVue ? undefined : 'automatic',
      loader: {
        '.vue': 'ts',
        '.tsx': 'tsx',
        '.jsx': 'jsx',
        // Asset loaders - generate separate files
        ...generateAssetLoaders()
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
    outputCache.set(outFile, contents);

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

    config?.logger?.info?.(
      `[vite-plugin-partial-prebundle] built ${toRelative(entry)}`,
    );
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
    if (!targetEntries.size) return;
    await Promise.all([...targetEntries].map((entry) => ensureBuild(entry)));
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
      return targetEntries.has(normalized) ? normalized : null;
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

    async configResolved(resolved) {
      config = resolved;
      serveMode = resolved.command === 'serve';
      root = normalizePath(resolved.root);
      cacheBase = normalizePath(
        options.cacheDir ??
          path.join(resolved.cacheDir ?? path.join(root, 'node_modules/.vite'), VITE_CACHE_DIR),
      );
      metadataPath = normalizePath(path.join(cacheBase, '_metadata.json'));
      externalPkgs = await resolveExternalPkgs(
        root,
        [...externalPkgs, ...(options.external ?? [])],
        [], // exclude
      );
      aliasEntries = Array.isArray(resolved.resolve?.alias)
        ? resolved.resolve.alias
        : [];

      await refreshEntryTargets();
      await loadMetadata().catch((err) => {
        config?.logger.error(`[vite-plugin-partial-prebundle] ${err?.message || err}`);
      });

      // Remove stale entries
      const stale = [...entryMeta.keys()].filter((e) => !targetEntries.has(e));
      await Promise.all(stale.map((e) => removeEntry(e)));

      // Build missing entries
      const missing = [...targetEntries].filter((e) => !entryMeta.has(e));
      if (missing.length) {
        await Promise.all(missing.map((e) => ensureBuild(e)));
      }

      if (!targetEntries.size) {
        resolved.logger.warn(
          '[vite-plugin-partial-prebundle] `includes` is empty, plugin is idle.',
        );
      }
    },

    async resolveId(source, importer, options) {
      if (!serveMode || options?.ssr) return null;
      if (source.startsWith(VIRTUAL_PREFIX)) return source;

      const entry = await matchEntry(source, importer, this.resolve, this);
      if (!entry) return null;

      const relEntry = toRelative(entry);
      const suffix = relEntry.startsWith('/') ? relEntry : `/${relEntry}`;
      return `${VIRTUAL_PREFIX}${suffix}`;
    },

    async load(id) {
      if (!serveMode || !id.startsWith(VIRTUAL_PREFIX)) return null;

      const relEntry = id.slice(VIRTUAL_PREFIX.length);
      const entry = toAbsolute(relEntry);

      if (!targetEntries.has(entry)) return null;

      const meta = entryMeta.get(entry);
      if (!meta) {
        await ensureBuild(entry);
      };

      const output = meta?.output || entryMeta.get(entry)?.output;
      if (!output) {
        return null;
      }

      const cached = outputCache.get(output);
      if (cached) return cached;

      const code = await fs.readFile(output, 'utf8');
      outputCache.set(output, code);
      return code;
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
