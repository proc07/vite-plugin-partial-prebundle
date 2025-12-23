import type { CSSProperties } from 'react';

export default function ProfileCard() {
  return (
    <div style={card}>
      <div style={avatar}>JS</div>
      <div>
        <div style={title}>Jessie Song</div>
        <div style={subtitle}>Product Designer · Remote</div>
      </div>
      <button style={action}>Follow</button>
    </div>
  );
}

const card: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '48px 1fr auto',
  gap: 12,
  alignItems: 'center',
  padding: '14px 16px',
  borderRadius: 12,
  border: '1px solid #e5e7eb',
  background: '#fff',
  boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
};

const avatar: CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #2563eb, #06b6d4)',
  color: '#fff',
  display: 'grid',
  placeItems: 'center',
  fontWeight: 700,
};

const title: CSSProperties = { fontWeight: 600, marginBottom: 4 };
const subtitle: CSSProperties = { color: '#6b7280', fontSize: 13 };
const action: CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #2563eb',
  color: '#2563eb',
  background: '#eef2ff',
  cursor: 'pointer',
};
