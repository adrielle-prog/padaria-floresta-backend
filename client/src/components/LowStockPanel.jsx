import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';


const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;

const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/* ── Priority tiers ────────────────────────────────────────────── */
function getPriority(product) {
  const { stock_quantity: qty, min_stock: min = 10 } = product;
  if (qty <= 0)              return { tier: 'critical', label: 'CRÍTICO',  color: '#ef4444', bg: 'rgba(239,68,68,.08)',  border: 'rgba(239,68,68,.35)',  icon: '🔴', order: 0 };
  if (qty <= min * 0.3)     return { tier: 'urgent',   label: 'URGENTE',  color: '#f97316', bg: 'rgba(249,115,22,.08)', border: 'rgba(249,115,22,.35)', icon: '🟠', order: 1 };
  if (qty <= min)            return { tier: 'low',      label: 'BAIXO',    color: '#eab308', bg: 'rgba(234,179,8,.08)',  border: 'rgba(234,179,8,.35)',  icon: '🟡', order: 2 };
  return null;
}

/* ── Stock bar (fills proportionally to min_stock) ─────────────── */
function StockBar({ qty, min }) {
  const pct = min > 0 ? Math.min(100, (qty / min) * 100) : 0;
  const color = qty <= 0 ? '#ef4444' : qty <= min * 0.3 ? '#f97316' : '#eab308';
  return (
    <div style={{ position: 'relative', height: 8, background: 'rgba(255,255,255,.08)', borderRadius: 50, overflow: 'hidden', flex: 1 }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: `${pct}%`, borderRadius: 50,
        background: color,
        transition: 'width .4s cubic-bezier(.4,0,.2,1)',
        boxShadow: `0 0 8px ${color}88`,
      }} />
    </div>
  );
}

