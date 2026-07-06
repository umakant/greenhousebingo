import re
from pathlib import Path

p = Path(r"c:\xampp_latest\htdocs\Paper-Flight-Dash\nextjs\storage\storefront-liquid-themes\1000\w-2\index.html")
s = p.read_text(encoding="utf-8")
idx = s.find('id="MainContent"')
sub = s[idx : idx + 400000]
pat = r'<div id="(shopify-section-template--26951428768025__[^"]+)"'
seen = []
for m in re.finditer(pat, sub):
    sid = m.group(1)
    if sid not in seen:
        seen.append(sid)
for i, sid in enumerate(seen[:40]):
    print(f"{i:2} {sid}")
