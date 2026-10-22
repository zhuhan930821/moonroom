"""Prepare seam-free per-plank atlases from Poly Haven's CC0 wood_floor maps.

The existing Moonroom floor already has modeled plank seams. Sampling entire
source boards would duplicate those seams, so each atlas column is cropped from
the interior of one source plank. Run with system Python/Pillow before Blender.
"""

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets-source/architecture/polyhaven-wood-floor-test/textures"
SIZE = 2048

# (center X, top Y, bottom Y) in source UV. Each crop stays inside a source
# board and away from its staggered end joint.
STRIPS = (
    (.055, .08, .70), (.165, .12, .50), (.275, .35, .86),
    (.385, .10, .78), (.495, .39, .68), (.605, .05, .32),
)
MAPS = {"BaseColor": "diff", "Normal": "nor_gl", "Roughness": "rough"}

for label, suffix in MAPS.items():
    source = Image.open(OUT / f"wood_floor_{suffix}_2k.jpg").convert("RGB")
    atlas = Image.new("RGB", (SIZE, SIZE))
    column_width = SIZE // 6
    for index, (cx, top, bottom) in enumerate(STRIPS):
        half_width = .042
        crop = source.crop((round((cx-half_width)*source.width), round(top*source.height),
                            round((cx+half_width)*source.width), round(bottom*source.height)))
        width = column_width if index < 5 else SIZE - 5 * column_width
        atlas.paste(crop.resize((width, SIZE), Image.Resampling.LANCZOS), (index * column_width, 0))
    path = OUT / f"Moonroom_PolyHaven_WoodFloor_{label}_Atlas.png"
    atlas.save(path, optimize=True)
    print(path)
