import { useState, useEffect, useCallback } from "react";

const PAIRS = [
  "BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT",
  "ADA/USDT", "DOGE/USDT", "AVAX/USDT", "LINK/USDT", "DOT/USDT",
  "MATIC/USDT", "UNI/USDT", "ATOM/USDT", "LTC/USDT", "NEAR/USDT",
  "ARB/USDT", "OP/USDT", "INJ/USDT", "TIA/USDT", "SUI/USDT",
];

const TIMEFRAMES = ["1D", "4H"];

function generateMockCandles(pair, tf) {
  const seed = pair.charCodeAt(0) + pair.charCodeAt(1) + tf.length;
  const base = 100 + (seed * 37) % 900;
  const candles = [];
  let price = base;
  for (let i = 0; i < 5; i++) {
    const move = ((seed * (i + 3) * 17) % 10) - 5;
    const open = price;
    const close = price + move;
    const high = Math.max(open, close) + ((seed * i) % 5);
    const low = Math.min(open, close) - ((seed * i) % 5);
    candles.push({ open, close, high, low });
    price = close;
  }
  return candles;
}

function MiniChart({ candles, direction }) {
  const allPrices = candles.flatMap(c => [c.high, c.low]);
  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const range = maxP - minP || 1;
  const w = 60, h = 28;

  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      {candles.map((c, i) => {
        const x = i * 12 + 4;
        const bodyTop = h - ((Math.max(c.open, c.close) - minP) / range) * h;
        const bodyBot = h - ((Math.min(c.open, c.close) - minP) / range) * h;
        const wickTop = h - ((c.high - minP) / range) * h;
        const wickBot = h - ((c.low - minP) / range) * h;
        const isGreen = c.close >= c.open;
        const color = isGreen ? "#00e5a0" : "#ff4d6d";
        return (
          <g key={i}>
            <line x1={x + 3} y1={wickTop} x2={x + 3} y2={wickBot} stroke={color} strokeWidth={1} />
            <rect x={x} y={bodyTop} width={6} height={Math.max(bodyBot - bodyTop, 1)} fill={color} rx={1} />
          </g>
        );
      })}
    </svg>
  );
}

function AlertRow({ alert, onAnalyze }) {
  const isLong = alert.direction === "LONG";
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "30px 1fr 80px 70px 70px 80px 90px",
      alignItems: "center",
      gap: "8px",
      padding: "10px 16px",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
      transition: "background 0.2s",
      cursor: "default",
    }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <span style={{ color: "#888", fontSize: "11px" }}>{alert.id}</span>
      <div>
        <div style={{ color: "#f0f0f0", fontWeight: 700, fontSize: "13px", fontFamily: "'Space Mono', monospace" }}>{alert.pair}</div>
        <div style={{ color: "#666", fontSize: "10px" }}>{alert.exchange}</div>
      </div>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: "4px",
        background: isLong ? "rgba(0,229,160,0.12)" : "rgba(255,77,109,0.12)",
        border: `1px solid ${isLong ? "rgba(0,229,160,0.3)" : "rgba(255,77,109,0.3)"}`,
        borderRadius: "4px", padding: "3px 8px",
        fontSize: "11px", fontWeight: 700,
        color: isLong ? "#00e5a0" : "#ff4d6d",
        fontFamily: "'Space Mono', monospace",
      }}>
        {isLong ? "▲" : "▼"} {alert.direction}
      </div>
      <span style={{ color: "#aaa", fontSize: "11px", fontFamily: "'Space Mono', monospace" }}>{alert.timeframe}</span>
      <span style={{ color: "#888", fontSize: "11px" }}>{alert.pattern}</span>
      <MiniChart candles={alert.candles} direction={alert.direction} />
      <button
        onClick={() => onAnalyze(alert)}
        style={{
          background: "rgba(99,102,241,0.15)",
          border: "1px solid rgba(99,102,241,0.4)",
          borderRadius: "6px",
          color: "#818cf8",
          fontSize: "10px",
          fontWeight: 700,
          padding: "5px 10px",
          cursor: "pointer",
          fontFamily: "'Space Mono', monospace",
          transition: "all 0.2s",
          letterSpacing: "0.5px",
        }}
        onMouseEnter={e => { e.target.style.background = "rgba(99,102,241,0.3)"; e.target.style.color = "#c7d2fe"; }}
        onMouseLeave={e => { e.target.style.background = "rgba(99,102,241,0.15)"; e.target.style.color = "#818cf8"; }}
      >
        AI ANALYZE
      </button>
    </div>
  );
}

