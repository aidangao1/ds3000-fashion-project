import { readFileSync } from "fs";
import { join } from "path";
import type { DataSet } from "./types";
import ScatterPlot from "./components/ScatterPlot";
import ScreePlot from "./components/ScreePlot";
import DistanceHeatmap from "./components/DistanceHeatmap";
import Timeline from "./components/Timeline";
import CL from "./components/CollectionLink";

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
          <p className="subtitle">SVD on CLIP-scored runway data</p>
          <p className="large-text" style={{ marginTop: 24 }}>
            We scored {totalLooks.toLocaleString()} runway images against 31 text prompts using OpenCLIP,
            then ran SVD on the resulting matrix to find the independent aesthetic axes that separate
            six Japanese menswear designers.
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
            <h3>Six designers, two decades of data</h3>
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
            <h3>31 attributes, 5 independent dimensions</h3>
            <p className="large-text">
              Five components capture {(cumVar * 100).toFixed(0)}% of total variance.
              The scree plot shows a clear elbow at three, with diminishing returns after five.
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
      <section id="biplot">
        <div className="container">
          <div className="section-header">
            <h2>Principal Component Space</h2>
            <h3>129 collections in reduced space</h3>
            <p className="large-text">
              Each dot is one collection. Click to see its PC scores and all 31 attribute values.
              Arrows show attribute loadings.
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
          <div className="section-header" style={{ marginTop: 48, marginBottom: 24 }}>
            <h2>Component Extremes</h2>
            <h3>What each PC measures and who sits at each pole</h3>
          </div>

          <div className="insights">
            <div className="insight">
              <div className="insight-title">PC1: Construction (29.7%)</div>
              <p>
                Raw, textured, distressed on one end. Clean and polished on the other.
                Top loadings: distressed, raw edges, fabric cotton, abstract print.{" "}
                <CL d="cdg" s="spring-2022-menswear">CDG SS22</CL> (&minus;8.11) scores the most deconstructed.{" "}
                <CL d="sacai" s="fall-2016-menswear">Sacai FW16</CL> (+8.03) scores the cleanest.
              </p>
            </div>
            <div className="insight">
              <div className="insight-title">PC2: Formality (18.8%)</div>
              <p>
                Dark, structured, tailored vs. bright, casual, patterned.
                Top loadings: color black, structured silhouette, tailored formal, draped.{" "}
                <CL d="yohji" s="fall-2021-menswear">Yohji FW21</CL> (+5.29) leads the formal end.{" "}
                <CL d="undercover" s="spring-2017-menswear">Undercover SS17</CL> (&minus;4.62) leads the casual end.
              </p>
            </div>
            <div className="insight">
              <div className="insight-title">PC3: Pattern (14.1%)</div>
              <p>
                Printed and patterned vs. plain and earth-toned.
                Top loadings: floral print, no print (negative), abstract print.{" "}
                <CL d="cdg" s="fall-2020-menswear">CDG FW20</CL> (+6.04) is the most print-heavy.{" "}
                <CL d="undercover" s="pre-fall-2026-menswear">Undercover PF26</CL> (&minus;5.21) is the plainest.
              </p>
            </div>
            <div className="insight">
              <div className="insight-title">PC4: Weight (8.1%)</div>
              <p>
                Heavy, dark fabrics vs. lightweight, bright ones.
                Top loadings: heavy fabric, gothic dark, punk, leather.{" "}
                <CL d="yohji" s="fall-2021-menswear">Yohji FW21</CL> (+4.31) scores heaviest.{" "}
                <CL d="sacai" s="spring-2018-menswear">Sacai SS18</CL> (&minus;2.97) scores lightest.
              </p>
            </div>
            <div className="insight">
              <div className="insight-title">PC5: Silhouette (7.2%)</div>
              <p>
                Oversized, military, layered vs. slim, tailored, fitted.
                Top loadings: slim (negative), military, oversized.{" "}
                <CL d="yohji" s="fall-2025-menswear">Yohji FW25</CL> (+3.59) is the most oversized.{" "}
                <CL d="undercover" s="fall-2015-menswear">Undercover FW15</CL> (&minus;3.91) is the slimmest.
              </p>
            </div>
            <div className="insight">
              <div className="insight-title">CDG vs. Undercover</div>
              <p>Both negative on PC1, but they split on PC2. CDG trends formal and dark, Undercover trends casual and graphic. Similar construction, different mood.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Clustering */}
      <section>
        <div className="container">
          <div className="section-header">
            <h2>Designer Proximity</h2>
            <h3>Cosine distance between centroids</h3>
            <p className="large-text">
              Each designer&rsquo;s centroid in PC space represents their average aesthetic.
              Cosine distance measures how different those averages are.
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
              <p>Undercover and visvim (0.353). Both score toward earthy, casual, textured. This relationship only becomes visible through the decomposition.</p>
            </div>
            <div className="insight">
              <div className="insight-title">Most Distant Pair</div>
              <p>Yohji Yamamoto and visvim (1.645). Opposite ends of both PC1 and PC2: black and structural vs. earthy and casual.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Correlations */}
      <section>
        <div className="container">
          <div className="section-header">
            <h2>Attribute Correlations</h2>
            <h3>Correlated attributes</h3>
            <p className="large-text">
              Many attributes move together. &ldquo;Distressed&rdquo; and &ldquo;raw edges&rdquo; correlate at 0.77,
              meaning they measure the same underlying thing. SVD extracts those shared factors.
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
            <h3>PC scores over time</h3>
            <p className="large-text">
              Each designer&rsquo;s position in PC space changes season to season.
              Variance across seasons measures how much a designer reinvents.
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
              <p>CDG Homme Plus has the highest variance across all five components. No two seasons occupy the same region.</p>
            </div>
            <div className="insight">
              <div className="insight-title">Yohji&rsquo;s Range</div>
              <p>Yamamoto spans PC1 from &minus;7.62 (<CL d="yohji" s="spring-2022-menswear">SS22</CL>) to +6.42 (<CL d="yohji" s="fall-2008-menswear">FW08</CL>). That is a wider range than you would expect for a designer known for consistency.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Methodology */}
      <section>
        <div className="container">
          <div className="section-header">
            <h2>Methodology</h2>
            <h3>Pipeline</h3>
          </div>
          <p className="large-text">
            OpenCLIP (ViT-B-32) scores each runway image against 31 text prompts as cosine similarity.
            Scores are averaged per collection, standardized, then decomposed as X&nbsp;=&nbsp;USV&#8868;.
            A hand-scored validation set of 11 collections showed ~80% agreement with the automated scores.
          </p>
          <p style={{ marginTop: 16, fontSize: 14, color: "var(--light)" }}>
            Images from Vogue Runway. Menswear only.
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
