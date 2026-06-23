import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';


const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;

const PAYMENT_METHODS = [
  { id: 'dinheiro', label: 'Dinheiro',         icon: '💵' },
  { id: 'debito',   label: 'Débito',            icon: '💳' },
  { id: 'credito',  label: 'Crédito',           icon: '💳' },
  { id: 'pix',      label: 'PIX',               icon: '🔑' },
  { id: 'vale',     label: 'Vale Alimentação',  icon: '🏷️' },
];

const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function CashierView({ onSaleComplete }) {
  const { authFetch } = useAuth();
  // ── Cart ──────────────────────────────────────────────────
  const [cart, setCart] = useState([]);               // [{product, quantity}]

  // ── Scanner ───────────────────────────────────────────────
  const [scanInput, setScanInput] = useState('');
  const [scanError, setScanError] = useState('');
  const [scanResults, setScanResults] = useState([]);  // multiple matches
  const scanRef = useRef(null);

  // ── Payment ───────────────────────────────────────────────
  const [phase, setPhase]         = useState('cart');  // 'cart' | 'payment' | 'receipt'
  const [payments, setPayments]   = useState([]);      // [{method, amount}]
  const [payError, setPayError]   = useState('');

  // ── Receipt ───────────────────────────────────────────────
  const [receipt, setReceipt]     = useState(null);
  const [loading, setLoading]     = useState(false);

  // Auto-focus scanner input on mount and after each action
  useEffect(() => {
    if (phase === 'cart') scanRef.current?.focus();
  }, [phase, cart.length]);

  // ── Computed values ───────────────────────────────────────
  const cartTotal  = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const totalPaid  = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const remaining  = Math.max(0, cartTotal - totalPaid);
  const cashEntry  = payments.find(p => p.method === 'dinheiro');
  const change     = cashEntry ? Math.max(0, totalPaid - cartTotal) : 0;

  // ── Scanner logic ─────────────────────────────────────────
  const handleScan = async (e) => {
    e.preventDefault();
    const q = scanInput.trim();
    if (!q) return;
    setScanError('');
    setScanResults([]);

    try {
      const res = await authFetch(`${API_BASE}/api/products/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.products.length === 0) {
        setScanError(`Produto não encontrado: "${q}"`);
        return;
      }
      if (data.exactMatch || data.products.length === 1) {
        addToCart(data.products[0]);
        setScanInput('');
      } else {
        // Multiple name matches — let user pick
        setScanResults(data.products);
      }
    } catch (err) {
      setScanError(err.message || 'Erro ao buscar produto.');
    }
  };

  const addToCart = (product) => {
    setScanResults([]);
    setScanError('');
    setCart(prev => {
      const idx = prev.findIndex(i => i.product.id === product.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 };
        return updated;
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (productId, delta) => {
    setCart(prev =>
      prev
        .map(i => i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i)
        .filter(i => i.quantity > 0)
    );
  };

  const setQty = (productId, val) => {
    const n = parseInt(val);
    if (isNaN(n) || n < 0) return;
    if (n === 0) return setCart(prev => prev.filter(i => i.product.id !== productId));
    setCart(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: n } : i));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setPayments([]);
    setScanInput('');
    setScanError('');
    setScanResults([]);
    setPhase('cart');
  };

  // ── Payment logic ─────────────────────────────────────────
  const addPayment = (method) => {
    setPayments(prev => {
      if (prev.find(p => p.method === method)) return prev; // no duplicates
      return [...prev, { method, amount: '' }];
    });
  };

  const updatePaymentAmount = (method, val) => {
    setPayments(prev =>
      prev.map(p => p.method === method ? { ...p, amount: val } : p)
    );
  };

  const removePayment = (method) => {
    setPayments(prev => prev.filter(p => p.method !== method));
  };

  // Fill remaining balance into the selected method
  const fillRemaining = (method) => {
    const other = payments.filter(p => p.method !== method)
                          .reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const needed = Math.max(0, cartTotal - other);
    setPayments(prev =>
      prev.map(p => p.method === method ? { ...p, amount: needed.toFixed(2) } : p)
    );
  };

  const handleCheckout = async () => {
    setPayError('');
    if (cart.length === 0)    return setPayError('Adicione produtos ao carrinho.');
    if (payments.length === 0) return setPayError('Selecione ao menos uma forma de pagamento.');
    if (totalPaid < cartTotal - 0.01) return setPayError('O valor pago é insuficiente para cobrir o total.');

    setLoading(true);
    try {
      const items = cart.map(i => ({ productId: i.product.id, quantity: i.quantity }));
      const res = await authFetch(`${API_BASE}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          payments: payments.map(p => ({ method: p.method, amount: Number(p.amount) })),
          totalAmount: cartTotal,
          amountPaid: totalPaid,
          changeAmount: change,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setReceipt({
        sessionId: data.sessionId,
        date: new Date(),
        items: cart.map(i => ({
          name: i.product.name,
          qty: i.quantity,
          unitPrice: i.product.price,
          subtotal: i.product.price * i.quantity,
        })),
        total: cartTotal,
        payments: payments.map(p => ({ ...p, amount: Number(p.amount) })),
        amountPaid: totalPaid,
        change,
      });
      setPhase('receipt');
      if (onSaleComplete) onSaleComplete();
    } catch (err) {
      setPayError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Print receipt ─────────────────────────────────────────
  const printReceipt = () => window.print();

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────

  return (
    <div className="pdv-shell">

      {/* ════════ PHASE: RECEIPT ════════ */}
      {phase === 'receipt' && receipt && (
        <div className="receipt-overlay">
          <div className="receipt-box" id="print-area">
            <div className="receipt-header">
              <div className="receipt-logo">
                <img src="/logo.png" alt="Logo Padaria Floresta" style={{ height: '50px', objectFit: 'contain' }} />
              </div>
              <h2>PADARIA FLORESTA</h2>
              <p>Obrigado pela preferência!</p>
              <div className="receipt-divider" />
              <p className="receipt-meta">
                <strong>Nº {receipt.sessionId}</strong>
                &nbsp;|&nbsp;
                {receipt.date.toLocaleString('pt-BR')}
              </p>
            </div>

            <div className="receipt-divider" />
            <div className="receipt-section-title">ITENS</div>
            <table className="receipt-table">
              <tbody>
                {receipt.items.map((item, i) => (
                  <tr key={i}>
                    <td>{item.name}</td>
                    <td className="receipt-qty">{item.qty}x</td>
                    <td className="receipt-price">{fmt(item.unitPrice)}</td>
                    <td className="receipt-sub">{fmt(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="receipt-divider" />
            <div className="receipt-total-line">
              <span>TOTAL</span>
              <span>{fmt(receipt.total)}</span>
            </div>

            <div className="receipt-divider" />
            <div className="receipt-section-title">PAGAMENTO</div>
            {receipt.payments.map((p, i) => (
              <div key={i} className="receipt-pay-line">
                <span>{PAYMENT_METHODS.find(m => m.id === p.method)?.label || p.method}</span>
                <span>{fmt(p.amount)}</span>
              </div>
            ))}
            {receipt.change > 0 && (
              <div className="receipt-pay-line receipt-change">
                <span>Troco</span>
                <span>{fmt(receipt.change)}</span>
              </div>
            )}

            <div className="receipt-footer">
              <div className="receipt-divider" />
              ★ Volte sempre! ★
            </div>
          </div>

          {/* Action buttons (hidden on print) */}
          <div className="receipt-actions no-print">
            <button className="btn btn-secondary" onClick={printReceipt}>🖨️ Imprimir</button>
            <button className="btn btn-primary" onClick={clearCart}>🛒 Nova Venda</button>
          </div>
        </div>
      )}

      {/* ════════ PHASE: CART + PAYMENT ════════ */}
      {phase !== 'receipt' && (
        <div className="pdv-grid">

          {/* ─── LEFT: Scanner + Cart ─── */}
          <div className="pdv-left">

            {/* Scanner */}
            <div className="pdv-card pdv-scanner-card">
              <div className="pdv-card-title">🔍 Leitor de Código de Barras</div>
              <form onSubmit={handleScan} className="scanner-form">
                <input
                  ref={scanRef}
                  type="text"
                  className="form-control scanner-input"
                  value={scanInput}
                  onChange={e => { setScanInput(e.target.value); setScanError(''); setScanResults([]); }}
                  placeholder="Código de barras ou nome do produto…"
                  autoComplete="off"
                  autoFocus
                />
                <button type="submit" className="btn btn-primary">Buscar</button>
              </form>

              {/* Error */}
              {scanError && (
                <div className="scan-error">⚠️ {scanError}</div>
              )}

              {/* Multiple results */}
              {scanResults.length > 1 && (
                <div className="scan-results">
                  <div className="scan-results-title">Selecione o produto:</div>
                  {scanResults.map(p => (
                    <button key={p.id} className="scan-result-item"
                      onClick={() => { addToCart(p); setScanInput(''); }}>
                      <span className="sri-name">{p.name}</span>
                      <span className="sri-price">{fmt(p.price)}</span>
                      <span className="sri-stock">{p.stock_quantity} un</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cart */}
            <div className="pdv-card pdv-cart-card">
              <div className="pdv-card-title-row">
                <span className="pdv-card-title">🛒 Carrinho</span>
                {cart.length > 0 && (
                  <button className="btn btn-danger btn-sm" onClick={clearCart}>Limpar</button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="cart-empty">
                  <span>Nenhum produto adicionado.</span>
                  <span>Use o leitor ou busque pelo nome acima.</span>
                </div>
              ) : (
                <>
                  <div className="cart-table-wrap">
                    <table className="cart-table">
                      <thead>
                        <tr>
                          <th>Produto</th>
                          <th>Un.</th>
                          <th>Qtd</th>
                          <th>Subtotal</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {cart.map(({ product: p, quantity }) => (
                          <tr key={p.id}>
                            <td className="cart-product-name">{p.name}</td>
                            <td className="cart-price">{fmt(p.price)}</td>
                            <td className="cart-qty-cell">
                              <div className="qty-control">
                                <button className="qty-btn" onClick={() => updateQty(p.id, -1)}>−</button>
                                <input
                                  type="number" min="1"
                                  className="qty-input"
                                  value={quantity}
                                  onChange={e => setQty(p.id, e.target.value)}
                                />
                                <button className="qty-btn" onClick={() => updateQty(p.id, +1)}>+</button>
                              </div>
                            </td>
                            <td className="cart-subtotal">{fmt(p.price * quantity)}</td>
                            <td>
                              <button className="cart-remove-btn" onClick={() => removeFromCart(p.id)}>×</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Total bar */}
                  <div className="cart-total-bar">
                    <span>TOTAL</span>
                    <span className="cart-total-value">{fmt(cartTotal)}</span>
                  </div>

                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '1rem', padding: '.8rem', fontSize: '1rem' }}
                    onClick={() => { setPhase('payment'); setPayments([]); setPayError(''); }}
                  >
                    💳 Ir para Pagamento →
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ─── RIGHT: Payment ─── */}
          <div className="pdv-right">
            <div className="pdv-card pdv-payment-card">
              <div className="pdv-card-title">💳 Pagamento</div>

              {phase === 'cart' ? (
                <div className="payment-idle">
                  <span>Adicione produtos ao carrinho e clique em <strong>"Ir para Pagamento"</strong> para prosseguir.</span>
                </div>
              ) : (
                <>
                  {/* Order summary */}
                  <div className="pay-summary">
                    <div className="pay-summary-row">
                      <span>Itens</span>
                      <span>{cart.reduce((s, i) => s + i.quantity, 0)}</span>
                    </div>
                    <div className="pay-summary-row pay-summary-total">
                      <span>Total a Pagar</span>
                      <span>{fmt(cartTotal)}</span>
                    </div>
                  </div>

                  {/* Payment method picker */}
                  <div className="pay-methods-label">Forma de Pagamento:</div>
                  <div className="pay-methods-grid">
                    {PAYMENT_METHODS.map(m => {
                      const active = !!payments.find(p => p.method === m.id);
                      return (
                        <button
                          key={m.id}
                          className={`pay-method-btn ${active ? 'pay-method-btn--active' : ''}`}
                          onClick={() => active ? removePayment(m.id) : addPayment(m.id)}
                        >
                          <span>{m.icon}</span>
                          <span>{m.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Payment amount inputs */}
                  {payments.length > 0 && (
                    <div className="pay-entries">
                      {payments.map(p => {
                        const meta = PAYMENT_METHODS.find(m => m.id === p.method);
                        return (
                          <div key={p.method} className="pay-entry">
                            <span className="pay-entry-label">{meta?.icon} {meta?.label}</span>
                            <div className="pay-entry-input-wrap">
                              <span className="pay-currency">R$</span>
                              <input
                                type="number" min="0" step="0.01"
                                className="pay-amount-input"
                                value={p.amount}
                                onChange={e => updatePaymentAmount(p.method, e.target.value)}
                                placeholder="0,00"
                              />
                              <button
                                className="pay-fill-btn"
                                title="Preencher com valor restante"
                                onClick={() => fillRemaining(p.method)}
                              >
                                ↩
                              </button>
                            </div>
                            <button className="cart-remove-btn" onClick={() => removePayment(p.method)}>×</button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Running totals */}
                  {payments.length > 0 && (
                    <div className="pay-totals">
                      <div className="pay-total-row">
                        <span>Pago até agora</span>
                        <span>{fmt(totalPaid)}</span>
                      </div>
                      {remaining > 0.005 && (
                        <div className="pay-total-row pay-total-lacking">
                          <span>Falta</span>
                          <span>{fmt(remaining)}</span>
                        </div>
                      )}
                      {change > 0.005 && (
                        <div className="pay-total-row pay-total-change">
                          <span>💵 Troco</span>
                          <span>{fmt(change)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {payError && (
                    <div className="pay-error">⚠️ {payError}</div>
                  )}

                  <div className="pay-actions">
                    <button className="btn btn-secondary" onClick={() => setPhase('cart')}>
                      ← Voltar
                    </button>
                    <button
                      className="btn btn-primary"
                      disabled={loading || totalPaid < cartTotal - 0.01 || cart.length === 0}
                      onClick={handleCheckout}
                      style={{ flex: 1, fontSize: '1rem', padding: '.8rem' }}
                    >
                      {loading ? '⏳ Processando…' : '✅ Finalizar Venda'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Print styles (injected inline so they work without a CSS file) ── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .pdv-shell { display: none !important; }
          .receipt-overlay { position: static !important; background: none !important; }
          .receipt-box { box-shadow: none !important; border: none !important; color: #000 !important; background: #fff !important; font-size: 13px; max-width: 320px; margin: 0 auto; }
          .receipt-table td, .receipt-total-line, .receipt-pay-line { color: #000 !important; }
        }

        /* PDV layout */
        .pdv-shell { width: 100%; }
        .pdv-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 1.25rem;
          align-items: start;
        }
        @media (max-width: 900px) {
          .pdv-grid { grid-template-columns: 1fr; }
        }

        /* Cards */
        .pdv-card {
          background: var(--bg-card);
          border: 1px solid var(--border-mid);
          border-radius: var(--r-md);
          padding: 1.25rem;
          margin-bottom: 1.25rem;
        }
        .pdv-card-title { font-size: .95rem; font-weight: 700; color: var(--color-secondary); margin-bottom: 1rem; text-transform: uppercase; letter-spacing: .04em; }
        .pdv-card-title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }

        /* Scanner */
        .scanner-form { display: flex; gap: .5rem; }
        .scanner-input { flex: 1; font-size: 1.05rem; padding: .7rem 1rem; }
        .scan-error { margin-top: .75rem; color: var(--color-danger); font-size: .88rem; background: rgba(231,76,60,.1); border: 1px solid rgba(231,76,60,.25); border-radius: var(--r-sm); padding: .5rem .75rem; }
        .scan-results { margin-top: .75rem; border: 1px solid var(--border-mid); border-radius: var(--r-sm); overflow: hidden; }
        .scan-results-title { font-size: .78rem; color: var(--text-low); padding: .4rem .75rem; background: var(--bg-raised); text-transform: uppercase; letter-spacing: .04em; }
        .scan-result-item { display: flex; align-items: center; gap: .75rem; width: 100%; text-align: left; padding: .65rem .75rem; background: none; border: none; border-bottom: 1px solid var(--border-subtle); color: var(--text-high); cursor: pointer; font-family: var(--font-main); font-size: .9rem; transition: background var(--t-fast); }
        .scan-result-item:last-child { border-bottom: none; }
        .scan-result-item:hover { background: rgba(232,158,58,.07); }
        .sri-name { flex: 1; font-weight: 500; }
        .sri-price { color: var(--color-primary); font-weight: 700; }
        .sri-stock { font-size: .8rem; color: var(--text-low); min-width: 50px; text-align: right; }

        /* Cart */
        .cart-empty { display: flex; flex-direction: column; align-items: center; gap: .4rem; padding: 2.5rem 1rem; color: var(--text-low); font-size: .9rem; text-align: center; }
        .cart-table-wrap { overflow-x: auto; border-radius: var(--r-sm); border: 1px solid var(--border-mid); background: var(--bg-surface); }
        .cart-table { width: 100%; border-collapse: collapse; font-size: .88rem; }
        .cart-table th { padding: .6rem .75rem; color: var(--color-secondary); font-size: .75rem; text-transform: uppercase; letter-spacing: .04em; border-bottom: 1px solid var(--border-mid); background: rgba(40,32,25,.8); }
        .cart-table td { padding: .55rem .75rem; border-bottom: 1px solid rgba(255,210,120,.06); color: var(--text-high); }
        .cart-table tr:last-child td { border-bottom: none; }
        .cart-product-name { font-weight: 500; }
        .cart-price { color: var(--text-mid); white-space: nowrap; }
        .cart-subtotal { font-weight: 700; color: var(--color-primary); text-align: right; white-space: nowrap; }
        .qty-control { display: flex; align-items: center; gap: .25rem; }
        .qty-btn { width: 26px; height: 26px; border: 1px solid var(--border-mid); background: var(--bg-raised); color: var(--text-high); border-radius: 4px; cursor: pointer; font-size: 1rem; line-height: 1; display: flex; align-items: center; justify-content: center; transition: background var(--t-fast); }
        .qty-btn:hover { background: var(--color-primary); color: #0e0b09; border-color: var(--color-primary); }
        .qty-input { width: 46px; text-align: center; background: var(--bg-input); border: 1px solid var(--border-mid); border-radius: 4px; color: var(--text-high); font-size: .88rem; padding: .2rem .3rem; font-family: var(--font-main); }
        .cart-remove-btn { background: none; border: none; color: var(--text-low); font-size: 1.25rem; cursor: pointer; line-height: 1; padding: 0; transition: color var(--t-fast); }
        .cart-remove-btn:hover { color: var(--color-danger); }
        .cart-total-bar { display: flex; justify-content: space-between; align-items: center; margin-top: .9rem; padding: .75rem 1rem; background: rgba(232,158,58,.08); border: 1px solid rgba(232,158,58,.2); border-radius: var(--r-sm); font-weight: 700; font-size: .9rem; color: var(--text-mid); text-transform: uppercase; }
        .cart-total-value { font-size: 1.4rem; color: var(--color-primary); }

        /* Payment */
        .payment-idle { padding: 2rem 1rem; text-align: center; color: var(--text-low); font-size: .9rem; line-height: 1.6; }
        .pay-summary { background: var(--bg-raised); border-radius: var(--r-sm); padding: .75rem 1rem; margin-bottom: 1.1rem; }
        .pay-summary-row { display: flex; justify-content: space-between; font-size: .88rem; color: var(--text-mid); margin-bottom: .2rem; }
        .pay-summary-total { font-size: 1rem; font-weight: 700; color: var(--text-high); margin-top: .4rem; padding-top: .4rem; border-top: 1px solid var(--border-mid); }
        .pay-methods-label { font-size: .78rem; color: var(--text-low); text-transform: uppercase; letter-spacing: .05em; margin-bottom: .5rem; }
        .pay-methods-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: .4rem; margin-bottom: 1rem; }
        .pay-method-btn { display: flex; flex-direction: column; align-items: center; gap: .2rem; padding: .6rem .4rem; background: var(--bg-raised); border: 1.5px solid var(--border-mid); border-radius: var(--r-sm); color: var(--text-mid); font-family: var(--font-main); font-size: .75rem; cursor: pointer; transition: all var(--t-fast); }
        .pay-method-btn:hover { border-color: var(--color-primary); color: var(--text-high); }
        .pay-method-btn--active { background: rgba(232,158,58,.12); border-color: var(--color-primary); color: var(--color-secondary); font-weight: 600; }
        .pay-entries { display: flex; flex-direction: column; gap: .5rem; margin-bottom: 1rem; }
        .pay-entry { display: flex; align-items: center; gap: .5rem; background: var(--bg-raised); border-radius: var(--r-sm); padding: .5rem .75rem; }
        .pay-entry-label { font-size: .82rem; color: var(--text-mid); min-width: 100px; font-weight: 500; }
        .pay-entry-input-wrap { display: flex; align-items: center; gap: .3rem; flex: 1; background: var(--bg-input); border: 1px solid var(--border-mid); border-radius: var(--r-sm); padding: 0 .5rem; }
        .pay-currency { color: var(--text-low); font-size: .85rem; }
        .pay-amount-input { flex: 1; background: none; border: none; color: var(--text-high); font-size: .95rem; font-family: var(--font-main); padding: .4rem .2rem; outline: none; min-width: 0; }
        .pay-fill-btn { background: none; border: none; color: var(--color-primary); cursor: pointer; font-size: 1rem; padding: 0; opacity: .8; }
        .pay-fill-btn:hover { opacity: 1; }
        .pay-totals { background: rgba(0,0,0,.2); border-radius: var(--r-sm); padding: .75rem 1rem; margin-bottom: 1rem; }
        .pay-total-row { display: flex; justify-content: space-between; font-size: .9rem; color: var(--text-mid); margin-bottom: .2rem; }
        .pay-total-lacking { color: var(--color-danger); font-weight: 600; }
        .pay-total-change  { color: var(--color-success); font-weight: 700; font-size: 1rem; }
        .pay-error { background: rgba(231,76,60,.1); border: 1px solid rgba(231,76,60,.3); border-radius: var(--r-sm); color: var(--color-danger); padding: .6rem .8rem; font-size: .88rem; margin-bottom: 1rem; }
        .pay-actions { display: flex; gap: .6rem; margin-top: auto; }

        /* Receipt */
        .receipt-overlay { display: flex; flex-direction: column; align-items: center; gap: 1.25rem; padding: 1rem 0; }
        .receipt-box { background: #fff; color: #111; border-radius: var(--r-md); padding: 1.5rem 1.75rem; max-width: 360px; width: 100%; box-shadow: var(--shadow-lg); font-size: .9rem; line-height: 1.5; }
        .receipt-header { text-align: center; margin-bottom: .5rem; }
        .receipt-logo { display: flex; justify-content: center; margin-bottom: .4rem; }
        .receipt-header h2 { font-size: 1.2rem; letter-spacing: .1em; color: #111; margin: .2rem 0; }
        .receipt-header p { font-size: .8rem; color: #555; }
        .receipt-meta { font-size: .78rem; color: #555; margin-top: .4rem; }
        .receipt-divider { border-top: 1px dashed #ccc; margin: .75rem 0; }
        .receipt-section-title { font-weight: 700; font-size: .78rem; text-transform: uppercase; letter-spacing: .06em; color: #333; margin-bottom: .4rem; }
        .receipt-table { width: 100%; border-collapse: collapse; }
        .receipt-table td { padding: .25rem .2rem; color: #222; font-size: .82rem; vertical-align: top; }
        .receipt-qty  { white-space: nowrap; text-align: right; color: #555; width: 28px; }
        .receipt-price { white-space: nowrap; text-align: right; color: #555; width: 60px; }
        .receipt-sub  { white-space: nowrap; text-align: right; font-weight: 600; width: 72px; }
        .receipt-total-line { display: flex; justify-content: space-between; font-weight: 700; font-size: 1rem; color: #111; margin: .3rem 0; }
        .receipt-pay-line   { display: flex; justify-content: space-between; font-size: .84rem; color: #333; margin-bottom: .15rem; }
        .receipt-change { color: #16a34a; font-weight: 700; }
        .receipt-footer { text-align: center; font-size: .8rem; color: #555; padding-top: .4rem; }
        .receipt-actions { display: flex; gap: .75rem; }
      `}</style>
    </div>
  );
}
