import type { CSSProperties } from 'react';

const metrics = [
  { label: '活跃用户', value: '12,430', trend: '+8.3%' },
  { label: '完成表单', value: '6,028', trend: '+2.1%' },
  { label: '转化率', value: '12.4%', trend: '+0.6%' },
];

export default function StatsPanel() {
  return (
    <div style={panel}>
      {metrics.map((m) => (
        <div key={m.label} style={item}>
          <div style={label}>{m.label}</div>
          <div style={value}>{m.value}</div>
          <div style={trend}>{m.trend}</div>
        </div>
      ))}
    </div>
  );
}

const panel: CSSProperties = {
  display: 'grid',
  gap: 12,
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
};

const item: CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: '14px 16px',
  background: '#fff',
  boxShadow: '0 6px 18px rgba(0,0,0,0.04)',
};

const label: CSSProperties = { color: '#6b7280', fontSize: 13 };
const value: CSSProperties = { fontWeight: 700, fontSize: 20, marginTop: 4 };
const trend: CSSProperties = { color: '#16a34a', fontSize: 13, marginTop: 2 };
