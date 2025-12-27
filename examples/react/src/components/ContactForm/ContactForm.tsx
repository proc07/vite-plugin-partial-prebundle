import { useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
// import documentarywebp from 'src/images/documentary.webp';

// console.log('documentarywebp', documentarywebp);

export default function ContactForm() {
  const [topic, setTopic] = useState('支持咨询');
  const [email, setEmail] = useState('');
  const [detail, setDetail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <form onSubmit={submit} style={cardStyle}>
      <h2 style={titleStyle}>联系支持</h2>
      <label style={labelStyle}>
        类型
        <select style={inputStyle} value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option>支持咨询</option>
          <option>产品建议</option>
          <option>Bug 反馈</option>
        </select>
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
        详情
        <textarea
          style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
        />
      </label>
      <button type="submit" style={buttonStyle}>
        发送
      </button>
      {submitted && <p style={hintStyle}>已收到，我们会尽快回复。</p>}
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
  background: '#16a34a',
  color: 'white',
  cursor: 'pointer',
};

const hintStyle: CSSProperties = {
  marginTop: 12,
  color: '#16a34a',
  fontSize: 13,
};
