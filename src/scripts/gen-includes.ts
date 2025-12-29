import path from 'node:path';
import glob from 'fast-glob';

// 1.匹配 pattern 目录下的 index.ext 或 目录名.ext 文件、大写开头目录名.ext 文件
// 2.如果当前目录下不存在任何 ext 文件，则获取它每一个子目录递归查找 ext 文件
// 3.如果当前目录下有文件，但是文件名不符合 index.ext 或 目录名.ext，且只有一个 ext 文件的话，则选取该文件
// 3.1 如果文件名不符合，但是有多个 ext 文件的话，则都匹配 ext 文件，并且递归查找子目录的 ext 文件

type Ext = 'tsx' | 'jsx' | 'vue';

const isSimpleName = (file: string) => path.basename(file).split('.').length === 2;

async function collectEntries(dir: string, ext: Ext, acc: Set<string>) {
  const base = path.basename(dir);
  const capBase = base ? `${base[0].toUpperCase()}${base.slice(1)}` : base;
  const preferredNames = [
    `index.ts`,
    `index.${ext}`,
    `${base}.${ext}`,
    `${capBase}.${ext}`,
  ];

  const immediateFiles = await glob(
    [`${dir}/*.${ext}`, `${dir}/index.ts`],
    {
      onlyFiles: true,
      deep: 0,
    },
  );
  const simpleFiles = immediateFiles.filter(isSimpleName);
  
  const preferred = simpleFiles.find((file) =>
    preferredNames.includes(path.basename(file)),
  );
  if (preferred) {
    acc.add(preferred);
    return;
  }

  if (simpleFiles.length === 0) {
    const children = await glob(`${dir}/*`, { onlyDirectories: true, deep: 0 });
    for (const child of children) {
      await collectEntries(child, ext, acc);
    }
    return;
  }

  if (simpleFiles.length === 1) {
    acc.add(simpleFiles[0]);
  } else {
    simpleFiles.forEach((f) => acc.add(f));
  }

  const children = await glob(`${dir}/*`, { onlyDirectories: true, deep: 0 });
  for (const child of children) {
    await collectEntries(child, ext, acc);
  }
}

export async function getAllComponentPaths(
  pattern: string,
  ext: Ext = 'tsx',
) {
  const roots = await glob(pattern, { onlyDirectories: true });
  const files = new Set<string>();

  for (const dir of roots) {
    await collectEntries(dir, ext, files);
  }

  console.log('getAllComponentPaths:', JSON.stringify([...files], null, 2), files.size);
  return [...files];
}
