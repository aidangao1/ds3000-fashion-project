#!/usr/bin/env python3
"""
DS3000 OpenCLIP Feature Extraction Pipeline
=============================================
Converts runway images into numerical attribute vectors using OpenCLIP,
then aggregates per collection for SVD analysis.

USAGE:
    python3 clip_feature_extractor.py --input ds3000-runway-images --output data/clip_scores.csv

WHAT THIS DOES:
    1. Loads a pretrained OpenCLIP model (no training needed)
    2. For each runway image, scores it against text prompts like
       "oversized silhouette", "distressed fabric", "monochrome palette"
    3. Each image becomes a row of ~30 numbers
    4. Averages all images in a collection into one row
    5. Outputs a CSV ready for SVD

REQUIREMENTS:
    pip3 install open-clip-torch torch pillow pandas numpy tqdm
"""

import os
import sys
import argparse
import numpy as np
import pandas as pd
from pathlib import Path
from tqdm import tqdm

import torch
from PIL import Image
import open_clip


# =========================================================================
# ATTRIBUTE PROMPTS
# =========================================================================
# These are the text descriptions OpenCLIP will score each image against.
# Each prompt maps to a column in your final data matrix.
#
# The key insight: instead of scoring "silhouette 1-5" as one column,
# we use OPPOSING prompts and the model's relative scores create a
# spectrum. SVD will figure out which prompts cluster together.
# =========================================================================

ATTRIBUTE_PROMPTS = {
    # Silhouette
    "silhouette_slim": "a fashion model wearing slim fitted tight clothing",
    "silhouette_oversized": "a fashion model wearing oversized baggy loose clothing",
    "silhouette_structured": "a fashion model wearing structured architectural clothing with sharp shoulders",
    "silhouette_draped": "a fashion model wearing draped flowing fabric",

    # Fabric weight / type
    "fabric_heavy": "a fashion model wearing heavy thick wool or leather clothing",
    "fabric_light": "a fashion model wearing lightweight sheer thin fabric clothing",
    "fabric_leather": "a fashion model wearing leather clothing",
    "fabric_denim": "a fashion model wearing denim jeans clothing",
    "fabric_knit": "a fashion model wearing knitted or crocheted clothing",
    "fabric_cotton": "a fashion model wearing cotton or linen clothing",

    # Layering
    "layering_heavy": "a fashion model wearing many layers of clothing stacked on top of each other",
    "layering_minimal": "a fashion model wearing a simple single layer outfit",

    # Color
    "color_black": "a fashion model wearing all black monochrome clothing",
    "color_white": "a fashion model wearing all white clothing",
    "color_earth_tones": "a fashion model wearing brown olive khaki earth tone clothing",
    "color_bright": "a fashion model wearing bright vivid colorful clothing",
    "color_muted": "a fashion model wearing muted desaturated faded color clothing",
    "color_plaid": "a fashion model wearing plaid or tartan pattern clothing",

    # Construction / technique
    "distressed": "a fashion model wearing distressed ripped torn frayed clothing",
    "patchwork": "a fashion model wearing patchwork clothing made from different fabric pieces sewn together",
    "raw_edges": "a fashion model wearing clothing with raw unfinished edges and exposed seams",
    "deconstructed": "a fashion model wearing deconstructed clothing with asymmetric or unfinished construction",

    # Print / graphic
    "graphic_print": "a fashion model wearing clothing with graphic prints text or logos",
    "floral_print": "a fashion model wearing floral printed clothing",
    "abstract_print": "a fashion model wearing abstract artistic painted print clothing",
    "no_print": "a fashion model wearing solid plain unpatterned clothing",

    # Style references
    "military": "a fashion model wearing military inspired clothing with cargo pockets and olive green",
    "punk_grunge": "a fashion model wearing punk or grunge style clothing",
    "tailored_formal": "a fashion model wearing tailored formal suit clothing",
    "streetwear_casual": "a fashion model wearing casual streetwear clothing",
    "gothic_dark": "a fashion model wearing dark gothic Victorian style clothing",
}


def load_model(model_name="ViT-B-32", pretrained="laion2b_s34b_b79k"):
    """
    Load OpenCLIP model and preprocessing.
    
    ViT-B-32 is the sweet spot: fast enough for 5000+ images,
    accurate enough for meaningful attribute scores.
    
    If you have a GPU, this runs ~10x faster automatically.
    On CPU (your MacBook), expect ~2-3 images/second.
    """
    print(f"Loading OpenCLIP model: {model_name} ({pretrained})...")
    model, _, preprocess = open_clip.create_model_and_transforms(
        model_name, pretrained=pretrained
    )
    tokenizer = open_clip.get_tokenizer(model_name)
    
    # Use GPU if available (Mac M1/M2 = "mps", NVIDIA = "cuda")
    device = "cpu"
    if torch.cuda.is_available():
        device = "cuda"
    elif torch.backends.mps.is_available():
        device = "mps"
    
    model = model.to(device)
    model.eval()
    
    print(f"Model loaded on device: {device}")
    return model, preprocess, tokenizer, device


