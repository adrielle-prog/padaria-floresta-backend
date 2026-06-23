import React, { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;
const HEALTH_TIMEOUT = 75000; // 75s max wait
const SLOW_THRESHOLD = 1500;  // if ping takes >1.5s, show the wake-up screen

export default function ServerWakeUp({ onReady }) {
  const [status, setStatus]     = useState('checking'); // 'checking' | 'waking' | 'ready'
  const [elapsed, setElapsed]   = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let timer;
    let progressTimer;
    let done = false;
    const start = Date.now();

    async function ping() {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        try { controller.abort(); } catch (e) {}
      }, HEALTH_TIMEOUT);

      try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: '__ping__', password: '__ping__' }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        // Any HTTP response (even 401) means server is alive
        if (res.status !== 0 && !done) {
          done = true;
          setStatus('ready');
          clearInterval(progressTimer);
          setProgress(100);
          setTimeout(() => onReady(), 400);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (!done) {
          done = true;
          setStatus('ready');
          clearInterval(progressTimer);
          onReady();
        }
      }
    }

    // Quick check — if server responds fast, skip the wake-up screen
    const quickCheck = setTimeout(() => {
      if (status === 'checking') setStatus('waking');
    }, SLOW_THRESHOLD);

    // Animate progress bar over ~60s
    progressTimer = setInterval(() => {
      const secs = (Date.now() - start) / 1000;
      setElapsed(Math.round(secs));
      // Asymptotic progress: reaches ~90% at 60s, never 100% until done
      setProgress(Math.min(90, (secs / 60) * 90));
    }, 500);

    ping();

    return () => {
      clearTimeout(quickCheck);
      clearInterval(progressTimer);
      done = true;
    };
  }, []);

  // Server responded fast — don't render anything
  if (status === 'checking' || status === 'ready') return null;

  return (
    <div className="wakeup-overlay">
      <div className="wakeup-card">
        {/* Animated bread icon */}
        <div className="wakeup-icon">🍞</div>

        <h2 className="wakeup-title">Acordando o servidor…</h2>
        <p className="wakeup-desc">
          O servidor ficou em repouso para economizar energia.<br />
          Isso leva normalmente <strong>30–60 segundos</strong>.
        </p>

        {/* Progress bar */}
        <div className="wakeup-bar-track">
          <div className="wakeup-bar-fill" style={{ width: `${progress}%` }} />
        </div>

        <p className="wakeup-timer">
          {elapsed < 5
            ? 'Conectando…'
            : elapsed < 30
            ? `Aquecendo… ${elapsed}s`
            : `Quase lá… ${elapsed}s`}
        </p>

        <p className="wakeup-hint">☕ Aproveite para pegar um café!</p>
      </div>

      <style>{`
        .wakeup-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(10, 8, 5, 0.85);
          backdrop-filter: blur(6px);
          animation: fadeIn 0.4s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .wakeup-card {
          background: var(--bg-card, #1a1710);
          border: 1px solid rgba(232,158,58,.3);
          border-radius: 1.5rem;
          padding: 2.5rem 3rem;
          max-width: 420px;
          width: 90%;
          text-align: center;
          box-shadow: 0 24px 80px rgba(0,0,0,.7), 0 0 0 1px rgba(232,158,58,.1);
          animation: slideUp 0.4s cubic-bezier(.34,1.56,.64,1);
        }
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .wakeup-icon {
          font-size: 3.5rem;
          margin-bottom: 1rem;
          display: inline-block;
          animation: bounce 1.2s ease-in-out infinite alternate;
          filter: drop-shadow(0 4px 12px rgba(232,158,58,.5));
        }
        @keyframes bounce {
          from { transform: translateY(0) rotate(-5deg); }
          to   { transform: translateY(-12px) rotate(5deg); }
        }
        .wakeup-title {
          font-size: 1.5rem;
          color: var(--color-primary, #e89e3a);
          margin: 0 0 .75rem;
        }
        .wakeup-desc {
          color: var(--text-muted, #9a8878);
          font-size: .92rem;
          line-height: 1.6;
          margin-bottom: 1.75rem;
        }
        .wakeup-desc strong {
          color: var(--text-base, #e8ddd0);
        }
        .wakeup-bar-track {
          background: rgba(232,158,58,.12);
          border-radius: 999px;
          height: 8px;
          overflow: hidden;
          margin-bottom: .75rem;
        }
        .wakeup-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #c97d20, #e89e3a, #f0b558);
          border-radius: 999px;
          transition: width 0.5s ease;
          box-shadow: 0 0 10px rgba(232,158,58,.5);
        }
        .wakeup-timer {
          font-size: .88rem;
          color: var(--text-low, #7a6a5a);
          margin-bottom: 1.5rem;
          font-variant-numeric: tabular-nums;
        }
        .wakeup-hint {
          font-size: .82rem;
          color: var(--text-low, #7a6a5a);
          opacity: .7;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
