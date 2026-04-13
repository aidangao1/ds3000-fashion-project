import { readFileSync } from "fs";
import { join } from "path";
import type { DataSet } from "./types";
import ScatterPlot from "./components/ScatterPlot";
import ScreePlot from "./components/ScreePlot";
import DistanceHeatmap from "./components/DistanceHeatmap";
import Timeline from "./components/Timeline";

function loadData(): DataSet {
  const raw = readFileSync(join(process.cwd(), "public", "data.json"), "utf-8");
  return JSON.parse(raw);
}

export default function Home() {
  const data = loadData();
  const totalLooks = data.collections.reduce((s, c) => s + c.numLooks, 0);
  const cumVar = data.varianceExplained.slice(0, 5).reduce((s, v) => s + v, 0);

  const pcInterpretations = [
    { pc: "PC1", var: "29.7%", interp: "Construction technique", loadings: "\u2212distressed, \u2212raw edges, \u2212fabric cotton, \u2212fabric light" },
    { pc: "PC2", var: "18.8%", interp: "Formality axis", loadings: "+color black, +structured, +tailored formal, +draped" },
    { pc: "PC3", var: "14.1%", interp: "Pattern density", loadings: "+floral print, \u2212no print, +abstract print" },
    { pc: "PC4", var: "8.1%", interp: "Weight and darkness", loadings: "+fabric heavy, +gothic dark, +punk grunge" },
    { pc: "PC5", var: "7.2%", interp: "Silhouette volume", loadings: "\u2212silhouette slim, +military, +oversized" },
  ];

  const strongCorr = [
    ["minimal layering \u2194 no print", "0.88"],
    ["draped \u2194 deconstructed", "0.85"],
    ["floral \u2194 abstract print", "0.81"],
    ["patchwork \u2194 abstract print", "0.80"],
    ["raw edges \u2194 deconstructed", "0.79"],
  ];

  const negCorr = [
    ["black \u2194 bright color", "\u22120.59"],
    ["black \u2194 plaid", "\u22120.51"],
    ["black \u2194 patchwork", "\u22120.46"],
    ["tailored \u2194 streetwear", "\u22120.40"],
    ["knit \u2194 black", "\u22120.39"],
  ];

  return (
    <>
      <header>
        <div className="container">
          <h2>DS3000 Final Project</h2>
          <h1>Latent Aesthetics in<br />Japanese Menswear</h1>
          <p className="subtitle">Uncovering shared aesthetic DNA through SVD</p>
          <p className="large-text" style={{ marginTop: 24 }}>
            We applied Singular Value Decomposition to {totalLooks.toLocaleString()} runway looks
            across six Japanese menswear designers, reducing 31 CLIP-scored attributes to a handful
            of latent aesthetic dimensions.
          </p>
        </div>
      </header>

      {/* Stats */}
      <div className="container">
        <div className="stats">
          <div className="stat">
            <div className="stat-number">{totalLooks.toLocaleString()}</div>
            <div className="stat-label">Runway Looks</div>
          </div>
          <div className="stat">
            <div className="stat-number">{data.collections.length}</div>
            <div className="stat-label">Collections</div>
          </div>
          <div className="stat">
            <div className="stat-number">{data.attributes.length}</div>
            <div className="stat-label">Attributes</div>
          </div>
          <div className="stat">
            <div className="stat-number">{Object.keys(data.centroids).length}</div>
            <div className="stat-label">Designers</div>
          </div>
        </div>
      </div>

      {/* Designers */}
      <section>
        <div className="container">
          <div className="section-header">
            <h2>The Designers</h2>
            <h3>Six voices, two decades</h3>
          </div>
          <div className="designers">
            {[
              { name: "Yohji Yamamoto", line: "Pour Homme", key: "Yohji Yamamoto" },
              { name: "Rei Kawakubo", line: "CDG Homme Plus", key: "CDG Homme Plus" },
              { name: "Jun Takahashi", line: "Undercover", key: "Undercover" },
              { name: "Chitose Abe", line: "Sacai", key: "Sacai" },
              { name: "Takahiro Miyashita", line: "Number (N)ine", key: "Number (N)ine" },
              { name: "Hiroki Nakamura", line: "visvim", key: "visvim" },
            ].map((d) => {
              const c = data.centroids[d.key];
              return (
                <div className="designer-card" key={d.key}>
                  <div className="designer-name">{d.name}</div>
                  <div className="designer-meta">
                    {d.line} &middot; {c?.count || 0} collections
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Scree */}
      <section>
        <div className="container">
          <div className="section-header">
            <h2>Dimensionality Reduction</h2>
            <h3>31 attributes collapse into 5 dimensions</h3>
            <p className="large-text">
              The scree plot shows a clear elbow after the third component.
              Five components capture {(cumVar * 100).toFixed(0)}% of the total variance &mdash;
              a strong reduction from the original 31 attributes.
            </p>
          </div>
          <ScreePlot singularValues={data.singularValues} varianceExplained={data.varianceExplained} />

          <table className="pc-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Variance</th>
                <th>Interpretation</th>
                <th>Top Loadings</th>
              </tr>
            </thead>
            <tbody>
              {pcInterpretations.map((row) => (
                <tr key={row.pc}>
                  <td>{row.pc}</td>
                  <td style={{ color: "var(--mid)", fontVariantNumeric: "tabular-nums" }}>{row.var}</td>
                  <td>{row.interp}</td>
                  <td style={{ fontSize: 14, color: "var(--mid)" }}>{row.loadings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Interactive Biplot */}
      <section>
        <div className="container">
          <div className="section-header">
            <h2>Principal Component Space</h2>
            <h3>Click any point to inspect</h3>
            <p className="large-text">
              Each dot is one collection. Select any point to see its PC scores and all 31 CLIP
              attribute values. Use the axis selectors to explore different component pairs.
            </p>
          </div>
        </div>
        <div className="wide">
          <ScatterPlot
            collections={data.collections}
            loadings={data.loadings}
            varianceExplained={data.varianceExplained}
          />
        </div>
        <div className="container">
          <div className="insights">
            <div className="insight">
              <div className="insight-title">Most Extreme on PC1</div>
              <p>CDG Homme Plus SS22 scored &minus;8.11 (most deconstructed), while Sacai FW16 scored +8.03 (cleanest). A 16-point swing on the construction axis.</p>
            </div>
            <div className="insight">
              <div className="insight-title">CDG vs. Undercover</div>
              <p>Both score negative on PC1 (deconstructed), but split on PC2: CDG tends formal and dark, Undercover tends casual and graphic. Shared DNA is in construction, not mood.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Clustering */}
      <section>
        <div className="container">
          <div className="section-header">
            <h2>Designer Proximity</h2>
            <h3>Who sounds like whom</h3>
            <p className="large-text">
              Cosine distance between designer centroids in the full PC space.
              Low values mean shared visual vocabulary.
            </p>
          </div>
        </div>
        <div className="wide">
          <DistanceHeatmap
            labels={data.distanceMatrix.labels}
            values={data.distanceMatrix.values}
          />
        </div>
        <div className="container">
          <div className="insights">
            <div className="insight">
              <div className="insight-title">Closest Pair</div>
              <p>Undercover and visvim (0.353) share the most aesthetic ground &mdash; earthy tones, casual silhouettes, textural rawness. A connection invisible to trend journalism that emerges clearly from the decomposition.</p>
            </div>
            <div className="insight">
              <div className="insight-title">Most Distant Pair</div>
              <p>Yohji Yamamoto and visvim (1.645) are maximally apart. Black draping and structure vs. earth-toned craft casualwear. Opposite poles of Japanese menswear.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Correlations */}
      <section>
        <div className="container">
          <div className="section-header">
            <h2>Attribute Correlations</h2>
            <h3>31 prompts, not 31 dimensions</h3>
            <p className="large-text">
              Many CLIP attributes are highly correlated &mdash; different measurements of the
              same latent thing. This is why SVD works: the true dimensionality is far lower than 31.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, marginTop: 32 }}>
            <div>
              <h3 style={{ fontSize: 16, marginBottom: 12 }}>Positive</h3>
              {strongCorr.map(([pair, val]) => (
                <div key={pair} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--rule)", fontSize: 14 }}>
                  <span style={{ color: "var(--dark)" }}>{pair}</span>
                  <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{val}</span>
                </div>
              ))}
            </div>
            <div>
              <h3 style={{ fontSize: 16, marginBottom: 12 }}>Negative</h3>
              {negCorr.map(([pair, val]) => (
                <div key={pair} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--rule)", fontSize: 14 }}>
                  <span style={{ color: "var(--dark)" }}>{pair}</span>
                  <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--accent)" }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Evolution */}
      <section>
        <div className="container">
          <div className="section-header">
            <h2>Stylistic Evolution</h2>
            <h3>How aesthetics drift over time</h3>
            <p className="large-text">
              Track each designer&rsquo;s PC scores across seasons. Hover any point for details.
              Switch components to see different aesthetic axes.
            </p>
          </div>
        </div>
        <div className="wide">
          <Timeline collections={data.collections} varianceExplained={data.varianceExplained} />
        </div>
        <div className="container">
          <div className="insights">
            <div className="insight">
              <div className="insight-title">Most Varied</div>
              <p>CDG Homme Plus has the highest stylistic variance &mdash; Kawakubo reinvents more aggressively than any other designer in the dataset.</p>
            </div>
            <div className="insight">
              <div className="insight-title">Yohji&rsquo;s Range</div>
              <p>Yamamoto spans nearly the full width of PC1 &mdash; from &minus;7.62 (SS22) to +6.42 (FW08). The data reveals significant variation despite his reputation for consistency.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Methodology */}
      <section>
        <div className="container">
          <div className="section-header">
            <h2>Methodology</h2>
            <h3>From pixels to principal components</h3>
          </div>
          <p className="large-text">
            Runway images were scored against 31 text prompts using OpenCLIP (ViT-B-32),
            producing cosine similarity values between 0 and 1. Scores were averaged per collection,
            standardized, and decomposed via SVD. A manually scored validation set of 11 collections
            showed approximately 80% agreement with the CLIP-generated scores.
          </p>
          <p style={{ marginTop: 16, fontSize: 14, color: "var(--light)" }}>
            Images sourced from Vogue Runway. All collections are menswear only.
          </p>
        </div>
      </section>

      <footer>
        <div className="container">
          <p>DS3000 &middot; Foundations of Data Science &middot; 2026</p>
        </div>
      </footer>
    </>
  );
}
