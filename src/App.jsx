import { useState } from 'react';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
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
