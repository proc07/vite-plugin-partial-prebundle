import { useState } from 'react';
import type { CSSProperties } from 'react';
import viteSVG from '../../icons/vite.svg';
// import documentarywebp from '../images/documentary.jpg';
import documentarywebp from '@/images/documentary.jpg';
import { buttonprops } from './LoadingResources.styled';

console.log('LoadingResources: buttonprops', buttonprops);

export const defaultItems = [
  '入口匹配到 glob',
  '排除特定组件',
  '预构建输出缓存',
  'HMR 局部更新',
];

export default function Checklist() {
  const [done, setDone] = useState(() => new Set<string>([defaultItems[0]]));
  const toggle = (item: string) => {
    setDone((prev) => {
      const next = new Set(prev);
      next.has(item) ? next.delete(item) : next.add(item);
      return next;
    });
  };

  return (
    <div style={list}>
      {defaultItems.map((item) => (
        <label key={item} style={row}>
          <input
            type="checkbox"
            checked={done.has(item)}
            onChange={() => toggle(item)}
            style={{ marginRight: 8 }}
          />
          <span>{item}</span>
        </label>
      ))}
      <img src={viteSVG} alt="Vite Logo" width={80} height={80} />
      <img src={documentarywebp} alt="react bg img" width={80} height={80} />
    </div>
  );
}

const list: CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 12,
  background: '#fff',
  display: 'grid',
  gap: 8,
};

const row: CSSProperties = { display: 'flex', alignItems: 'center', fontSize: 14, gap: 4 };
