import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import { normalizePath } from 'vite';

export const stripQuery = (id: string): string => id.split('?')[0];

export const stableHash = (input: string): string => {
  return crypto.createHash('md5').update(input).digest('hex').slice(0, 8);
};

export const resolveExternalPkgs = async (root: string, external: string[] = []): Promise<string[]> => {
  const set = new Set<string>([...external]);
  try {
    const pkgRaw = await fs.readFile(path.join(root, 'package.json'), 'utf8');
    const pkg = JSON.parse(pkgRaw) as {
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    Object.keys(pkg.dependencies ?? {}).forEach((dep) => set.add(dep));
    Object.keys(pkg.peerDependencies ?? {}).forEach((dep) => set.add(dep));
  } catch {
    // ignore missing/invalid package.json
  }
  return [...set];
};

export const createPathUtils = (root: string) => {
  const normalizedRoot = normalizePath(root);

  const toRelative = (p: string): string => {
    if (!p) return p;
    const idx = p.indexOf(normalizedRoot);
    if (idx === 0) {
      return normalizePath(path.relative(normalizedRoot, p)) || '.';
    }
    if (idx > 0) {
      const prefix = p.slice(0, idx);
      const suffix = p.slice(idx);
      return normalizePath(prefix + path.relative(normalizedRoot, suffix));
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
        : normalizePath(path.join(normalizedRoot, tail));
      return normalizePath(prefix + rebuilt);
    }
    return normalizePath(path.join(normalizedRoot, p));
  };

  const resolveAbs = (p: string): string =>
    normalizePath(path.isAbsolute(p) ? p : path.resolve(normalizedRoot, p));

  return {
    toRelative,
    toAbsolute,
    resolveAbs,
  };
};
