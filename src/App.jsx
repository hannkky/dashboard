import { useEffect, useState } from 'react';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import { subscribeLang } from './i18n';
import { authService } from './services/api';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [, setLangVersion] = useState(0);

  useEffect(() => {
    let mounted = true;
    const verifySession = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          if (mounted) setIsLoggedIn(false);
          return;
        }
        const res = await authService.me();
        if (res?.user) {
          localStorage.setItem('role', res.user.rol || 'user');
          localStorage.setItem('usuario', res.user.usuario || '');
          if (mounted) setIsLoggedIn(true);
          return;
        }
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('usuario');
        if (mounted) setIsLoggedIn(false);
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('usuario');
        if (mounted) setIsLoggedIn(false);
      }
    };

    const unsubscribe = subscribeLang(() => {
      setLangVersion(v => v + 1);
    });
    verifySession();
    return () => { mounted = false; unsubscribe(); };
  }, []);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('usuario');
    } catch (e) {}
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