/* ── Restock modal ──────────────────────────────────────────────── */
function RestockModal({ product, onConfirm, onClose }) {
  const [qty, setQty] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const presets = [10, 20, 30, 50, 100];

  const handleConfirm = async () => {
    const n = parseInt(qty);
    if (!n || n <= 0) return setErr('Digite uma quantidade válida.');
    setBusy(true);
    setErr('');
    try {
      await onConfirm(product.id, n);
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h3 style={{ color: 'var(--color-primary)', fontSize: '1.05rem' }}>
            📦 Repor Estoque — {product.name}
          </h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Current stock status */}
        <div style={{
          background: 'rgba(0,0,0,.2)', borderRadius: 8, padding: '.75rem 1rem',
          marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '.75rem', color: 'var(--text-low)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Estoque Atual</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: product.stock_quantity <= 0 ? '#ef4444' : '#f97316' }}>
              {product.stock_quantity} un
            </div>
          </div>
          <div style={{ fontSize: '1.5rem' }}>→</div>
          <div>
            <div style={{ fontSize: '.75rem', color: 'var(--text-low)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Após Reposição</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-success)' }}>
              {product.stock_quantity + (parseInt(qty) || 0)} un
            </div>
          </div>
        </div>

        {/* Quick presets */}
        <div style={{ marginBottom: '.75rem' }}>
          <div style={{ fontSize: '.75rem', color: 'var(--text-low)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.4rem' }}>
            Quantidade rápida:
          </div>
          <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
            {presets.map(p => (
              <button key={p} onClick={() => { setQty(String(p)); setErr(''); }}
                style={{
                  padding: '.3rem .75rem', borderRadius: 6, border: `1px solid ${qty == p ? 'var(--color-primary)' : 'var(--border-mid)'}`,
                  background: qty == p ? 'rgba(232,158,58,.15)' : 'var(--bg-raised)',
                  color: qty == p ? 'var(--color-primary)' : 'var(--text-mid)',
                  cursor: 'pointer', fontFamily: 'var(--font-main)', fontSize: '.85rem', fontWeight: 600, transition: 'all .15s'
                }}>
                +{p}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="restock-qty">Ou insira a quantidade:</label>
          <input
            id="restock-qty" type="number" min="1" className="form-control"
            value={qty} onChange={e => { setQty(e.target.value); setErr(''); }}
            placeholder="Ex: 50"
            onKeyDown={e => e.key === 'Enter' && handleConfirm()}
            autoFocus
          />
        </div>

        {err && (
          <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 6, color: '#ef4444', padding: '.5rem .75rem', fontSize: '.85rem', marginBottom: '.75rem' }}>
            ⚠️ {err}
          </div>
        )}

        <div className="form-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={busy}>
            {busy ? '⏳ Salvando…' : '✅ Confirmar Reposição'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function LowStockPanel({ products, onRestock }) {
  const { authFetch } = useAuth();
  const [restockTarget, setRestockTarget] = useState(null);
  const [filter, setFilter]               = useState('all'); // 'all' | 'critical' | 'urgent' | 'low'

  // Classify and filter
  const lowItems = products
    .map(p => ({ ...p, priority: getPriority(p) }))
    .filter(p => p.priority !== null)
    .sort((a, b) => a.priority.order - b.priority.order);

  const counts = {
    critical: lowItems.filter(p => p.priority.tier === 'critical').length,
    urgent:   lowItems.filter(p => p.priority.tier === 'urgent').length,
    low:      lowItems.filter(p => p.priority.tier === 'low').length,
  };

  const displayed = filter === 'all'
    ? lowItems
    : lowItems.filter(p => p.priority.tier === filter);

  const handleRestock = async (productId, qty) => {
    const res = await authFetch(`${API_BASE}/api/products/${productId}/restock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qty }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    if (onRestock) onRestock();
  };

  if (lowItems.length === 0) {
    return (
      <div className="lsp-all-ok">
        <span className="lsp-ok-icon">✅</span>
        <div>
          <strong>Estoque em dia!</strong>
          <p>Todos os produtos estão acima do nível mínimo.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Summary banner ── */}
      <div className="lsp-banner">
        <div className="lsp-banner-left">
          <span className="lsp-banner-icon">⚠️</span>
          <div>
            <div className="lsp-banner-title">Reposição Necessária</div>
            <div className="lsp-banner-sub">
              {lowItems.length} produto{lowItems.length > 1 ? 's' : ''} abaixo do estoque mínimo
            </div>
          </div>
        </div>

        {/* Filter pills */}
        <div className="lsp-filters">
          <button className={`lsp-filter-pill ${filter === 'all' ? 'lsp-filter-pill--active' : ''}`}
            onClick={() => setFilter('all')}>
            Todos <span className="lsp-count lsp-count--all">{lowItems.length}</span>
          </button>
          {counts.critical > 0 && (
            <button className={`lsp-filter-pill ${filter === 'critical' ? 'lsp-filter-pill--active' : ''}`}
              onClick={() => setFilter(filter === 'critical' ? 'all' : 'critical')}>
              🔴 Críticos <span className="lsp-count lsp-count--critical">{counts.critical}</span>
            </button>
          )}
          {counts.urgent > 0 && (
            <button className={`lsp-filter-pill ${filter === 'urgent' ? 'lsp-filter-pill--active' : ''}`}
              onClick={() => setFilter(filter === 'urgent' ? 'all' : 'urgent')}>
              🟠 Urgentes <span className="lsp-count lsp-count--urgent">{counts.urgent}</span>
            </button>
          )}
          {counts.low > 0 && (
            <button className={`lsp-filter-pill ${filter === 'low' ? 'lsp-filter-pill--active' : ''}`}
              onClick={() => setFilter(filter === 'low' ? 'all' : 'low')}>
              🟡 Baixos <span className="lsp-count lsp-count--low">{counts.low}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Product cards grid ── */}
      <div className="lsp-grid">
        {displayed.map(p => {
          const pr = p.priority;
          const min = p.min_stock || 10;
          const pct = min > 0 ? Math.min(100, Math.round((p.stock_quantity / min) * 100)) : 0;

          return (
            <div key={p.id} className="lsp-card"
              style={{ borderColor: pr.border, '--lsp-glow': pr.color }}>

              {/* Priority badge */}
              <div className="lsp-priority-badge" style={{ background: pr.bg, color: pr.color, border: `1px solid ${pr.border}` }}>
                {pr.icon} {pr.label}
              </div>

              {/* Product name */}
              <div className="lsp-product-name">{p.name}</div>
              <div className="lsp-category">{p.category}</div>

              {/* Stock gauge */}
              <div className="lsp-gauge-row">
                <div className="lsp-stock-num" style={{ color: pr.color }}>
                  {p.stock_quantity}<span style={{ fontSize: '.7rem', marginLeft: 3, color: 'var(--text-low)' }}>un</span>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <StockBar qty={p.stock_quantity} min={min} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', color: 'var(--text-low)' }}>
                    <span>0</span>
                    <span style={{ color: pr.color }}>{pct}%</span>
                    <span>mín. {min}</span>
                  </div>
                </div>
              </div>

              {/* Deficit info */}
              <div className="lsp-deficit">
                {p.stock_quantity <= 0
                  ? `Repor ao menos ${min} unidades`
                  : `Faltam ${Math.max(0, min - p.stock_quantity)} un para atingir o mínimo`}
              </div>

              {/* Price info */}
              <div className="lsp-price-row">
                <span style={{ fontSize: '.78rem', color: 'var(--text-low)' }}>Preço unitário</span>
                <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{fmt(p.price)}</span>
              </div>

              {/* Restock action */}
              <button
                className="lsp-restock-btn"
                style={{ '--lsp-btn-color': pr.color, '--lsp-btn-bg': pr.bg, '--lsp-btn-border': pr.border }}
                onClick={() => setRestockTarget(p)}>
                📦 Repor Estoque
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Restock modal ── */}
      {restockTarget && (
        <RestockModal
          product={restockTarget}
          onConfirm={handleRestock}
          onClose={() => setRestockTarget(null)}
        />
      )}
    </>
  );
}
