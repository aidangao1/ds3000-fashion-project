# DS3000 Fashion Aesthetic Analysis
## Uncovering Latent Aesthetic Dimensions in Japanese Menswear Using Linear Algebra

### Overview
This project applies SVD (Singular Value Decomposition) and eigendecomposition to a dataset of Japanese menswear runway collections to identify latent aesthetic dimensions, cluster designers by shared aesthetic DNA, and track stylistic evolution over time.

We use two complementary data sources:
1. **OpenCLIP feature extraction** - automated scoring of 5477 runway images against 31 aesthetic prompts
2. **Manual expert scoring** - hand-scored subset of 11 collections used to validate the automated approach

### Designers
| Designer | Brand/Line | Seasons |
|----------|-----------|---------|
| Takahiro Miyashita | Number (N)ine | SS07-SS09 |
| Yohji Yamamoto | Pour Homme | SS05-FW26 |
| Rei Kawakubo | CDG Homme Plus | SS13-FW26 |
| Jun Takahashi | Undercover | SS16-FW26 |
| Junya Watanabe | Junya Watanabe MAN | SS16-FW26 |
| Yusuke Takahashi | Issey Miyake Men | SS16-FW24 |
| Chitose Abe | Sacai | FW13-FW26 |
| Hiroki Nakamura | visvim | FW21-FW26 |

### Repository Structure
```
ds3000-fashion-project/
├── README.md
├── .gitignore
├── data/
│   ├── clip_scores.csv                # CLIP-generated data matrix (primary)
│   ├── manual_scores.csv              # hand-scored validation set
│   ├── scoring_rubric.md              # manual attribute definitions
│   └── manual_vs_clip_comparison.md   # validation analysis
├── scripts/
│   ├── clip_feature_extractor.py      # OpenCLIP pipeline
│   ├── ds3000_batch_download.py       # Vogue Runway image scraper
│   └── clean_vogue_folder.py          # image deduplication
├── outputs/
│   ├── figures/                       # generated plots
│   └── report/                        # final report
└── docs/
    └── research_guides/
        └── number_nine_research_guide.md
```

### Data Pipeline
1. **Image collection**: Scrape runway images from Vogue Runway (`ds3000_batch_download.py`)
2. **Automated scoring**: Extract aesthetic features with OpenCLIP (`clip_feature_extractor.py`)
3. **Manual validation**: Hand-score 11 collections, compare against CLIP output
4. **Analysis**: Run SVD on the CLIP data matrix to discover latent dimensions
5. **Visualization**: Scree plots, biplots, clustering, distance timelines

### Setup
```bash
git clone https://github.com/YOUR_USERNAME/ds3000-fashion-project.git
cd ds3000-fashion-project
pip install numpy pandas matplotlib seaborn scikit-learn open-clip-torch torch pillow tqdm
```

### Data Access
- **Code + data matrices**: This repo
- **Runway images (5477 photos)**: Shared Google Drive folder (too large for git)

### Methodology Notes
- All collections are **menswear only** to avoid confounding gender-line differences
- CLIP scores are cosine similarity (0-1) between runway images and text prompts
- Manual scores validated against CLIP with ~80% agreement across attributes
- Key discrepancy: CLIP reads fringe/washed fabrics as "distressed" more broadly than manual binary threshold
