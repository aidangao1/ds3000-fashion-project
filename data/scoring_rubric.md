# Scoring Rubric

## Manual Scoring (1-5 scale + binary)

### silhouette_score
| Score | Description |
|-------|-------------|
| 1 | Skin-tight / bodycon |
| 2 | Slim / fitted |
| 3 | Regular / relaxed |
| 4 | Oversized |
| 5 | Extreme volume / architectural |

### fabric_weight
| Score | Description |
|-------|-------------|
| 1 | Sheer / mesh / very lightweight |
| 2 | Light cotton, linen, thin knits |
| 3 | Medium weight (wool suiting, denim, canvas) |
| 4 | Heavy wool, leather, thick knits |
| 5 | Extreme weight (felted, bonded, multi-ply) |

### layering_density
| Score | Description |
|-------|-------------|
| 1 | Single layer |
| 2 | Two layers |
| 3 | Three layers |
| 4 | Four layers |
| 5 | Five or more layers |

### color_range
| Score | Description |
|-------|-------------|
| 1 | Monochrome (single color family) |
| 2 | Black + one accent |
| 3 | Black base + 2-3 color families |
| 4 | Multiple distinct color families |
| 5 | Full spectrum |

### color_intensity
| Score | Description |
|-------|-------------|
| 1 | No chromatic color (black/white/gray) |
| 2 | Muted / dusty / desaturated |
| 3 | Moderate saturation |
| 4 | Bold / saturated |
| 5 | Extremely vivid / neon |

### Binary attributes (0 or 1, threshold: 3+ looks)
- **distressing**: fraying, holes, rips, cracking, paint splatter
- **patchwork**: garments made from multiple different fabric pieces
- **raw_edges**: unfinished seams, unhemmed edges, exposed construction
- **graphic_prints**: printed text, illustrations, logos (woven patterns like plaid do NOT count)

## CLIP Scoring

CLIP scores are cosine similarity (0.0-1.0) between runway images and text prompts, averaged per collection. 31 prompts covering silhouette, fabric, layering, color, construction, print, and style reference.

### Approximate CLIP-to-Manual Thresholds (derived from 11 validated collections)

| Manual Attribute | CLIP Prompt(s) | Low Signal | High Signal |
|-----------------|----------------|------------|-------------|
| silhouette | oversized - slim difference | < 0.01 = slim | > 0.05 = oversized |
| fabric_weight | heavy - light difference | < -0.01 = light | > 0.03 = heavy |
| layering | heavy_layer - minimal difference | < 0.01 = minimal | > 0.03 = layered |
| color_range | spread across color prompts | 1 color high = monochrome | 3+ colors moderate = broad |
| color_intensity | bright vs muted | bright < 0.14 = desaturated | bright > 0.19 = bold |
| distressing | distressed prompt | < 0.17 = no | > 0.19 = yes |
| patchwork | patchwork prompt | < 0.19 = no | > 0.21 = yes |
| raw_edges | raw_edges prompt | < 0.22 = no | > 0.24 = yes |
| graphic_prints | graphic_print prompt | < 0.17 = no | > 0.19 = yes |
