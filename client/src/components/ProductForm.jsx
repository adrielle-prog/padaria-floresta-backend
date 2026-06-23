import React, { useState, useEffect, useRef } from 'react';

// Default categories always available
const DEFAULT_CATEGORIES = [
  'Pães', 'Bolos', 'Broas', 'Doces',
  'Salgados', 'Bebidas', 'Frios/Laticínios', 'Cafeteria', 'Outros'
];

// Load custom categories from localStorage
function loadCustomCategories() {
  try {
    const stored = localStorage.getItem('bakery_custom_categories');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save custom categories to localStorage
function saveCustomCategories(categories) {
  localStorage.setItem('bakery_custom_categories', JSON.stringify(categories));
}

export default function ProductForm({ product, onSave, onClose }) {
  const [name, setName] = useState('');
  const [stockQuantity, setStockQuantity] = useState(0);
  const [price, setPrice] = useState(0);
  const [category, setCategory] = useState('Pães');
  const [barcode, setBarcode] = useState('');
  const [minStock, setMinStock] = useState(10);
  const [error, setError] = useState('');

  // Custom category state
  const [customCategories, setCustomCategories] = useState(loadCustomCategories);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const newCategoryInputRef = useRef(null);

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];

  useEffect(() => {
    if (product) {
      setName(product.name);
      setStockQuantity(product.stock_quantity);
      setPrice(product.price);
      setCategory(product.category);
      setBarcode(product.barcode || '');
      setMinStock(product.min_stock ?? 10);
    } else {
      setName('');
      setStockQuantity(0);
      setPrice(0);
      setCategory('Pães');
      setBarcode('');
      setMinStock(10);
    }
    setError('');
    setShowNewCategoryInput(false);
    setNewCategoryName('');
    setCategoryError('');
  }, [product]);

  // Focus new category input when it appears
  useEffect(() => {
    if (showNewCategoryInput && newCategoryInputRef.current) {
      newCategoryInputRef.current.focus();
    }
  }, [showNewCategoryInput]);

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    if (value === '__new__') {
      setShowNewCategoryInput(true);
      setNewCategoryName('');
      setCategoryError('');
    } else {
      setCategory(value);
      setShowNewCategoryInput(false);
    }
  };

  const handleConfirmNewCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setCategoryError('Digite um nome para a nova categoria.');
      return;
    }
    if (allCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      setCategoryError('Essa categoria já existe.');
      return;
    }

    const updated = [...customCategories, trimmed];
    setCustomCategories(updated);
    saveCustomCategories(updated);
    setCategory(trimmed);
    setShowNewCategoryInput(false);
    setNewCategoryName('');
    setCategoryError('');
  };

  const handleCancelNewCategory = () => {
    setShowNewCategoryInput(false);
    setNewCategoryName('');
    setCategoryError('');
    // Keep previous category selection
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('O nome do produto é obrigatório.');
      return;
    }
    if (stockQuantity < 0) {
      setError('A quantidade em estoque não pode ser negativa.');
      return;
    }
    if (price <= 0) {
      setError('O preço unitário deve ser maior que zero.');
      return;
    }
    if (!category.trim()) {
      setError('A categoria é obrigatória.');
      return;
    }

    onSave({
      id: product ? product.id : undefined,
      name: name.trim(),
      stock_quantity: Number(stockQuantity),
      price: Number(price),
      category: category.trim(),
      barcode: barcode.trim() || null,
      min_stock: Number(minStock) || 10,
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 style={{ color: 'var(--color-primary)' }}>
            {product ? 'Editar Produto' : 'Cadastrar Novo Produto'}
          </h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
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
            <label htmlFor="prod-barcode">Código de Barras <span style={{ fontWeight: 400, color: 'var(--text-low)', textTransform: 'none' }}>(opcional)</span></label>
            <input
              type="text"
              id="prod-barcode"
              className="form-control"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Ex: 7891234567890"
              maxLength={64}
            />
          </div>

          <div className="form-group">
            <label htmlFor="prod-name">Nome do Produto</label>
            <input
              type="text"
              id="prod-name"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Pão de Queijo"
              required
            />
          </div>

          {/* Category selector with "+ Nova Categoria" option */}
          <div className="form-group">
            <label htmlFor="prod-category">Categoria</label>
            <select
              id="prod-category"
              className="form-control"
              value={showNewCategoryInput ? '__new__' : category}
              onChange={handleCategoryChange}
            >
              {allCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
              <option disabled style={{ color: 'var(--color-text-muted)' }}>─────────────</option>
              <option value="__new__">➕ Nova Categoria...</option>
            </select>
          </div>

          {/* Inline new category input */}
          {showNewCategoryInput && (
            <div className="new-category-panel">
              <div style={{ marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Nome da Nova Categoria
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <input
                    ref={newCategoryInputRef}
                    type="text"
                    className="form-control"
                    value={newCategoryName}
                    onChange={(e) => {
                      setNewCategoryName(e.target.value);
                      setCategoryError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); handleConfirmNewCategory(); }
                      if (e.key === 'Escape') handleCancelNewCategory();
                    }}
                    placeholder="Ex: Tortas, Biscoitos..."
                    maxLength={40}
                  />
                  {categoryError && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-danger)', marginTop: '0.3rem', display: 'block' }}>
                      ⚠️ {categoryError}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleConfirmNewCategory}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  ✔ Adicionar
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleCancelNewCategory}
                >
                  ✕
                </button>
              </div>

              {/* Show existing custom categories with delete option */}
              {customCategories.length > 0 && (
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>
                    Categorias personalizadas:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {customCategories.map(cat => (
                      <span key={cat} style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                        background: 'rgba(232, 158, 58, 0.1)', border: '1px solid rgba(232, 158, 58, 0.25)',
                        borderRadius: '50px', padding: '0.2rem 0.6rem', fontSize: '0.78rem', color: 'var(--color-primary)'
                      }}>
                        {cat}
                        <button
                          type="button"
                          title={`Remover categoria "${cat}"`}
                          onClick={() => {
                            const updated = customCategories.filter(c => c !== cat);
                            setCustomCategories(updated);
                            saveCustomCategories(updated);
                            if (category === cat) setCategory('Pães');
                          }}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--color-text-muted)', fontSize: '0.85rem',
                            lineHeight: 1, padding: 0
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="prod-price">Preço Unitário (R$)</label>
              <input
                type="number"
                id="prod-price"
                className="form-control"
                step="0.01"
                min="0.01"
                value={price || ''}
                onChange={(e) => setPrice(parseFloat(e.target.value))}
                placeholder="0.00"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="prod-stock">Qtd. em Estoque</label>
              <input
                type="number"
                id="prod-stock"
                className="form-control"
                min="0"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(parseInt(e.target.value))}
                placeholder="0"
                disabled={!!product}
                style={{ opacity: product ? 0.6 : 1 }}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="prod-min-stock">Estoque Mínimo</label>
              <input
                type="number"
                id="prod-min-stock"
                className="form-control"
                min="0"
                value={minStock}
                onChange={(e) => setMinStock(parseInt(e.target.value) || 0)}
                placeholder="10"
              />
            </div>
          </div>

          {product && (
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
              * A quantidade em estoque não pode ser alterada na edição para manter a integridade do histórico de vendas. Use o fluxo de venda para dar saída.
            </p>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {product ? 'Salvar Alterações' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
