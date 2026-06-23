import React, { useState } from 'react';

export default function ProductList({ products, onEdit, onSell }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Extract unique categories for filter
  const categories = [...new Set(products.map(p => p.category))];

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === '' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getBadgeClass = (category) => {
    const cat = category.toLowerCase();
    if (cat.includes('pão') || cat.includes('pao')) return 'badge-bread';
    if (cat.includes('bolo')) return 'badge-cake';
    if (cat.includes('broa')) return 'badge-cake';
    if (cat.includes('doce') || cat.includes('sobremesa')) return 'badge-sweet';
    if (cat.includes('salgado')) return 'badge-savory';
    if (cat.includes('bebida')) return 'badge-drink';
    if (cat.includes('frio') || cat.includes('laticínio') || cat.includes('laticinio')) return 'badge-dairy';
    if (cat.includes('cafe')) return 'badge-cafe';
    return 'badge-default';
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 style={{ color: 'var(--color-secondary)' }}>Estoque de Produtos</h3>
        
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Buscar produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: '200px', padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
          />
          <select
            className="form-control"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ maxWidth: '150px', padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
          >
            <option value="">Todas Categorias</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="table-container">
        {filteredProducts.length === 0 ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Nenhum produto encontrado.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Categoria</th>
                <th style={{ textAlign: 'right' }}>Preço</th>
                <th style={{ textAlign: 'right' }}>Estoque</th>
                <th style={{ textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: '500' }}>{p.name}</td>
                  <td>
                    <span className={`badge ${getBadgeClass(p.category)}`}>
                      {p.category}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: '600', color: p.stock_quantity < 10 ? 'var(--color-danger)' : 'var(--color-text-main)' }}>
                    {p.stock_quantity} un
                  </td>
                  <td style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => onSell(p)}
                      disabled={p.stock_quantity <= 0}
                      style={{ opacity: p.stock_quantity <= 0 ? 0.5 : 1 }}
                    >
                      🛒 Vender
                    </button>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => onEdit(p)}
                    >
                      ✏️ Editar
                    </button>
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
