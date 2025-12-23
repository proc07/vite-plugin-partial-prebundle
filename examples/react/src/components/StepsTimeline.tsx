import type { CSSProperties } from 'react';

const steps = [
  { title: '选择入口', desc: '配置 includes，精确到需要预打包的组件。' },
  { title: '启动 dev', desc: '启动 Vite 后，入口会被单独构建并缓存。' },
  { title: '局部热更', desc: '改动命中入口时只重建对应文件并推送 HMR。' },
];

export default function StepsTimeline() {
  return (
    <ol style={list}>
      {steps.map((step, i) => (
        <li key={step.title} style={row}>
          <div style={dot}>{i + 1}</div>
          <div>
            <div style={title}>{step.title}</div>
            <div style={desc}>{step.desc}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

const list: CSSProperties = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'grid',
  gap: 12,
};

const row: CSSProperties = { display: 'grid', gridTemplateColumns: '32px 1fr', gap: 10 };
const dot: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: '50%',
  background: '#1d4ed8',
  color: '#fff',
  display: 'grid',
  placeItems: 'center',
  fontWeight: 700,
};
const title: CSSProperties = { fontWeight: 600 };
const desc: CSSProperties = { color: '#6b7280', fontSize: 13 };
