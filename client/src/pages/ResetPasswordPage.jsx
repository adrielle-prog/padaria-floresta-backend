import React, { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;

export default function ResetPasswordPage({ token }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      return setError('Preencha todos os campos.');
    }
    if (newPassword !== confirmPassword) {
      return setError('As senhas não coincidem.');
    }
    if (newPassword.length < 6) {
      return setError('A senha deve ter pelo menos 6 caracteres.');
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao redefinir a senha.');
      }
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = () => {
    // Redireciona limpando o token da URL
    window.history.replaceState({}, document.title, '/');
    window.location.reload();
  };

  return (
    <div className="login-shell">
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

        {success ? (
          <div className="reset-success-container">
            <div className="reset-success-icon">✅</div>
            <h3 className="reset-success-title">Senha Redefinida!</h3>
            <p className="reset-success-text">Sua senha foi atualizada com sucesso. Você já pode entrar na sua conta.</p>
            <button onClick={handleGoToLogin} className="btn btn-primary login-submit" style={{ marginTop: '1rem' }}>
              Voltar para o Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            <h3 style={{ fontSize: '1.15rem', color: 'var(--color-primary)', marginBottom: '1rem', fontFamily: 'var(--font-main)', fontWeight: 600 }}>
              🔑 Nova Senha
            </h3>
            
            <div className="form-group">
              <label htmlFor="reset-new-password">Nova Senha</label>
              <input
                id="reset-new-password"
                type="password"
                className="form-control"
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setError(''); }}
                placeholder="Mínimo 6 caracteres"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="reset-confirm-password">Confirmar Nova Senha</label>
              <input
                id="reset-confirm-password"
                type="password"
                className="form-control"
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                placeholder="Repita a nova senha"
              />
            </div>

            {error && (
              <div className="login-error">⚠️ {error}</div>
            )}

            <button type="submit" className="btn btn-primary login-submit" disabled={loading}>
              {loading ? '⏳ Redefinindo…' : 'Redefinir Senha'}
            </button>
            
            <button type="button" onClick={handleGoToLogin} className="btn btn-secondary login-submit" style={{ marginTop: '0.5rem' }}>
              Cancelar
            </button>
          </form>
        )}
      </div>

      <style>{`
        .reset-success-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          animation: fadeIn 0.4s var(--t-normal);
        }
        .reset-success-icon {
          font-size: 3rem;
          margin-bottom: 0.5rem;
        }
        .reset-success-title {
          font-size: 1.3rem;
          color: var(--color-primary);
          margin-bottom: 0.5rem;
          font-family: var(--font-main);
          font-weight: 700;
        }
        .reset-success-text {
          font-size: 0.9rem;
          color: var(--text-mid);
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}
