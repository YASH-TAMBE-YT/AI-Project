import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Play, RotateCcw } from "lucide-react";
import type { GraphNode, ReasoningGraph } from "@/engine/types";
import { cn } from "@/utils/cn";
import { SectionLabel } from "./ui";

/* ---------- visual language ---------- */
const STATE_COLORS: Record<GraphNode["state"], { stroke: string; fill: string; text: string; dash?: boolean }> = {
  present:   { stroke: "#2dd4bf", fill: "rgba(45,212,191,0.10)", text: "#99f6e4" },
  absent:    { stroke: "rgba(251,113,133,0.5)", fill: "rgba(244,63,94,0.06)", text: "#fda4af" },
  unknown:   { stroke: "rgba(139,156,186,0.45)", fill: "rgba(139,156,186,0.05)", text: "#8b9cba", dash: true },
  fired:     { stroke: "#22d3ee", fill: "rgba(34,211,238,0.12)", text: "#a5f3fc" },
  pending:   { stroke: "rgba(251,191,36,0.55)", fill: "rgba(251,191,36,0.06)", text: "#fcd34d", dash: true },
  failed:    { stroke: "rgba(100,116,139,0.5)", fill: "rgba(100,116,139,0.06)", text: "#64748b" },
  top:       { stroke: "#22d3ee", fill: "rgba(34,211,238,0.14)", text: "#cffafe" },
  candidate: { stroke: "rgba(129,140,248,0.6)", fill: "rgba(99,102,241,0.10)", text: "#c7d2fe" },
  eliminated:{ stroke: "rgba(100,116,139,0.4)", fill: "rgba(100,116,139,0.05)", text: "#64748b" },
};

const LAYER_Y = [64, 204, 344, 486];
const NODE_H = 44;

interface Positioned extends GraphNode {
  x: number;
  y: number;
  w: number;
}

