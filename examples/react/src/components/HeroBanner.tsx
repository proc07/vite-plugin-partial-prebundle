import type { CSSProperties } from 'react';

export default function HeroBanner() {
  return (
    <section style={wrap}>
      <div>
        <div style={eyebrow}>Partial Prebundle</div>
        <h1 style={title}>只为大组件单独预打包</h1>
        <p style={subtitle}>
          在 Vite dev 中精准预构建指定入口，变更只触达命中文件，HMR 更快。
        </p>
        <div style={actions}>
          <button style={primary}>立即体验</button>
          <button style={secondary}>查看文档</button>
        </div>
      </div>
      <div style={mock}>
        <div style={pill}>vite-plugin-partial-prebundle</div>
        <div style={lines} />
      </div>
    </section>
  );
}

const wrap: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1.2fr 1fr',
  alignItems: 'center',
  gap: 24,
  padding: '24px 28px',
  borderRadius: 20,
  background: 'linear-gradient(135deg, #eef2ff, #e0f2fe)',
  border: '1px solid #dbeafe',
};
const eyebrow: CSSProperties = {
  display: 'inline-block',
  padding: '4px 10px',
  background: '#fff',
  borderRadius: 999,
  color: '#2563eb',
  fontWeight: 600,
};
const title: CSSProperties = { margin: '12px 0 8px', fontSize: 28 };
const subtitle: CSSProperties = { margin: 0, color: '#475569' };
const actions: CSSProperties = { display: 'flex', gap: 10, marginTop: 16 };
const primary: CSSProperties = {
  padding: '10px 14px',
  borderRadius: 12,
  border: 'none',
  background: '#2563eb',
  color: '#fff',
  cursor: 'pointer',
};
const secondary: CSSProperties = {
  padding: '10px 14px',
  borderRadius: 12,
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#0f172a',
  cursor: 'pointer',
};
const mock: CSSProperties = {
  borderRadius: 16,
  background: '#0f172a',
  padding: 16,
  boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
};
const pill: CSSProperties = {
  display: 'inline-block',
  padding: '4px 8px',
  background: '#1d4ed8',
  color: '#e2e8f0',
  borderRadius: 999,
  fontSize: 12,
};
const lines: CSSProperties = {
  marginTop: 14,
  borderRadius: 8,
  height: 120,
  background:
    'repeating-linear-gradient( to bottom, rgba(226,232,240,0.18), rgba(226,232,240,0.18) 12px, transparent 12px, transparent 18px )',
};