function AIModal({ alert, onClose }) {
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!alert) return;
    setLoading(true);
    setAnalysis("");

    const prompt = `You are a professional crypto futures trader specializing in Candle Range Theory (CRT).

Analyze this CRT setup:
- Pair: ${alert.pair}
- Timeframe: ${alert.timeframe}
- Direction: ${alert.direction}
- Pattern: ${alert.pattern}
- Candle data (last 5): ${JSON.stringify(alert.candles.map(c => ({
  open: c.open.toFixed(2),
  close: c.close.toFixed(2),
  high: c.high.toFixed(2),
  low: c.low.toFixed(2)
})))}

Provide a concise CRT analysis covering:
1. Setup Quality (1-10 rating)
2. Key CRT levels (support/resistance based on candle ranges)
3. Entry suggestion
4. Stop Loss suggestion
5. Take Profit targets (TP1, TP2)
6. Risk assessment
7. Brief market context

Keep it practical and actionable. Use bullet points. Max 200 words.`;

    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    })
      .then(r => r.json())
      .then(data => {
        const text = data.content?.map(b => b.text || "").join("") || "Analysis unavailable.";
        setAnalysis(text);
        setLoading(false);
      })
      .catch(() => {
        setAnalysis("Failed to load analysis. Please try again.");
        setLoading(false);
      });
  }, [alert]);

  if (!alert) return null;
  const isLong = alert.direction === "LONG";

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, backdropFilter: "blur(8px)",
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "#0d0f14",
        border: "1px solid rgba(99,102,241,0.3)",
        borderRadius: "16px",
        padding: "28px",
        maxWidth: "520px",
        width: "90%",
        boxShadow: "0 0 60px rgba(99,102,241,0.2)",
        position: "relative",
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: "16px", right: "16px",
          background: "none", border: "none", color: "#666",
          fontSize: "20px", cursor: "pointer", lineHeight: 1,
        }}>×</button>

        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <span style={{ fontSize: "18px", fontWeight: 800, color: "#f0f0f0", fontFamily: "'Space Mono', monospace" }}>
              {alert.pair}
            </span>
            <span style={{
< truncated lines 204-302 >
        return p + 4;
      });
    }, 80);
  }, [activeTimeframes]);

  useEffect(() => {
    runScan();
  }, []);

  const toggleTF = (tf) => {
    setActiveTimeframes(prev =>
      prev.includes(tf) ? prev.filter(t => t !== tf) : [...prev, tf]
    );
  };

  const filtered = alerts.filter(a => {
    if (filter === "LONG") return a.direction === "LONG";
    if (filter === "SHORT") return a.direction === "SHORT";
    return true;
  });

  const longCount = alerts.filter(a => a.direction === "LONG").length;
  const shortCount = alerts.filter(a => a.direction === "SHORT").length;
  const tfCounts = {};
  TIMEFRAMES.forEach(tf => { tfCounts[tf] = alerts.filter(a => a.timeframe === tf).length; });

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080a0f",
      color: "#e0e0e0",
      fontFamily: "'Space Mono', 'Courier New', monospace",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes scanline { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #080a0f; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
      `}</style>

      {/* Header */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "16px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(255,255,255,0.02)",
        position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "36px", height: "36px",
            background: "linear-gradient(135deg, #6366f1, #818cf8)",
            borderRadius: "8px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "18px",
          }}>📊</div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#f0f0f0", letterSpacing: "2px" }}>CRT ALERT</div>
            <div style={{ fontSize: "9px", color: "#666", letterSpacing: "1px" }}>CANDLE RANGE THEORY SCANNER</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* TF toggles */}
          {TIMEFRAMES.map(tf => (
            <button key={tf} onClick={() => toggleTF(tf)} style={{
              background: activeTimeframes.includes(tf) ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${activeTimeframes.includes(tf) ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: "6px", color: activeTimeframes.includes(tf) ? "#818cf8" : "#666",
              padding: "5px 12px", fontSize: "11px", fontWeight: 700,
              cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit",
            }}>
              {tf} {tfCounts[tf] > 0 && <span style={{ opacity: 0.7 }}>({tfCounts[tf]})</span>}
            </button>
          ))}

          <button onClick={runScan} disabled={scanning} style={{
            background: scanning ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.2)",
            border: "1px solid rgba(99,102,241,0.4)",
            borderRadius: "8px", color: scanning ? "#818cf8" : "#a5b4fc",
            padding: "7px 16px", fontSize: "11px", fontWeight: 700,
            cursor: scanning ? "not-allowed" : "pointer",
            transition: "all 0.2s", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: "6px",
          }}>
            <span style={{ animation: scanning ? "spin 1s linear infinite" : "none", display: "inline-block" }}>⟳</span>
            {scanning ? "SCANNING..." : "SCAN NOW"}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {scanning && (
        <div style={{ height: "2px", background: "rgba(99,102,241,0.1)", position: "relative", overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${progress}%`,
            background: "linear-gradient(90deg, #6366f1, #818cf8)",
            transition: "width 0.1s linear",
          }} />
        </div>
      )}

      {/* Stats */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        gap: "12px", padding: "20px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        {[
          { label: "TOTAL ALERTS", value: alerts.length, color: "#818cf8" },
          { label: "LONG SETUPS", value: longCount, color: "#00e5a0" },
          { label: "SHORT SETUPS", value: shortCount, color: "#ff4d6d" },
          { label: "PAIRS SCANNED", value: PAIRS.length, color: "#f59e0b" },
        ].map(stat => (
          <div key={stat.label} style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: "10px", padding: "14px 16px",
          }}>
            <div style={{ fontSize: "22px", fontWeight: 700, color: stat.color, fontFamily: "'Space Mono', monospace" }}>
              {scanning ? <span style={{ animation: "pulse 1s infinite", display: "inline-block" }}>--</span> : stat.value}
            </div>
            <div style={{ fontSize: "9px", color: "#555", letterSpacing: "1.5px", marginTop: "4px" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filter + Last scan */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        <div style={{ display: "flex", gap: "6px" }}>
          {["ALL", "LONG", "SHORT"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              background: filter === f ? "rgba(99,102,241,0.2)" : "transparent",
              border: `1px solid ${filter === f ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.07)"}`,
              borderRadius: "6px", color: filter === f ? "#818cf8" : "#555",
              padding: "4px 12px", fontSize: "10px", fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
            }}>{f}</button>
          ))}
        </div>
        {lastScan && (
          <div style={{ fontSize: "10px", color: "#444" }}>
            Last scan: <span style={{ color: "#666" }}>{lastScan}</span>
          </div>
        )}
      </div>

      {/* Table header */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "30px 1fr 80px 70px 70px 80px 90px",
        gap: "8px", padding: "8px 16px",
        fontSize: "9px", color: "#444", letterSpacing: "1.5px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        <span>#</span><span>PAIR</span><span>DIRECTION</span>
        <span>TF</span><span>PATTERN</span><span>CHART</span><span>ACTION</span>
      </div>

      {/* Alerts */}
      <div style={{ maxHeight: "calc(100vh - 320px)", overflowY: "auto" }}>
        {scanning ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#444" }}>
            <div style={{ fontSize: "24px", marginBottom: "12px", animation: "pulse 1s infinite" }}>📡</div>
            <div style={{ fontSize: "12px", letterSpacing: "2px" }}>SCANNING {PAIRS.length} PAIRS...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#444" }}>
            <div style={{ fontSize: "24px", marginBottom: "12px" }}>🔍</div>
            <div style={{ fontSize: "12px" }}>No setups found. Try scanning again.</div>
          </div>
        ) : (
          filtered.map(alert => (
            <AlertRow key={`${alert.id}-${alert.timeframe}`} alert={alert} onAnalyze={setSelectedAlert} />
          ))
        )}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.04)",
        padding: "10px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontSize: "9px", color: "#333",
      }}>
        <span>CRT SCANNER • 1D & 4H • {PAIRS.length} PAIRS</span>
        <span style={{ animation: "pulse 2s infinite", color: "#444" }}>● LIVE</span>
      </div>

      {selectedAlert && (
        <AIModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
      )}
    </div>
  );
}
