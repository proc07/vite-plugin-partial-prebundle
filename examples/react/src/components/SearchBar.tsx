import { useState } from 'react';
import type { CSSProperties, ChangeEvent } from 'react';
import StatsPanel from './StatsPanel';

export default function SearchBar() {
  console.log('SearchBar rendered -> used child component StatsPanel');
  const [q, setQ] = useState('');
  const [history, setHistory] = useState<string[]>([]);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => setQ(e.target.value);
  const submit = () => {
    if (!q.trim()) return;
    setHistory((prev) => [q.trim(), ...prev.slice(0, 4)]);
    setQ('');
  };

  return (
    <div style={wrap}>
      <div style={bar}>
        <input
          value={q}
          onChange={onChange}
          placeholder="搜索组件、表单、案例..."
          style={input}
        />
        <button onClick={submit} style={btn} type="button">
          搜索
        </button>
      </div>
      {history.length > 0 && (
        <div style={historyBox}>
          <div style={historyTitle}>最近搜索</div>
          <div style={chips}>
            {history.map((item) => (
              <span key={item} style={chip}>
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
      <StatsPanel from="search bar" />
    </div>
  );
}

const wrap: CSSProperties = { display: 'grid', gap: 8 };
const bar: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  gap: 8,
};
const input: CSSProperties = {
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #e5e7eb',
};
const btn: CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  border: 'none',
  background: '#2563eb',
  color: '#fff',
  cursor: 'pointer',
};
const historyBox: CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: '10px 12px',
  background: '#fff',
};
const historyTitle: CSSProperties = { fontSize: 13, color: '#6b7280', marginBottom: 6 };
const chips: CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap' };
const chip: CSSProperties = {
  padding: '6px 10px',
  background: '#eef2ff',
  color: '#2563eb',
  borderRadius: 999,
  fontSize: 12,
};
