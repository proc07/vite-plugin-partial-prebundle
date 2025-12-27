import type { CSSProperties } from 'react';

export const cardStyle: CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: '1.5rem',
  boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
  background: 'white',
};

export const titleStyle: CSSProperties = { marginTop: 0, marginBottom: '1rem' };
export const labelStyle: CSSProperties = {
  display: 'grid',
  gap: 6,
  marginBottom: 12,
  color: '#374151',
  fontSize: 14,
};

export const inputStyle: CSSProperties = {
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
};

export const buttonStyle: CSSProperties = {
  marginTop: 6,
  padding: '10px 14px',
  borderRadius: 8,
  border: 'none',
  background: '#2563eb',
  color: 'white',
  cursor: 'pointer',
};

export const hintStyle: CSSProperties = {
  marginTop: 12,
  color: '#2563eb',
  fontSize: 13,
};