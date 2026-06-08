import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import NotificationBell from './components/NotificationBell';
import logo from './logo.jpeg';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
  }, [token]);

  const handleLogin = (userData, userToken) => {
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(userToken);
    setUser(userData);
  };

  const [activePage, setActivePage] = useState('dashboard');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const saveProfile = async (updatedUser) => {
    try {
      const res = await fetch(`http://localhost:5000/api/users/${updatedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedUser),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Unable to update profile');
      }
      const data = await res.json();
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
    } catch (err) {
      console.error('Profile update failed:', err);
      alert(err.message || 'Profile update failed');
    }
  };

  const updateCurrentUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  if (!token || !user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white text-slate-900 selection:bg-blue-200 selection:text-slate-900">
      <nav className="sticky top-0 z-50 border-b border-slate-200 px-6 py-2 flex justify-between items-center bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-md overflow-hidden">
            <img src={logo} alt="PISCS logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-black">PISCS</h1>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setActivePage('profile')}
            className="hidden md:flex items-center gap-3 border-r border-white/10 pr-6"
          >
            <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200">
              <img
                src={user.profile_pic || logo}
                alt="User"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-left">
              <p className="text-sm font-black tracking-tight">{user.name}</p>
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest hover:underline cursor-pointer">PROFILE</p>
            </div>
          </button>
          
          <div className="flex items-center gap-2">
            <NotificationBell token={token} onNavigate={(path) => console.log('Navigate to', path)} />
            <button
              onClick={handleLogout}
              className="px-6 py-2.5 text-xs font-black tracking-widest text-white bg-blue-600 hover:bg-blue-700 border border-blue-600 rounded-xl transition-all active:scale-95 uppercase"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex overflow-hidden">
        <Dashboard
          user={user}
          token={token}
          activePage={activePage}
          setActivePage={setActivePage}
          saveProfile={saveProfile}
          onCurrentUserUpdate={updateCurrentUser}
        />
      </main>

    </div>
  );
}

export default App;
