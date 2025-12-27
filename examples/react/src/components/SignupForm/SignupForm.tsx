import { useState } from 'react';
import type { FormEvent } from 'react';
import { cardStyle, titleStyle, labelStyle, inputStyle, buttonStyle, hintStyle } from './style';

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

