import type * as esbuild from 'esbuild';

// esbuild 0.21 不用处理
// esbuild 0.24 生成的 CSS sourcemap 注释样式变了（//# sourceMappingURL=...）
export const collectCss = (files: esbuild.OutputFile[]): string => {
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
