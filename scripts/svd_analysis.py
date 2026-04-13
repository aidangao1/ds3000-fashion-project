#!/usr/bin/env python3
"""
DS3000 SVD Analysis Pipeline
=============================
Runs SVD on the CLIP score matrix to discover latent aesthetic dimensions,
then generates all visualizations for the final report.

USAGE:
    python3 scripts/svd_analysis.py

OUTPUTS (saved to outputs/figures/):
    1. scree_plot.png         - variance explained per singular value
    2. biplot_pc1_pc2.png     - collections in PC space with attribute loadings
    3. biplot_pc2_pc3.png     - second biplot for additional dimensions
    4. designer_clustering.png - heatmap of cosine distances between designer centroids
    5. evolution_timeline.png  - how designers move through PC space over seasons
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.cm as cm
import seaborn as sns
from sklearn.preprocessing import StandardScaler
from sklearn.metrics.pairwise import cosine_distances
from pathlib import Path

# ── Config ──────────────────────────────────────────────────────────────────

DATA_PATH = Path(__file__).parent.parent / "data" / "clip_scores.csv"
OUTPUT_DIR = Path(__file__).parent.parent / "outputs" / "figures"

DESIGNER_LABELS = {
    "comme-des-garcons-homme-plus": "CDG Homme Plus",
    "yohji-yamamoto": "Yohji Yamamoto",
    "undercover": "Undercover",
    "sacai": "Sacai",
    "number-n-ine": "Number (N)ine",
    "visvim": "visvim",
    "junya-watanabe": "Junya Watanabe",
    "issey-miyake-men": "Issey Miyake Men",
}

DESIGNER_COLORS = {
    "CDG Homme Plus": "#e41a1c",
    "Yohji Yamamoto": "#377eb8",
    "Undercover": "#4daf4a",
    "Sacai": "#984ea3",
    "Number (N)ine": "#ff7f00",
    "visvim": "#a65628",
    "Junya Watanabe": "#f781bf",
    "Issey Miyake Men": "#999999",
}

# ── Data Loading ────────────────────────────────────────────────────────────

def load_data():
    df = pd.read_csv(DATA_PATH)
    attribute_cols = [c for c in df.columns if c not in ("designer", "season", "num_looks")]

    # Clean designer names for display
    df["designer_label"] = df["designer"].map(DESIGNER_LABELS).fillna(df["designer"])

    # Extract year from season string for timeline
    df["year"] = df["season"].str.extract(r"(\d{4})").astype(float)
    # Offset fall by 0.5 so seasonal ordering is correct
    df["year_adj"] = df["year"] + df["season"].str.contains("fall").astype(float) * 0.5

    return df, attribute_cols


def run_svd(df, attribute_cols):
    """Standardize the data matrix and compute full SVD."""
    X = df[attribute_cols].values
    scaler = StandardScaler()
    X_std = scaler.fit_transform(X)

    # Full SVD: X_std = U @ diag(s) @ Vt
    U, s, Vt = np.linalg.svd(X_std, full_matrices=False)

    # Variance explained
    var_explained = s ** 2 / np.sum(s ** 2)
    cumulative_var = np.cumsum(var_explained)

    # Project data into PC space (scores)
    scores = U * s  # equivalent to X_std @ V

    return X_std, U, s, Vt, var_explained, cumulative_var, scores, scaler


# ── Visualizations ──────────────────────────────────────────────────────────

def plot_scree(s, var_explained, cumulative_var):
    """Scree plot: singular values and cumulative variance."""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

    n = len(s)
    x = np.arange(1, n + 1)

    # Singular values
    ax1.bar(x, s, color="#377eb8", alpha=0.8)
    ax1.set_xlabel("Component")
    ax1.set_ylabel("Singular Value")
    ax1.set_title("Singular Values")
    ax1.set_xticks(x[::2])

    # Variance explained
    ax2.bar(x, var_explained * 100, color="#377eb8", alpha=0.6, label="Individual")
    ax2.plot(x, cumulative_var * 100, "o-", color="#e41a1c", label="Cumulative")
    ax2.axhline(y=80, color="gray", linestyle="--", alpha=0.5, label="80% threshold")
    ax2.set_xlabel("Component")
    ax2.set_ylabel("Variance Explained (%)")
    ax2.set_title("Variance Explained by Component")
    ax2.legend()
    ax2.set_xticks(x[::2])

    fig.suptitle("Scree Plot — Latent Aesthetic Dimensions", fontsize=14, fontweight="bold")
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "scree_plot.png", dpi=200, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved scree_plot.png")

    # Print variance summary
    print(f"\n  Top 5 components explain: {cumulative_var[4]*100:.1f}% of variance")
    for i in range(min(5, n)):
        print(f"    PC{i+1}: {var_explained[i]*100:.1f}%")


def plot_biplot(df, scores, Vt, attribute_cols, pc_x, pc_y, filename):
    """Biplot: collections as points, attributes as loading vectors."""
    fig, ax = plt.subplots(figsize=(12, 10))

    # Plot each designer's collections
    for label, color in DESIGNER_COLORS.items():
        mask = df["designer_label"] == label
        if mask.sum() == 0:
            continue
        ax.scatter(
            scores[mask, pc_x], scores[mask, pc_y],
            c=color, label=label, s=50, alpha=0.7, edgecolors="white", linewidth=0.5
        )

    # Attribute loading arrows (Vt rows = right singular vectors)
    # Scale arrows to be visible relative to scores
    scale = np.abs(scores[:, [pc_x, pc_y]]).max() * 0.8
    loadings_x = Vt[pc_x, :]
    loadings_y = Vt[pc_y, :]

    # Only label the top loadings to avoid clutter
    loading_magnitude = np.sqrt(loadings_x**2 + loadings_y**2)
    top_n = 12
    top_idx = np.argsort(loading_magnitude)[-top_n:]

    for i in top_idx:
        lx, ly = loadings_x[i] * scale, loadings_y[i] * scale
        ax.annotate(
            "", xy=(lx, ly), xytext=(0, 0),
            arrowprops=dict(arrowstyle="->", color="#555555", lw=1.2)
        )
        # Offset label slightly beyond arrow tip
        ax.text(
            lx * 1.1, ly * 1.1,
            attribute_cols[i].replace("_", " "),
            fontsize=8, ha="center", va="center", color="#333333",
            bbox=dict(boxstyle="round,pad=0.2", facecolor="white", alpha=0.7, edgecolor="none")
        )

    ax.axhline(0, color="gray", linewidth=0.5, alpha=0.5)
    ax.axvline(0, color="gray", linewidth=0.5, alpha=0.5)
    ax.set_xlabel(f"PC{pc_x+1}", fontsize=12)
    ax.set_ylabel(f"PC{pc_y+1}", fontsize=12)
    ax.set_title(f"Biplot — PC{pc_x+1} vs PC{pc_y+1}", fontsize=14, fontweight="bold")
    ax.legend(loc="best", fontsize=9, framealpha=0.9)
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / filename, dpi=200, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved {filename}")


def plot_clustering(df, scores, attribute_cols):
    """Heatmap of cosine distances between designer centroids in full PC space."""
    # Compute centroid for each designer
    labels = sorted(df["designer_label"].unique())
    centroids = np.array([
        scores[df["designer_label"] == label].mean(axis=0) for label in labels
    ])

    dist_matrix = cosine_distances(centroids)
    dist_df = pd.DataFrame(dist_matrix, index=labels, columns=labels)

    fig, ax = plt.subplots(figsize=(10, 8))
    sns.heatmap(
        dist_df, annot=True, fmt=".3f", cmap="RdYlBu_r",
        square=True, linewidths=0.5, ax=ax,
        cbar_kws={"label": "Cosine Distance"}
    )
    ax.set_title("Designer Aesthetic Distance (Cosine)", fontsize=14, fontweight="bold")
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "designer_clustering.png", dpi=200, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved designer_clustering.png")

    # Print closest / farthest pairs
    np.fill_diagonal(dist_matrix, np.inf)
    min_idx = np.unravel_index(np.argmin(dist_matrix), dist_matrix.shape)
    np.fill_diagonal(dist_matrix, 0)
    max_idx = np.unravel_index(np.argmax(dist_matrix), dist_matrix.shape)
    print(f"    Closest pair: {labels[min_idx[0]]} & {labels[min_idx[1]]} ({dist_matrix[max_idx[0], max_idx[1]]:.3f} farthest)")
    print(f"    Most distant: {labels[max_idx[0]]} & {labels[max_idx[1]]}")


def plot_evolution(df, scores):
    """Timeline: how each designer drifts through PC1-PC2 space over seasons."""
    fig, axes = plt.subplots(2, 2, figsize=(14, 12))

    # PC1 over time, PC2 over time, then trajectory in PC1-PC2 space
    designers_with_range = [
        label for label in DESIGNER_COLORS
        if (df["designer_label"] == label).sum() >= 4
    ]

    # PC1 over time
    ax = axes[0, 0]
    for label in designers_with_range:
        mask = df["designer_label"] == label
        sub = df[mask].sort_values("year_adj")
        ax.plot(sub["year_adj"], scores[mask.values, 0][np.argsort(sub["year_adj"])],
                color=DESIGNER_COLORS[label], label=label, alpha=0.8, marker=".", markersize=4)
    ax.set_xlabel("Year")
    ax.set_ylabel("PC1 Score")
    ax.set_title("PC1 Over Time")
    ax.legend(fontsize=7, loc="best")

    # PC2 over time
    ax = axes[0, 1]
    for label in designers_with_range:
        mask = df["designer_label"] == label
        sub = df[mask].sort_values("year_adj")
        ax.plot(sub["year_adj"], scores[mask.values, 1][np.argsort(sub["year_adj"])],
                color=DESIGNER_COLORS[label], label=label, alpha=0.8, marker=".", markersize=4)
    ax.set_xlabel("Year")
    ax.set_ylabel("PC2 Score")
    ax.set_title("PC2 Over Time")

    # PC1 vs PC2 trajectory with arrows
    ax = axes[1, 0]
    for label in designers_with_range:
        mask = df["designer_label"] == label
        sub = df[mask].sort_values("year_adj")
        idx = mask.values
        pc1 = scores[idx, 0][np.argsort(sub["year_adj"])]
        pc2 = scores[idx, 1][np.argsort(sub["year_adj"])]
        ax.plot(pc1, pc2, color=DESIGNER_COLORS[label], alpha=0.4, linewidth=1)
        ax.scatter(pc1, pc2, color=DESIGNER_COLORS[label], s=15, alpha=0.6)
        # Mark start and end
        ax.scatter(pc1[0], pc2[0], color=DESIGNER_COLORS[label], s=80, marker="o", edgecolors="black", linewidth=1.5, zorder=5)
        ax.scatter(pc1[-1], pc2[-1], color=DESIGNER_COLORS[label], s=80, marker="s", edgecolors="black", linewidth=1.5, zorder=5)
    ax.set_xlabel("PC1")
    ax.set_ylabel("PC2")
    ax.set_title("Stylistic Trajectory (o=start, ■=latest)")

    # Designer variance (spread in PC space = stylistic range)
    ax = axes[1, 1]
    spread = []
    for label in sorted(DESIGNER_COLORS.keys()):
        mask = df["designer_label"] == label
        if mask.sum() < 2:
            continue
        pc_scores = scores[mask.values, :5]  # first 5 PCs
        variance = np.mean(np.var(pc_scores, axis=0))
        spread.append((label, variance))
    spread.sort(key=lambda x: x[1], reverse=True)
    names, vals = zip(*spread)
    colors = [DESIGNER_COLORS[n] for n in names]
    ax.barh(range(len(names)), vals, color=colors, alpha=0.8)
    ax.set_yticks(range(len(names)))
    ax.set_yticklabels(names, fontsize=9)
    ax.set_xlabel("Mean Variance (PC1-5)")
    ax.set_title("Stylistic Range (Higher = More Varied)")
    ax.invert_yaxis()

    fig.suptitle("Stylistic Evolution Over Time", fontsize=14, fontweight="bold")
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "evolution_timeline.png", dpi=200, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved evolution_timeline.png")


def plot_correlation_circle(Vt, s, attribute_cols):
    """
    Correlation circle: each attribute is a point on the unit circle plane,
    positioned by its correlation with PC1 and PC2.

    Attributes near each other are positively correlated.
    Attributes on opposite sides are negatively correlated.
    Attributes near the origin are poorly represented by these two PCs.
    """
    # Loadings scaled by singular values = correlations with PCs
    # (for standardized data, V * s / sqrt(n-1) gives correlations)
    n = Vt.shape[1]  # num attributes = num columns in original matrix... no
    # Actually Vt is (k x p), we need the correlation of each variable with each PC
    # corr(X_j, PC_i) = V[j,i] * s[i] / sqrt(n-1)  where n = num observations
    # But for the circle we just need relative positions; use V * s normalized
    n_obs = 129  # number of collections
    loadings_scaled = Vt.T * s  # (p x k) — each row is an attribute
    # Normalize to correlations
    # std of each standardized variable is 1, std of PC_i is s_i / sqrt(n-1)
    correlations = loadings_scaled / np.sqrt(n_obs - 1)

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(18, 8))

    # ── Correlation circle: PC1 vs PC2 ──
    ax = ax1
    circle = plt.Circle((0, 0), 1, fill=False, color="gray", linestyle="--", linewidth=1)
    ax.add_patch(circle)
    ax.axhline(0, color="gray", linewidth=0.5, alpha=0.5)
    ax.axvline(0, color="gray", linewidth=0.5, alpha=0.5)

    # Color by attribute category
    category_colors = {
        "silhouette": "#e41a1c",
        "fabric": "#377eb8",
        "layering": "#4daf4a",
        "color": "#984ea3",
        "construction": "#ff7f00",
        "print": "#a65628",
        "style": "#f781bf",
    }

    def get_category(attr):
        if attr.startswith("silhouette"):
            return "silhouette"
        if attr.startswith("fabric"):
            return "fabric"
        if attr.startswith("layering"):
            return "layering"
        if attr.startswith("color"):
            return "color"
        if attr in ("distressed", "patchwork", "raw_edges", "deconstructed"):
            return "construction"
        if attr.endswith("print") or attr == "no_print":
            return "print"
        return "style"

    plotted_categories = set()
    for i, attr in enumerate(attribute_cols):
        cx, cy = correlations[i, 0], correlations[i, 1]
        cat = get_category(attr)
        col = category_colors[cat]
        label = cat if cat not in plotted_categories else None
        plotted_categories.add(cat)

        ax.annotate(
            "", xy=(cx, cy), xytext=(0, 0),
            arrowprops=dict(arrowstyle="->", color=col, lw=1.5, alpha=0.7)
        )
        ax.text(
            cx * 1.08, cy * 1.08,
            attr.replace("_", " "),
            fontsize=7, ha="center", va="center", color=col, fontweight="bold",
        )
        if label:
            ax.scatter([], [], color=col, label=label, s=30)

    ax.set_xlim(-1.15, 1.15)
    ax.set_ylim(-1.15, 1.15)
    ax.set_aspect("equal")
    ax.set_xlabel("Correlation with PC1", fontsize=11)
    ax.set_ylabel("Correlation with PC2", fontsize=11)
    ax.set_title("Correlation Circle — PC1 vs PC2", fontsize=13, fontweight="bold")
    ax.legend(fontsize=8, loc="lower left")

    # ── Correlation circle: PC2 vs PC3 ──
    ax = ax2
    circle = plt.Circle((0, 0), 1, fill=False, color="gray", linestyle="--", linewidth=1)
    ax.add_patch(circle)
    ax.axhline(0, color="gray", linewidth=0.5, alpha=0.5)
    ax.axvline(0, color="gray", linewidth=0.5, alpha=0.5)

    for i, attr in enumerate(attribute_cols):
        cx, cy = correlations[i, 1], correlations[i, 2]
        cat = get_category(attr)
        col = category_colors[cat]

        ax.annotate(
            "", xy=(cx, cy), xytext=(0, 0),
            arrowprops=dict(arrowstyle="->", color=col, lw=1.5, alpha=0.7)
        )
        ax.text(
            cx * 1.08, cy * 1.08,
            attr.replace("_", " "),
            fontsize=7, ha="center", va="center", color=col, fontweight="bold",
        )

    ax.set_xlim(-1.15, 1.15)
    ax.set_ylim(-1.15, 1.15)
    ax.set_aspect("equal")
    ax.set_xlabel("Correlation with PC2", fontsize=11)
    ax.set_ylabel("Correlation with PC3", fontsize=11)
    ax.set_title("Correlation Circle — PC2 vs PC3", fontsize=13, fontweight="bold")

    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "correlation_circle.png", dpi=200, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved correlation_circle.png")


def plot_correlation_heatmap(df, attribute_cols):
    """Full pairwise correlation heatmap of the 31 attributes."""
    corr = df[attribute_cols].corr()

    # Cluster the attributes so correlated ones appear together
    from scipy.cluster.hierarchy import linkage, leaves_list
    from scipy.spatial.distance import squareform

    dist = 1 - np.abs(corr.values)
    np.fill_diagonal(dist, 0)
    link = linkage(squareform(dist), method="ward")
    order = leaves_list(link)

    corr_ordered = corr.iloc[order, order]
    labels = [c.replace("_", " ") for c in corr_ordered.columns]

    fig, ax = plt.subplots(figsize=(14, 12))
    sns.heatmap(
        corr_ordered, annot=True, fmt=".2f", cmap="RdBu_r",
        center=0, vmin=-1, vmax=1, square=True,
        xticklabels=labels, yticklabels=labels,
        linewidths=0.3, ax=ax,
        annot_kws={"fontsize": 6},
        cbar_kws={"label": "Pearson Correlation", "shrink": 0.8}
    )
    ax.set_xticklabels(ax.get_xticklabels(), rotation=45, ha="right", fontsize=8)
    ax.set_yticklabels(ax.get_yticklabels(), fontsize=8)
    ax.set_title("Attribute Correlation Matrix (Hierarchically Clustered)",
                 fontsize=14, fontweight="bold")
    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "correlation_heatmap.png", dpi=200, bbox_inches="tight")
    plt.close(fig)
    print(f"  Saved correlation_heatmap.png")


# ── Main ────────────────────────────────────────────────────────────────────

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("Loading data...")
    df, attribute_cols = load_data()
    print(f"  {len(df)} collections, {len(attribute_cols)} attributes, "
          f"{df['designer_label'].nunique()} designers")

    print("\nRunning SVD...")
    X_std, U, s, Vt, var_explained, cumulative_var, scores, scaler = run_svd(df, attribute_cols)

    print("\nGenerating visualizations...")
    plot_scree(s, var_explained, cumulative_var)
    plot_biplot(df, scores, Vt, attribute_cols, 0, 1, "biplot_pc1_pc2.png")
    plot_biplot(df, scores, Vt, attribute_cols, 1, 2, "biplot_pc2_pc3.png")
    plot_clustering(df, scores, attribute_cols)
    plot_evolution(df, scores)
    plot_correlation_circle(Vt, s, attribute_cols)
    plot_correlation_heatmap(df, attribute_cols)

    # Save numerical results for the report
    results_path = OUTPUT_DIR.parent / "svd_summary.txt"
    with open(results_path, "w") as f:
        f.write("SVD Summary\n")
        f.write("=" * 60 + "\n\n")
        f.write(f"Data matrix: {X_std.shape[0]} collections x {X_std.shape[1]} attributes\n")
        f.write(f"Rank: {len(s)}\n\n")

        f.write("Variance Explained:\n")
        for i in range(min(10, len(s))):
            f.write(f"  PC{i+1}: {var_explained[i]*100:5.1f}%  (cumulative: {cumulative_var[i]*100:5.1f}%)\n")

        f.write(f"\nTop attribute loadings per component:\n")
        for pc in range(min(5, len(s))):
            f.write(f"\n  PC{pc+1}:\n")
            loadings = Vt[pc, :]
            order = np.argsort(np.abs(loadings))[::-1]
            for j in order[:6]:
                f.write(f"    {attribute_cols[j]:30s}  {loadings[j]:+.3f}\n")

    print(f"\n  Saved svd_summary.txt")
    print("\nDone! Check outputs/figures/ for all plots.")


if __name__ == "__main__":
    main()
