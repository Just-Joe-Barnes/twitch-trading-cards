import React from 'react';

const LoginPage = () => {
  const handleTwitchLogin = () => {
    window.location.href = 'http://localhost:5000/auth/twitch';
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '20px' }}>
      <h1>Login with Twitch</h1>
      <button onClick={handleTwitchLogin} style={{ padding: '10px 20px', fontSize: '16px' }}>
        Connect with Twitch
      </button>
    </div>
  );
};

export default LoginPage;
