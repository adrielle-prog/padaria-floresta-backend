import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const ROLES = [
  { value: 'gerente', label: '👑 Gerente',            desc: 'Acesso total' },
  { value: 'caixa',   label: '🛒 Caixa',              desc: 'PDV apenas' },
  { value: 'estoque', label: '📦 Operador de Estoque', desc: 'Estoque + Relatórios' },
];

const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;

const EMPTY_FORM = { name: '', username: '', password: '', confirmPassword: '', role: 'caixa' };

export default function UserManager() {
  const { authFetch, user: me } = useAuth();
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(false);
  const [toast, setToast]         = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState(null); // null = create, object = edit
  const [form, setForm]           = useState(EMPTY_FORM);
  const [formErr, setFormErr]     = useState('');

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/api/users`);
      setUsers(await res.json());
    } catch { showToast('error', 'Erro ao carregar usuários.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadUsers(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErr('');
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({ name: u.name, username: u.username, password: '', confirmPassword: '', role: u.role });
    setFormErr('');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormErr('');
    if (!form.name.trim() || !form.username.trim()) return setFormErr('Nome e usuário são obrigatórios.');
    if (!editing && !form.password) return setFormErr('Senha obrigatória para novo usuário.');
    if (form.password && form.password !== form.confirmPassword) return setFormErr('Senhas não coincidem.');
    if (form.password && form.password.length < 6) return setFormErr('Senha deve ter ao menos 6 caracteres.');

    const url    = editing ? `${API_BASE}/api/users/${editing.id}` : `${API_BASE}/api/users`;
    const method = editing ? 'PUT' : 'POST';
    const body   = { name: form.name.trim(), username: form.username.trim(), role: form.role };
    if (form.password) body.password = form.password;

    try {
      const res = await authFetch(url, { method, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) return setFormErr(data.error);
      showToast('success', editing ? 'Usuário atualizado!' : 'Usuário criado!');
      setShowModal(false);
      loadUsers();
    } catch { setFormErr('Erro ao salvar usuário.'); }
  };

  const handleToggle = async (u) => {
    try {
      await authFetch(`${API_BASE}/api/users/${u.id}/toggle`, { method: 'PUT' });
      showToast('success', u.is_active ? 'Usuário desativado.' : 'Usuário ativado.');
      loadUsers();
    } catch { showToast('error', 'Erro ao alterar status.'); }
  };

  const setF = (k, v) => { setForm(p => ({ ...p, [k]: v })); setFormErr(''); };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`alert-banner alert-${toast.type}`} style={{ position: 'fixed', top: '1.25rem', right: '1.25rem', zIndex: 2000 }}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="tab-panel__header">
        <div>
          <h2 className="tab-panel__title">👥 Usuários</h2>
          <p className="tab-panel__sub">Gerencie o acesso da equipe ao sistema.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>➕ Novo Usuário</button>
      </div>

      {/* Users table */}
      {loading ? (
        <div className="loading-center"><div className="spinner" /><p>Carregando…</p></div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Usuário</th>
                <th>Perfil</th>
                <th>Status</th>
                <th>Criado em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const role = ROLES.find(r => r.value === u.role);
                const isMe = u.id === me?.id;
                return (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>
                      {u.name} {isMe && <span style={{ fontSize: '.72rem', color: 'var(--color-primary)' }}>(você)</span>}
                    </td>
                    <td style={{ color: 'var(--text-mid)', fontFamily: 'monospace' }}>{u.username}</td>
                    <td>
                      <span className="badge badge-default">{role?.label || u.role}</span>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-block', padding: '.18rem .55rem', borderRadius: 50,
                        fontSize: '.72rem', fontWeight: 700,
                        background: u.is_active ? 'rgba(46,204,113,.15)' : 'rgba(239,68,68,.12)',
                        color: u.is_active ? '#2ecc71' : '#ef4444',
                        border: `1px solid ${u.is_active ? 'rgba(46,204,113,.3)' : 'rgba(239,68,68,.25)'}`,
                      }}>
                        {u.is_active ? '● Ativo' : '○ Inativo'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-low)', fontSize: '.85rem' }}>
                      {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '.4rem' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)}>✏️</button>
                        {!isMe && (
                          <button
                            className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-secondary'}`}
                            onClick={() => handleToggle(u)}
                          >
                            {u.is_active ? 'Desativar' : 'Ativar'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3 style={{ color: 'var(--color-primary)' }}>
                {editing ? '✏️ Editar Usuário' : '➕ Novo Usuário'}
              </h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label htmlFor="u-name">Nome completo</label>
                <input id="u-name" type="text" className="form-control"
                  value={form.name} onChange={e => setF('name', e.target.value)}
                  placeholder="Ex: João da Silva" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="u-username">Usuário (login)</label>
                  <input id="u-username" type="text" className="form-control"
                    value={form.username} onChange={e => setF('username', e.target.value.toLowerCase())}
                    placeholder="ex: joao" autoComplete="off" />
                </div>
                <div className="form-group">
                  <label htmlFor="u-role">Perfil de Acesso</label>
                  <select id="u-role" className="form-control"
                    value={form.role} onChange={e => setF('role', e.target.value)}>
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="u-pass">
                    Senha {editing && <span style={{ fontWeight: 400, color: 'var(--text-low)', textTransform: 'none' }}>(deixe em branco para manter)</span>}
                  </label>
                  <input id="u-pass" type="password" className="form-control"
                    value={form.password} onChange={e => setF('password', e.target.value)}
                    placeholder={editing ? '(sem alteração)' : 'mín. 6 caracteres'} autoComplete="new-password" />
                </div>
                <div className="form-group">
                  <label htmlFor="u-confirm">Confirmar Senha</label>
                  <input id="u-confirm" type="password" className="form-control"
                    value={form.confirmPassword} onChange={e => setF('confirmPassword', e.target.value)}
                    placeholder="repita a senha" autoComplete="new-password" />
                </div>
              </div>

              {/* Role preview */}
              <div style={{ background: 'rgba(0,0,0,.2)', borderRadius: 8, padding: '.7rem 1rem', marginBottom: '.5rem', fontSize: '.82rem', color: 'var(--text-mid)' }}>
                {form.role === 'gerente' && '👑 Acesso a tudo: PDV, Estoque, Relatórios, Usuários'}
                {form.role === 'caixa'   && '🛒 Acesso restrito: apenas aba de Vendas (PDV)'}
                {form.role === 'estoque' && '📦 Acesso a: Estoque, Reposição e Relatórios'}
              </div>

              {formErr && (
                <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 6, color: '#ef4444', padding: '.55rem .8rem', fontSize: '.85rem', marginBottom: '.5rem' }}>
                  ⚠️ {formErr}
                </div>
              )}

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">
                  {editing ? 'Salvar Alterações' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
