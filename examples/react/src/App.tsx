import ContactForm from './components/ContactForm';
import SignupForm from './components/SignupForm';

export default function App() {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '2rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: '1rem' }}>Partial prebundle demo (React)</h1>
      <p style={{ color: '#555', marginBottom: '2rem' }}>
        两个表单组件被作为入口预打包，修改它们时只重建对应产物并 HMR。
      </p>
      <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <SignupForm />
        <ContactForm />
      </div>
    </div>
  );
}
