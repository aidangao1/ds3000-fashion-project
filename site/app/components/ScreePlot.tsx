"use client";

import { DESIGNER_COLORS } from "../colors";

interface Props {
  singularValues: number[];
  varianceExplained: number[];
}

const W = 720;
const H = 300;
const PAD = { top: 24, right: 24, bottom: 40, left: 56 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;

export default function ScreePlot({ singularValues, varianceExplained }: Props) {
  const cumulative = varianceExplained.reduce<number[]>((acc, v) => {
    acc.push((acc.length ? acc[acc.length - 1] : 0) + v);
    return acc;
  }, []);

  const n = Math.min(15, singularValues.length);
  const barW = INNER_W / n * 0.7;
  const gap = INNER_W / n;
  const maxS = Math.max(...singularValues.slice(0, n));

  return (
    <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
      {/* Singular values */}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ flex: "1 1 340px", maxWidth: 500 }}>
        {Array.from({ length: n }, (_, i) => {
          const x = PAD.left + i * gap;
          const h = (singularValues[i] / maxS) * INNER_H;
          return (
            <g key={i}>
              <rect x={x} y={PAD.top + INNER_H - h} width={barW} height={h} fill="var(--black)" opacity={0.75} />
              {i % 2 === 0 && (
                <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize={10} fill="var(--light)">{i + 1}</text>
              )}
            </g>
          );
        })}
        <text x={PAD.left + INNER_W / 2} y={H - 0} textAnchor="middle" fontSize={11} fill="var(--mid)" fontWeight={700}>Component</text>
        <text x={12} y={PAD.top + INNER_H / 2} textAnchor="middle" fontSize={11} fill="var(--mid)" fontWeight={700} transform={`rotate(-90, 12, ${PAD.top + INNER_H / 2})`}>Singular Value</text>
      </svg>

      {/* Cumulative variance */}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ flex: "1 1 340px", maxWidth: 500 }}>
        {/* 80% line */}
        <line
          x1={PAD.left} y1={PAD.top + INNER_H * (1 - 0.8)}
          x2={PAD.left + INNER_W} y2={PAD.top + INNER_H * (1 - 0.8)}
          stroke="var(--rule)" strokeWidth={1} strokeDasharray="4,4"
        />
        <text x={PAD.left + INNER_W + 4} y={PAD.top + INNER_H * (1 - 0.8) + 4} fontSize={10} fill="var(--light)">80%</text>

        {/* Bars */}
        {Array.from({ length: n }, (_, i) => {
          const x = PAD.left + i * gap;
          const h = varianceExplained[i] * INNER_H;
          return (
            <g key={i}>
              <rect x={x} y={PAD.top + INNER_H - h} width={barW} height={h} fill="var(--black)" opacity={0.25} />
              {i % 2 === 0 && (
                <text x={x + barW / 2} y={H - 8} textAnchor="middle" fontSize={10} fill="var(--light)">{i + 1}</text>
              )}
            </g>
          );
        })}

        {/* Cumulative line */}
        <polyline
          points={Array.from({ length: n }, (_, i) => {
            const x = PAD.left + i * gap + barW / 2;
            const y = PAD.top + INNER_H * (1 - cumulative[i]);
            return `${x},${y}`;
          }).join(" ")}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
        />
        {Array.from({ length: n }, (_, i) => {
          const x = PAD.left + i * gap + barW / 2;
          const y = PAD.top + INNER_H * (1 - cumulative[i]);
          return <circle key={i} cx={x} cy={y} r={3} fill="var(--accent)" />;
        })}

        <text x={PAD.left + INNER_W / 2} y={H - 0} textAnchor="middle" fontSize={11} fill="var(--mid)" fontWeight={700}>Component</text>
        <text x={12} y={PAD.top + INNER_H / 2} textAnchor="middle" fontSize={11} fill="var(--mid)" fontWeight={700} transform={`rotate(-90, 12, ${PAD.top + INNER_H / 2})`}>Variance (%)</text>
      </svg>
    </div>
  );
}