def encode_text_prompts(model, tokenizer, device):
    """
    Pre-encode all text prompts into CLIP embedding space.
    This only happens once, not per image.
    """
    prompts = list(ATTRIBUTE_PROMPTS.values())
    prompt_names = list(ATTRIBUTE_PROMPTS.keys())
    
    tokens = tokenizer(prompts).to(device)
    with torch.no_grad():
        text_features = model.encode_text(tokens)
        text_features = text_features / text_features.norm(dim=-1, keepdim=True)
    
    return text_features, prompt_names


def score_image(model, preprocess, text_features, image_path, device):
    """
    Score a single image against all text prompts.
    
    Returns a numpy array of shape (num_prompts,) with values 0-1.
    Higher = image matches that prompt more.
    """
    try:
        image = Image.open(image_path).convert("RGB")
        image_tensor = preprocess(image).unsqueeze(0).to(device)
        
        with torch.no_grad():
            image_features = model.encode_image(image_tensor)
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)
            
            # Cosine similarity between image and each text prompt
            similarities = (image_features @ text_features.T).squeeze(0)
            
            # Convert to probabilities with softmax (makes scores sum to 1
            # within related groups, which is useful but optional)
            # For raw cosine similarity, comment out the next line:
            # similarities = torch.softmax(similarities * 100, dim=-1)
            
        return similarities.cpu().numpy()
    
    except Exception as e:
        print(f"    Error processing {image_path}: {e}")
        return None


def find_collections(input_dir):
    """
    Discover the folder structure: designer/season/images.
    Returns list of (designer, season, image_paths).
    """
    input_path = Path(input_dir)
    collections = []
    
    for designer_dir in sorted(input_path.iterdir()):
        if not designer_dir.is_dir():
            continue
        designer = designer_dir.name
        
        for season_dir in sorted(designer_dir.iterdir()):
            if not season_dir.is_dir():
                continue
            season = season_dir.name
            
            # Find all images
            images = sorted([
                f for f in season_dir.iterdir()
                if f.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp')
            ])
            
            if images:
                collections.append((designer, season, images))
    
    return collections


def main():
    parser = argparse.ArgumentParser(description="DS3000 OpenCLIP Feature Extractor")
    parser.add_argument("--input", type=str, default="ds3000-runway-images",
                        help="Root folder with designer/season/images structure")
    parser.add_argument("--output", type=str, default="data/clip_scores.csv",
                        help="Output CSV path")
    parser.add_argument("--per-image", type=str, default=None,
                        help="Also save per-image scores (optional, large file)")
    args = parser.parse_args()

    # ---- Step 1: Load model ----
    model, preprocess, tokenizer, device = load_model()
    text_features, prompt_names = encode_text_prompts(model, tokenizer, device)
    
    print(f"\nScoring against {len(prompt_names)} attribute prompts:")
    for name in prompt_names:
        print(f"  - {name}")

    # ---- Step 2: Discover collections ----
    collections = find_collections(args.input)
    total_images = sum(len(imgs) for _, _, imgs in collections)
    
    print(f"\nFound {len(collections)} collections with {total_images} total images")
    
    if not collections:
        print(f"\nERROR: No collections found in '{args.input}/'")
        print(f"Expected structure: {args.input}/designer-name/season-name/image.jpg")
        sys.exit(1)

    # ---- Step 3: Score every image ----
    collection_rows = []
    all_image_rows = []
    
    for designer, season, images in tqdm(collections, desc="Collections"):
        image_scores = []
        
        for img_path in images:
            scores = score_image(model, preprocess, text_features, img_path, device)
            if scores is not None:
                image_scores.append(scores)
                
                if args.per_image:
                    row = {"designer": designer, "season": season, "image": img_path.name}
                    row.update(dict(zip(prompt_names, scores)))
                    all_image_rows.append(row)
        
        if image_scores:
            # Average across all looks in the collection
            avg_scores = np.mean(image_scores, axis=0)
            
            row = {
                "designer": designer,
                "season": season,
                "num_looks": len(image_scores),
            }
            row.update(dict(zip(prompt_names, avg_scores)))
            collection_rows.append(row)

    # ---- Step 4: Save results ----
    os.makedirs(os.path.dirname(args.output) or ".", exist_ok=True)
    
    df = pd.DataFrame(collection_rows)
    df.to_csv(args.output, index=False)
    print(f"\nSaved collection-level scores: {args.output}")
    print(f"  Shape: {df.shape[0]} collections x {df.shape[1]} columns")
    
    if args.per_image and all_image_rows:
        df_images = pd.DataFrame(all_image_rows)
        df_images.to_csv(args.per_image, index=False)
        print(f"Saved per-image scores: {args.per_image}")
        print(f"  Shape: {df_images.shape[0]} images x {df_images.shape[1]} columns")

    # ---- Step 5: Preview ----
    print(f"\nPreview of first 5 rows:")
    print(df[["designer", "season", "num_looks"] + prompt_names[:5]].head().to_string())
    
    print(f"\n--- DONE ---")
    print(f"Next steps:")
    print(f"  1. Open {args.output} to inspect the data")
    print(f"  2. Run SVD: python3 scripts/svd_analysis.py --input {args.output}")
    print(f"  3. Compare with manual scores to validate")


if __name__ == "__main__":
    main()
