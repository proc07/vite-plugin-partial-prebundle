import { useState } from 'react';
import type { CSSProperties, ChangeEvent } from 'react';

export default function UploadCard() {
  const [file, setFile] = useState<File | null>(null);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files?.[0];
    if (next) setFile(next);
  };

  return (
    <div style={card}>
      <div>
        <div style={title}>上传设计附件</div>
        <p style={desc}>支持 PNG/JPG/PDF，单个文件 10MB 以内。</p>
      </div>
      <label style={button}>
        选择文件
        <input type="file" onChange={onChange} style={{ display: 'none' }} />
      </label>
      {file && (
        <div style={fileBox}>
          <span>{file.name}</span>
          <span style={size}>{(file.size / 1024).toFixed(1)} KB</span>
        </div>
      )}
    </div>
  );
}

const card: CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: '14px 16px',
  background: '#fff',
  display: 'grid',
  gap: 10,
};

const title: CSSProperties = { fontWeight: 700 };
const desc: CSSProperties = { margin: 0, color: '#6b7280', fontSize: 13 };
const button: CSSProperties = {
  alignSelf: 'start',
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid #2563eb',
  color: '#2563eb',
  cursor: 'pointer',
  display: 'inline-block',
};
const fileBox: CSSProperties = {
  padding: '8px 10px',
  borderRadius: 10,
  background: '#f8fafc',
  border: '1px solid #e5e7eb',
  display: 'flex',
  justifyContent: 'space-between',
};
const size: CSSProperties = { color: '#6b7280', fontSize: 12 };
