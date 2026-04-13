"use client";

import { useState, useEffect, useCallback } from "react";

interface Props {
  designer: string;
  season: string;
  onClose: () => void;
}

const DESIGNER_SLUGS: Record<string, string> = {
  "CDG Homme Plus": "comme-des-garcons-homme-plus",
  "Yohji Yamamoto": "yohji-yamamoto",
  "Undercover": "undercover",
  "Sacai": "sacai",
  "Number (N)ine": "number-n-ine",
  "visvim": "visvim",
};

function formatSeason(s: string): string {
  return s
    .replace("-menswear", "")
    .replace("spring-", "SS")
    .replace("fall-", "FW")
    .replace("pre-fall-", "PF")
    .replace("resort-", "RS");
}

export default function Gallery({ designer, season, onClose }: Props) {
  const [urls, setUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  useEffect(() => {
    const slug = DESIGNER_SLUGS[designer] || designer;
    const key = `${slug}/${season}`;

    fetch("/image_urls.json")
      .then((r) => r.json())
      .then((data: Record<string, string[]>) => {
        setUrls(data[key] || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [designer, season]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (activeIdx === null) {
        if (e.key === "Escape") onClose();
        return;
      }
      if (e.key === "Escape") setActiveIdx(null);
      if (e.key === "ArrowRight" && activeIdx < urls.length - 1) setActiveIdx(activeIdx + 1);
      if (e.key === "ArrowLeft" && activeIdx > 0) setActiveIdx(activeIdx - 1);
    },
    [activeIdx, urls.length, onClose]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(255,255,255,0.97)",
      overflow: "auto",
    }}>
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "var(--bg)",
        borderBottom: "1px solid var(--rule)",
        padding: "16px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 16, color: "var(--black)" }}>
            {designer}
          </span>
          <span style={{ color: "var(--light)", marginLeft: 8, fontSize: 14 }}>
            {formatSeason(season)} &middot; {urls.length} looks
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none", border: "1px solid var(--rule)",
            padding: "6px 16px", fontSize: 13, cursor: "pointer",
            fontFamily: "inherit", color: "var(--dark)",
          }}
        >
          Close
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ padding: 48, textAlign: "center", color: "var(--light)" }}>
          Loading...
        </div>
      )}

      {/* No images */}
      {!loading && urls.length === 0 && (
        <div style={{ padding: 48, textAlign: "center", color: "var(--light)" }}>
          No images available for this collection.
        </div>
      )}

      {/* Grid */}
      {!loading && urls.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 2,
          padding: 2,
        }}>
          {urls.map((url, idx) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={idx}
              src={url}
              alt={`Look ${idx + 1}`}
              loading="lazy"
              onClick={() => setActiveIdx(idx)}
              style={{
                width: "100%",
                aspectRatio: "2/3",
                objectFit: "cover",
                display: "block",
                cursor: "pointer",
                background: "#f5f5f5",
              }}
            />
          ))}
        </div>
      )}

      {/* Lightbox */}
      {activeIdx !== null && (
        <div
          onClick={() => setActiveIdx(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.9)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          {/* Nav buttons */}
          {activeIdx > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setActiveIdx(activeIdx - 1); }}
              style={{
                position: "absolute", left: 24, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", color: "white", fontSize: 36,
                cursor: "pointer", padding: 12,
              }}
            >
              &lsaquo;
            </button>
          )}
          {activeIdx < urls.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setActiveIdx(activeIdx + 1); }}
              style={{
                position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", color: "white", fontSize: 36,
                cursor: "pointer", padding: 12,
              }}
            >
              &rsaquo;
            </button>
          )}

          {/* Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urls[activeIdx]}
            alt={`Look ${activeIdx + 1}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxHeight: "90vh", maxWidth: "90vw",
              objectFit: "contain", cursor: "default",
            }}
          />

          {/* Counter */}
          <div style={{
            position: "absolute", bottom: 24,
            color: "rgba(255,255,255,0.6)", fontSize: 13,
            fontVariantNumeric: "tabular-nums",
          }}>
            {activeIdx + 1} / {urls.length}
          </div>
        </div>
      )}
    </div>
  );
}
