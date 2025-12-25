# vite-plugin-partial-prebundle
一款专为 Vite 设计的性能优化插件。通过预构建本地文件，大幅减少运行时编译开销，解决页面加载慢的痛点，让开发与构建体验快如闪电。

## TodoList
- 目录仅支持 vite5，后续升级 vite6 要将项目依赖升级。
- e2e 测试，针对每个逻辑、case 覆盖到。
- 检测每个文件的最后保存的时间，每次启动服务进行检测 metadata 中记录的 update 的时间是否与当前时间一致，否则说明文件更新了代码，需要重新预构建。
- 新增文件（暂不预构建，因为大概率是要开发的，但重新启动服务又会预构建），删除文件（需要从 metadata 移除）
- 组件内引入组件的路径待优化 import StatsPanel from "/Users/zhangli/Desktop/\u4E2A\u4EBA\u9879\u76EE/vite-plugin-partial-prebundle/examples/react/src/components/StatsPanel.tsx";
