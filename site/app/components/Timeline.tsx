"use client";

import { useState, useMemo } from "react";
import type { Collection } from "../types";
import { DESIGNER_COLORS } from "../colors";

interface Props {
  collections: Collection[];
  varianceExplained: number[];
}

const W = 720;
const H = 360;
const PAD = { top: 24, right: 24, bottom: 40, left: 56 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;

function formatSeason(s: string): string {
  return s.replace("-menswear", "").replace("spring-", "SS").replace("fall-", "FW").replace("pre-fall-", "PF").replace("resort-", "RS");
}

export default function Timeline({ collections, varianceExplained }: Props) {
  const [pcIdx, setPcIdx] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);

  const designers = useMemo(() => {
    return Object.keys(DESIGNER_COLORS).filter(
      (d) => collections.filter((c) => c.designer === d).length >= 4
    );
  }, [collections]);

  const { xMin, xMax, yMin, yMax, scaleX, scaleY } = useMemo(() => {
    const years = collections.map((c) => c.yearAdj);
    const vals = collections.map((c) => c.pc[pcIdx]);
    const xMin = Math.min(...years) - 0.5;
    const xMax = Math.max(...years) + 0.5;
    const pad = 1;
    const yMin = Math.min(...vals) - pad;
    const yMax = Math.max(...vals) + pad;
    return {
      xMin, xMax, yMin, yMax,
      scaleX: (v: number) => PAD.left + ((v - xMin) / (xMax - xMin)) * INNER_W,
      scaleY: (v: number) => PAD.top + ((yMax - v) / (yMax - yMin)) * INNER_H,
    };
  }, [collections, pcIdx]);

  return (
    <div>
      <div className="axis-controls">
        <div className="axis-control">
          <label>Component</label>
          <select value={pcIdx} onChange={(e) => setPcIdx(Number(e.target.value))}>
            {[0, 1, 2, 3, 4].map((i) => (
              <option key={i} value={i}>PC{i + 1} ({(varianceExplained[i] * 100).toFixed(1)}%)</option>
            ))}
          </select>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }}>
        {/* Zero line */}
        {yMin < 0 && yMax > 0 && (
          <line x1={PAD.left} y1={scaleY(0)} x2={PAD.left + INNER_W} y2={scaleY(0)} stroke="var(--rule)" strokeWidth={0.5} />
        )}

        {/* Year ticks */}
        {Array.from({ length: Math.ceil(xMax) - Math.floor(xMin) + 1 }, (_, i) => {
          const yr = Math.floor(xMin) + i;
          if (yr % 2 !== 0) return null;
          const x = scaleX(yr);
          return (
            <g key={yr}>
              <line x1={x} y1={PAD.top} x2={x} y2={PAD.top + INNER_H} stroke="var(--rule)" strokeWidth={0.5} />
              <text x={x} y={H - 8} textAnchor="middle" fontSize={10} fill="var(--light)">{yr}</text>
            </g>
          );
        })}

        {/* Lines + dots per designer */}
        {designers.map((designer) => {
          const pts = collections
            .filter((c) => c.designer === designer)
            .sort((a, b) => a.yearAdj - b.yearAdj);
          const color = DESIGNER_COLORS[designer];
          return (
            <g key={designer}>
              <polyline
                points={pts.map((c) => `${scaleX(c.yearAdj)},${scaleY(c.pc[pcIdx])}`).join(" ")}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                opacity={0.7}
              />
              {pts.map((c) => (
                <circle
                  key={c.id}
                  cx={scaleX(c.yearAdj)}
                  cy={scaleY(c.pc[pcIdx])}
                  r={hovered === c.id ? 5 : 3}
                  fill={color}
                  stroke="white"
                  strokeWidth={0.5}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHovered(c.id)}
                  onMouseLeave={() => setHovered(null)}
                />
              ))}
            </g>
          );
        })}

        {/* Hover label */}
        {hovered !== null && (() => {
          const c = collections.find((c) => c.id === hovered);
          if (!c) return null;
          const tx = scaleX(c.yearAdj);
          const ty = scaleY(c.pc[pcIdx]) - 10;
          return (
            <text x={tx} y={ty} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--black)">
              {c.designer} {formatSeason(c.season)} ({c.pc[pcIdx] > 0 ? "+" : ""}{c.pc[pcIdx].toFixed(1)})
            </text>
          );
        })()}

        <text x={12} y={PAD.top + INNER_H / 2} textAnchor="middle" fontSize={11} fill="var(--mid)" fontWeight={700} transform={`rotate(-90, 12, ${PAD.top + INNER_H / 2})`}>
          PC{pcIdx + 1} Score
        </text>
      </svg>

      <div className="scatter-legend" style={{ marginTop: 12 }}>
        {designers.map((d) => (
          <div className="scatter-legend-item" key={d}>
            <div className="scatter-legend-dot" style={{ background: DESIGNER_COLORS[d] }} />
            {d}
          </div>
        ))}
      </div>
    </div>
  );
}
