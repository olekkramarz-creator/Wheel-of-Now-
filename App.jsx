import { useState, useEffect, useRef, useCallback } from "react";

// ── DATA ──────────────────────────────────────────────────────────────────────
const STORAGE_KEY = "wheel-of-now-v3";

const CATEGORIES = {
  Work:     { color: "#8B7355", light: "#F0EBE1", dot: "#8B7355" },
  Personal: { color: "#7A8B6F", light: "#E8EDE4", dot: "#7A8B6F" },
  Health:   { color: "#6B8B8B", light: "#E4ECEC", dot: "#6B8B8B" },
  Fun:      { color: "#8B6B7A", light: "#EDE4E8", dot: "#8B6B7A" },
  Chores:   { color: "#7B7B6B", light: "#EAEAE0", dot: "#7B7B6B" },
};

const WILDCARDS = [
  { text: "Do it dancing", sub: "Whatever the task — do it while moving your body." },
  { text: "5-minute blitz", sub: "Set a timer. Begin immediately. Stop when it rings." },
  { text: "Eyes closed start", sub: "Start the task before you have time to think about it." },
  { text: "Say it aloud", sub: "Speak out loud what you're about to do, then begin." },
  { text: "Smallest version", sub: "Do just the tiniest possible version of this task." },
  { text: "Backwards", sub: "Start from the last step and work your way forward." },
];

const DEFAULT_TASKS = [
  { id: 1, text: "Reply to emails", category: "Work", spins: 0, skips: 0, done: 0 },
  { id: 2, text: "10-minute walk", category: "Health", spins: 0, skips: 0, done: 0 },
  { id: 3, text: "Clean my desk", category: "Chores", spins: 0, skips: 0, done: 0 },
  { id: 4, text: "Read 10 pages", category: "Fun", spins: 0, skips: 0, done: 0 },
  { id: 5, text: "Call a friend", category: "Personal", spins: 0, skips: 0, done: 0 },
];

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch { return null; }
}
function persist(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}
function easeOut(t) {
  // Smooth quartic deceleration
  const base = 1 - Math.pow(1 - t, 4);
  // Micro-jerk: a faint sine ripple that fades into the last 25% of the spin
  // Almost invisible but gives a tactile, organic mechanical feeling
  const jerkWindow = Math.max(0, (t - 0.75) / 0.25);
  const jerk = Math.sin(t * Math.PI * 18) * 0.003 * jerkWindow * (1 - t);
  return base + jerk;
}

