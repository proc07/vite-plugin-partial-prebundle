import fg from 'fast-glob';
import fs from 'node:fs/promises';
import path from 'node:path';

const isEsm = (pkg: any): boolean => {
  if (!pkg || typeof pkg !== 'object') return false;
  if (pkg.type === 'module') return true;
  if (typeof pkg.module === 'string') return true;
  const exportsField = pkg.exports;
  if (typeof exportsField === 'string') {
    return exportsField.endsWith('.mjs') || exportsField.includes('module');
  }
  if (exportsField && typeof exportsField === 'object') {
    return Object.values(exportsField).some((val) => {
      if (typeof val === 'string') {
        return val.endsWith('.mjs') || val.includes('module');
      }
      if (val && typeof val === 'object') {
        return Boolean((val as any).import || (val as any).module);
      }
      return false;
    });
  }
  return false;
};

async function main() {
  const root = process.cwd();
  const pkgFiles = await fg('node_modules/**/package.json', {
    cwd: root,
    deep: 3,
  });

  const cjs = new Set<string>();
  for (const pkgJson of pkgFiles) {
    const full = path.join(root, pkgJson);
    const raw = await fs.readFile(full, 'utf8').catch(() => null);
    if (!raw) continue;
    const pkg = JSON.parse(raw);
    if (!isEsm(pkg)) {
      const name = pkg.name ?? path.basename(path.dirname(pkgJson));
      cjs.add(name);
    }
  }

  const list = [...cjs].sort();
  console.log(JSON.stringify(list, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
