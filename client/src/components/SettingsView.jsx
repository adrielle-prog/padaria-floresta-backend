import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;

export default function SettingsView() {
  const { user, authFetch, updateCurrentUser } = useAuth();
  
  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setUsername(user.username || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!name.trim() || !username.trim()) {
      return setProfileError('Nome e usuário são obrigatórios.');
    }

    setProfileLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/api/auth/update-profile`, {
        method: 'PUT',
        body: JSON.stringify({ name: name.trim(), username: username.trim(), email: email.trim() || null })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao atualizar dados cadastrais.');
      }
      
      // Update local context
      updateCurrentUser({ name: name.trim(), username: username.trim(), email: email.trim() });
      setProfileSuccess('Dados cadastrais atualizados com sucesso!');
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      return setPassError('Todos os campos de senha são obrigatórios.');
    }
    if (newPassword !== confirmPassword) {
      return setPassError('A nova senha e a confirmação não coincidem.');
    }
    if (newPassword.length < 6) {
      return setPassError('A nova senha deve conter pelo menos 6 caracteres.');
    }

    setPassLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/api/auth/change-password`, {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao alterar a senha.');
      }

      setPassSuccess('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPassError(err.message);
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="settings-container">
      {/* Dados do Perfil */}
      <div className="settings-card">
        <h3 className="settings-card-title">👤 Minha Conta</h3>
        <p className="settings-card-sub">Atualize suas informações de login e contato.</p>
        
        <form onSubmit={handleUpdateProfile} className="settings-form">
          <div className="form-group">
            <label htmlFor="settings-name">Nome Completo</label>
            <input
              id="settings-name"
              type="text"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Adrielle Silva"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="settings-grid-2">
            <div className="form-group">
              <label htmlFor="settings-username">Usuário (login)</label>
              <input
                id="settings-username"
                type="text"
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="Ex: adrielle"
              />
            </div>
            <div className="form-group">
              <label>Perfil de Acesso</label>
              <input
                type="text"
                className="form-control"
                value={user?.role === 'gerente' ? '👑 Gerente' : user?.role === 'caixa' ? '🛒 Caixa' : '📦 Estoque'}
                disabled
                style={{ opacity: 0.7, cursor: 'not-allowed', background: 'var(--bg-input)' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="settings-email">E-mail para Recuperação</label>
            <input
              id="settings-email"
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ex: seu-email@gmail.com"
            />
            <small style={{ color: 'var(--text-low)', fontSize: '0.78rem', marginTop: '0.2rem', display: 'block' }}>
              Este e-mail será usado caso você precise redefinir sua senha ("Esqueci minha senha").
            </small>
          </div>

          {profileError && (
            <div className="settings-alert settings-alert--error">⚠️ {profileError}</div>
          )}
          {profileSuccess && (
            <div className="settings-alert settings-alert--success">✅ {profileSuccess}</div>
          )}

          <button type="submit" className="btn btn-primary settings-submit" disabled={profileLoading}>
            {profileLoading ? '⏳ Salvando...' : 'Salvar Alterações'}
          </button>
        </form>
      </div>

      {/* Alterar Senha */}
      <div className="settings-card">
        <h3 className="settings-card-title">🔑 Alterar Senha</h3>
        <p className="settings-card-sub">Para sua segurança, use uma senha forte com pelo menos 6 caracteres.</p>

        <form onSubmit={handleChangePassword} className="settings-form">
          <div className="form-group">
            <label htmlFor="settings-curr-pass">Senha Atual</label>
            <input
              id="settings-curr-pass"
              type="password"
              className="form-control"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="settings-grid-2">
            <div className="form-group">
              <label htmlFor="settings-new-pass">Nova Senha</label>
              <input
                id="settings-new-pass"
                type="password"
                className="form-control"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="mín. 6 caracteres"
                autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <label htmlFor="settings-conf-pass">Confirmar Nova Senha</label>
              <input
                id="settings-conf-pass"
                type="password"
                className="form-control"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="repita a senha"
                autoComplete="new-password"
              />
            </div>
          </div>

          {passError && (
            <div className="settings-alert settings-alert--error">⚠️ {passError}</div>
          )}
          {passSuccess && (
            <div className="settings-alert settings-alert--success">✅ {passSuccess}</div>
          )}

          <button type="submit" className="btn btn-primary settings-submit" disabled={passLoading}>
            {passLoading ? '⏳ Alterando...' : 'Alterar Senha'}
          </button>
        </form>
      </div>

      <style>{`
        .settings-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          max-width: 600px;
          margin: 0 auto;
          padding: 0.5rem 0 2rem 0;
          animation: slideUp var(--t-normal);
        }
        .settings-card {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--r-md);
          padding: 1.75rem;
          box-shadow: var(--shadow-md);
          transition: border-color var(--t-fast);
        }
        .settings-card:hover {
          border-color: rgba(232, 158, 58, 0.25);
        }
        .settings-card-title {
          font-size: 1.25rem;
          color: var(--color-primary);
          margin-bottom: 0.25rem;
        }
        .settings-card-sub {
          font-size: 0.85rem;
          color: var(--text-low);
          margin-bottom: 1.5rem;
        }
        .settings-form {
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
        }
        .settings-submit {
          align-self: flex-start;
          padding: 0.65rem 1.5rem;
          font-size: 0.92rem;
        }
        .settings-alert {
          border-radius: var(--r-sm);
          padding: 0.6rem 0.9rem;
          font-size: 0.88rem;
          line-height: 1.4;
        }
        .settings-alert--error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }
        .settings-alert--success {
          background: rgba(46, 204, 113, 0.1);
          border: 1px solid rgba(46, 204, 113, 0.3);
          color: #2ecc71;
        }
        
        @media (max-width: 576px) {
          .settings-grid-2 {
            grid-template-columns: 1fr !important;
            gap: 1.2rem !important;
          }
          .settings-submit {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
