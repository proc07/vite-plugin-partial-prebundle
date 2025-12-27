import ContactForm from './components/ContactForm/ContactForm';
import SignupForm from './components/SignupForm/SignupForm';
import LoadingResources from './components/feature/LoadingResources';
import HeroBanner from './components/HeroBanner';
import ProfileCard from './components/ProfileCard';
import SearchBar from './components/SearchBar';
import StatsPanel from './components/StatsPanel';

import StepsTimeline from './components/StepsTimeline';
import TagInput from './components/TagInput';
import UploadCard from './components/UploadCard';
 
export default function App() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem', fontFamily: 'Inter, system-ui, sans-serif', display: 'grid', gap: '1.5rem' }}>
      <HeroBanner />
      <SearchBar />
      <StatsPanel from="App Component" />
      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <SignupForm />
        <ContactForm />
        <ProfileCard />
        <LoadingResources />
        {/* 这3个组件没有调用，但还是需要预打包 */}
        {/* <TagInput />
        <UploadCard />
        <StepsTimeline /> */}
      </div>
    </div>
  );
}
