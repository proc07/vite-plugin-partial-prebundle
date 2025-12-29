import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { getAllComponentPaths } from '../gen-includes.js';

const write = async (root: string, rel: string, content = '// stub') => {
  const full = path.join(root, rel);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content, 'utf8');
};

describe('getAllComponentPaths', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'gen-includes-'));
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it('prefers index.tsx and dir-name.tsx (including capitalized)', async () => {
    await write(tmp, 'components/Foo/index.tsx');
    await write(tmp, 'components/Bar/Bar.tsx');
    await write(tmp, 'components/Baz/Baz.tsx');
    // capitalized directory name file
    await write(tmp, 'components/Qux/Qux.tsx');

    const res = await getAllComponentPaths(`${tmp}/components/*`);
    expect(new Set(res)).toEqual(
      new Set([
        path.join(tmp, 'components/Foo/index.tsx'),
        path.join(tmp, 'components/Bar/Bar.tsx'),
        path.join(tmp, 'components/Baz/Baz.tsx'),
        path.join(tmp, 'components/Qux/Qux.tsx'),
      ]),
    );
  });

  it('recurses into subdirectories when no tsx files exist', async () => {
    await write(tmp, 'components/Deep/Nested/Leaf.tsx');

    const res = await getAllComponentPaths(`${tmp}/components/*`);
    expect(res).toEqual([path.join(tmp, 'components/Deep/Nested/Leaf.tsx')]);
  });

  it('picks single tsx when no preferred name exists', async () => {
    await write(tmp, 'components/Single/Only.tsx');

    const res = await getAllComponentPaths(`${tmp}/components/*`);
    expect(res).toEqual([path.join(tmp, 'components/Single/Only.tsx')]);
  });

  it('collects all tsx files when multiple non-preferred exist and keeps recursing', async () => {
    await write(tmp, 'components/Multi/A.tsx');
    await write(tmp, 'components/Multi/B.tsx');
    await write(tmp, 'components/Multi/Sub/C.tsx');

    const res = await getAllComponentPaths(`${tmp}/components/*`);
    expect(new Set(res)).toEqual(
      new Set([
        path.join(tmp, 'components/Multi/A.tsx'),
        path.join(tmp, 'components/Multi/B.tsx'),
        path.join(tmp, 'components/Multi/Sub/C.tsx'),
      ]),
    );
  });
});