// ── ORGANIC WHEEL ──────────────────────────────────────────────────────────────
function WheelCanvas({ tasks, angle, spinning }) {
  const canvasRef = useRef(null);

  const draw = useCallback((a) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) / 2 - 16;
    ctx.clearRect(0, 0, W, H);

    if (tasks.length === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = "#D4C9B8";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#A89880";
      ctx.font = "14px 'DM Serif Display', serif";
      ctx.textAlign = "center";
      ctx.fillText("add tasks below", cx, cy + 5);
      return;
    }

    const slice = (Math.PI * 2) / tasks.length;
    const cats = Object.keys(CATEGORIES);

    tasks.forEach((task, i) => {
      const cat = CATEGORIES[task.category] || CATEGORIES.Personal;
      const startA = a + i * slice;
      const endA = startA + slice;
      const mid = startA + slice / 2;

      // Segment fill
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, startA, endA);
      ctx.closePath();
      ctx.fillStyle = i % 2 === 0 ? "#F5F0E8" : "#EDE8DE";
      ctx.fill();

      // Subtle category color band at edge
      ctx.beginPath();
      ctx.arc(cx, cy, R, startA, endA);
      ctx.arc(cx, cy, R - 10, endA, startA, true);
      ctx.closePath();
      ctx.fillStyle = cat.light;
      ctx.fill();

      // Thin separator
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(startA) * R, cy + Math.sin(startA) * R);
      ctx.strokeStyle = "#C8BEA8";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Label — fit text inside the segment arc
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(mid);

      // Available radial length: from center hub (28px) to outer edge minus padding
      const textStart = 32;
      const textEnd = R - 14;
      const maxTextWidth = textEnd - textStart;

      const fontSize = Math.max(11, Math.min(13, 14 - tasks.length * 0.3));
      ctx.font = `700 ${fontSize}px 'DM Sans', sans-serif`;

      // Truncate label to fit available width
      let label = task.text;
      while (label.length > 1 && ctx.measureText(label).width > maxTextWidth) {
        label = label.slice(0, -1);
      }
      if (label.length < task.text.length) label = label.slice(0, -1) + "…";

      // Clip to segment so text can't bleed outside
      ctx.beginPath();
      ctx.moveTo(textStart, 0);
      ctx.lineTo(textEnd, 0);
      ctx.rect(textStart, -(R * 0.5), maxTextWidth, R);

      // White halo stroke for legibility
      ctx.strokeStyle = "rgba(255,255,255,0.92)";
      ctx.lineWidth = 3.5;
      ctx.lineJoin = "round";
      ctx.textAlign = "left";
      ctx.strokeText(label, textStart, 4.5);
      // Bold dark fill
      ctx.fillStyle = "#2C2420";
      ctx.fillText(label, textStart, 4.5);
      ctx.restore();
    });

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = "#C8BEA8";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.fillStyle = "#F9F6F0";
    ctx.fill();
    ctx.strokeStyle = "#D4C9B8";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#8B7355";
    ctx.fill();

  }, [tasks]);

  useEffect(() => { draw(angle); }, [angle, draw]);

  return (
    <canvas ref={canvasRef} width={300} height={300}
      style={{ display: "block", maxWidth: "100%", opacity: spinning ? 0.92 : 1, transition: "opacity 0.3s" }} />
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const saved = load();
  const [tasks, setTasks] = useState(saved?.tasks || DEFAULT_TASKS);
  const [streak, setStreak] = useState(saved?.streak || 0);
  const [totalDone, setTotalDone] = useState(saved?.totalDone || 0);
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [wildcard, setWildcard] = useState(null);
  const [screen, setScreen] = useState("wheel");
  const [newText, setNewText] = useState("");
  const [newCat, setNewCat] = useState("Work");
  const [showAdd, setShowAdd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const spinRef = useRef(null);
  const nextId = useRef(saved?.tasks ? Math.max(...saved.tasks.map(t => t.id), 0) + 1 : 10);

  useEffect(() => {
    persist({ tasks, streak, totalDone });
  }, [tasks, streak, totalDone]);

  const activeTasks = tasks.filter(t => t.text);

  function spin() {
    if (spinning || activeTasks.length === 0) return;
    setWinner(null); setWildcard(null);
    setSpinning(true);

    const targetIdx = Math.floor(Math.random() * activeTasks.length);
    const sliceAngle = (Math.PI * 2) / activeTasks.length;
    const extraSpins = 8 + Math.floor(Math.random() * 4);
    const targetOffset = -Math.PI / 2 - (targetIdx * sliceAngle + sliceAngle / 2);
    const totalRotation = Math.PI * 2 * extraSpins + ((targetOffset - angle + Math.PI * 2 * 10) % (Math.PI * 2));
    const duration = 6000 + Math.random() * 1000;
    const startA = angle, start = performance.now();
    const isWildcard = Math.random() < 0.18;

    function frame(now) {
      const t = Math.min((now - start) / duration, 1);
      const cur = startA + totalRotation * easeOut(t);
      setAngle(cur);
      if (t < 1) { spinRef.current = requestAnimationFrame(frame); }
      else {
        const chosen = activeTasks[targetIdx];
        setWinner(chosen);
        if (isWildcard) setWildcard(WILDCARDS[Math.floor(Math.random() * WILDCARDS.length)]);
        setSpinning(false);
        setTasks(p => p.map(t => t.id === chosen.id ? { ...t, spins: (t.spins || 0) + 1 } : t));
        setTimeout(() => setScreen("result"), 400);
      }
    }
    spinRef.current = requestAnimationFrame(frame);
  }

  function markDone() {
    if (!winner) return;
    setTasks(p => p.map(t => t.id === winner.id ? { ...t, done: (t.done || 0) + 1 } : t));
    setStreak(s => s + 1);
    setTotalDone(d => d + 1);
    setWinner(null); setScreen("wheel");
  }

  function markSkip() {
    if (!winner) return;
    setTasks(p => p.map(t => t.id === winner.id ? { ...t, skips: (t.skips || 0) + 1 } : t));
    setStreak(0);
    setWinner(null); setScreen("wheel");
  }

  function addTask() {
    if (!newText.trim()) return;
    setTasks(p => [...p, { id: nextId.current++, text: newText.trim(), category: newCat, spins: 0, skips: 0, done: 0 }]);
    setNewText(""); setShowAdd(false);
  }

  const mostSkipped = [...tasks].sort((a, b) => (b.skips || 0) - (a.skips || 0))[0];

  const base = {
    fontFamily: "'DM Serif Display', serif",
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F2EDE3; }
        input, select, textarea { font-family: 'DM Sans', sans-serif; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #D4C9B8; border-radius: 4px; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
        @keyframes softPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.015); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "#F2EDE3",
        fontFamily: "'DM Sans', sans-serif",
        color: "#3D3530",
        maxWidth: 420,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        paddingBottom: 88,
      }}>

        {/* ── HEADER ── */}
        <div style={{ padding: "40px 28px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, fontWeight: 400, color: "#2C2420", letterSpacing: "-0.3px", lineHeight: 1 }}>
              Wheel of Now
            </h1>
            <p style={{ fontSize: 13, color: "#A89880", marginTop: 5, fontWeight: 300, letterSpacing: "0.01em" }}>
              {totalDone > 0 ? `${totalDone} things done` : "spin. decide. do."}
              {streak > 1 ? ` · ${streak} in a row` : ""}
            </p>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {[{ label: "Tasks", s: "manage" }, { label: "Insights", s: "insight" }].map(({ label, s }) => (
              <button key={s} onClick={() => setScreen(screen === s ? "wheel" : s)} style={{
                background: screen === s ? "#E8E0D2" : "transparent",
                border: "1px solid #D4C9B8",
                borderRadius: 20, padding: "6px 14px",
                fontSize: 12, color: screen === s ? "#3D3530" : "#A89880",
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                fontWeight: 400, transition: "all 0.2s",
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* ── WHEEL SCREEN ── */}
        {screen === "wheel" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 28px 0", animation: "fadeUp 0.4s ease" }}>

            {/* Pointer + wheel */}
            <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
              {/* Pointer */}
              <div style={{
                width: 2, height: 20, background: "#8B7355",
                borderRadius: 2, marginBottom: -2, zIndex: 2,
                position: "relative",
              }}>
                <div style={{
                  position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)",
                  width: 10, height: 10, borderRadius: "50%",
                  background: "#8B7355", boxShadow: "0 2px 8px rgba(139,115,85,0.4)",
                }} />
              </div>
              <WheelCanvas tasks={activeTasks} angle={angle} spinning={spinning} />
            </div>

            {/* Spin button */}
            <button
              onClick={spin}
              disabled={spinning || activeTasks.length === 0}
              style={{
                marginTop: 32,
                background: spinning ? "#E8E0D2" : "#3D3530",
                color: spinning ? "#A89880" : "#F2EDE3",
                border: "none",
                borderRadius: 100,
                padding: "16px 52px",
                fontSize: 15,
                fontFamily: "'DM Serif Display', serif",
                fontWeight: 400,
                cursor: spinning ? "default" : "pointer",
                letterSpacing: "0.04em",
                transition: "all 0.3s ease",
                animation: !spinning && activeTasks.length > 0 ? "softPulse 3s ease-in-out infinite" : "none",
                boxShadow: spinning ? "none" : "0 4px 24px rgba(61,53,48,0.18)",
              }}
            >
              {spinning ? "spinning…" : activeTasks.length === 0 ? "add a task first" : "Spin"}
            </button>

            {activeTasks.length > 0 && (
              <p style={{ marginTop: 16, fontSize: 12, color: "#C0B09A", letterSpacing: "0.02em" }}>
                {activeTasks.length} task{activeTasks.length !== 1 ? "s" : ""} in the wheel
              </p>
            )}

            {/* Category dots legend */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 28, justifyContent: "center" }}>
              {Object.entries(CATEGORIES).map(([cat, { dot }]) => {
                const count = activeTasks.filter(t => t.category === cat).length;
                if (!count) return null;
                return (
                  <div key={cat} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: dot }} />
                    <span style={{ fontSize: 12, color: "#A89880", fontWeight: 300 }}>{cat}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── RESULT SCREEN ── */}
        {screen === "result" && winner && (
          <div style={{
            padding: "48px 32px 0", animation: "fadeUp 0.5s ease",
            display: "flex", flexDirection: "column",
          }}>
            <p style={{ fontSize: 11, color: "#C0B09A", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>
              The wheel chose
            </p>

            {/* Task card */}
            <div style={{
              background: CATEGORIES[winner.category]?.light || "#F0EBE1",
              borderRadius: 20, padding: "32px 28px",
              border: "1px solid #E0D8CC",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: CATEGORIES[winner.category]?.dot }} />
                <span style={{ fontSize: 12, color: CATEGORIES[winner.category]?.color, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {winner.category}
                </span>
              </div>
              <h2 style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 28, fontWeight: 400, color: "#2C2420",
                lineHeight: 1.25, letterSpacing: "-0.3px",
              }}>{winner.text}</h2>

              {winner.skips > 1 && (
                <p style={{ marginTop: 16, fontSize: 13, color: "#A89880", fontStyle: "italic", fontFamily: "'DM Serif Display', serif" }}>
                  You've avoided this {winner.skips} times.
                </p>
              )}
            </div>

            {/* Wildcard */}
            {wildcard && (
              <div style={{
                marginTop: 16, background: "#F9F6F0",
                borderRadius: 16, padding: "20px 24px",
                border: "1px solid #E0D8CC",
                animation: "fadeUp 0.5s 0.15s both",
              }}>
                <p style={{ fontSize: 11, color: "#C0B09A", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                  Wildcard
                </p>
                <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: "#2C2420", marginBottom: 6 }}>
                  {wildcard.text}
                </p>
                <p style={{ fontSize: 13, color: "#A89880", lineHeight: 1.5, fontWeight: 300 }}>{wildcard.sub}</p>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={markSkip} style={{
                flex: 1, padding: "15px 0",
                background: "transparent", border: "1px solid #D4C9B8",
                borderRadius: 100, color: "#A89880",
                fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.2s",
              }}>Skip</button>
              <button onClick={markDone} style={{
                flex: 2, padding: "15px 0",
                background: "#3D3530", border: "none",
                borderRadius: 100, color: "#F2EDE3",
                fontSize: 14, cursor: "pointer", fontFamily: "'DM Serif Display', serif",
                letterSpacing: "0.04em", boxShadow: "0 4px 20px rgba(61,53,48,0.2)",
                transition: "all 0.2s",
              }}>Done</button>
            </div>

            <button onClick={() => { setWinner(null); setScreen("wheel"); }} style={{
              background: "none", border: "none", color: "#C0B09A",
              fontSize: 13, cursor: "pointer", marginTop: 20,
              fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.02em",
            }}>
              ← spin again
            </button>
          </div>
        )}

        {/* ── MANAGE SCREEN ── */}
        {screen === "manage" && (
          <div style={{ padding: "32px 28px 0", animation: "fadeUp 0.4s ease" }}>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, fontWeight: 400, color: "#2C2420", marginBottom: 6 }}>
              Your Tasks
            </h2>
            <p style={{ fontSize: 13, color: "#A89880", marginBottom: 28, fontWeight: 300 }}>
              Everything in the wheel
            </p>

            {/* Add task */}
            {!showAdd ? (
              <button onClick={() => setShowAdd(true)} style={{
                width: "100%", padding: "16px",
                background: "transparent", border: "1.5px dashed #D4C9B8",
                borderRadius: 16, color: "#A89880",
                fontSize: 14, cursor: "pointer",
                fontFamily: "'DM Serif Display', serif",
                marginBottom: 20, transition: "all 0.2s",
              }}>+ Add a task</button>
            ) : (
              <div style={{
                background: "#F9F6F0", borderRadius: 20, padding: 20,
                border: "1px solid #E0D8CC", marginBottom: 20,
              }}>
                <input
                  value={newText}
                  onChange={e => setNewText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addTask()}
                  placeholder="What needs doing?"
                  autoFocus
                  style={{
                    width: "100%", background: "transparent", border: "none",
                    borderBottom: "1px solid #D4C9B8", padding: "8px 0",
                    fontSize: 16, color: "#2C2420", outline: "none",
                    fontFamily: "'DM Serif Display', serif", marginBottom: 16,
                  }}
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                  {Object.entries(CATEGORIES).map(([cat, { dot, color }]) => (
                    <button key={cat} onClick={() => setNewCat(cat)} style={{
                      padding: "5px 14px", borderRadius: 20,
                      border: `1px solid ${newCat === cat ? dot : "#D4C9B8"}`,
                      background: newCat === cat ? "#F2EDE3" : "transparent",
                      color: newCat === cat ? color : "#A89880",
                      fontSize: 12, cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                      transition: "all 0.15s",
                    }}>{cat}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setShowAdd(false); setNewText(""); }} style={{
                    flex: 1, padding: "11px 0", background: "transparent",
                    border: "1px solid #D4C9B8", borderRadius: 100,
                    color: "#A89880", fontSize: 13, cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                  }}>Cancel</button>
                  <button onClick={addTask} style={{
                    flex: 2, padding: "11px 0", background: "#3D3530",
                    border: "none", borderRadius: 100,
                    color: "#F2EDE3", fontSize: 13, cursor: "pointer",
                    fontFamily: "'DM Serif Display', serif",
                  }}>Add to wheel</button>
                </div>
              </div>
            )}

            {/* Task list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {tasks.map(task => {
                const cat = CATEGORIES[task.category] || CATEGORIES.Personal;
                return (
                  <div key={task.id} style={{
                    display: "flex", alignItems: "center",
                    background: "#F9F6F0", borderRadius: 14, padding: "14px 18px",
                    border: "1px solid #E8E0D2", gap: 14,
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: cat.dot, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 15, color: "#2C2420", fontFamily: "'DM Serif Display', serif", fontWeight: 400 }}>
                        {task.text}
                      </p>
                      <p style={{ fontSize: 11, color: "#C0B09A", marginTop: 3, fontWeight: 300 }}>
                        {task.category} · done {task.done || 0}×
                        {(task.skips || 0) > 0 ? ` · skipped ${task.skips}×` : ""}
                      </p>
                    </div>
                    <button onClick={() => setTasks(p => p.filter(t => t.id !== task.id))} style={{
                      background: "none", border: "none",
                      color: "#D4C9B8", fontSize: 18, cursor: "pointer",
                      lineHeight: 1, padding: 0, flexShrink: 0,
                    }}>×</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── INSIGHT SCREEN ── */}
        {screen === "insight" && (
          <div style={{ padding: "32px 28px 0", animation: "fadeUp 0.4s ease" }}>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, fontWeight: 400, color: "#2C2420", marginBottom: 6 }}>
              Your patterns
            </h2>
            <p style={{ fontSize: 13, color: "#A89880", marginBottom: 32, fontWeight: 300, fontStyle: "italic", fontFamily: "'DM Serif Display', serif" }}>
              The wheel sees what you resist.
            </p>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              {[
                { label: "things done", val: totalDone },
                { label: "current streak", val: streak > 0 ? `${streak} ✦` : "—" },
              ].map(({ label, val }) => (
                <div key={label} style={{
                  background: "#F9F6F0", borderRadius: 16,
                  padding: "20px 18px", border: "1px solid #E8E0D2",
                }}>
                  <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: "#2C2420", fontWeight: 400 }}>{val}</p>
                  <p style={{ fontSize: 11, color: "#A89880", marginTop: 6, fontWeight: 300, letterSpacing: "0.04em" }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Avoidance */}
            {mostSkipped && (mostSkipped.skips || 0) > 0 && (
              <div style={{
                background: "#F5F0E8", borderRadius: 16, padding: "22px 20px",
                border: "1px solid #E0D8CC", marginTop: 10,
              }}>
                <p style={{ fontSize: 11, color: "#C0B09A", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                  Most avoided
                </p>
                <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: "#2C2420", marginBottom: 8 }}>
                  "{mostSkipped.text}"
                </p>
                <p style={{ fontSize: 13, color: "#A89880", lineHeight: 1.6, fontWeight: 300 }}>
                  Skipped {mostSkipped.skips}× out of {mostSkipped.spins || 0} spins.
                  {mostSkipped.spins > 0 && ` That's ${Math.round(((mostSkipped.skips || 0) / mostSkipped.spins) * 100)}% of the time.`}
                </p>
              </div>
            )}

            {/* Category breakdown */}
            <div style={{ marginTop: 20 }}>
              {Object.entries(CATEGORIES).map(([cat, { dot, color }]) => {
                const catTasks = tasks.filter(t => t.category === cat);
                const done = catTasks.reduce((s, t) => s + (t.done || 0), 0);
                const total = catTasks.reduce((s, t) => s + (t.done || 0) + (t.skips || 0), 0);
                if (!catTasks.length) return null;
                const pct = total > 0 ? (done / total) * 100 : 0;
                return (
                  <div key={cat} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: dot }} />
                        <span style={{ fontSize: 13, color: "#3D3530" }}>{cat}</span>
                      </div>
                      <span style={{ fontSize: 12, color: "#A89880", fontWeight: 300 }}>
                        {done} done
                      </span>
                    </div>
                    <div style={{ height: 3, background: "#E8E0D2", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", background: dot, borderRadius: 2,
                        width: `${pct}%`, transition: "width 1s ease",
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── BOTTOM NAV ── */}
        <div style={{
          position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "100%", maxWidth: 420,
          background: "linear-gradient(to top, #F2EDE3 75%, rgba(242,237,227,0))",
          padding: "12px 28px 28px",
          display: "flex", justifyContent: "center", gap: 4,
        }}>
          {[
            { label: "Spin", s: "wheel" },
            { label: "Insights", s: "insight" },
            { label: "Tasks", s: "manage" },
          ].map(({ label, s }) => (
            <button key={s} onClick={() => setScreen(s)} style={{
              flex: 1, padding: "10px 8px",
              background: screen === s ? "#E8E0D2" : "transparent",
              border: "1px solid",
              borderColor: screen === s ? "#D4C9B8" : "transparent",
              borderRadius: 100, color: screen === s ? "#3D3530" : "#A89880",
              cursor: "pointer", fontSize: 13,
              fontFamily: screen === s ? "'DM Serif Display', serif" : "'DM Sans', sans-serif",
              transition: "all 0.2s",
            }}>{label}</button>
          ))}
        </div>
      </div>
    </>
  );
}
