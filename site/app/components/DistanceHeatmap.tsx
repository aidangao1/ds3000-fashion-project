"use client";

import { useState } from "react";

interface Props {
  labels: string[];
  values: number[][];
}

const CELL = 80;
const LABEL_W = 140;

function interpolateColor(val: number, max: number): string {
  const t = val / max;
  // Blue (similar) -> White -> Red (distant), no gradients in the CSS sense but computed colors
  if (t < 0.5) {
    const s = t * 2;
    const r = Math.round(59 + (255 - 59) * s);
    const g = Math.round(130 + (255 - 130) * s);
    const b = Math.round(189 + (255 - 189) * s);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const s = (t - 0.5) * 2;
    const r = Math.round(255 - (255 - 228) * s);
    const g = Math.round(255 - (255 - 26) * s);
    const b = Math.round(255 - (255 - 28) * s);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

export default function DistanceHeatmap({ labels, values }: Props) {
  const [hovered, setHovered] = useState<[number, number] | null>(null);
  const n = labels.length;
  const max = Math.max(...values.flat().filter((v) => v > 0));
  const W = LABEL_W + n * CELL;
  const H = 32 + n * CELL;

  return (
    <div style={{ overflowX: "auto", margin: "32px 0" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: W, display: "block" }}>
        {/* Column labels */}
        {labels.map((l, j) => (
          <text key={`col${j}`} x={LABEL_W + j * CELL + CELL / 2} y={20} textAnchor="middle" fontSize={10} fill="var(--mid)" fontWeight={600}>
            {l.replace("Yohji Yamamoto", "Yohji").replace("Number (N)ine", "(N)ine").replace("CDG Homme Plus", "CDG HP")}
          </text>
        ))}

        {/* Rows */}
        {labels.map((rowLabel, i) => (
          <g key={`row${i}`}>
            <text x={LABEL_W - 8} y={32 + i * CELL + CELL / 2 + 4} textAnchor="end" fontSize={11} fill="var(--dark)" fontWeight={600}>
              {rowLabel}
            </text>
            {values[i].map((val, j) => {
              const isHov = hovered && hovered[0] === i && hovered[1] === j;
              return (
                <g key={`${i}-${j}`}
                  onMouseEnter={() => setHovered([i, j])}
                  onMouseLeave={() => setHovered(null)}
                >
                  <rect
                    x={LABEL_W + j * CELL}
                    y={32 + i * CELL}
                    width={CELL}
                    height={CELL}
                    fill={i === j ? "var(--bg)" : interpolateColor(val, max)}
                    stroke={isHov ? "var(--black)" : "white"}
                    strokeWidth={isHov ? 2 : 1}
                  />
                  <text
                    x={LABEL_W + j * CELL + CELL / 2}
                    y={32 + i * CELL + CELL / 2 + 4}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={600}
                    fill={val / max > 0.7 ? "white" : "var(--dark)"}
                  >
                    {val.toFixed(3)}
                  </text>
                </g>
              );
            })}
          </g>
        ))}
      </svg>
    </div>
  );
}
