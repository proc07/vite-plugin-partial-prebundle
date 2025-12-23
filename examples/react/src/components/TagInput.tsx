import { useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';

export default function TagInput() {
  const [tag, setTag] = useState('');
  const [tags, setTags] = useState<string[]>(['表单', '性能', 'HMR']);

  const addTag = () => {
    const next = tag.trim();
    if (!next || tags.includes(next)) return;
    setTags((prev) => [...prev, next]);
    setTag('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const remove = (t: string) => setTags((prev) => prev.filter((x) => x !== t));

  return (
    <div style={wrap}>
      <div style={inputWrap}>
        {tags.map((t) => (
          <span key={t} style={chip}>
            {t}
            <button style={chipBtn} onClick={() => remove(t)} type="button">
              ×
            </button>
          </span>
        ))}
        <input
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="添加标签..."
          style={input}
        />
      </div>
      <button style={btn} onClick={addTag} type="button">
        添加
      </button>
    </div>
  );
}

const wrap: CSSProperties = { display: 'grid', gap: 8 };
const inputWrap: CSSProperties = {
  display: 'flex',
  gap: 6,
  flexWrap: 'wrap',
  padding: '8px 10px',
  borderRadius: 12,
  border: '1px solid #e5e7eb',
  background: '#fff',
};
const input: CSSProperties = {
  flex: 1,
  minWidth: 140,
  border: 'none',
  outline: 'none',
  fontSize: 14,
};
const chip: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 10px',
  background: '#fef3c7',
  color: '#92400e',
  borderRadius: 999,
  fontSize: 12,
};
const chipBtn: CSSProperties = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  color: '#92400e',
  fontWeight: 700,
};
const btn: CSSProperties = {
  justifySelf: 'start',
  padding: '8px 12px',
  borderRadius: 10,
  border: 'none',
  background: '#2563eb',
  color: '#fff',
  cursor: 'pointer',
};
