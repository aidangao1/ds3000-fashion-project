"use client";

import { useState, useMemo } from "react";
import type { Collection, Loading } from "../types";
import { DESIGNER_COLORS } from "../colors";

interface Props {
  collections: Collection[];
  loadings: Loading[];
  varianceExplained: number[];
}

const W = 720;
const H = 560;
const PAD = { top: 24, right: 24, bottom: 48, left: 56 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;

function formatSeason(s: string): string {
  return s
    .replace("-menswear", "")
    .replace("spring-", "SS")
    .replace("fall-", "FW")
    .replace("pre-fall-", "PF")
    .replace("resort-", "RS");
}

export default function ScatterPlot({ collections, loadings, varianceExplained }: Props) {
  const [pcX, setPcX] = useState(0);
  const [pcY, setPcY] = useState(1);
  const [selected, setSelected] = useState<Collection | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const { xMin, xMax, yMin, yMax, scaleX, scaleY } = useMemo(() => {
    const xs = collections.map((c) => c.pc[pcX]);
    const ys = collections.map((c) => c.pc[pcY]);
    const pad = 0.8;
    const xMin = Math.min(...xs) - pad;
    const xMax = Math.max(...xs) + pad;
    const yMin = Math.min(...ys) - pad;
    const yMax = Math.max(...ys) + pad;
    return {
      xMin, xMax, yMin, yMax,
      scaleX: (v: number) => PAD.left + ((v - xMin) / (xMax - xMin)) * INNER_W,
      scaleY: (v: number) => PAD.top + ((yMax - v) / (yMax - yMin)) * INNER_H,
    };
  }, [collections, pcX, pcY]);

  // Top loadings for arrows
  const topLoadings = useMemo(() => {
    return loadings
      .map((l) => ({
        ...l,
        lx: l.values[pcX],
        ly: l.values[pcY],
        mag: Math.sqrt(l.values[pcX] ** 2 + l.values[pcY] ** 2),
      }))
      .sort((a, b) => b.mag - a.mag)
      .slice(0, 10);
  }, [loadings, pcX, pcY]);

  const arrowScale = Math.max(Math.abs(xMax - xMin), Math.abs(yMax - yMin)) * 0.45;

  const designers = Object.keys(DESIGNER_COLORS);

  const attributes = selected
    ? Object.entries(selected.attributes).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="scatter-wrapper">
      <div className="axis-controls">
        <div className="axis-control">
          <label>X Axis</label>
          <select value={pcX} onChange={(e) => { setPcX(Number(e.target.value)); setSelected(null); }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <option key={i} value={i}>PC{i + 1} ({(varianceExplained[i] * 100).toFixed(1)}%)</option>
            ))}
          </select>
        </div>
        <div className="axis-control">
          <label>Y Axis</label>
          <select value={pcY} onChange={(e) => { setPcY(Number(e.target.value)); setSelected(null); }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <option key={i} value={i}>PC{i + 1} ({(varianceExplained[i] * 100).toFixed(1)}%)</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "flex", gap: 0 }}>
        <svg className="scatter-svg" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: selected ? W : "100%" }}>
          {/* Grid lines */}
          {(() => {
            const lines = [];
            const xStep = Math.ceil((xMax - xMin) / 8);
            for (let v = Math.ceil(xMin); v <= xMax; v += xStep) {
              const x = scaleX(v);
              lines.push(<line key={`xg${v}`} x1={x} y1={PAD.top} x2={x} y2={PAD.top + INNER_H} stroke="var(--rule)" strokeWidth={0.5} />);
            }
            const yStep = Math.ceil((yMax - yMin) / 6);
            for (let v = Math.ceil(yMin); v <= yMax; v += yStep) {
              const y = scaleY(v);
              lines.push(<line key={`yg${v}`} x1={PAD.left} y1={y} x2={PAD.left + INNER_W} y2={y} stroke="var(--rule)" strokeWidth={0.5} />);
            }
            return lines;
          })()}

          {/* Zero lines */}
          {xMin < 0 && xMax > 0 && (
            <line x1={scaleX(0)} y1={PAD.top} x2={scaleX(0)} y2={PAD.top + INNER_H} stroke="var(--light)" strokeWidth={0.5} />
          )}
          {yMin < 0 && yMax > 0 && (
            <line x1={PAD.left} y1={scaleY(0)} x2={PAD.left + INNER_W} y2={scaleY(0)} stroke="var(--light)" strokeWidth={0.5} />
          )}

          {/* Loading arrows */}
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
              <polygon points="0 0, 6 2, 0 4" fill="var(--light)" />
            </marker>
          </defs>
          {topLoadings.map((l) => {
            const cx = scaleX(0);
            const cy = scaleY(0);
            const tx = scaleX(l.lx * arrowScale);
            const ty = scaleY(l.ly * arrowScale);
            return (
              <g key={l.name}>
                <line x1={cx} y1={cy} x2={tx} y2={ty} stroke="var(--light)" strokeWidth={1} markerEnd="url(#arrowhead)" opacity={0.6} />
                <text x={tx + (tx > cx ? 4 : -4)} y={ty - 4} fontSize={9} fill="var(--mid)" textAnchor={tx > cx ? "start" : "end"}>
                  {l.label}
                </text>
              </g>
            );
          })}

          {/* Points */}
          {collections.map((c) => {
            const isSelected = selected?.id === c.id;
            const isHovered = hovered === c.id;
            return (
              <circle
                key={c.id}
                cx={scaleX(c.pc[pcX])}
                cy={scaleY(c.pc[pcY])}
                r={isSelected ? 7 : isHovered ? 6 : 4.5}
                fill={DESIGNER_COLORS[c.designer] || "#999"}
                stroke={isSelected ? "var(--black)" : "white"}
                strokeWidth={isSelected ? 2 : 0.5}
                opacity={selected && !isSelected ? 0.3 : 0.8}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHovered(c.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setSelected(isSelected ? null : c)}
              />
            );
          })}

          {/* Hover tooltip */}
          {hovered !== null && !selected && (() => {
            const c = collections.find((c) => c.id === hovered)!;
            const tx = scaleX(c.pc[pcX]);
            const ty = scaleY(c.pc[pcY]) - 12;
            return (
              <text x={tx} y={ty} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--black)">
                {c.designer} {formatSeason(c.season)}
              </text>
            );
          })()}

          {/* Axis labels */}
          <text x={PAD.left + INNER_W / 2} y={H - 8} textAnchor="middle" fontSize={12} fill="var(--mid)" fontWeight={700}>
            PC{pcX + 1}
          </text>
          <text x={14} y={PAD.top + INNER_H / 2} textAnchor="middle" fontSize={12} fill="var(--mid)" fontWeight={700} transform={`rotate(-90, 14, ${PAD.top + INNER_H / 2})`}>
            PC{pcY + 1}
          </text>
        </svg>

        {/* Detail panel */}
        {selected && (
          <div className="detail-panel" style={{ position: "relative" }}>
            <div className="detail-panel-header">
              <div>
                <h4>{selected.designer}</h4>
                <div style={{ fontSize: 14, color: "var(--mid)", marginTop: 2 }}>
                  {formatSeason(selected.season)} &middot; {selected.numLooks} looks
                </div>
              </div>
              <button className="detail-close" onClick={() => setSelected(null)}>&times;</button>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">PC Scores</div>
              {selected.pc.slice(0, 5).map((v, i) => (
                <div className="detail-row" key={i}>
                  <span className="detail-attr">PC{i + 1}</span>
                  <span className="detail-val">{v > 0 ? "+" : ""}{v.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="detail-section">
              <div className="detail-section-title">Attributes</div>
              {attributes.map(([key, val]) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 0" }}>
                  <span className="detail-attr" style={{ fontSize: 12, minWidth: 110 }}>{key.replace(/_/g, " ")}</span>
                  <div className="detail-bar-container" style={{ flex: 1 }}>
                    <div className="detail-bar-track">
                      <div className="detail-bar-fill" style={{ width: `${(val / 0.3) * 100}%`, maxWidth: "100%" }} />
                    </div>
                    <span className="detail-bar-val">{val.toFixed(3)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="scatter-legend">
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
