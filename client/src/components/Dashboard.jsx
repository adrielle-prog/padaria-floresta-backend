import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';


export default function Dashboard({ products, sales }) {
  const { authFetch } = useAuth();
  const [networkInfo, setNetworkInfo] = useState({ ip: 'localhost', port: 5000 });

  // Detect if running on production cloud (Vercel)
  const isProduction = window.location.hostname !== 'localhost' && 
                       window.location.hostname !== '127.0.0.1' && 
                       !window.location.hostname.match(/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/);

  useEffect(() => {
    if (isProduction) return;
    const API_BASE = `http://${window.location.hostname}:5000`;
    authFetch(`${API_BASE}/api/network-ip`)
      .then(res => res.json())
      .then(data => setNetworkInfo(data))
      .catch(err => console.error('Error fetching network IP:', err));
  }, [isProduction]);

  const totalProducts = products.length;
  
  // Calculate sales today
  const todayStr = new Date().toISOString().split('T')[0];
  const salesToday = sales.filter(sale => sale.sale_date.startsWith(todayStr));
  const revenueToday = salesToday.reduce((sum, sale) => sum + sale.total_price, 0);

  // Low stock products (stock < 10)
  const lowStockProducts = products.filter(p => p.stock_quantity < 10);
  const lowStockCount = lowStockProducts.length;

  const clientUrl = isProduction ? window.location.origin : `http://${networkInfo.ip}:5173`;
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
        <h3 style={{ color: 'var(--color-secondary)', marginBottom: '1rem' }}>
          {isProduction ? 'Acesso Mobile Rápido' : 'Conexão Mobile Local'}
        </h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginBottom: '1rem' }}>
          {isProduction 
            ? 'Aponte a câmera do seu celular para o QR Code abaixo para acessar o sistema na nuvem e cadastrar produtos diretamente pelo celular:'
            : 'Para cadastrar produtos localmente pelo celular, certifique-se de estar na mesma rede Wi-Fi do computador e escaneie o QR Code abaixo:'}
        </p>
        <div className="sync-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="qr-code-placeholder" style={{ background: '#fff', padding: '0.5rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isProduction || networkInfo.ip !== 'localhost' ? (
              <img src={qrUrl} alt="QR Code para acesso mobile" style={{ width: '150px', height: '150px' }} />
            ) : (
              <span style={{ color: '#120f0d', fontSize: '0.8rem', textAlign: 'center' }}>Carregando IP...</span>
            )}
          </div>
          <p style={{ fontWeight: '600', color: 'var(--color-primary)', marginTop: '0.5rem', wordBreak: 'break-all', textAlign: 'center' }}>
            <a href={clientUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
              {clientUrl}
            </a>
          </p>
          {!isProduction && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem', textAlign: 'center', maxWidth: '400px' }}>
              <strong>Dica de conexão local:</strong> Se a página carregar infinitamente no celular, verifique se ambos os aparelhos estão no mesmo Wi-Fi e se o Firewall do computador não está bloqueando a porta 5173.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
