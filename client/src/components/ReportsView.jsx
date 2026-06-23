import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;
const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtShort = (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PIE_COLORS = ['#e89e3a','#f97316','#eab308','#2ecc71','#3b82f6','#d4a373','#ec4899','#14b8a6'];

// ── Date helpers ────────────────────────────────────────────────────────────
const today    = () => new Date().toISOString().split('T')[0];
const daysAgo  = (n) => new Date(Date.now() - n * 86400000).toISOString().split('T')[0];
const fmtDate  = (s) => new Date(s + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

const PERIODS = [
  { label: 'Hoje',         from: today(),      to: today()     },
  { label: 'Esta semana',  from: daysAgo(6),   to: today()     },
  { label: 'Este mês',     from: daysAgo(29),  to: today()     },
  { label: 'Últimos 3 m.', from: daysAgo(89),  to: today()     },
  { label: 'Personalizado',from: null,          to: null        },
];

// ── Tooltip customizado ──────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1f1812', border: '1px solid rgba(232,158,58,.3)', borderRadius: 8, padding: '.75rem 1rem' }}>
      <p style={{ color: '#f2d180', fontWeight: 700, marginBottom: '.4rem', fontSize: '.85rem' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontSize: '.82rem' }}>
          {p.name}: {p.name.includes('Fatura') ? fmt(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

// ── Summary card ─────────────────────────────────────────────────────────────
const SummaryCard = ({ label, value, sub, icon, highlight }) => (
  <div style={{
    background: 'var(--bg-card)', border: `1px solid ${highlight ? 'rgba(232,158,58,.3)' : 'var(--border-mid)'}`,
    borderRadius: 'var(--r-md)', padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem',
  }}>
    <span style={{ fontSize: '2rem' }}>{icon}</span>
    <div>
      <div style={{ fontSize: '.78rem', color: 'var(--text-low)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: highlight ? 'var(--color-primary)' : 'var(--text-high)', lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: '.78rem', color: 'var(--text-low)', marginTop: '.15rem' }}>{sub}</div>}
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
export default function ReportsView() {
  const { authFetch } = useAuth();
  const [periodIdx, setPeriodIdx] = useState(1); // Esta semana
  const [customFrom, setCustomFrom] = useState(daysAgo(29));
  const [customTo,   setCustomTo]   = useState(today());

  const [summary,     setSummary]     = useState(null);
  const [periodData,  setPeriodData]  = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [detailed,    setDetailed]    = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  const from = periodIdx === 4 ? customFrom : PERIODS[periodIdx].from;
  const to   = periodIdx === 4 ? customTo   : PERIODS[periodIdx].to;

  const load = useCallback(async () => {
    if (!from || !to) return;
    setLoading(true); setError('');
    try {
      const [sumRes, perRes, topRes, catRes, detRes] = await Promise.all([
        authFetch(`${API_BASE}/api/reports/summary`),
        authFetch(`${API_BASE}/api/reports/period?from=${from}&to=${to}`),
        authFetch(`${API_BASE}/api/reports/top-products?from=${from}&to=${to}&limit=10`),
        authFetch(`${API_BASE}/api/reports/categories?from=${from}&to=${to}`),
        authFetch(`${API_BASE}/api/reports/export?from=${from}&to=${to}`),
      ]);
      // detRes is CSV — parse period data for table
      const detResJson = await authFetch(`${API_BASE}/api/reports/period?from=${from}&to=${to}`);
      const detailRes  = await authFetch(`${API_BASE}/api/reports/top-products?from=${from}&to=${to}&limit=50`);
      setSummary(await sumRes.json());
      setPeriodData(await perRes.json());
      setTopProducts(await topRes.json());
      setCategories(await catRes.json());
      setDetailed(await detailRes.json());
    } catch { setError('Erro ao carregar relatórios. Verifique a conexão com o servidor.'); }
    finally { setLoading(false); }
  }, [from, to, authFetch]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    const res = await authFetch(`${API_BASE}/api/reports/export?from=${from}&to=${to}`);
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `vendas_${from}_${to}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const periodTotal   = periodData.reduce((s, d) => s + d.revenue, 0);
  const periodCount   = periodData.reduce((s, d) => s + d.sales_count, 0);
  const avgTicket     = periodCount > 0 ? periodTotal / periodCount : 0;
  const topProduct    = topProducts[0];

  return (
    <div>
      {/* ── Period selector ── */}
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' }}>
        {PERIODS.map((p, i) => (
          <button key={i}
            onClick={() => setPeriodIdx(i)}
            style={{
              padding: '.38rem .9rem', borderRadius: 50, border: '1px solid',
              borderColor: periodIdx === i ? 'var(--color-primary)' : 'var(--border-mid)',
              background: periodIdx === i ? 'rgba(232,158,58,.15)' : 'var(--bg-raised)',
              color: periodIdx === i ? 'var(--color-secondary)' : 'var(--text-mid)',
              fontFamily: 'var(--font-main)', fontSize: '.85rem', fontWeight: periodIdx === i ? 700 : 500,
              cursor: 'pointer', transition: 'all .15s',
            }}>
            {p.label}
          </button>
        ))}

        {periodIdx === 4 && (
          <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
            <label htmlFor="custom-from" style={{ display: 'none' }}>Data Inicial</label>
            <input id="custom-from" type="date" aria-label="Data inicial" className="form-control" style={{ padding: '.35rem .6rem', width: 'auto' }}
              value={customFrom} onChange={e => setCustomFrom(e.target.value)} max={customTo} />
            <span style={{ color: 'var(--text-low)' }}>até</span>
            <label htmlFor="custom-to" style={{ display: 'none' }}>Data Final</label>
            <input id="custom-to" type="date" aria-label="Data final" className="form-control" style={{ padding: '.35rem .6rem', width: 'auto' }}
              value={customTo} onChange={e => setCustomTo(e.target.value)} min={customFrom} max={today()} />
          </div>
        )}

        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExport}>⬇️ Exportar CSV</button>
        </div>
      </div>

      {error && <div className="error-card" style={{ marginBottom: '1.5rem' }}><p>{error}</p></div>}

      {loading && <div className="loading-center"><div className="spinner" /><p>Carregando dados…</p></div>}

      {!loading && (
        <>
          {/* ── Summary cards (always show today/week/month) ── */}
          {summary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
              <SummaryCard icon="📅" label="Hoje"       value={fmt(summary.today.revenue)}  sub={`${summary.today.count} vendas`}   highlight />
              <SummaryCard icon="📆" label="Esta semana" value={fmt(summary.week.revenue)}   sub={`${summary.week.count} vendas`}  />
              <SummaryCard icon="🗓️" label="Este mês"   value={fmt(summary.month.revenue)}  sub={`${summary.month.count} vendas`} />
              <SummaryCard icon="💰" label="Total geral" value={fmt(summary.allTime.revenue)} sub={`${summary.allTime.count} vendas`} />
            </div>
          )}

          {/* ── Period stats ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
            <SummaryCard icon="💵" label={`Faturamento (${PERIODS[periodIdx]?.label || 'Período'})`} value={fmt(periodTotal)} highlight />
            <SummaryCard icon="🧾" label="Nº de Vendas"   value={periodCount} />
            <SummaryCard icon="🎯" label="Ticket Médio"   value={fmt(avgTicket)} />
            <SummaryCard icon="🏆" label="Produto Top"    value={topProduct?.name || '—'} sub={topProduct ? fmt(topProduct.total_revenue) : ''} />
          </div>

          {/* ── Charts row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem', marginBottom: '1.75rem' }}>

            {/* Line chart — revenue over time */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-mid)', borderRadius: 'var(--r-md)', padding: '1.25rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-secondary)', marginBottom: '1rem', fontSize: '.92rem', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                📈 Faturamento por Dia
              </div>
              {periodData.length === 0
                ? <EmptyChart />
                : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={periodData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" />
                      <XAxis dataKey="day" tickFormatter={fmtDate} tick={{ fill: '#8a7f70', fontSize: 11 }} />
                      <YAxis tickFormatter={fmtShort} tick={{ fill: '#8a7f70', fontSize: 11 }} width={60} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="revenue" name="Faturamento" stroke="#e89e3a" strokeWidth={2.5} dot={{ fill: '#e89e3a', r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
            </div>

            {/* Pie chart — by category */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-mid)', borderRadius: 'var(--r-md)', padding: '1.25rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-secondary)', marginBottom: '1rem', fontSize: '.92rem', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                🥧 Por Categoria
              </div>
              {categories.length === 0
                ? <EmptyChart />
                : (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={categories} dataKey="total_revenue" nameKey="category" cx="50%" cy="50%" outerRadius={65} paddingAngle={2}>
                          {categories.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: '#1f1812', border: '1px solid rgba(232,158,58,.3)', borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem', marginTop: '.5rem' }}>
                      {categories.map((c, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.75rem' }}>
                          <span style={{ width: 10, height: 10, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                          <span style={{ color: 'var(--text-mid)', flex: 1 }}>{c.category}</span>
                          <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{fmt(c.total_revenue)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
            </div>
          </div>

          {/* Bar chart — top products */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-mid)', borderRadius: 'var(--r-md)', padding: '1.25rem', marginBottom: '1.75rem' }}>
            <div style={{ fontWeight: 700, color: 'var(--color-secondary)', marginBottom: '1rem', fontSize: '.92rem', textTransform: 'uppercase', letterSpacing: '.04em' }}>
              🏆 Top 10 Produtos (por faturamento)
            </div>
            {topProducts.length === 0
              ? <EmptyChart />
              : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 20, left: 120, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" horizontal={false} />
                    <XAxis type="number" tickFormatter={fmtShort} tick={{ fill: '#8a7f70', fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#c4b89e', fontSize: 12 }} width={115} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total_revenue" name="Faturamento" fill="#e89e3a" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
          </div>

          {/* Detailed table */}
          {detailed.length > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-mid)', borderRadius: 'var(--r-md)', padding: '1.25rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--color-secondary)', marginBottom: '1rem', fontSize: '.92rem', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                📋 Produtos no Período
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Categoria</th>
                      <th style={{ textAlign: 'right' }}>Qtd Vendida</th>
                      <th style={{ textAlign: 'right' }}>Faturamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailed.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 500 }}>{r.name}</td>
                        <td><span className="badge badge-default">{r.category}</span></td>
                        <td style={{ textAlign: 'right', color: 'var(--text-mid)' }}>{r.total_qty} un</td>
                        <td style={{ textAlign: 'right', color: 'var(--color-primary)', fontWeight: 700 }}>{fmt(r.total_revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyChart() {
  return (
    <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-low)', fontSize: '.9rem' }}>
      Sem dados para o período selecionado.
    </div>
  );
}
