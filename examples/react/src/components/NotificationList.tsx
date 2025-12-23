import type { CSSProperties } from 'react';

const items = [
  { title: '新注册用户', desc: 'Ada 刚刚注册并创建了团队', time: '2m ago' },
  { title: '表单提交', desc: '关于费用报销的工单已提交', time: '8m ago' },
  { title: '权限更新', desc: '你被添加为项目管理者', time: '15m ago' },
];

export default function NotificationList() {
  return (
    <div style={list}>
      {items.map((item) => (
        <div key={item.title} style={row}>
          <div style={dot} />
          <div style={{ flex: 1 }}>
            <div style={title}>{item.title}</div>
            <div style={desc}>{item.desc}</div>
          </div>
          <div style={time}>{item.time}</div>
        </div>
      ))}
    </div>
  );
}

const list: CSSProperties = {
  display: 'grid',
  gap: 10,
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: 12,
  background: '#fff',
};

const row: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '12px 1fr auto',
  gap: 10,
  alignItems: 'start',
};

const dot: CSSProperties = {
  width: 10,
  height: 10,
  marginTop: 5,
  borderRadius: '50%',
  background: '#2563eb',
};

const title: CSSProperties = { fontWeight: 600, fontSize: 14 };
const desc: CSSProperties = { color: '#6b7280', fontSize: 13 };
const time: CSSProperties = { color: '#9ca3af', fontSize: 12 };
