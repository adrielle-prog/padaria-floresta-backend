import React, { useEffect, useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;
const SLOW_THRESHOLD  = 1500;  // show wake-up screen if ping > 1.5s
const SHOW_SKIP_AFTER = 20000; // show "skip" button after 20s
const HARD_TIMEOUT    = 90000; // force proceed after 90s no matter what

export default function ServerWakeUp({ onReady }) {
  const [status, setStatus]       = useState('checking'); // 'checking' | 'waking' | 'ready'
  const [elapsed, setElapsed]     = useState(0);
  const [progress, setProgress]   = useState(0);
  const [showSkip, setShowSkip]   = useState(false);

  const proceed = useCallback(() => {
    setStatus('ready');
    setProgress(100);
    onReady();
  }, [onReady]);

  useEffect(() => {
    let done = false;
    let progressTimer;
    const start = Date.now();

    // Hard fallback: if server never responds in 90s, unblock the user anyway
    const hardTimeout = setTimeout(() => {
      if (!done) { done = true; proceed(); }
    }, HARD_TIMEOUT);

    // Show "skip" button after 20s
    const skipTimer = setTimeout(() => setShowSkip(true), SHOW_SKIP_AFTER);

    // Show wake-up screen if ping is slow
    const slowTimer = setTimeout(() => {
      if (!done) setStatus('waking');
    }, SLOW_THRESHOLD);

    // Animate progress bar
    progressTimer = setInterval(() => {
      const secs = (Date.now() - start) / 1000;
      setElapsed(Math.round(secs));
      // Asymptotic: reaches ~88% at 75s
      setProgress(prev => Math.min(88, (secs / 75) * 88));
    }, 500);

    async function ping() {
      const controller = new AbortController();
      // Abort after 85s (slightly less than hard timeout)
      const abortId = setTimeout(() => controller.abort(), 85000);
      try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: '__ping__', password: '__ping__' }),
          signal: controller.signal,
        });
        clearTimeout(abortId);
        if (res.status !== 0 && !done) {
          done = true;
          clearTimeout(hardTimeout);
          clearTimeout(skipTimer);
          clearInterval(progressTimer);
          setProgress(100);
          setTimeout(proceed, 400);
        }
      } catch {
        clearTimeout(abortId);
        if (!done) {
          done = true;
          clearTimeout(hardTimeout);
          clearTimeout(skipTimer);
          clearInterval(progressTimer);
          proceed();
        }
      }
    }

    ping();

    return () => {
      done = true;
      clearTimeout(hardTimeout);
      clearTimeout(skipTimer);
      clearTimeout(slowTimer);
      clearInterval(progressTimer);
    };
  }, [proceed]);

  if (status === 'checking' || status === 'ready') return null;

  return (
    <div className="wakeup-overlay">
      <div className="wakeup-card">
        <div className="wakeup-icon">🍞</div>

        <h2 className="wakeup-title">Acordando o servidor…</h2>
        <p className="wakeup-desc">
          O servidor ficou em repouso para economizar energia.<br />
          Isso leva normalmente <strong>30–60 segundos</strong>.
        </p>

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

        {showSkip ? (
          <button className="wakeup-skip-btn" onClick={proceed}>
            Continuar mesmo assim →
          </button>
        ) : (
          <p className="wakeup-hint">☕ Aproveite para pegar um café!</p>
        )}
      </div>

      <style>{`
        .wakeup-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(10, 8, 5, 0.92);
          backdrop-filter: blur(6px);
          animation: wuFadeIn 0.4s ease;
        }
        @keyframes wuFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .wakeup-card {
          background: var(--bg-card, #1a1710);
          border: 1px solid rgba(232,158,58,.3);
          border-radius: 1.5rem;
          padding: 2.5rem 2rem;
          max-width: 400px;
          width: 90%;
          text-align: center;
          box-shadow: 0 24px 80px rgba(0,0,0,.7), 0 0 0 1px rgba(232,158,58,.1);
          animation: wuSlideUp 0.4s cubic-bezier(.34,1.56,.64,1);
        }
        @keyframes wuSlideUp {
          from { transform: translateY(30px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .wakeup-icon {
          font-size: 3.5rem;
          margin-bottom: 1rem;
          display: inline-block;
          animation: wuBounce 1.2s ease-in-out infinite alternate;
          filter: drop-shadow(0 4px 12px rgba(232,158,58,.5));
        }
        @keyframes wuBounce {
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
          margin-bottom: 1.5rem;
        }
        .wakeup-desc strong { color: var(--text-base, #e8ddd0); }
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
        .wakeup-skip-btn {
          display: inline-block;
          margin-top: .25rem;
          padding: .6rem 1.4rem;
          background: rgba(232,158,58,.15);
          border: 1px solid rgba(232,158,58,.4);
          border-radius: 999px;
          color: var(--color-primary, #e89e3a);
          font-size: .88rem;
          font-weight: 600;
          cursor: pointer;
          transition: background .2s;
          letter-spacing: .02em;
        }
        .wakeup-skip-btn:hover {
          background: rgba(232,158,58,.28);
        }
      `}</style>
    </div>
  );
}