export default function ReasoningGraphView({ graph, fireOrder }: { graph: ReasoningGraph; fireOrder: string[] }) {
  const [step, setStep] = useState(fireOrder.length + 1); // default: fully revealed
  const [playing, setPlaying] = useState(false);

  const { positioned, width } = useMemo(() => {
    const byLayer = new Map<number, GraphNode[]>();
    for (const n of graph.nodes) {
      const arr = byLayer.get(n.layer) ?? [];
      arr.push(n);
      byLayer.set(n.layer, arr);
    }
    const maxInBand = Math.max(1, ...[...byLayer.values()].map((a) => a.length));
    const width = Math.max(860, maxInBand * 150 + 120);
    const positioned: Positioned[] = [];
    for (const [layer, nodes] of byLayer) {
      const w = layer === 2 ? 104 : layer === 3 ? 190 : 148;
      const gap = (width - 100 - nodes.length * w) / Math.max(1, nodes.length + 1);
      nodes.forEach((n, i) => positioned.push({ ...n, w, x: 50 + gap + i * (w + gap) + w / 2, y: LAYER_Y[layer] ?? 60 }));
    }
    return { positioned, width };
  }, [graph]);

  const byId = useMemo(() => new Map(positioned.map((n) => [n.id, n])), [positioned]);

  /** progressive activation driven by the forward-chaining fire order */
  const activeSet = useMemo(() => {
    if (step >= fireOrder.length + 1) return null; // null → show all
    const set = new Set<string>();
    // known symptoms are active from step 0
    for (const n of positioned) if (n.kind === "symptom" && n.state === "present") set.add(n.id);
    for (let i = 0; i < step && i < fireOrder.length; i++) {
      const ruleId = fireOrder[i];
      set.add(ruleId);
      const rule = positioned.find((p) => p.id === ruleId);
      if (rule) {
        for (const e of graph.edges) {
          if (e.to === ruleId && e.active) set.add(e.from);
          if (e.from === ruleId) { set.add(e.to); }
        }
      }
    }
    return set;
  }, [step, fireOrder, positioned, graph.edges]);

  const play = () => {
    setStep(0);
    setPlaying(true);
    let i = 0;
    const tick = () => {
      i += 1;
      setStep(i);
      if (i <= fireOrder.length) setTimeout(tick, 780);
      else setPlaying(false);
    };
    setTimeout(tick, 780);
  };

  const stepLabel = step === 0
    ? "Working memory — known symptom facts"
    : step <= fireOrder.length
      ? `Cycle event ${step}/${fireOrder.length} — rule ${fireOrder[step - 1]} fired`
      : "Inference fixpoint — no new facts derivable";

  const H = 560;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SectionLabel>Interactive Reasoning Graph</SectionLabel>
        <div className="flex items-center gap-2">
          <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="rounded-lg border border-white/10 bg-white/4 p-2 text-mist-300 transition hover:bg-white/8 disabled:opacity-30">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={play} disabled={playing} className="inline-flex items-center gap-2 rounded-lg border border-pulse-400/40 bg-pulse-400/10 px-3.5 py-2 text-xs font-semibold text-pulse-300 transition hover:bg-pulse-400/20 disabled:opacity-40">
            <Play className="h-3.5 w-3.5" /> Animate Inference
          </button>
          <button onClick={() => setStep((s) => Math.min(fireOrder.length + 1, s + 1))} disabled={step > fireOrder.length} className="rounded-lg border border-white/10 bg-white/4 p-2 text-mist-300 transition hover:bg-white/8 disabled:opacity-30">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button onClick={() => setStep(fireOrder.length + 1)} className="rounded-lg border border-white/10 bg-white/4 p-2 text-mist-300 transition hover:bg-white/8" title="Show full graph">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="mono mb-3 h-4 text-[11px] text-pulse-300/90">{stepLabel}</p>

      <div className="overflow-x-auto rounded-xl border border-white/8 bg-ink-900/60">
        <svg viewBox={`0 0 ${width} ${H}`} className="min-w-[860px]" style={{ width: "100%" }}>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9" fill="none" stroke="#3b4c72" strokeWidth="1.6" />
            </marker>
            <marker id="arrowActive" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9" fill="none" stroke="#22d3ee" strokeWidth="1.6" />
            </marker>
            <marker id="arrowContra" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9" fill="none" stroke="#f43f5e" strokeWidth="1.6" />
            </marker>
          </defs>

          {/* layer captions */}
          {["SYMPTOM FACTS", "DERIVED FACTS", "PRODUCTION RULES", "HYPOTHESES"].map((cap, i) => (
            <text key={cap} x={26} y={(LAYER_Y[i] ?? 60) - NODE_H / 2 - 10} fill="#46536e" fontSize="9.5" fontFamily="JetBrains Mono, monospace" letterSpacing="2.5" textAnchor="start">
              {cap}
            </text>
          ))}

          {/* edges */}
          {graph.edges.map((e, i) => {
            const a = byId.get(e.from);
            const b = byId.get(e.to);
            if (!a || !b) return null;
            const dimmed = activeSet !== null && !(activeSet.has(e.from) && activeSet.has(e.to) && e.active);
            const x1 = a.x, y1 = a.y + NODE_H / 2 - 6;
            const x2 = b.x, y2 = b.y - NODE_H / 2 + 6;
            const stroke = e.negative ? "#f43f5e" : e.active ? "#22d3ee" : "#33415f";
            return (
              <path
                key={i}
                d={`M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`}
                fill="none"
                stroke={stroke}
                strokeOpacity={dimmed ? 0.1 : e.active ? 0.75 : 0.28}
                strokeWidth={e.active ? 1.6 : 1.1}
                strokeDasharray={e.negative ? "5 4" : e.active ? undefined : "3 4"}
                markerEnd={dimmed ? undefined : e.negative ? "url(#arrowContra)" : e.active ? "url(#arrowActive)" : "url(#arrow)"}
                style={{ transition: "stroke-opacity 0.4s" }}
              />
            );
          })}

          {/* nodes */}
          {positioned.map((n) => {
            const c = STATE_COLORS[n.state];
            const dimmed = activeSet !== null && !activeSet.has(n.id);
            const label = n.label.length > 17 ? n.label.slice(0, 16) + "…" : n.label;
            return (
              <motion.g
                key={n.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: dimmed ? 0.22 : 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <title>{n.label}{n.meta ? ` — ${n.meta}` : ""} ({n.state})</title>
                {n.kind === "rule" ? (
                  <>
                    <rect
                      x={n.x - n.w / 2} y={n.y - NODE_H / 2} width={n.w} height={NODE_H} rx={10}
                      fill={c.fill} stroke={c.stroke} strokeWidth={1.4}
                      style={n.state === "fired" ? { filter: "drop-shadow(0 0 10px rgba(34,211,238,0.35))" } : undefined}
                    />
                    <text x={n.x} y={n.y - 2} textAnchor="middle" fill={c.text} fontSize="12.5" fontWeight="700" fontFamily="JetBrains Mono, monospace">
                      {n.id}
                    </text>
                    <text x={n.x} y={n.y + 13} textAnchor="middle" fill="#647696" fontSize="8.2" fontFamily="Inter, sans-serif">
                      {(n.meta ?? "").length > 20 ? n.meta!.slice(0, 19) + "…" : n.meta}
                    </text>
                  </>
                ) : n.kind === "condition" ? (
                  <>
                    <rect
                      x={n.x - n.w / 2} y={n.y - NODE_H / 2} width={n.w} height={NODE_H + 8} rx={14}
                      fill={c.fill} stroke={c.stroke} strokeWidth={n.state === "top" ? 2 : 1.4}
                      style={n.state === "top" ? { filter: "drop-shadow(0 0 16px rgba(34,211,238,0.4))" } : undefined}
                    />
                    <text x={n.x} y={n.y + 1} textAnchor="middle" fill={c.text} fontSize="12.5" fontWeight="700" fontFamily="Space Grotesk, sans-serif">
                      {label}
                    </text>
                    <text x={n.x} y={n.y + 16} textAnchor="middle" fill="#647696" fontSize="8.4" fontFamily="JetBrains Mono, monospace">
                      {n.meta}
                    </text>
                  </>
                ) : n.kind === "derived" ? (
                  <>
                    <path
                      d={`M ${n.x} ${n.y - NODE_H / 2 - 2} L ${n.x + n.w / 2} ${n.y} L ${n.x} ${n.y + NODE_H / 2 + 2} L ${n.x - n.w / 2} ${n.y} Z`}
                      fill={c.fill} stroke={c.stroke} strokeWidth={1.3} strokeDasharray={c.dash ? "4 3" : undefined}
                    />
                    <text x={n.x} y={n.y - 1} textAnchor="middle" fill={c.text} fontSize="10" fontWeight="600" fontFamily="Inter, sans-serif">
                      {label}
                    </text>
                    <text x={n.x} y={n.y + 12} textAnchor="middle" fill="#46536e" fontSize="8" fontFamily="JetBrains Mono, monospace">DERIVED</text>
                  </>
                ) : (
                  <>
                    <rect
                      x={n.x - n.w / 2} y={n.y - NODE_H / 2} width={n.w} height={NODE_H - 8} rx={18}
                      fill={c.fill} stroke={c.stroke} strokeWidth={1.3} strokeDasharray={c.dash ? "4 3" : undefined}
                    />
                    <circle cx={n.x - n.w / 2 + 16} cy={n.y - 4} r={3.2} fill={c.stroke} />
                    <text x={n.x + 6} y={n.y} textAnchor="middle" fill={c.text} fontSize="10.5" fontWeight="600" fontFamily="Inter, sans-serif">
                      {label}
                    </text>
                  </>
                )}
              </motion.g>
            );
          })}
        </svg>
      </div>

      {/* legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        {[
          ["#2dd4bf", "Present / Satisfied"],
          ["#f43f5e", "Contradicts (NOT-premise)"],
          ["#8b9cba", "Unknown evidence"],
          ["#22d3ee", "Fired rule / Top match"],
          ["#fbbf24", "Pending (needs data)"],
        ].map(([color, label]) => (
          <span key={label} className="flex items-center gap-2 text-[11px] text-mist-400">
            <span className="h-2 w-2 rounded-full" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function GraphEmpty() {
  return (
    <div className={cn("rounded-xl border border-white/8 bg-ink-900/60 px-6 py-14 text-center")}>
      <p className="text-sm text-mist-400">No reasoning graph yet — the arena is empty.</p>
      <p className="mono mt-2 text-[11px] text-mist-600">Mark at least one symptom as PRESENT and run the engine.</p>
    </div>
  );
}
