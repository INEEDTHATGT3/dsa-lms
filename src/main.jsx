import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Hub from './pages/Hub.jsx';
import Lesson from './pages/Lesson.jsx';
import NotFound from './pages/NotFound.jsx';
import Review from './pages/Review.jsx';
import Interview from './pages/Interview.jsx';
import Sprint from './pages/Sprint.jsx';
import SkipLink from './components/SkipLink.jsx';
/* self-hosted webfonts - latin subset only (see theme.css font stacks) */
import '@fontsource/syne/latin-400.css';
import '@fontsource/syne/latin-600.css';
import '@fontsource/syne/latin-700.css';
import '@fontsource/syne/latin-800.css';
import '@fontsource/dm-mono/latin-400.css';
import '@fontsource/dm-mono/latin-500.css';
import '@fontsource/space-mono/latin-400.css';
import '@fontsource/space-mono/latin-700.css';
import './styles/theme.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <HashRouter>
    <SkipLink />
    <main id="main" tabIndex={-1}>
    <Routes>
      <Route path="/" element={<Hub />} />
      <Route path="/lesson/:moduleId/:level" element={<Lesson />} />
      <Route path="/review" element={<Review />} />
      <Route path="/interview" element={<Interview />} />
      <Route path="/sprint" element={<Sprint />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </main>
  </HashRouter>
);
