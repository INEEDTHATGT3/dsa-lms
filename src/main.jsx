import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Hub from './pages/Hub.jsx';
import Lesson from './pages/Lesson.jsx';
import NotFound from './pages/NotFound.jsx';
import Review from './pages/Review.jsx';
import Interview from './pages/Interview.jsx';
import Sprint from './pages/Sprint.jsx';
import './styles/theme.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <HashRouter>
    <Routes>
      <Route path="/" element={<Hub />} />
      <Route path="/lesson/:moduleId/:level" element={<Lesson />} />
      <Route path="/review" element={<Review />} />
      <Route path="/interview" element={<Interview />} />
      <Route path="/sprint" element={<Sprint />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </HashRouter>
);
