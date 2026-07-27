# ===========
# Import
# ===========
from pathlib import Path
import numpy as np
from PIL import Image
from skimage.metrics import structural_similarity


class ImageCompare:
  def __init__(self, reference_dir="src/playwright/screenshots/reference", target_dir="src/playwright/screenshots/target"):
    self.reference_dir = Path(reference_dir).resolve()
    self.target_dir = Path(target_dir).resolve()
    self.threshold = 0.8

  def compare(self):
    results = []
    for ref in self.reference_dir.glob("*.png"):
      target = self.target_dir / ref.name

      if not target.exists():
        results.append({"image": ref.name, "status": "missing_target"})
        continue

      score = self.compare_images(ref, target)
      if score is None:
        results.append({
          "image": ref.name,
          "status": "different_size"
          })
      else:
        results.append({
          "image": ref.name,
          "status": "ok",
          "score": score,
          "passed": score >= self.threshold
        })

    return results

  def compare_images(self, a, b):
    img1 = np.array(Image.open(a).convert("L"))
    img2 = np.array(Image.open(b).convert("L"))

    if img1.shape != img2.shape:
      return None

    score, _ = structural_similarity(img1, img2, full=True)

    return float(score)
