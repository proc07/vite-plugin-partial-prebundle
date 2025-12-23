import type { CSSProperties } from 'react';

const tasks = [
  { title: '梳理需求文档', status: '进行中' },
  { title: '重构表单校验', status: '待办' },
  { title: '编写测试用例', status: '待办' },
  { title: '体验问题回访', status: '完成' },
];

export default function TodoBoard() {
  return (
    <div style={board}>
      {tasks.map((task) => (
        <div key={task.title} style={card}>
          <div style={title}>{task.title}</div>
          <div style={status}>{task.status}</div>
        </div>
      ))}
    </div>
  );
}

const board: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 12,
};

const card: CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: '12px 14px',
  background: '#fff',
};

const title: CSSProperties = { fontWeight: 600, marginBottom: 6 };
const status: CSSProperties = { color: '#2563eb', fontSize: 13 };
