import fs from 'node:fs/promises';
import type { EntryMeta, EntryMetaSerialized } from '../types';

type MetadataDeps = {
  entryMeta: Map<string, EntryMeta>;
  depToEntries: Map<string, Set<string>>;
  cacheBase: string;
  metadataPath: string;
  toRelative: (p: string) => string;
  toAbsolute: (p: string) => string;
  logger?: { warn?: (msg: string) => void };
};

export const createMetadataManager = ({
  entryMeta,
  depToEntries,
  cacheBase,
  metadataPath,
  toRelative,
  toAbsolute,
  logger,
}: MetadataDeps) => {
  let metadataWrite: Promise<void> = Promise.resolve();

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

  const queueMetadataSave = () => {
    metadataWrite = metadataWrite
      .then(() => saveMetadata())
      .catch((err) => {
        logger?.warn?.(
          `[vite-plugin-partial-prebundle] failed to write metadata: ${String(
            err?.message || err,
          )}`,
        );
      });
    return metadataWrite;
  };

  const loadMetadata = async (targetEntries: Set<string>) => {
    try {
      const raw = await fs.readFile(metadataPath, 'utf8');
      const json = JSON.parse(raw) as {
        entries?: Record<string, EntryMetaSerialized>;
      };

      if (!json.entries) return;

      for (const [relEntry, meta] of Object.entries(json.entries)) {
        const entry = toAbsolute(relEntry);
        if (!targetEntries.has(entry)) continue;

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
    } catch {
      // ignore
    }
    queueMetadataSave();
  };

  return {
    queueMetadataSave,
    loadMetadata,
    removeEntry,
  };
};
