"""Make every app icon from assets/logo.svg and assets/logo-small.svg.

Run from the repository root: python3 build/make-icons.py  (needs rsvg-convert and Pillow).
"""
import io, os, subprocess
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BIG = os.path.join(ROOT, 'assets', 'logo.svg')
SMALL = os.path.join(ROOT, 'assets', 'logo-small.svg')
STORE = os.path.join(ROOT, 'build', 'windows', 'store', 'Assets')


def render(svg, px):
    png = subprocess.run(['rsvg-convert', '-w', str(px), '-h', str(px), svg], check=True, capture_output=True).stdout
    return Image.open(io.BytesIO(png)).convert('RGBA')


def icon(px, pad=0.0859):
    """The rounded square on a transparent square, with the usual margin (44 of 512)."""
    svg = SMALL if px <= 48 else BIG
    pad = 0.0 if px <= 24 else (0.04 if px <= 48 else pad)
    inner = max(1, round(px * (1 - 2 * pad)))
    out = Image.new('RGBA', (px, px), (0, 0, 0, 0))
    out.alpha_composite(render(svg, inner), ((px - inner) // 2, (px - inner) // 2))
    return out


def tile(w, h, share=0.66):
    """The icon centred on a transparent tile (Store tiles)."""
    side = round(h * share)
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    out.alpha_composite(icon(side, pad=0), ((w - side) // 2, (h - side) // 2))
    return out


big = icon(512)
big.save(os.path.join(ROOT, 'assets', 'icon.png'))
big.save(os.path.join(ROOT, 'app', 'icon.png'))
icon(1024).save(os.path.join(ROOT, 'assets', 'icon-1024.png'))

sizes = [16, 24, 32, 48, 64, 128, 256]
frames = [icon(s) for s in sizes]
frames[-1].save(os.path.join(ROOT, 'assets', 'icon.ico'), format='ICO', sizes=[(s, s) for s in sizes], append_images=frames[:-1])
icon(1024).save(os.path.join(ROOT, 'assets', 'icon.icns'), format='ICNS', append_images=[icon(s) for s in (16, 32, 64, 128, 256, 512)])

for scale in (100, 200, 400):
    k = scale / 100
    tile(round(150 * k), round(150 * k)).save(os.path.join(STORE, f'Square150x150Logo.scale-{scale}.png'))
    tile(round(310 * k), round(150 * k)).save(os.path.join(STORE, f'Wide310x150Logo.scale-{scale}.png'))
    icon(round(44 * k)).save(os.path.join(STORE, f'Square44x44Logo.scale-{scale}.png'))
    icon(round(50 * k)).save(os.path.join(STORE, f'StoreLogo.scale-{scale}.png'))
for t in (16, 24, 32, 48, 256):
    im = icon(t)
    im.save(os.path.join(STORE, f'Square44x44Logo.targetsize-{t}.png'))
    im.save(os.path.join(STORE, f'Square44x44Logo.targetsize-{t}_altform-unplated.png'))
print('icons written')
