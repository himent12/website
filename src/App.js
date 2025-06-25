
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SpeedInsights } from "@vercel/speed-insights/react";
import TabContainer from './components/TabContainer';
import ReadingMode from './components/ReadingMode';
import './App.css';

function App() {
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

