# Sisters of St Joseph of the Apparition — website

A plain static site built from the design in `../SJA Mobile.dc.html`.
No build step, no dependencies: open `index.html` or drop the folder on any host
(GitHub Pages, Netlify, ordinary shared hosting).

```
docs/
  index.html          Home
  congregation.html   Who we are » Congregation
  where-we-are.html   Where we are — interactive foundations map
  css/style.css       all styling (palette and metrics taken from the design)
  js/site.js          navigation drawer + footer links
  js/map.js           the interactive map layer
  assets/             logo, photographs, foundations map artwork
```

To preview locally: `python3 -m http.server 8000` then open <http://localhost:8000>.
(Opening `index.html` by double-click also works.)

## What was ported

- **Palette and type** — `#004a9b`, `#004aad`, `#046bd2`, `#75c2ec`, `#b0d6f7`;
  Inknut Antiqua headings (Google Fonts), system sans for body text.
- **Classic UI** — solid bars, chevrons, blockquotes, drop/inset shadows instead
  of 1px borders, 44px minimum tap targets.
- **Navigation** — the full eight-section tree from the design, as an accordion
  drawer behind the header's menu button, on every page.
- **Where we are** — the Congregation's own foundations map with the interactive
  layer rebuilt in vanilla JS: 24 country markers at the coordinates measured
  against the artwork, four cluster badges for countries too close to tap apart
  (Mediterranean & Holy Land, Britain & Ireland, South-East Asia, Central
  America), hover/tap highlight with a tooltip carrying the foundation year,
  per-country zoom, drag-to-pan and double-tap-to-reset while zoomed, the
  communities panel, the community sheet, and the region chips. Hit areas are
  still sized from the nearest visible marker (12–44px) so no marker can swallow
  a neighbour's tap; Palestine keeps its offset marker and leader line.

## Deliberate differences from the design canvas

- **Responsive** — the design draws 430px screens. Phones get exactly that.
  From 700px the column widens to 720px; from 1024px it widens to 1100px and
  the sections use the width: on the home page the Welcome text sits beside the
  foundress card, Explore becomes two columns and the news becomes three cards
  abreast. Source order is unchanged, so the phone layout still shows the
  portrait between the quote and the button — only the desktop grid moves it.
  Text-led content (the Congregation page, the map intro, the panels and the
  region list) carries the `wrap` class and centres at 680px, about 72
  characters a line, rather than stretching across the full width. The header,
  hero, world map and footer span the whole column.
- **The "Menu" screen** is the drawer, opened by the header button, rather than a
  separate page.
- **Search** submits to a Google site-search for `stjoseph-apparition.org`, since
  a static site has no search backend.
- **Community photographs** — the design used a drag-and-drop mockup slot. Here
  the sheet shows `assets/communities/<slug>.jpg` if such a file exists (slug =
  the community name lowercased, non-alphanumerics replaced by `-`, e.g.
  `assets/communities/gaillac.jpg`), and otherwise keeps the marked placeholder.

## Still to be supplied by the Congregation

- Pages for every nav entry other than Home, Congregation and Where we are.
  Their links are rendered but not clickable, marked with the title
  "This page has not been built yet".
- Real news items — the three on the home page are the design's placeholders,
  dated August/July/June 2026.
- Per-community descriptions and photographs, and the French translation.

## Image notes

- The hero is `assets/hero-generalate-garden.webp` — 1280x669, WebP q85, 217KB
  (from the design's 1900x992 PNG, 3.2MB). The hero renders at most 640px wide,
  so 1280px still covers 2x displays. Re-encode with:
  `cwebp -q 85 -resize 1280 0 -m 6 -sharp_yuv <source>.png -o hero-generalate-garden.webp`
  (`brew install webp`). The original PNG remains in `../assets/`.
- `assets/world-map-foundations.png` — 1625x968, quantized to a 256-colour
  palette with `pngquant`, 414KB (was 1013KB). It stays a PNG rather than WebP
  because the artwork carries fine text (country names and foundation years)
  that must survive the map's 6x zoom, and because its colour coding is the
  content. Re-encode with:
  `pngquant --nofs --quality=70-98 --speed 1 --strip 256 -- <source>.png`
  (`brew install pngquant`). Dithering is off deliberately: the fills are flat,
  so Floyd-Steinberg only adds speckle and costs bytes.

  Palette size was chosen by checking whether quantization merges the fills of
  the 24 presence countries. At 256 and 128 colours, only Italy/India and
  Cyprus/Myanmar collapse to the same colour — pairs on different continents,
  so nothing reads wrong. At 64 colours, Cyprus and the Palestinian Territories
  merge, and they sit in the same neighbourhood on the map, so 64 and below were
  rejected. SSIM against the original is 0.9983.

- `assets/emilie-portrait-oval.webp` — 804x1207, WebP q85, 93KB (was a 1.2MB
  PNG). Native resolution was kept rather than downscaled: the portrait displays
  at 150x196 CSS px, so even 480px would have sufficed, but at 93KB there is no
  reason to bake in a ceiling if the portrait is ever shown larger. The oval is
  produced by CSS `border-radius`, not by transparency in the file — the source
  has no alpha channel, so the conversion is plain lossy WebP.
  `cwebp -q 85 -m 6 -sharp_yuv <source>.png -o emilie-portrait-oval.webp`

## Where this lives

This folder is `docs/` on `main` in `cristofor-dev/sja_website`. The design it was
built from (`SJA Mobile.dc.html`, `CHANGELOG.md`, `assets/`, `uploads/`) stays at
the repository root.

## Hosting

The pages use **relative** asset paths (`css/style.css`, `assets/...`), so the
site must be served from a URL ending in a slash. A host that serves `/docs`
without redirecting to `/docs/` makes the browser resolve every asset against
the domain root, and the page arrives as unstyled HTML with broken images.

- **Vercel** — the cleanest setup is Settings → Build & Deployment → *Root
  Directory* = `docs`, which serves the site at the domain root and deploys
  only this folder. Without that, the `vercel.json` at the repository root
  supplies `trailingSlash: true` (so `/docs` redirects to `/docs/`) and sends
  `/` to `/docs/`. If you do set the Root Directory, that file stops being read
  and can be deleted.
- **GitHub Pages** — not enabled. Settings → Pages → Source "Deploy from a
  branch" → branch `main`, folder `/docs` → Save. It then serves at
  <https://cristofor-dev.github.io/sja_website/>, with the trailing slash
  handled automatically.
