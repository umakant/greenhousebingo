"""One-off: Philly Water Ice bundle images + copy in index.html."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / "index.html"
html = path.read_text(encoding="utf-8")

intro_old = (
    "<p>The choice is yours. With our bundle builder, you can select any combination "
    "from our range of products. The easiest way to keep everyone happy.</p>"
)
intro_new = (
    "<p>Mix your favorite Philly Water Ice flavors in one bundle. Pick party tubs in "
    "any combination so every scoop is exactly what you crave.</p>"
)
if intro_old in html:
    html = html.replace(intro_old, intro_new, 1)

sidebar_old = "<p>Add at least 3 products to proceed and Save 30%</p>"
sidebar_new = "<p>Add at least 3 tubs to unlock your bundle discount and save 30%.</p>"
html = html.replace(sidebar_old, sidebar_new, 1)

gallery_ids = [
    "8678367428889",
    "8813796884761",
    "8799405900057",
    "8801439547673",
    "8801540538649",
    "8804665229593",
]
flavors = [
    "banana.png",
    "blue-raspberry.png",
    "cherry.png",
    "mango.png",
    "lime.png",
    "pina-colada.png",
]


def replace_remote_imgs(chunk: str, fname: str) -> str:
    rel = f"./assets/bundle/{fname}"
    absu = f"/assets/bundle/{fname}"
    chunk = re.sub(
        r"\./assets/remote/[a-f0-9]+\.webp(?:\?[^\"\s>]*)?",
        rel,
        chunk,
    )
    chunk = re.sub(
        r"url\(/assets/remote/[a-f0-9]+\.webp[^)]*\)",
        f"url({absu})",
        chunk,
    )
    return chunk


for i, gid in enumerate(gallery_ids):
    fname = flavors[i]
    marker = f'id="ProductGallery-template--26951428768025__product-bundle-{gid}"'
    start = html.find(marker)
    if start == -1:
        raise SystemExit(f"MISSING gallery start {gid}")
    if i + 1 < len(gallery_ids):
        next_gid = gallery_ids[i + 1]
        end_marker = f'id="ProductGallery-template--26951428768025__product-bundle-{next_gid}"'
        end = html.find(end_marker, start)
    else:
        end = html.find("</motion-list>", start)
    if end == -1:
        raise SystemExit(f"MISSING gallery end {gid}")
    chunk = html[start:end]
    chunk = replace_remote_imgs(chunk, fname)
    html = html[:start] + chunk + html[end:]

sec_start = html.find('id="shopify-section-template--26951428768025__product-bundle"')
if sec_start == -1:
    raise SystemExit("bundle section not found")
pre = html[:sec_start]
post = html[sec_start:]
text_map = [
    ("Flow Harmony", "Banana Water Ice"),
    ("Zenith Pulse", "Blue Raspberry Water Ice"),
    ("RhythmiQ", "Cherry Water Ice"),
    ("Nature Tune", "Mango Water Ice"),
    ("SoundRoll", "Lime Water Ice"),
    ("3.5 mm Audio Cable", "Piña Colada Water Ice"),
    ("SonicPulse", "Philly Water Ice"),
    ("Vibrance", "Philly Water Ice"),
    ("Resonance", "Philly Water Ice"),
    ('title="SonicPulse"', 'title="Philly Water Ice"'),
    ('title="Vibrance"', 'title="Philly Water Ice"'),
    ('title="Resonance"', 'title="Philly Water Ice"'),
]
for a, b in text_map:
    post = post.replace(a, b)
html = pre + post

# Prices: first occurrence of each price span in bundle section window
sec = html[sec_start : sec_start + 250000]
price_pairs = [
    ('<span class="price__regular whitespace-nowrap">$999.00</span>', "34.99"),
    ('<span class="price__regular whitespace-nowrap">$400.00</span>', "34.99"),
    ('<span class="price__regular whitespace-nowrap">$399.00</span>', "34.99"),
    ('<span class="price__regular whitespace-nowrap">$1,099.00</span>', "34.99"),
    ('<span class="price__regular whitespace-nowrap">$199.00</span>', "34.99"),
    ('<span class="price__regular whitespace-nowrap">$35.00</span>', "34.99"),
]
pos = sec_start
for old, amt in price_pairs:
    new = f'<span class="price__regular whitespace-nowrap">${amt}</span>'
    i = html.find(old, pos)
    if i == -1:
        continue
    html = html[:i] + new + html[i + len(old) :]
    pos = i + len(new)

# Bundle section: noscript option prices + variant JSON cents (sidebar totals)
bundle_sec_end = html.find("</product-bundle>", sec_start)
if bundle_sec_end != -1:
    bundle_sec_end += len("</product-bundle>")
    bchunk = html[sec_start:bundle_sec_end]
    for old_d in (
        "- $999.00",
        "- $400.00",
        "- $420.00",
        "- $450.00",
        "- $399.00",
        "- $1,099.00",
        "- $1,299.00",
        "- $199.00",
        "- $35.00",
    ):
        bchunk = bchunk.replace(old_d, "- $34.99")
    for p in (99900, 40000, 42000, 45000, 39900, 109900, 129900, 19900, 3500):
        bchunk = bchunk.replace(f'"price":{p}', '"price":3499')
    html = html[:sec_start] + bchunk + html[bundle_sec_end:]

# Shop-the-feed hotspots (same renamed products): thumb + display price
feed_old_banana = (
    '<div class="hidden lg:block media media--square relative overflow-hidden shrink-0 loading">'
    '<img src="./assets/remote/e201c5efe8a58890482c.webp" alt="#color_gold-tone" '
    'srcset="./assets/remote/e201c5efe8a58890482c.webp?v=1708574900&amp;width=120 120w, '
    './assets/remote/e201c5efe8a58890482c.webp?v=1708574900&amp;width=160 160w, '
    './assets/remote/e201c5efe8a58890482c.webp?v=1708574900&amp;width=240 240w" '
    'width="2000" height="2000" loading="lazy" sizes="80px" is="lazy-image"></div>'
    '<div class="rte text-sm leading-none grid gap-2">\n'
    '                              <p class="horizontal-product__title lg:text-base lg:font-medium leading-tight">'
    "Banana Water Ice</p><div class=\"price\"><span class=\"price__regular whitespace-nowrap\">"
    "$999.00</span></div>"
)
feed_new_banana = (
    '<div class="hidden lg:block media media--square relative overflow-hidden shrink-0 loading">'
    '<img src="./assets/bundle/banana.png" alt="Banana Philly Water Ice" '
    'srcset="./assets/bundle/banana.png 120w, ./assets/bundle/banana.png 160w, '
    './assets/bundle/banana.png 240w" width="2000" height="2000" loading="lazy" sizes="80px" '
    'is="lazy-image"></div>'
    '<div class="rte text-sm leading-none grid gap-2">\n'
    '                              <p class="horizontal-product__title lg:text-base lg:font-medium leading-tight">'
    "Banana Water Ice</p><div class=\"price\"><span class=\"price__regular whitespace-nowrap\">"
    "$34.99</span></div>"
)
html = html.replace(feed_old_banana, feed_new_banana, 1)

feed_old_lime = (
    '<div class="hidden lg:block media media--square relative overflow-hidden shrink-0 loading">'
    '<img src="./assets/remote/21a3a8ec0e1edeeb8a11.webp" alt="#color_black" '
    'srcset="./assets/remote/21a3a8ec0e1edeeb8a11.webp?v=1739328626&amp;width=120 120w, '
    './assets/remote/21a3a8ec0e1edeeb8a11.webp?v=1739328626&amp;width=160 160w, '
    './assets/remote/21a3a8ec0e1edeeb8a11.webp?v=1739328626&amp;width=240 240w" '
    'width="2000" height="2000" loading="lazy" sizes="80px" is="lazy-image"></div>'
    '<div class="rte text-sm leading-none grid gap-2">\n'
    '                              <p class="horizontal-product__title lg:text-base lg:font-medium leading-tight">'
    "Lime Water Ice</p><div class=\"price\"><span class=\"price__regular whitespace-nowrap\">"
    "$199.00</span></div>"
)
feed_new_lime = (
    '<div class="hidden lg:block media media--square relative overflow-hidden shrink-0 loading">'
    '<img src="./assets/bundle/lime.png" alt="Lime Philly Water Ice" '
    'srcset="./assets/bundle/lime.png 120w, ./assets/bundle/lime.png 160w, '
    './assets/bundle/lime.png 240w" width="2000" height="2000" loading="lazy" sizes="80px" '
    'is="lazy-image"></div>'
    '<div class="rte text-sm leading-none grid gap-2">\n'
    '                              <p class="horizontal-product__title lg:text-base lg:font-medium leading-tight">'
    "Lime Water Ice</p><div class=\"price\"><span class=\"price__regular whitespace-nowrap\">"
    "$34.99</span></div>"
)
html = html.replace(feed_old_lime, feed_new_lime, 1)

feed_list_banana = (
    '<a class="horizontal-product__media media media--square relative overflow-hidden shrink-0 loading" href="#">'
    '<img src="./assets/remote/e201c5efe8a58890482c.webp" alt="#color_gold-tone" '
    'srcset="./assets/remote/e201c5efe8a58890482c.webp?v=1708574900&amp;width=144 144w, '
    './assets/remote/e201c5efe8a58890482c.webp?v=1708574900&amp;width=192 192w, '
    './assets/remote/e201c5efe8a58890482c.webp?v=1708574900&amp;width=288 288w" '
    'width="2000" height="2000" loading="lazy" sizes="96px" is="lazy-image"></a>'
    '\n  <div class="horizontal-product__details grow flex flex-col justify-start gap-1d5">\n'
    '    <div class="flex flex-col gap-1">\n'
    '      <div class="block"><a href="#" class="horizontal-product__title reversed-link font-medium text-base leading-tight">'
    "Banana Water Ice</a>\n"
    "      </div>\n"
    "    </div>\n"
    "    \n"
    '    <div class="flex flex-col gap-1"><div class="price flex flex-wrap items-end gap-2 text-sm">'
    '<span class="price__regular whitespace-nowrap">$999.00</span></div>'
)
feed_list_banana_new = (
    '<a class="horizontal-product__media media media--square relative overflow-hidden shrink-0 loading" href="#">'
    '<img src="./assets/bundle/banana.png" alt="Banana Philly Water Ice" '
    'srcset="./assets/bundle/banana.png 144w, ./assets/bundle/banana.png 192w, '
    './assets/bundle/banana.png 288w" width="2000" height="2000" loading="lazy" sizes="96px" '
    'is="lazy-image"></a>'
    '\n  <div class="horizontal-product__details grow flex flex-col justify-start gap-1d5">\n'
    '    <div class="flex flex-col gap-1">\n'
    '      <div class="block"><a href="#" class="horizontal-product__title reversed-link font-medium text-base leading-tight">'
    "Banana Water Ice</a>\n"
    "      </div>\n"
    "    </div>\n"
    "    \n"
    '    <div class="flex flex-col gap-1"><div class="price flex flex-wrap items-end gap-2 text-sm">'
    '<span class="price__regular whitespace-nowrap">$34.99</span></div>'
)
html = html.replace(feed_list_banana, feed_list_banana_new, 1)

path.write_text(html, encoding="utf-8")
print("OK:", path)
