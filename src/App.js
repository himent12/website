
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import { useEffect } from 'react';
import TabContainer from './components/TabContainer';
import ReadingMode from './components/ReadingMode';
import ReaderDemo from './components/ReaderDemo';
import { initializeMobileOptimizations } from './hooks/useMobileDetection';
import './App.css';

function App() {
  // Initialize mobile optimizations on app start
  useEffect(() => {
    initializeMobileOptimizations();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<TabContainer />} />
        <Route path="/reading" element={<ReadingMode />} />
        <Route path="/demo" element={<ReaderDemo />} />
      </Routes>
      <SpeedInsights />
      <Analytics />
    </Router>
  );
}

export default App;

