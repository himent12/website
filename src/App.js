
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SpeedInsights } from "@vercel/speed-insights/react";
import { useEffect } from 'react';
import TabContainer from './components/TabContainer';
import ReadingMode from './components/ReadingMode';
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
      </Routes>
      <SpeedInsights />
    </Router>
  );
}

export default App;

