#!/usr/bin/env python3
"""Export all SVD results as JSON for the Next.js frontend."""

import json
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.metrics.pairwise import cosine_distances
from pathlib import Path

DATA_PATH = Path(__file__).parent.parent / "data" / "clip_scores.csv"
OUTPUT_PATH = Path(__file__).parent.parent / "site" / "public" / "data.json"

LABELS = {
    "comme-des-garcons-homme-plus": "CDG Homme Plus",
    "yohji-yamamoto": "Yohji Yamamoto",
    "undercover": "Undercover",
    "sacai": "Sacai",
    "number-n-ine": "Number (N)ine",
    "visvim": "visvim",
}

def main():
    df = pd.read_csv(DATA_PATH)
    attr_cols = [c for c in df.columns if c not in ("designer", "season", "num_looks")]

    df["label"] = df["designer"].map(LABELS).fillna(df["designer"])
    df["year"] = df["season"].str.extract(r"(\d{4})").astype(float)
    df["year_adj"] = df["year"] + df["season"].str.contains("fall").astype(float) * 0.5

    X = df[attr_cols].values
    scaler = StandardScaler()
    X_std = scaler.fit_transform(X)
    U, s, Vt = np.linalg.svd(X_std, full_matrices=False)
    scores = U * s
    var_explained = (s ** 2 / np.sum(s ** 2)).tolist()

    # Collections with PC scores and raw attributes
    collections = []
    for i, row in df.iterrows():
        collections.append({
            "id": i,
            "designer": row["label"],
            "season": row["season"],
            "year": float(row["year"]),
            "yearAdj": float(row["year_adj"]),
            "numLooks": int(row["num_looks"]),
            "pc": [round(float(scores[i, j]), 3) for j in range(5)],
            "attributes": {col: round(float(row[col]), 4) for col in attr_cols},
        })

    # Loadings (Vt rows)
    loadings = []
    for j, col in enumerate(attr_cols):
        loadings.append({
            "name": col,
            "label": col.replace("_", " "),
            "values": [round(float(Vt[pc, j]), 4) for pc in range(5)],
        })

    # Designer centroids
    centroids = {}
    for label in sorted(df["label"].unique()):
        mask = df["label"] == label
        centroids[label] = {
            "pc": [round(float(scores[mask.values, j].mean()), 3) for j in range(5)],
            "count": int(mask.sum()),
        }

    # Cosine distance matrix
    labels_sorted = sorted(df["label"].unique())
    centroid_matrix = np.array([
        scores[df["label"] == label].mean(axis=0) for label in labels_sorted
    ])
    dist = cosine_distances(centroid_matrix)
    distance_matrix = {
        "labels": labels_sorted,
        "values": [[round(float(dist[i, j]), 4) for j in range(len(labels_sorted))]
                    for i in range(len(labels_sorted))],
    }

    # Correlation matrix
    corr = df[attr_cols].corr().values
    correlation = {
        "labels": [c.replace("_", " ") for c in attr_cols],
        "values": [[round(float(corr[i, j]), 3) for j in range(len(attr_cols))]
                    for i in range(len(attr_cols))],
    }

    data = {
        "collections": collections,
        "loadings": loadings,
        "varianceExplained": [round(v, 4) for v in var_explained],
        "singularValues": [round(float(v), 3) for v in s],
        "centroids": centroids,
        "distanceMatrix": distance_matrix,
        "correlation": correlation,
        "attributes": attr_cols,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(data, f)
    print(f"Exported to {OUTPUT_PATH} ({OUTPUT_PATH.stat().st_size / 1024:.0f} KB)")

if __name__ == "__main__":
    main()
