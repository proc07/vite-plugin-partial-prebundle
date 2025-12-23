import type { CSSProperties } from 'react';

export default function PricingCard() {
  return (
    <div style={card}>
      <div style={plan}>Pro</div>
      <div style={price}>
        ￥129
        <span style={unit}> /月</span>
      </div>
      <ul style={list}>
        <li>不限项目数</li>
        <li>自定义字段</li>
        <li>团队协作与审批</li>
        <li>优先支持</li>
      </ul>
      <button style={btn}>立即升级</button>
    </div>
  );
}

const card: CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 16,
  padding: '18px 16px',
  background: '#fff',
  boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
  display: 'grid',
  gap: 12,
};

const plan: CSSProperties = {
  fontWeight: 700,
  letterSpacing: 0.4,
};

const price: CSSProperties = { fontSize: 28, fontWeight: 800 };
const unit: CSSProperties = { fontSize: 14, color: '#6b7280', marginLeft: 4 };
const list: CSSProperties = { margin: 0, paddingLeft: 18, color: '#374151', lineHeight: 1.6 };
const btn: CSSProperties = {
  padding: '10px 14px',
  borderRadius: 12,
  border: 'none',
  background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
  color: '#fff',
  cursor: 'pointer',
};
