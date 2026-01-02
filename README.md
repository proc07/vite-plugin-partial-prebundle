# vite-plugin-partial-prebundle

专为 Vite 开发/预览场景设计的「局部预打包」插件，用于把指定的大组件/页面入口提前用 esbuild 构建成稳定产物，避免全量 optimizeDeps 或频繁全量刷新。

## 特性

- **按需预构建**：`includes`/`excludes` 支持 glob，定位需要预打包的本地入口；未命中时正常走 Vite 流程。
- **依赖索引 + 精准 HMR**：记录入口的依赖图，变更时只重建受影响入口并推送对应虚拟模块。
- **持久缓存**：产物与 metadata 落地到 `.vite/partial-prebundle`，重启命中缓存，配置变化自动失效重建。
- **内容哈希输出**：`vp-<hash>.js` 文件名基于内容哈希，可安全配合强缓存/ETag。
- **外部化/去重建议**：需要通过 `external` 手动声明要外部化的依赖（如 React/Router 及其子包），以避免双份依赖带来的上下文问题。
- **资源外链**：组件目录内的依赖被打包，目录外的依赖/静态资源外部化，路径改为以项目根为基准的短路径。

## 快速使用

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import partialPrebundle from 'vite-plugin-partial-prebundle';

export default defineConfig({
  plugins: [
    partialPrebundle({
      includes: ['src/components/*/index.tsx'], // 你的入口 glob
      excludes: ['src/components/**/__tests__/**'],
      external: ['react-router', 'history'],
    }),
  ],
});
```

## 注意事项

- 入口粒度越少，收益越高；推荐「一个业务组件/页面 = 一个入口」而非每个子文件。
- 修改 `includes`/`excludes` 后，旧缓存会被签名校验自动失效；如遇异常可手动清理 `node_modules/.vite/partial-prebundle`。

## TodoList

- 目录仅支持 Vite 5，后续升级 Vite 6 需同步依赖。
- e2e 测试覆盖全部核心逻辑。
- 基于文件 mtime 的变更检测，启动时增量重建。
- 新增/删除文件的自动处理（新增默认不预构建，删除同步清理 metadata）。
