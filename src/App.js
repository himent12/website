
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
    </Router>
  );
}

export default App;

