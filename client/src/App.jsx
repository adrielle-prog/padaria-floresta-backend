import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import ProductList from './components/ProductList';
import ProductForm from './components/ProductForm';
import SaleForm from './components/SaleForm';
import HistoryList from './components/HistoryList';
import CashierView from './components/CashierView';
import LowStockPanel from './components/LowStockPanel';
import UserManager from './components/UserManager';
import ReportsView from './components/ReportsView';
import LoginPage from './pages/LoginPage';
import { AuthProvider, useAuth } from './context/AuthContext';

// Tab identifiers
const TABS = {
  SALES: 'vendas',
  STOCK: 'estoque',
  DASHBOARD: 'dashboard',
  REPORTS: 'relatorios',
  USERS: 'usuarios',
};

function AppContent() {
  const { user, logout, authFetch, isGerente, isCaixa, isEstoque } = useAuth();
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  // Navigation
  const [activeTab, setActiveTab] = useState(TABS.SALES);

  // Modals
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedSaleProduct, setSelectedSaleProduct] = useState(null);

  // Usa variável de ambiente para produção (Vercel/Render) ou localhost para desenvolvimento
  const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Set default active tab based on role when user changes
  useEffect(() => {
    if (user) {
      if (user.role === 'caixa') {
        setActiveTab(TABS.SALES);
      } else if (user.role === 'estoque') {
        setActiveTab(TABS.STOCK);
      } else {
        setActiveTab(TABS.SALES);
      }
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [prodRes, salesRes] = await Promise.all([
        authFetch(`${API_BASE}/api/products`),
        authFetch(`${API_BASE}/api/sales`),
      ]);
      if (!prodRes.ok) throw new Error('Falha ao buscar produtos.');
      if (!salesRes.ok) throw new Error('Falha ao buscar histórico.');
      setProducts(await prodRes.json());
      setSales(await salesRes.json());
    } catch (err) {
      setError('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]); // reload data when user logs in or out

  const handleSaveProduct = async (productData) => {
    const isEdit = !!productData.id;
    const url = isEdit
      ? `${API_BASE}/api/products/${productData.id}`
      : `${API_BASE}/api/products`;

    try {
      const res = await authFetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar.');
      showToast('success', isEdit ? 'Produto atualizado!' : 'Produto cadastrado!');
      setShowProductForm(false);
      setEditingProduct(null);
      loadData();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleSellSubmit = async (productId, quantitySold) => {
    try {
      const res = await authFetch(`${API_BASE}/api/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, quantity_sold: quantitySold }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao registrar venda.');
      showToast('success', 'Venda realizada com sucesso!');
      setSelectedSaleProduct(null);
      loadData();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const openEdit = (prod) => {
    setEditingProduct(prod);
    setShowProductForm(true);
  };

  const openAddNew = () => {
    setEditingProduct(null);
    setShowProductForm(true);
  };

  const openSell = (prod) => {
    setSelectedSaleProduct(prod);
  };

  // If not logged in, render the login page
  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="app-layout">
      {/* ── Toast ── */}
      {toast && (
        <div className={`alert-banner alert-${toast.type}`}>
          <span>{toast.type === 'success' ? '✅' : '❌'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── Sidebar (Visible on Desktop) ── */}
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <img
            src="/logo.png"
            alt="Logo Padaria Floresta"
            className="sidebar-brand-logo"
          />
          <div className="sidebar-brand-text">
            <h1>Padaria Floresta</h1>
            <p>Nunca foi sorte, sempre foi Deus</p>
          </div>
        </div>

        {/* Navigation Links in Sidebar */}
        <nav className="sidebar-nav" aria-label="Navegação lateral">
          {isCaixa && (
            <button
              id="sidebar-tab-vendas"
              className={`sidebar-nav-btn ${activeTab === TABS.SALES ? 'sidebar-nav-btn--active' : ''}`}
              onClick={() => setActiveTab(TABS.SALES)}
            >
              <span className="sidebar-nav-icon">🛒</span> <span>Vendas</span>
            </button>
          )}
          {isEstoque && (
            <button
              id="sidebar-tab-estoque"
              className={`sidebar-nav-btn ${activeTab === TABS.STOCK ? 'sidebar-nav-btn--active' : ''}`}
              onClick={() => setActiveTab(TABS.STOCK)}
            >
              <span className="sidebar-nav-icon">📦</span> <span>Estoque</span>
            </button>
          )}
          {isEstoque && (
            <button
              id="sidebar-tab-dashboard"
              className={`sidebar-nav-btn ${activeTab === TABS.DASHBOARD ? 'sidebar-nav-btn--active' : ''}`}
              onClick={() => setActiveTab(TABS.DASHBOARD)}
            >
              <span className="sidebar-nav-icon">📊</span> <span>Painel</span>
            </button>
          )}
          {isEstoque && (
            <button
              id="sidebar-tab-relatorios"
              className={`sidebar-nav-btn ${activeTab === TABS.REPORTS ? 'sidebar-nav-btn--active' : ''}`}
              onClick={() => setActiveTab(TABS.REPORTS)}
            >
              <span className="sidebar-nav-icon">📈</span> <span>Relatórios</span>
            </button>
          )}
          {isGerente && (
            <button
              id="sidebar-tab-usuarios"
              className={`sidebar-nav-btn ${activeTab === TABS.USERS ? 'sidebar-nav-btn--active' : ''}`}
              onClick={() => setActiveTab(TABS.USERS)}
            >
              <span className="sidebar-nav-icon">👥</span> <span>Usuários</span>
            </button>
          )}
        </nav>

        {/* Sidebar Footer & profile */}
        <div className="sidebar-footer">
          <div className="sidebar-profile">
            👤 
            <div>
              <div className="sidebar-profile-name">{user.name}</div>
              <div className="sidebar-profile-role">{user.role === 'gerente' ? 'Gerente' : user.role === 'caixa' ? 'Caixa' : 'Estoque'}</div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm sidebar-logout-btn" onClick={logout}>
            🚪 <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* ── Main Container ── */}
      <div className="app-container">
        {/* ── Top Header (Visible on Mobile Only) ── */}
        <header className="app-header">
          <div className="logo-section">
            <img
              src="/logo.png"
              alt="Logo Padaria Floresta"
              className="logo-img"
            />
            <div className="logo-text">
              <h1>Padaria Floresta</h1>
              <p>Nunca foi sorte, sempre foi Deus</p>
            </div>
          </div>

          {/* Mobile Tab Navigation */}
          <nav className="tab-nav" aria-label="Navegação principal">
            {isCaixa && (
              <button
                id="tab-vendas"
                className={`tab-btn ${activeTab === TABS.SALES ? 'tab-btn--active' : ''}`}
                onClick={() => setActiveTab(TABS.SALES)}
                aria-selected={activeTab === TABS.SALES}
              >
                🛒 <span>Vendas</span>
              </button>
            )}
            {isEstoque && (
              <button
                id="tab-estoque"
                className={`tab-btn ${activeTab === TABS.STOCK ? 'tab-btn--active' : ''}`}
                onClick={() => setActiveTab(TABS.STOCK)}
                aria-selected={activeTab === TABS.STOCK}
              >
                📦 <span>Estoque</span>
              </button>
            )}
            {isEstoque && (
              <button
                id="tab-dashboard"
                className={`tab-btn ${activeTab === TABS.DASHBOARD ? 'tab-btn--active' : ''}`}
                onClick={() => setActiveTab(TABS.DASHBOARD)}
                aria-selected={activeTab === TABS.DASHBOARD}
              >
                📊 <span>Painel</span>
              </button>
            )}
            {isEstoque && (
              <button
                id="tab-relatorios"
                className={`tab-btn ${activeTab === TABS.REPORTS ? 'tab-btn--active' : ''}`}
                onClick={() => setActiveTab(TABS.REPORTS)}
                aria-selected={activeTab === TABS.REPORTS}
              >
                📈 <span>Relatórios</span>
              </button>
            )}
            {isGerente && (
              <button
                id="tab-usuarios"
                className={`tab-btn ${activeTab === TABS.USERS ? 'tab-btn--active' : ''}`}
                onClick={() => setActiveTab(TABS.USERS)}
                aria-selected={activeTab === TABS.USERS}
              >
                👥 <span>Usuários</span>
              </button>
            )}
          </nav>

          {/* Mobile Profile & Logout */}
          <div className="header-profile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="user-info" style={{ display: 'none' }}>👤</span>
            <button className="btn btn-secondary btn-sm" onClick={logout}>
              🚪
            </button>
          </div>
        </header>

        {/* ── Main Content Area ── */}
        <main className="app-main">
          {/* Error state */}
          {error && (
            <div className="error-card">
              <h3>⚠️ Erro de Conexão</h3>
              <p>{error}</p>
              <button className="btn btn-primary" onClick={() => { setError(''); loadData(); }}>
                Tentar Novamente
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && products.length === 0 && !error && (
            <div className="loading-center">
              <div className="spinner" />
              <p>Carregando dados do estoque...</p>
            </div>
          )}

          {!error && (!loading || products.length > 0) && (
            <>
              {/* ABA 1 — VENDAS */}
              {activeTab === TABS.SALES && isCaixa && (
                <div className="tab-panel">
                  <div className="tab-panel__header">
                    <h2 className="tab-panel__title">🛒 Caixa — PDV</h2>
                    <p className="tab-panel__sub">
                      Leia o código de barras ou busque pelo nome, monte o carrinho e finalize o pagamento.
                    </p>
                  </div>
                  <CashierView onSaleComplete={loadData} />
                </div>
              )}

              {/* ABA 2 — ESTOQUE / CADASTRO */}
              {activeTab === TABS.STOCK && isEstoque && (
                <div className="tab-panel">
                  <div className="tab-panel__header">
                    <div>
                      <h2 className="tab-panel__title">📦 Gestão de Estoque</h2>
                      <p className="tab-panel__sub">Cadastre, edite e consulte os produtos da padaria.</p>
                    </div>
                    {isGerente && (
                      <button id="btn-novo-produto" className="btn btn-primary" onClick={openAddNew}>
                        ➕ Novo Produto
                      </button>
                    )}
                  </div>

                  {/* Low stock alert panel */}
                  <LowStockPanel products={products} onRestock={loadData} />

                  <ProductList
                    products={products}
                    onEdit={isGerente ? openEdit : null}
                    onSell={isCaixa ? (p) => { openSell(p); setActiveTab(TABS.SALES); } : null}
                  />
                </div>
              )}

              {/* ABA 3 — DASHBOARD / PAINEL */}
              {activeTab === TABS.DASHBOARD && isEstoque && (
                <div className="tab-panel">
                  <div className="tab-panel__header">
                    <h2 className="tab-panel__title">📊 Painel Geral</h2>
                    <p className="tab-panel__sub">Resumo do dia e acesso por QR Code para o celular.</p>
                  </div>
                  <Dashboard products={products} sales={sales} />
                </div>
              )}

              {/* ABA 4 — RELATÓRIOS */}
              {activeTab === TABS.REPORTS && isEstoque && (
                <div className="tab-panel">
                  <div className="tab-panel__header">
                    <h2 className="tab-panel__title">📈 Relatórios de Vendas</h2>
                    <p className="tab-panel__sub">Monitore faturamento, produtos e categorias em tempo real.</p>
                  </div>
                  <ReportsView />
                </div>
              )}

              {/* ABA 5 — USUÁRIOS */}
              {activeTab === TABS.USERS && isGerente && (
                <div className="tab-panel">
                  <div className="tab-panel__header">
                    <h2 className="tab-panel__title">👥 Usuários do Sistema</h2>
                    <p className="tab-panel__sub">Gerencie credenciais de acesso, perfis e permissões.</p>
                  </div>
                  <UserManager />
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ── Modals ── */}
      {showProductForm && isGerente && (
        <ProductForm
          product={editingProduct}
          onSave={handleSaveProduct}
          onClose={() => { setShowProductForm(false); setEditingProduct(null); }}
        />
      )}

      {selectedSaleProduct && isCaixa && (
        <SaleForm
          product={selectedSaleProduct}
          onSellSubmit={handleSellSubmit}
          onClose={() => setSelectedSaleProduct(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
