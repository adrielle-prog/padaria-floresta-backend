import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ServerWakeUp from '../components/ServerWakeUp';

const ROLE_LABELS = { gerente: '👑 Gerente', caixa: '🛒 Caixa', estoque: '📦 Estoque' };

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [serverReady, setServerReady] = useState(false);

  // Forgot password states
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) return setError('Preencha usuário e senha.');
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!forgotEmail.trim()) return setForgotError('Preencha o e-mail.');
    
    setForgotLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao solicitar redefinição.');
      }
      setForgotSuccess('Instruções enviadas! Verifique seu e-mail (e a pasta de spam).');
    } catch (err) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="login-shell">
      {/* Cold-start wake-up screen */}
      <ServerWakeUp onReady={() => setServerReady(true)} />
      {/* Animated background */}
      <div className="login-bg">
        <div className="login-bg-orb login-bg-orb--1" />
        <div className="login-bg-orb login-bg-orb--2" />
      </div>

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <img
            src="/logo.png"
            alt="Logo Padaria Floresta"
            className="login-logo-img"
          />
          <div>
            <h1 className="login-title">Padaria Floresta</h1>
            <p className="login-subtitle">Nunca foi sorte, sempre foi Deus</p>
          </div>
        </div>

        <div className="login-divider" />

        {showForgot ? (
          <form onSubmit={handleForgotSubmit} className="login-form">
            <h3 style={{ fontSize: '1.15rem', color: 'var(--color-primary)', marginBottom: '0.5rem', fontFamily: 'var(--font-main)', fontWeight: 600 }}>
              ✉️ Recuperar Senha
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-mid)', marginBottom: '1.25rem', lineHeight: '1.4' }}>
              Digite seu e-mail cadastrado e enviaremos um link de recuperação.
            </p>

            <div className="form-group">
              <label htmlFor="forgot-email">E-mail Cadastrado</label>
              <input
                id="forgot-email"
                type="email"
                className="form-control"
                value={forgotEmail}
                onChange={e => { setForgotEmail(e.target.value); setForgotError(''); }}
                placeholder="ex: seu-email@gmail.com"
                required
                autoFocus
              />
            </div>

            {forgotError && (
              <div className="login-error">⚠️ {forgotError}</div>
            )}
            {forgotSuccess && (
              <div style={{
                background: 'rgba(46,204,113,.1)',
                border: '1px solid rgba(46,204,113,.3)',
                borderRadius: 'var(--r-sm)',
                color: '#2ecc71',
                padding: '.6rem .9rem',
                fontSize: '.85rem',
                lineHeight: '1.4',
                marginBottom: '0.5rem'
              }}>
                ✅ {forgotSuccess}
              </div>
            )}

            <button type="submit" className="btn btn-primary login-submit" disabled={forgotLoading || !!forgotSuccess}>
              {forgotLoading ? '⏳ Enviando…' : 'Enviar Link'}
            </button>
            
            <button type="button" onClick={() => { setShowForgot(false); setForgotEmail(''); setForgotSuccess(''); setForgotError(''); }} className="btn btn-secondary login-submit" style={{ marginTop: '0.5rem' }}>
              Voltar para o Login
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="login-username">Usuário</label>
              <input
                id="login-username"
                type="text"
                className="form-control"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                placeholder="ex: admin"
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Senha</label>
              <div className="login-pass-wrap">
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  className="form-control"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button type="button" className="login-pass-toggle" onClick={() => setShowPass(v => !v)}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'right', marginTop: '0.2rem', marginBottom: '0.8rem' }}>
              <button type="button" onClick={() => { setShowForgot(true); setError(''); }} className="login-forgot-link">
                Esqueci minha senha
              </button>
            </div>

            {error && (
              <div className="login-error">⚠️ {error}</div>
            )}

            <button type="submit" className="btn btn-primary login-submit" disabled={loading}>
              {loading ? '⏳ Entrando…' : '→ Entrar'}
            </button>
          </form>
        )}
      </div>

      <style>{`
        .login-shell {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          background: transparent;
          padding: 1rem;
        }
        .login-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }
        .login-bg-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: .25;
          animation: orb-float 8s ease-in-out infinite alternate;
        }
        .login-bg-orb--1 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, #e89e3a, transparent 70%);
          top: -150px; right: -100px;
        }
        .login-bg-orb--2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, #c97d20, transparent 70%);
          bottom: -100px; left: -100px;
          animation-delay: -4s;
        }
        @keyframes orb-float {
          from { transform: scale(1) translate(0, 0); }
          to   { transform: scale(1.1) translate(20px, -20px); }
        }
        .login-card {
          position: relative; z-index: 1;
          background: var(--bg-card);
          border: 1px solid rgba(232,158,58,.25);
          border-radius: var(--r-lg);
          padding: 2.5rem;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 20px 60px rgba(0,0,0,.6), 0 0 0 1px rgba(232,158,58,.1);
          animation: slideUp var(--t-normal);
        }
        .login-logo {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .login-logo-img {
          width: 90px;
          height: 90px;
          object-fit: contain;
          flex-shrink: 0;
          filter: drop-shadow(0 4px 16px rgba(229, 162, 93, 0.5));
          animation: logo-entrance 0.6s var(--t-spring);
        }
        @keyframes logo-entrance {
          from { transform: scale(0.7) rotate(-8deg); opacity: 0; }
          to   { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .login-title {
          font-size: 1.8rem;
          color: var(--color-primary);
          margin: 0;
        }
        .login-subtitle {
          font-size: .85rem;
          color: var(--text-low);
        }
        .login-divider {
          border-top: 1px solid var(--border-mid);
          margin-bottom: 1.75rem;
        }
        .login-form { display: flex; flex-direction: column; gap: .1rem; }
        .login-pass-wrap { position: relative; }
        .login-pass-wrap .form-control { padding-right: 3rem; }
        .login-pass-toggle {
          position: absolute;
          right: .75rem; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          cursor: pointer; font-size: 1.1rem;
          opacity: .7; transition: opacity .15s;
        }
        .login-pass-toggle:hover { opacity: 1; }
        .login-error {
          background: rgba(239,68,68,.1);
          border: 1px solid rgba(239,68,68,.3);
          border-radius: var(--r-sm);
          color: #ef4444;
          padding: .6rem .9rem;
          font-size: .88rem;
        }
        .login-submit {
          width: 100%;
          padding: .85rem;
          font-size: 1rem;
          margin-top: .5rem;
          letter-spacing: .03em;
        }
        .login-forgot-link {
          background: none;
          border: none;
          color: var(--text-low);
          font-family: var(--font-main);
          font-size: 0.82rem;
          cursor: pointer;
          transition: color var(--t-fast);
          padding: 0;
          text-decoration: underline;
        }
        .login-forgot-link:hover {
          color: var(--color-primary);
        }
      `}</style>
    </div>
  );
}
