# DS3000 Fashion Aesthetic Analysis
## Uncovering Latent Aesthetic Dimensions in Japanese Menswear Using Linear Algebra

### Overview
This project applies SVD (Singular Value Decomposition) to a dataset of Japanese menswear runway collections to identify latent aesthetic dimensions, cluster designers by shared aesthetic DNA, and track stylistic evolution over time.

We use two complementary data sources:
1. **OpenCLIP feature extraction** - automated scoring of 5,333 runway looks across 129 collections against 31 aesthetic prompts
2. **Manual expert scoring** - hand-scored subset of 11 collections used to validate the automated approach

### Key Findings
- **5 latent dimensions** capture 78% of aesthetic variance across 31 CLIP attributes
- **PC1** (29.7%) separates raw/deconstructed from clean construction
- **PC2** (18.8%) separates dark/formal from colorful/casual
- **Closest designers**: Undercover & visvim (cosine distance 0.353)
- **Most distant**: Yohji Yamamoto & visvim (1.645)
- **Most experimental**: CDG Homme Plus (highest season-to-season variance)

### Designers
| Designer | Brand/Line | Collections | Years |
|----------|-----------|-------------|-------|
| Yohji Yamamoto | Pour Homme | 41 | 2005-2026 |
| Jun Takahashi | Undercover | 31 | 2015-2026 |
| Chitose Abe | Sacai | 27 | 2013-2026 |
| Rei Kawakubo | CDG Homme Plus | 23 | 2013-2026 |
| Takahiro Miyashita | Number (N)ine | 5 | 2007-2009 |
| Hiroki Nakamura | visvim | 2 | 2017-2018 |

### Repository Structure
```
ds3000-fashion-project/
├── README.md
├── .gitignore
├── data/
│   ├── clip_scores.csv                # CLIP-generated data matrix (129 x 31)
│   ├── manual_scores.csv              # hand-scored validation set
│   ├── scoring_rubric.md              # attribute definitions
│   └── Manual vs CLIP Scoring.pdf     # validation analysis
├── scripts/
│   ├── clip_feature_extractor.py      # OpenCLIP pipeline
│   ├── svd_analysis.py                # SVD + all visualizations
│   └── ds3000_batch_download.py       # Vogue Runway image scraper
├── outputs/
│   ├── figures/                       # generated plots (png)
│   ├── report/
│   │   └── index.html                 # static web presentation
│   └── svd_summary.txt               # numerical results
├── site/                              # interactive Next.js presentation
│   ├── app/
│   │   ├── components/                # ScatterPlot, ScreePlot, Heatmap, Timeline
│   │   └── page.tsx                   # main page
│   └── public/data.json               # pre-computed SVD data
```

### Data Pipeline
1. **Image collection**: Scrape runway images from Vogue Runway (`ds3000_batch_download.py`)
2. **Automated scoring**: Extract aesthetic features with OpenCLIP (`clip_feature_extractor.py`)
3. **Manual validation**: Hand-score 11 collections, compare against CLIP output
4. **Analysis**: Run SVD on the CLIP data matrix (`svd_analysis.py`)
5. **Presentation**: Open `outputs/report/index.html` in a browser

### Running the Analysis
```bash
# activate the project venv
source venv/bin/activate

# generate all figures + summary
python3 scripts/svd_analysis.py

# export data for the interactive site
python3 scripts/export_json.py
```

### Interactive Presentation
```bash
cd site
npm install
npm run build
npm start
# open http://localhost:3000
```

Features: interactive scatter plot (click any collection to see all 31 attribute values), axis selector for any PC pair, hover tooltips on the timeline, and a cosine distance heatmap.

### Methodology Notes
- All collections are **menswear only** to avoid confounding gender-line differences
- CLIP scores are cosine similarity (0-1) between runway images and text prompts
- Manual scores validated against CLIP with ~80% agreement across attributes
- Key discrepancy: CLIP reads fringe/washed fabrics as "distressed" more broadly than manual binary threshold
