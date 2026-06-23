import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';


export default function Dashboard({ products, sales }) {
  const { authFetch } = useAuth();
  const [networkInfo, setNetworkInfo] = useState({ ip: 'localhost', port: 5000 });

  useEffect(() => {
    const API_BASE = `http://${window.location.hostname}:5000`;
    authFetch(`${API_BASE}/api/network-ip`)
      .then(res => res.json())
      .then(data => setNetworkInfo(data))
      .catch(err => console.error('Error fetching network IP:', err));
  }, []);

  const totalProducts = products.length;
  
  // Calculate sales today
  const todayStr = new Date().toISOString().split('T')[0];
  const salesToday = sales.filter(sale => sale.sale_date.startsWith(todayStr));
  const revenueToday = salesToday.reduce((sum, sale) => sum + sale.total_price, 0);

  // Low stock products (stock < 10)
  const lowStockProducts = products.filter(p => p.stock_quantity < 10);
  const lowStockCount = lowStockProducts.length;

  const clientUrl = `http://${networkInfo.ip}:5173`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(clientUrl)}`;

  return (
    <div>
      <div className="dashboard-grid">
        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-label">Total de Produtos</span>
            <div className="stat-value">{totalProducts}</div>
          </div>
          <span className="stat-icon">📦</span>
        </div>

        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-label">Vendas Hoje</span>
            <div className="stat-value">
              {revenueToday.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </div>
          <span className="stat-icon">💰</span>
        </div>

        <div className="card stat-card alert">
          <div className="stat-info">
            <span className="stat-label">Estoque Baixo (&lt; 10)</span>
            <div className="stat-value" style={{ color: lowStockCount > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
              {lowStockCount}
            </div>
          </div>
          <span className="stat-icon">⚠️</span>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ color: 'var(--color-secondary)', marginBottom: '1rem' }}>Conexão Mobile (Sincronização)</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginBottom: '1rem' }}>
          Para cadastrar produtos ou gerenciar o estoque pelo celular, conecte o aparelho na mesma rede Wi-Fi e aponte a câmera para o QR Code abaixo:
        </p>
        <div className="sync-panel">
          <div className="qr-code-placeholder">
            {networkInfo.ip !== 'localhost' ? (
              <img src={qrUrl} alt="QR Code para acesso mobile" />
            ) : (
              <span style={{ color: '#120f0d', fontSize: '0.8rem', textAlign: 'center' }}>Carregando IP...</span>
            )}
          </div>
          <p style={{ fontWeight: '600', color: 'var(--color-primary)', marginTop: '0.5rem' }}>
            {clientUrl}
          </p>
        </div>
      </div>
    </div>
  );
}
