/**
 * 🏠 Kodinohjaus App - Multi-Page Architecture
 * 
 * Uses SocketProvider + NavigationLayout for complete app structure:
 * - React Router for navigation
 * - Single Socket.IO connection across all pages
 * - Automatic authentication with fallback
 * - Status updates on every page
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './contexts';
import { NavigationLayout } from './components/NavigationLayout';
import { Home } from './pages/Home';
import { Trends } from './pages/Trends';
import { Settings } from './pages/Settings';

function App() {
  // Get stored token for auto-authentication
  const token = localStorage.getItem('authToken') || undefined;

  return (
    <Router>
      <SocketProvider 
        url="https://kodinohjaus.fi"
        token={token}
        autoAuth={true}
      >
        <Routes>
          <Route path="/" element={<NavigationLayout />}>
            <Route index element={<Home />} />
            <Route path="trends" element={<Trends />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </SocketProvider>
    </Router>
  );
}

export default App;