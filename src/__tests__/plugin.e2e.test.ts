import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import partialPrebundle from '../index.js';

const writeFile = fs.writeFile;
const mkdir = fs.mkdir;

const createFile = async (base: string, rel: string, content: string) => {
  const full = path.join(base, rel);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, content, 'utf8');
  return full;
};

const readJson = async (file: string) =>
  JSON.parse(await fs.readFile(file, 'utf8')) as any;

const createLogger = () => ({
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
});

describe('partial-prebundle glob + metadata', () => {
  let tmp: string;
  let cacheDir: string;
  let pluginCacheBase: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'vp-prebundle-'));
    pluginCacheBase = path.join(tmp, 'node_modules/.vite');
    cacheDir = path.join(pluginCacheBase, 'code-partial');
    await createFile(
      tmp,
      'src/components/Keep.tsx',
      `export default function Keep(){ return 'keep'; }`,
    );
    await createFile(
      tmp,
      'src/components/Drop.tsx',
      `export default function Drop(){ return 'drop'; }`,
    );
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  const runPlugin = async (includes: string[], excludes: string[] = []) => {
    const plugin = partialPrebundle({
      includes,
      excludes,
      cacheDir,
      injectStyles: false,
    });
    const resolved = {
      root: tmp,
      cacheDir: pluginCacheBase,
      command: 'serve',
      logger: createLogger(),
    } as any;
    await plugin.configResolved?.call(plugin, resolved);
    return plugin;
  };

  it('resolves glob includes/excludes and writes relative metadata', async () => {
    await runPlugin(['src/components/*.tsx'], ['src/components/Drop.tsx']);

    const metadataFile = path.join(cacheDir, '_metadata.json');
    const meta = await readJson(metadataFile);
    const entries = meta.entries as Record<string, any>;

    expect(entries).toHaveProperty('src/components/Keep.tsx');
    expect(entries).not.toHaveProperty('src/components/Drop.tsx');

    const keepMeta = entries['src/components/Keep.tsx'];
    expect(path.isAbsolute(keepMeta.output)).toBe(false);
    expect(path.isAbsolute(keepMeta.virtualId)).toBe(false);
    const outAbs = path.join(tmp, keepMeta.output);
    const exists = await fs.access(outAbs).then(
      () => true,
      () => false,
    );
    expect(exists).toBe(true);
    // deps should also be serialized as relative paths
    expect(keepMeta.deps.every((d: string) => !path.isAbsolute(d))).toBe(true);
  });

  it('removes stale entries when config changes', async () => {
    await runPlugin(['src/components/*.tsx'], []);
    const metadataFile = path.join(cacheDir, '_metadata.json');
    const firstMeta = await readJson(metadataFile);
    const dropOutRel = firstMeta.entries['src/components/Drop.tsx'].output as string;
    const dropOutAbs = path.join(tmp, dropOutRel);

    await runPlugin(['src/components/Keep.tsx'], []);

    const meta = await readJson(metadataFile);
    const entries = meta.entries as Record<string, any>;
    expect(entries).toHaveProperty('src/components/Keep.tsx');
    expect(entries).not.toHaveProperty('src/components/Drop.tsx');

    const dropExists = await fs.access(dropOutAbs).then(
      () => true,
      () => false,
    );
    expect(dropExists).toBe(false);
  });

  it('reuses cached output on restart and load', async () => {
    const plugin = await runPlugin(['src/components/Keep.tsx']);
    const metadataFile = path.join(cacheDir, '_metadata.json');
    const meta1 = await readJson(metadataFile);
    const keepMeta = meta1.entries['src/components/Keep.tsx'];
    const outAbs = path.join(tmp, keepMeta.output);
    const before = (await fs.stat(outAbs)).mtimeMs;

    const plugin2 = await runPlugin(['src/components/Keep.tsx']);
    const after = (await fs.stat(outAbs)).mtimeMs;

    // output should not be rebuilt on restart
    expect(after).toBe(before);

    const virtualId = `virtual:vp:${path.join(tmp, 'src/components/Keep.tsx')}.js`;
    const loaded = await plugin2.load?.call(plugin2, virtualId);
    expect(typeof loaded).toBe('string');
    expect((loaded as string).length).toBeGreaterThan(0);
  });

  it('rebuilds and invalidates on hot update', async () => {
    const entryPath = await createFile(
      tmp,
      'src/components/Hot.tsx',
      `export default function Hot(){ return 'v1'; }`,
    );
    const plugin = await runPlugin(['src/components/Hot.tsx']);
    const metadataFile = path.join(cacheDir, '_metadata.json');
    const meta = await readJson(metadataFile);
    const hotOutAbs = path.join(tmp, meta.entries['src/components/Hot.tsx'].output as string);

    const initial = await fs.readFile(hotOutAbs, 'utf8');
    await writeFile(entryPath, `export default function Hot(){ return 'v2'; }`, 'utf8');

    const virtualId = `virtual:vp:${path.join(tmp, 'src/components/Hot.tsx')}.js`;
    const moduleNode: any = { id: virtualId };
    const moduleGraph = {
      getModuleById: (id: string) => (id === virtualId ? moduleNode : null),
      invalidateModule: (mod: any) => {
        mod.invalidated = true;
      },
    };
    const ctx = {
      file: entryPath,
      server: { moduleGraph },
    } as any;

    const updated = await plugin.handleHotUpdate?.call(plugin, ctx);
    expect(updated?.[0]).toBe(moduleNode);
    expect(moduleNode.invalidated).toBe(true);

    const rebuilt = await fs.readFile(hotOutAbs, 'utf8');
    expect(rebuilt).not.toBe(initial);
    expect(rebuilt).toContain('v2');
  });
});
