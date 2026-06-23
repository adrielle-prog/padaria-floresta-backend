import React from 'react';

export default function HistoryList({ sales }) {
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="card">
      <h3 style={{ color: 'var(--color-secondary)', marginBottom: '1.5rem' }}>Histórico de Vendas</h3>

      <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {sales.length === 0 ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Nenhuma venda registrada ainda.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Produto</th>
                <th style={{ textAlign: 'right' }}>Qtd</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {sales.map(sale => (
                <tr key={sale.id}>
                  <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {formatDate(sale.sale_date)}
                  </td>
                  <td style={{ fontWeight: '500' }}>
                    {sale.product_name}
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 'normal' }}>
                      {sale.product_category}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>{sale.quantity_sold} un</td>
                  <td style={{ textAlign: 'right', fontWeight: '600', color: 'var(--color-success)' }}>
                    {sale.total_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
