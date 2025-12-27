import { useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';

export default function SignupForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(`已提交：${name} / ${email}`);
  };

  return (
    <form onSubmit={submit} style={cardStyle}>
      <h2 style={titleStyle}>注册账号</h2>
      <label style={labelStyle}>
        姓名
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label style={labelStyle}>
        邮箱
        <input
          style={inputStyle}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label style={labelStyle}>
        密码
        <input
          style={inputStyle}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button type="submit" style={buttonStyle}>
        创建
      </button>
      {message && <p style={hintStyle}>{message}</p>}
    </form>
  );
}

const cardStyle: CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: '1.5rem',
  boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
  background: 'white',
};

const titleStyle: CSSProperties = { marginTop: 0, marginBottom: '1rem' };

const labelStyle: CSSProperties = {
  display: 'grid',
  gap: 6,
  marginBottom: 12,
  color: '#374151',
  fontSize: 14,
};

const inputStyle: CSSProperties = {
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
};

const buttonStyle: CSSProperties = {
  marginTop: 6,
  padding: '10px 14px',
  borderRadius: 8,
  border: 'none',
  background: '#2563eb',
  color: 'white',
  cursor: 'pointer',
};

const hintStyle: CSSProperties = {
  marginTop: 12,
  color: '#2563eb',
  fontSize: 13,
};
