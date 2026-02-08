import { useEffect, useState } from 'react';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import { subscribeLang } from './i18n';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [, setLangVersion] = useState(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('isLoggedIn');
      if (stored === 'true') setIsLoggedIn(true);
    } catch (e) {}

    const unsubscribe = subscribeLang(() => {
      setLangVersion(v => v + 1);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = () => {
    setIsLoggedIn(true);
    try { localStorage.setItem('isLoggedIn', 'true'); } catch (e) {}
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    try { localStorage.removeItem('isLoggedIn'); } catch (e) {}
  };

  return (
    <div>
      {!isLoggedIn ? (
        <LoginPage onLogin={handleLogin} />
      ) : (
        <DashboardPage onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
