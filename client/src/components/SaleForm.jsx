import React, { useState } from 'react';

export default function SaleForm({ product, onSellSubmit, onClose }) {
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');

  if (!product) return null;

  const totalPrice = product.price * quantity;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const qtyNum = Number(quantity);

    if (qtyNum <= 0) {
      setError('A quantidade vendida deve ser no mínimo 1.');
      return;
    }

    if (qtyNum > product.stock_quantity) {
      setError(`Estoque insuficiente! Temos apenas ${product.stock_quantity} unidades disponíveis.`);
      return;
    }

    onSellSubmit(product.id, qtyNum);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 style={{ color: 'var(--color-primary)' }}>Registrar Venda</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ color: 'var(--color-text-main)', marginBottom: '0.25rem' }}>{product.name}</h4>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Estoque atual: {product.stock_quantity} un | Preço unitário: {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>

          {error && (
            <div style={{ 
              backgroundColor: 'rgba(231, 76, 60, 0.15)', 
              color: 'var(--color-danger)', 
              padding: '0.75rem', 
              borderRadius: 'var(--border-radius-sm)', 
              marginBottom: '1rem',
              border: '1px solid rgba(231, 76, 60, 0.3)',
              fontSize: '0.9rem'
            }}>
              ⚠️ {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="sale-quantity">Quantidade Vendida</label>
            <input
              type="number"
              id="sale-quantity"
              className="form-control"
              min="1"
              max={product.stock_quantity}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
              required
            />
          </div>

          <div className="card" style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Total a pagar:</span>
            <span style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-primary)' }}>
              {totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Confirmar Venda
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
