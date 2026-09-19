#!/usr/bin/env python3
"""Port the remaining pages of stjoseph-apparition.org into docs/.

Reads the WordPress mirror (../www.stjoseph-apparition.org), converts each
page's entry content to the site's own markup (see docs/css/style.css), copies
and re-encodes the images it uses into docs/assets/media/, copies the PDFs that
the mirror holds into docs/assets/docs/, and writes one docs/<file>.html per
page.  Videos and PDFs the mirror does not hold are linked from the live site.

Run from anywhere:  python3 tools/build_pages.py
Needs: beautifulsoup4, pillow (pip), cwebp (brew install webp).
"""
import hashlib
import html
import os
import re
import shutil
import subprocess
import sys
import urllib.parse

from bs4 import BeautifulSoup, NavigableString, Tag
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, 'docs')
MIRROR = os.path.normpath(os.path.join(ROOT, '..', 'www.stjoseph-apparition.org'))
LIVE = 'https://www.stjoseph-apparition.org'
MEDIA_DIR = os.path.join(DOCS, 'assets', 'media')
DOCS_DIR = os.path.join(DOCS, 'assets', 'docs')
MAX_W = 1280

# ── site structure ────────────────────────────────────────────────────────
# (label, output file, mirror directory, kind)
#   kind: 'section'  – a landing page listing its children
#         'page'     – ordinary content page
#         'restricted' – members-only on the live site
#         'contact'  – the contact page (details + mail form)
#         'existing' – hand-built earlier; left alone, only linked
SECTIONS = [
    ('Home', 'index.html', None, 'existing', []),
    ('Who we are', 'who-we-are.html', 'who-we-are', 'section', [
        ('Congregation', 'congregation.html', 'congregation', 'existing'),
        ('The Foundress St. Emilie', 'the-foundress-st-emilie.html', 'the-foundress-st-emilie', 'page'),
        ('Charism and Spirituality', 'charism.html', 'charism', 'page'),
    ]),
    ('Where we are', 'where-we-are.html', 'where-we-are', 'existing', [
        ('Generalate', 'generalate.html', 'generalate', 'page'),
        ('Europe/Africa', 'europe-africa.html', 'europe-africa', 'page'),
        ('Asia/Oceania', 'asia-oceania.html', 'asia-oceania', 'page'),
        ('Middle East', 'middle-east.html', 'middle-east', 'page'),
        ('Latin America', 'latin-america.html', 'latin-america', 'page'),
    ]),
    ('What we do', 'what-we-do.html', 'what-we-do', 'section', [
        ('Education', 'education.html', 'education', 'section'),
        ('Health Care', 'health-care.html', 'health-care', 'page'),
        ('Pastoral Care', 'pastoral-care.html', 'pastoral-care', 'page'),
        ('Social Work', 'social-work.html', 'social-work', 'page'),
        ('Retreat Houses', 'retreat-houses.html', 'retreat-houses', 'page'),
        ('Guest Houses', 'guest-houses.html', 'guest-houses', 'page'),
        ('Hostels', 'hostels.html', 'hostels', 'page'),
        ('Orphanages', 'orphanages.html', 'orphanages', 'page'),
        ('Media Ministry', 'media-ministry.html', 'media-ministry', 'page'),
    ]),
    ('Formation', 'formation.html', 'formation', 'section', [
        ('Aim', 'aim.html', 'aim', 'page'),
        ('Stages', 'stages.html', 'stages', 'page'),
        ('Ongoing Formation', 'ongoing-formation.html', 'ongoing-formation', 'page'),
        ('Lay Associates', 'lay-associates.html', 'lay-associates', 'page'),
        ('Professional Formation', 'professional-formation.html', 'professional-formation', 'page'),
        ('Safeguarding', 'safeguarding.html', 'safeguarding', 'page'),
    ]),
    ('News', 'news.html', 'news', 'section', [
        ('Current news', 'current-news.html', 'current-news', 'page'),
        ('Bulletins', 'bulletins.html', 'bulletins', 'page'),
        ('General Chapter 2025', 'general-chapter-2025.html', 'chapter-theme-with-logo', 'page'),
        ('Hymn of the General Chapter 2025', 'hymn-of-the-general-chapter-2025.html', 'the-hymn-of-the-general-chapter-2025', 'page'),
        ('Other useful weblinks', 'other-useful-weblinks.html', 'other-useful-weblinks', 'page'),
    ]),
    ('Contact', 'contact.html', 'contact', 'contact', []),
    ('Members', 'members.html', 'members', 'restricted', [
        ('Archives', 'http://gilse.emiliedevialar.org:8090/SJA/edv_en.html', None, 'external'),
        ('Obituaries', 'obituaries.html', 'obituaries', 'restricted'),
        ('Letters', 'letters.html', 'letters', 'restricted'),
        ('Documents', 'documents.html', 'documents', 'restricted'),
        ('Voices of the Sisters', 'voices-of-the-sisters.html', 'voices-of-the-sisters', 'restricted'),
    ]),
]

# Education's own sub-pages (the live site nests them under Education)
EDUCATION_CHILDREN = [
    ('SJA schools', 'sja-schools.html', 'sja-schools', 'page'),
    ('Sisters working in collaboration with others', 'sisters-working-in-collaboration-with-others.html',
     'sisters-working-in-collaboration-with-others', 'page'),
]

# WordPress page id → output file, for rewriting the mirror's internal links
ID_TO_FILE = {
    '51': 'congregation.html', '52': 'the-foundress-st-emilie.html', '53': 'charism.html',
    '55': 'generalate.html', '56': 'europe-africa.html', '57': 'asia-oceania.html',
    '58': 'middle-east.html', '59': 'latin-america.html', '61': 'education.html',
    '62': 'health-care.html', '63': 'pastoral-care.html', '64': 'social-work.html',
    '65': 'retreat-houses.html', '66': 'guest-houses.html', '67': 'hostels.html',
    '68': 'orphanages.html', '69': 'media-ministry.html', '115': 'aim.html', '116': 'stages.html',
    '117': 'ongoing-formation.html', '118': 'lay-associates.html', '119': 'safeguarding.html',
    '120': 'professional-formation.html', '136': 'general-chapter-2025.html', '139': 'obituaries.html',
    '159': 'members.html', '161': 'contact.html', '162': 'news.html', '163': 'formation.html',
    '164': 'what-we-do.html', '175': 'where-we-are.html', '176': 'who-we-are.html',
    '734': 'sja-schools.html', '736': 'sisters-working-in-collaboration-with-others.html',
    '918': 'current-news.html', '1176': 'letters.html', '1178': 'documents.html',
    '1187': 'bulletins.html', '1329': 'other-useful-weblinks.html', '1738': 'voices-of-the-sisters.html',
    '1804': 'hymn-of-the-general-chapter-2025.html', '2234': 'index.html',
}

CHEVRON = ('<svg class="chev" viewBox="57 35.171 26 16.043" width="14" height="9" aria-hidden="true">'
           '<path d="M57.5,38.193l12.5,12.5l12.5-12.5l-2.5-2.5l-10,10l-10-10L57.5,38.193z"></path></svg>')

# ── media ─────────────────────────────────────────────────────────────────

_media_cache = {}
_used_names = {}


def local_path(url):
    """Map any mirror/live/absolute wp-content URL to a file in the mirror, or None."""
    url = html.unescape(url).split('?')[0].split('#')[0]
    m = re.search(r'wp-content/.*$', url)
    if not m:
        return None
    p = os.path.join(MIRROR, urllib.parse.unquote(m.group(0)))
    return p if os.path.isfile(p) else None


def live_url(url):
    url = html.unescape(url).split('#')[0]
    m = re.search(r'wp-content/.*$', url)
    return LIVE + '/' + m.group(0) if m else url


def unique_name(stem, ext, src):
    key = stem + ext
    if key in _used_names and _used_names[key] != src:
        h = hashlib.md5(src.encode()).hexdigest()[:6]
        key = f'{stem}-{h}{ext}'
    _used_names[key] = src
    return key


def image_asset(url):
    """Copy/re-encode an image into docs/assets/media. Returns (href, w, h) or None."""
    if url in _media_cache:
        return _media_cache[url]
    src = local_path(url)
    if not src:
        _media_cache[url] = None
        return None
    stem = re.sub(r'-\d+x\d+$', '', os.path.splitext(os.path.basename(src))[0])
    stem = re.sub(r'[^A-Za-z0-9]+', '-', stem).strip('-').lower() or 'image'
    with Image.open(src) as im:
        w, h = im.size
    if src.lower().endswith('.gif'):
        name = unique_name(stem, '.gif', src)
        shutil.copyfile(src, os.path.join(MEDIA_DIR, name))
        out_w, out_h = w, h
    else:
        name = unique_name(stem, '.webp', src)
        out = os.path.join(MEDIA_DIR, name)
        if not os.path.exists(out):
            cmd = ['cwebp', '-quiet', '-q', '82', '-m', '6', '-sharp_yuv', '-metadata', 'none']
            if w > MAX_W:
                cmd += ['-resize', str(MAX_W), '0']
            subprocess.run(cmd + [src, '-o', out], check=True)
        with Image.open(out) as im:
            out_w, out_h = im.size
    res = ('assets/media/' + name, out_w, out_h)
    _media_cache[url] = res
    return res


def document_asset(url):
    """Copy a PDF into docs/assets/docs when the mirror has it; else the live URL."""
    src = local_path(url)
    if not src:
        return live_url(url), False
    name = os.path.basename(src)
    dst = os.path.join(DOCS_DIR, name)
    if not os.path.exists(dst):
        shutil.copyfile(src, dst)
    return 'assets/docs/' + urllib.parse.quote(name), True


def pdf_cover(href):
    """Render page 1 of a locally served PDF as a WebP cover (via macOS Quick
    Look); returns (href, w, h) or None when it cannot be rendered."""
    src = os.path.join(DOCS, urllib.parse.unquote(href))
    if not os.path.isfile(src) or not shutil.which('qlmanage'):
        return None
    stem = re.sub(r'[^A-Za-z0-9]+', '-', os.path.splitext(os.path.basename(src))[0]).strip('-').lower()
    name = unique_name(stem + '-cover', '.webp', src)
    out = os.path.join(MEDIA_DIR, name)
    if not os.path.exists(out):
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            subprocess.run(['qlmanage', '-t', '-s', '1448', '-o', tmp, src],
                           check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            png = os.path.join(tmp, os.path.basename(src) + '.png')
            if not os.path.exists(png):
                return None
            subprocess.run(['cwebp', '-quiet', '-q', '82', '-m', '6', '-resize', '724', '0', png, '-o', out], check=True)
    with Image.open(out) as im:
        w, h = im.size
    return 'assets/media/' + name, w, h


# ── caption from a Smart Slider slide title ("StLouisHospitalJerusalem") ──

CONNECTORS = ('inthe', 'ofthe', 'in', 'of', 'the', 'and', 'de', 'des', 'du')
JUNK = re.compile(r'^(photo|image|img|pic|picture|slide|audience|conclusion|report|net|untitled)$', re.I)


def humanize(title):
    """Turn a slide title such as "StLouisHospitalJerusalem" into a caption.
    Returns '' when the title does not look like a name worth showing."""
    t = re.sub(r'\d+$', '', title or '').strip()
    t = re.sub(r'([a-z])([A-Z])', r'\1 \2', t)
    t = re.sub(r'([A-Za-z])(\d)', r'\1 \2', t)
    t = re.sub(r'[_\-]+', ' ', t).strip()
    words = t.split()
    # "Postulantsin Myanmar" → "Postulants in Myanmar": peel connectors glued
    # to the end of a word when a capitalised word follows
    out = []
    for i, w in enumerate(words):
        tail = []
        nxt = words[i + 1] if i + 1 < len(words) else ''
        while nxt and nxt[:1].isupper():
            hit = next((c for c in CONNECTORS if w.lower().endswith(c) and len(w) - len(c) >= 3), None)
            if not hit:
                break
            w = w[:-len(hit)]
            tail.insert(0, ' '.join(re.findall(r'inthe|ofthe|[a-z]+', hit)) if hit in ('inthe', 'ofthe') else hit)
        out.append(w)
        out.extend(x.replace('inthe', 'in the').replace('ofthe', 'of the') for x in tail)
    t = ' '.join(out)
    if len(t) < 3 or not re.search(r'[A-Z]', t) or JUNK.match(t):
        return ''
    return t


# ── converter ─────────────────────────────────────────────────────────────

class Converter:
    def __init__(self, page_title, mirror_dir):
        self.page_title = page_title
        self.mirror_dir = mirror_dir
        self.notes = []          # things the reader should know (videos offsite, etc.)

    # entry point
    def convert(self, entry):
        out = self.children(entry)
        out = re.sub(r'\n{3,}', '\n\n', out)
        return out.strip()

    def children(self, node):
        return ''.join(self.render(c) for c in node.children)

    def text(self, s):
        s = html.unescape(str(s))
        s = s.replace('\xa0', ' ')
        return html.escape(re.sub(r'\s+', ' ', s), quote=False)

    def inline(self, node, top=True):
        """Inline content of a paragraph/heading/list item."""
        parts = []
        for c in node.children:
            if isinstance(c, NavigableString):
                parts.append(self.text(c))
            elif isinstance(c, Tag):
                n = c.name
                if n in ('strong', 'b'):
                    parts.append('<strong>' + self.inline(c, False) + '</strong>')
                elif n in ('em', 'i'):
                    parts.append('<em>' + self.inline(c, False) + '</em>')
                elif n == 'br':
                    parts.append('<br>')
                elif n == 'a':
                    parts.append(self.anchor(c))
                elif n == 'img':
                    parts.append(self.image(c))
                elif n in ('script', 'style', 'svg', 'noscript', 'input', 'form'):
                    continue
                else:
                    parts.append(self.inline(c, False))
        s = ''.join(parts)
        s = re.sub(r'\s+', ' ', s)
        if not top:
            return s
        s = re.sub(r'\s*<br>\s*', '<br>', s)
        s = re.sub(r'^(<br>)+|(<br>)+$', '', s.strip())
        return s.strip()

    def anchor(self, a):
        href = a.get('href') or ''
        label = self.inline(a)
        href, kind = self.link(href)
        if not label:
            return ''
        if kind == 'pdf':
            return f'<a href="{href}">{label}</a>'
        if kind == 'external':
            return f'<a href="{href}" rel="noopener">{label}</a>'
        return f'<a href="{href}">{label}</a>'

    def link(self, href):
        """Rewrite a mirror href. Returns (href, kind)."""
        h = html.unescape(href)
        m = re.search(r'index\.html%3Fp=(\d+)', h) or re.search(r'[?&]p=(\d+)', h)
        if m and m.group(1) in ID_TO_FILE:
            return ID_TO_FILE[m.group(1)], 'internal'
        if h.lower().split('?')[0].endswith('.pdf'):
            href2, local = document_asset(h)
            if not local:
                self.notes.append('pdf-offsite')
            return href2, 'pdf'
        if 'wp-content' in h:
            return live_url(h), 'external'
        if h.startswith('mailto:') or h.startswith('tel:'):
            return h, 'internal'
        if h.startswith('http'):
            return h, 'external'
        return h, 'internal'

    def image(self, img, alt=None, caption=None, lazy=True):
        src = img.get('src') or img.get('data-src') or ''
        if src.startswith('data:'):
            return ''
        asset = image_asset(src)
        alt = alt if alt is not None else (img.get('alt') or caption or self.page_title)
        if not asset:
            # not in the mirror: use the live file
            return f'<img src="{live_url(src)}" alt="{html.escape(alt)}" loading="lazy">'
        href, w, h = asset
        lz = ' loading="lazy"' if lazy else ''
        return f'<img src="{href}" alt="{html.escape(alt)}" width="{w}" height="{h}"{lz}>'

    @staticmethod
    def is_small(img_tag):
        m = re.search(r'width="(\d+)"', img_tag)
        return bool(m) and int(m.group(1)) < 480

    @staticmethod
    def figure_class(img_tag):
        w = re.search(r'width="(\d+)"', img_tag)
        h = re.search(r'height="(\d+)"', img_tag)
        if not (w and h):
            return 'figure'
        w, h = int(w.group(1)), int(h.group(1))
        if w < 480:
            return 'figure figure--small'
        if h > w * 1.15:
            return 'figure figure--portrait'
        return 'figure'

    def video(self, v):
        src = v.get('src') or ''
        if not src:
            s = v.find('source')
            src = s.get('src') if s else ''
        self.notes.append('video-offsite')
        return (f'<figure class="figure figure--video"><video controls preload="metadata" playsinline '
                f'src="{live_url(src)}"></video></figure>\n')

    def gallery(self, node):
        imgs = []
        seen = set()
        titles = [s.get('data-title') or '' for s in node.select('.n2-ss-slide')]
        bg = node.select('.n2-ss-slide-background-image img')
        for i, img in enumerate(bg):
            src = img.get('src') or ''
            key = os.path.basename(src)
            if not src or key in seen:
                continue
            seen.add(key)
            imgs.append((img, titles[i] if i < len(titles) else ''))
        if not imgs:
            return ''
        items = []
        for img, title in imgs:
            cap = humanize(title)
            fig = '<figure class="gallery__item">' + self.image(img, alt=cap or self.page_title, caption=cap)
            if cap:
                fig += f'<figcaption>{html.escape(cap)}</figcaption>'
            items.append(fig + '</figure>')
        if len(items) == 1:
            return items[0].replace('gallery__item', 'figure') + '\n'
        return '<div class="gallery">' + ''.join(items) + '</div>\n'

    def table(self, tbl):
        trs = tbl.find_all('tr')
        if trs and all(tr.find('a') for tr in trs if tr.get_text(strip=True) and not (
                len(tr.find_all(['td', 'th'])) == 1)):
            return self.link_table(trs)
        rows = []
        for tr in trs:
            cells = [self.inline(td) for td in tr.find_all(['td', 'th'])]
            if any(cells):
                rows.append(cells)
        if not rows:
            return ''
        out = ['<div class="table-scroll"><table class="table">']
        for cells in rows:
            out.append('<tr>' + ''.join(f'<td>{c}</td>' for c in cells) + '</tr>')
        out.append('</table></div>\n')
        return ''.join(out)

    def link_table(self, trs):
        """A table of names and web addresses (the weblinks page) becomes a
        list of link rows grouped under the bold cells the site uses as headings."""
        out = []
        open_card = False
        for tr in trs:
            tds = tr.find_all(['td', 'th'])
            if not tr.get_text(strip=True):
                continue
            heading = None
            if tds and tds[0].find(['strong', 'b']) and tds[0].get_text(strip=True):
                heading = re.sub(r'</?(strong|em)>', '', self.inline(tds[0]))
                tds = tds[1:]
            if heading:
                if open_card:
                    out.append('</div>\n')
                    open_card = False
                out.append(f'<h3>{heading}</h3>\n')
            if not tds:
                continue
            links = tds[-1].find_all('a')
            name = self.inline(tds[-2]) if len(tds) >= 2 else ''
            if not links:
                if name or tds[-1].get_text(strip=True):
                    out.append(f'<p>{name or self.inline(tds[-1])}</p>\n')
                continue
            if not open_card:
                out.append('<div class="linkrows">')
                open_card = True
            anchors = []
            for a in links:
                href, kind = self.link(a.get('href') or '')
                shown = re.sub(r'^https?://(www\.)?', '', html.unescape(a.get_text(strip=True) or href))
                shown = shown.rstrip('/')
                if len(shown) > 42:
                    shown = shown[:40] + '…'
                anchors.append(f'<a href="{html.escape(href, quote=True)}" rel="noopener">{html.escape(shown)}</a>')
            out.append('<div class="linkrow">' + (f'<span class="linkrow__name">{name}</span>' if name else '') +
                       '<span class="linkrow__links">' + ''.join(anchors) + '</span></div>')
        if open_card:
            out.append('</div>\n')
        return ''.join(out)

    def render(self, node):
        if isinstance(node, NavigableString):
            if node.parent and node.parent.name in ('div', 'section', 'main', 'article'):
                t = self.text(node).strip()
                return f'<p>{t}</p>\n' if t else ''
            return self.text(node)
        if not isinstance(node, Tag):
            return ''
        n = node.name
        cls = node.get('class', [])
        if n in ('script', 'style', 'svg', 'noscript', 'form', 'input', 'ss3-loader', 'iframe'):
            return ''
        if node.get('id') in ('wpmem_restricted_msg', 'wpmem_login'):
            return ''
        if 'n2-section-smartslider' in cls:
            return self.gallery(node)
        if n == 'p':
            inner = self.inline(node)
            if not inner:
                return ''
            return f'<p>{inner}</p>\n'
        if n in ('h1', 'h2', 'h3', 'h4', 'h5', 'h6'):
            inner = self.inline(node)
            if not inner:
                return ''
            level = {'h1': 2, 'h2': 2, 'h3': 3}.get(n, 4)
            inner = re.sub(r'</?strong>', '', inner)   # headings are already set in the display face
            return f'<h{level}>{inner}</h{level}>\n'
        if n in ('ul', 'ol'):
            items = []
            for li in node.find_all('li', recursive=False):
                blocks = ''.join(self.render(c) for c in li.children if isinstance(c, Tag) and c.name in ('ul', 'ol'))
                inner = self.inline_without_lists(li)
                if inner or blocks:
                    items.append(f'<li>{inner}{blocks}</li>')
            if not items:
                return ''
            return f'<{n}>' + ''.join(items) + f'</{n}>\n'
        if n == 'blockquote':
            inner = ''.join(self.render(c) for c in node.children).strip()
            if not inner:
                return ''
            return f'<blockquote class="quote">{inner}</blockquote>\n'
        if n == 'figure':
            if node.find('video'):
                return self.video(node.find('video'))
            if node.find('table'):
                return self.table(node.find('table'))
            img = node.find('img')
            if img:
                fc = node.find('figcaption')
                cap = self.inline(fc) if fc else ''
                tag = self.image(img, caption=re.sub('<[^>]+>', '', cap) or None)
                out = f'<figure class="{self.figure_class(tag)}">' + tag
                if cap:
                    out += f'<figcaption>{cap}</figcaption>'
                return out + '</figure>\n'
            return self.children(node)
        if n == 'video':
            return self.video(node)
        if n == 'img':
            tag = self.image(node)
            return f'<figure class="{self.figure_class(tag)}">' + tag + '</figure>\n'
        if n == 'table':
            return self.table(node)
        if n == 'a':
            # a block-level link (WordPress "button" or a bare file link)
            href, kind = self.link(node.get('href') or '')
            label = self.inline(node)
            if not label:
                return ''
            if 'wp-block-button__link' in cls or kind == 'pdf':
                if kind == 'pdf' and href.startswith('assets/') and label.strip().lower() == 'download':
                    label = 'Read'          # opens in the in-page reader; Download stays inside it
                if kind == 'pdf' and 'PDF' not in label.upper():
                    label += ' (PDF)'
                return f'<p><a class="btn btn--doc" href="{href}">{label}</a></p>\n'
            return f'<p><a href="{href}">{label}</a></p>\n'
        if n in ('strong', 'em', 'b', 'i', 'span', 'br'):
            inner = self.inline(node) if n != 'br' else ''
            return f'<p>{inner}</p>\n' if inner else ''
        # everything else (columns, groups, media-text, etc.) is flattened
        return self.children(node)

    def inline_without_lists(self, li):
        tmp = BeautifulSoup('<li></li>', 'html.parser').li
        for c in li.children:
            if isinstance(c, Tag) and c.name in ('ul', 'ol'):
                continue
            tmp.append(c.__copy__())
        return self.inline(tmp)


# ── page shell ────────────────────────────────────────────────────────────

def read_entry(mirror_dir):
    path = os.path.join(MIRROR, mirror_dir, 'index.html')
    with open(path, encoding='utf-8', errors='ignore') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')
    entry = soup.select_one('.entry-content')
    title = soup.select_one('h1.entry-title')
    desc = soup.find('meta', attrs={'name': 'description'})
    return entry, (title.get_text(strip=True) if title else None), (desc.get('content') if desc else '')


SEARCH_FORM = '''    <form class="bar__search" role="search" action="https://www.google.com/search" method="get" target="_blank" data-site-search>
      <label class="bar__field">
        <svg viewBox="-893 477 142 142" width="14" height="14" aria-hidden="true"><path d="M-787.4,568.7h-6.3l-2.4-2.4c7.9-8.7,12.6-20.5,12.6-33.1c0-28.4-22.9-51.3-51.3-51.3c-28.4,0-51.3,22.9-51.3,51.3c0,28.4,22.9,51.3,51.3,51.3c12.6,0,24.4-4.7,33.1-12.6l2.4,2.4v6.3l39.4,39.4l11.8-11.8L-787.4,568.7L-787.4,568.7z M-834.7,568.7c-19.7,0-35.5-15.8-35.5-35.5c0-19.7,15.8-35.5,35.5-35.5c19.7,0,35.5,15.8,35.5,35.5C-799.3,553-815,568.7-834.7,568.7L-834.7,568.7z"></path></svg>
        <span class="visually-hidden">Search the site</span>
        <input type="search" name="q" placeholder="Search the site…" autocomplete="off" aria-autocomplete="list" aria-controls="searchSuggest" aria-expanded="false">
      </label>
      <input type="hidden" name="as_sitesearch" value="stjoseph-apparition.org">
      <div class="bar__lang">
        <span class="lang-on">EN</span>
        <span class="lang-off" title="French pages are not yet available">FR</span>
      </div>
      <div class="suggest" id="searchSuggest" role="listbox" hidden></div>
    </form>'''


def asset_version():
    """Short hash of the shared CSS/JS, appended as ?v= so browsers and the
    CDN drop stale copies after a change."""
    h = hashlib.md5()
    for name in ('css/style.css', 'js/site.js', 'js/reader.js', 'js/lightbox.js'):
        with open(os.path.join(DOCS, name), 'rb') as f:
            h.update(f.read())
    return h.hexdigest()[:8]


VERSION = None


def shell(label, title, body, crumbs, description=''):
    global VERSION
    if VERSION is None:
        VERSION = asset_version()
    crumb_html = '<a href="index.html">Home</a>'
    for i, (text, href) in enumerate(crumbs):
        crumb_html += '\n    <span class="sep">»</span>\n    '
        crumb_html += f'<a href="{href}">{html.escape(text)}</a>' if href else f'<span>{html.escape(text)}</span>'
    desc_tag = f'\n<meta name="description" content="{html.escape(description, quote=True)}">' if description else ''
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)} — Sisters of Saint Joseph of the Apparition</title>{desc_tag}
<link rel="icon" href="assets/logo_sja.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inknut+Antiqua:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/style.css?v={VERSION}">
</head>
<body data-page="{html.escape(label, quote=True)}">

<div class="screen">

  <header class="bar">
    <div class="bar__top">
      <a class="bar__logo" href="index.html">
        <img src="assets/logo_sja.png" alt="Sisters of Saint Joseph of the Apparition" width="52" height="52">
      </a>
      <a class="bar__title" href="index.html">Sisters of Saint Joseph<br>of the Apparition</a>
      <button class="burger" type="button" id="navToggle" aria-label="Menu" aria-expanded="false" aria-controls="siteNav">
        <span></span><span></span><span></span>
      </button>
    </div>
{SEARCH_FORM}
  </header>

  <nav class="drawer" id="siteNav" aria-label="Main navigation" hidden></nav>

  <nav class="crumbs" aria-label="Breadcrumb">
    {crumb_html}
  </nav>

{body}

  <footer class="foot">
    <div class="foot__name">Sisters of Saint Joseph<br>of the Apparition</div>
    <div class="foot__links" data-footer-links></div>
    <div class="foot__legal">Copyright © 2026 Sisters of Saint Joseph of the Apparition</div>
  </footer>

</div>

<script src="js/site.js?v={VERSION}"></script>
<script src="js/reader.js?v={VERSION}" defer></script>
<script src="js/lightbox.js?v={VERSION}" defer></script>
</body>
</html>
'''


def rows_card(subhead, entries, current=None):
    """A card of chevron rows. entries: (label, href, external?)"""
    out = [f'  <div class="card wrap">\n    <div class="card__subhead">{html.escape(subhead)}</div>']
    for label, href, external in entries:
        if label == current:
            continue
        rel = ' rel="noopener"' if external else ''
        out.append(f'    <a class="row row--plain" href="{href}"{rel}>\n      {html.escape(label)}\n      {CHEVRON}\n    </a>')
    out.append('  </div>')
    return '\n'.join(out)


def title_block(title, body_html, tight=False):
    cls = 'block block--tight wrap' if tight else 'block wrap'
    return (f'  <div class="{cls}">\n    <h1 class="title">{html.escape(title)}</h1>\n'
            f'    <div class="rule"></div>\n{body_html}\n  </div>')


RESTRICTED_NOTE = (
    '<p>This content is restricted to members of the Congregation. Sisters with an account can '
    'log in on the members area of the Congregation\'s website.</p>\n'
    '<p><a class="btn" href="' + LIVE + '/members/" rel="noopener">Members log in</a></p>'
)

CONTACT_FORM = '''
    <form class="form" id="contactForm" data-mailto="congsjasecgen@gmail.com" novalidate>
      <label class="form__field">
        <span>Name</span>
        <input type="text" name="name" autocomplete="name" required>
      </label>
      <label class="form__field">
        <span>E-mail</span>
        <input type="email" name="email" autocomplete="email" required>
      </label>
      <label class="form__field">
        <span>Phone number</span>
        <input type="tel" name="phone" autocomplete="tel">
      </label>
      <label class="form__field">
        <span>Message</span>
        <textarea name="message" rows="6" required></textarea>
      </label>
      <p class="form__note">Sending opens a new message in your own e-mail app, addressed to the Generalate, with what you wrote here.</p>
      <button class="btn" type="submit">Send</button>
    </form>'''


PARTS_DIR = os.path.join(DOCS, 'parts')
FIRST_BLOCKS = 10      # blocks served with the page itself
PART_BLOCKS = 10       # blocks per lazily fetched part
LONG_PAGE = 11000      # bytes of content before a page is split at all
SEARCH_INDEX = []      # entries for docs/search-index.json


def split_blocks(content_html):
    """Top-level elements of converted content, as HTML strings."""
    soup = BeautifulSoup(content_html, 'html.parser')
    return [str(c) for c in soup.children if isinstance(c, Tag)]


def chunk_content(filename, content_html):
    """Keep the first blocks in the page; write the rest as fetchable parts
    and return the page HTML with a sentinel that loads them on scroll."""
    blocks = split_blocks(content_html)
    if len(content_html) < LONG_PAGE or len(blocks) <= FIRST_BLOCKS + 4:
        return content_html
    os.makedirs(PARTS_DIR, exist_ok=True)
    stem = filename[:-5]
    rest = blocks[FIRST_BLOCKS:]
    parts = [rest[i:i + PART_BLOCKS] for i in range(0, len(rest), PART_BLOCKS)]
    for n, part in enumerate(parts, start=2):
        with open(os.path.join(PARTS_DIR, f'{stem}-{n}.html'), 'w', encoding='utf-8') as f:
            f.write('\n'.join(part) + '\n')
    total = len(parts) + 1
    sentinel = (f'<div class="lazy" data-part="parts/{stem}-2.html" data-stem="parts/{stem}" data-next="2" data-last="{total}">'
                f'<a class="btn btn--ghost" href="parts/{stem}-2.html">Show more of this page</a>'
                f'<span class="lazy__status" aria-live="polite"></span></div>')
    return '\n'.join(blocks[:FIRST_BLOCKS]) + '\n' + sentinel


def group_documents(content_html):
    """A cover image followed by a PDF button becomes a document card: the
    cover opens the reader, and Read / Download buttons sit beneath it. A PDF
    button on its own becomes the same pair of buttons."""
    soup = BeautifulSoup(content_html, 'html.parser')
    nodes = [c for c in soup.children if isinstance(c, Tag)]
    out, i = [], 0

    def pdf_link(node):
        """The file button of a block: a PDF, an image file, or a dead link."""
        a = node.find('a', class_='btn--doc') if node.name == 'p' else None
        if a is None:
            return None
        href = a.get('href', '').lower().split('?')[0]
        return a if href == '' or href.endswith(('.pdf', '.png', '.jpg', '.jpeg')) else None

    def card(title, fig, a):
        href = a['href']
        is_pdf = href.lower().endswith('.pdf')
        local = href.startswith('assets/')
        name = html.escape(title or re.sub(r'[-_]+', ' ', re.sub(r'\s*\((PDF)\)\s*$', '', a.get_text(strip=True))))
        img = fig.find('img') if fig is not None else None
        if img is None and is_pdf and local:
            # no cover in the source: use the document's own first page
            cov = pdf_cover(href)
            if cov:
                img = BeautifulSoup(f'<img src="{cov[0]}" alt="First page of {name}" width="{cov[1]}" height="{cov[2]}">',
                                    'html.parser').img
        if img is not None:
            img['loading'] = 'lazy'
        if not href:
            # the site links nothing here: show the cover (it opens in the viewer) and say so
            cover = f'<figure class="doc__cover doc__cover--still">{img}</figure>' if img is not None else ''
            head = f'<div class="doc__title">{name}</div>' if title else ''
            return (f'<div class="doc">{cover}<div class="doc__body">{head}'
                    f'<p class="doc__note">The file for this issue is not yet available.</p></div></div>')
        if img is not None and is_pdf and local:
            cover = (f'<a class="doc__cover" href="{href}" data-title="{name}" aria-label="Read {name}">'
                     f'{img}<span class="doc__badge">Read</span></a>')
        elif img is not None:
            cover = f'<figure class="doc__cover doc__cover--still">{img}</figure>'
        else:
            cover = ''
        head = f'<div class="doc__title">{name}</div>' if (title or img is not None) else ''
        if is_pdf:
            read = (f'<a class="btn doc__read" href="{href}" data-title="{name}">Read online</a>' if local
                    else f'<a class="btn doc__read" href="{href}" rel="noopener">Open</a>')
            dl = f'<a class="btn btn--ghost doc__download" href="{href}" download>Download PDF</a>'
        else:
            read = ''
            dl = f'<a class="btn btn--ghost doc__download" href="{href}" download rel="noopener">Download image</a>'
        return f'<div class="doc{"" if img is not None else " doc--bare"}">{cover}<div class="doc__body">{head}<div class="doc__actions">{read}{dl}</div></div></div>'

    while i < len(nodes):
        n = nodes[i]
        title = None
        fig = None
        j = i
        if n.name == 'h4' and j + 1 < len(nodes):
            title = n.get_text(' ', strip=True)
            j += 1
        if nodes[j].name == 'figure' and nodes[j].find('img') and j + 1 < len(nodes) and pdf_link(nodes[j + 1]):
            fig = nodes[j]
            out.append(card(title, fig, pdf_link(nodes[j + 1])))
            i = j + 2
            continue
        if pdf_link(nodes[j]) and (title is None or j == i + 1):
            out.append(card(title, None, pdf_link(nodes[j])))
            i = j + 1
            continue
        out.append(str(n))
        i += 1
    return '\n'.join(out)


def index_page(label, filename, section, content_html):
    """Add one search entry per heading-delimited passage of a page."""
    soup = BeautifulSoup(content_html, 'html.parser')
    heading, buf = '', []

    def flush():
        text = re.sub(r'\s+', ' ', ' '.join(buf)).strip()
        if text or heading:
            SEARCH_INDEX.append({'t': label, 'u': filename, 's': section, 'h': heading, 'x': text[:600]})

    for el in soup.children:
        if not isinstance(el, Tag):
            continue
        if el.name in ('h2', 'h3', 'h4'):
            flush()
            heading, buf = el.get_text(' ', strip=True), []
        else:
            caps = [fc.get_text(' ', strip=True) for fc in el.find_all('figcaption')]
            piece = el.get_text(' ', strip=True) if el.name != 'div' else ' '.join(caps)
            # long passages become several entries so no sentence falls past the cap
            if buf and sum(len(b) for b in buf) + len(piece) > 500:
                flush()
                buf = []
            buf.append(piece)
    flush()


def index_existing(label, filename, section):
    """Index a hand-built page (Home, Congregation, Where we are) from its HTML."""
    with open(os.path.join(DOCS, filename), encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')
    for junk in soup.select('header, nav, footer, script, style, .drawer'):
        junk.decompose()
    text = re.sub(r'\s+', ' ', soup.get_text(' ', strip=True))
    SEARCH_INDEX.append({'t': label, 'u': filename, 's': section, 'h': '', 'x': text[:600]})


CONTACT_MAP = '''
  <div class="card wrap card--map">
    <div class="card__subhead">Where to find us</div>
    <div class="map-embed">
      <iframe src="https://www.google.com/maps?q=Via+Paolo+III+16,+00165+Roma,+Italia&z=16&output=embed" width="600" height="400" style="border:0" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen title="Map showing the Generalate, Via Paolo III 16, Rome"></iframe>
    </div>
    <a class="row row--plain" href="https://www.google.com/maps/search/?api=1&query=Via+Paolo+III+16,+00165+Roma,+Italia" rel="noopener">
      Open in Google Maps
      ''' + CHEVRON + '''
    </a>
  </div>'''


def build_page(label, filename, mirror_dir, kind, crumbs, siblings_card, description_override=None):
    entry, h1, desc = read_entry(mirror_dir) if mirror_dir else (None, None, '')
    title = label
    conv = Converter(title, mirror_dir)

    if kind == 'restricted':
        body = title_block(title, RESTRICTED_NOTE)
    elif kind == 'contact':
        details = conv.convert(entry) if entry is not None else ''
        details = details.replace('<h3>', '<h2>').replace('</h3>', '</h2>')
        body = title_block(title, details) + '\n' + CONTACT_MAP + '\n' + '  <div class="card wrap card--form">\n    <div class="card__subhead">Write to us</div>\n    <div class="card__body">' + CONTACT_FORM + '\n    </div>\n  </div>'
        index_page(label, filename, crumbs[0][0], details)
    else:
        content = conv.convert(entry) if entry is not None else ''
        if not content.strip():
            content = '<p class="empty">The Congregation has not yet published content for this page.</p>'
        if 'video-offsite' in conv.notes:
            content += '\n<p class="note">Videos on this page play from the Congregation\'s main website.</p>'
        index_page(label, filename, crumbs[0][0], content)
        body = title_block(title, chunk_content(filename, group_documents(content)))

    if siblings_card:
        body += '\n\n' + siblings_card
    page = shell(label, title, body, crumbs, description_override if description_override is not None else desc)
    with open(os.path.join(DOCS, filename), 'w', encoding='utf-8') as f:
        f.write(page)
    return conv.notes


def build_section(label, filename, mirror_dir, children, crumbs, intro_html=''):
    entries = [(c[0], c[1], c[3] == 'external') for c in children]
    body = title_block(label, intro_html, tight=True) + '\n\n' + rows_card('In this section', entries)
    _, _, desc = read_entry(mirror_dir) if mirror_dir else (None, None, '')
    page = shell(label, label, body, crumbs, desc)
    with open(os.path.join(DOCS, filename), 'w', encoding='utf-8') as f:
        f.write(page)


def main():
    shutil.rmtree(PARTS_DIR, ignore_errors=True)   # parts are regenerated in full
    os.makedirs(MEDIA_DIR, exist_ok=True)
    os.makedirs(DOCS_DIR, exist_ok=True)
    written = []
    report = {}

    for sec_label, sec_file, sec_dir, sec_kind, children in SECTIONS:
        sec_crumbs = [(sec_label, None)]
        sib_entries = [(c[0], c[1], c[3] == 'external') for c in children]

        if sec_kind == 'section':
            build_section(sec_label, sec_file, sec_dir, children, sec_crumbs)
            written.append(sec_file)
        elif sec_kind == 'restricted':
            body = title_block(sec_label, RESTRICTED_NOTE) + '\n\n' + rows_card('In this section', sib_entries)
            with open(os.path.join(DOCS, sec_file), 'w', encoding='utf-8') as f:
                f.write(shell(sec_label, sec_label, body, sec_crumbs))
            written.append(sec_file)
        elif sec_kind == 'contact':
            report[sec_file] = build_page(sec_label, sec_file, sec_dir, 'contact', sec_crumbs, None)
            written.append(sec_file)

        for label, filename, mirror_dir, kind in children:
            if kind in ('existing', 'external'):
                continue
            crumbs = [(sec_label, sec_file), (label, None)]
            card = rows_card('More in ' + sec_label, sib_entries, current=label)
            if kind == 'section':          # Education
                edu_entries = [(c[0], c[1], False) for c in EDUCATION_CHILDREN]
                body = title_block(label, '', tight=True) + '\n\n' + rows_card('In this section', edu_entries) + '\n\n' + card
                _, _, desc = read_entry(mirror_dir)
                with open(os.path.join(DOCS, filename), 'w', encoding='utf-8') as f:
                    f.write(shell(label, label, body, crumbs, desc))
                written.append(filename)
                for clabel, cfile, cdir, ckind in EDUCATION_CHILDREN:
                    ccrumbs = [(sec_label, sec_file), (label, filename), (clabel, None)]
                    ccard = rows_card('More in ' + label, edu_entries, current=clabel)
                    report[cfile] = build_page(clabel, cfile, cdir, ckind, ccrumbs, ccard)
                    written.append(cfile)
                continue
            report[filename] = build_page(label, filename, mirror_dir, kind, crumbs, card)
            written.append(filename)

    index_existing('Home', 'index.html', 'Home')
    index_existing('Congregation', 'congregation.html', 'Who we are')
    index_existing('Where we are', 'where-we-are.html', 'Where we are')
    for sec_label, sec_file, _, sec_kind, children in SECTIONS:
        if sec_kind == 'section':
            SEARCH_INDEX.append({'t': sec_label, 'u': sec_file, 's': sec_label, 'h': '',
                                 'x': ', '.join(c[0] for c in children)})
    import json
    with open(os.path.join(DOCS, 'search-index.json'), 'w', encoding='utf-8') as f:
        json.dump(SEARCH_INDEX, f, ensure_ascii=False, separators=(',', ':'))
    for name in ('index.html', 'congregation.html', 'where-we-are.html'):
        path = os.path.join(DOCS, name)
        with open(path, encoding='utf-8') as f:
            page = f.read()
        page = re.sub(r'(href="css/style\.css|src="js/[a-z]+\.js)(\?v=[0-9a-f]+)?"', r'\1?v=' + VERSION + '"', page)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(page)
    print(f'{len(written)} pages written, {len(SEARCH_INDEX)} search entries, assets v{VERSION}')
    for f, notes in sorted(report.items()):
        if notes:
            print(f'  {f}: ' + ', '.join(f'{n}×{notes.count(n)}' for n in sorted(set(notes))))
    media = os.listdir(MEDIA_DIR)
    size = sum(os.path.getsize(os.path.join(MEDIA_DIR, m)) for m in media)
    print(f'{len(media)} media files, {size/1e6:.1f} MB')
    docs = os.listdir(DOCS_DIR)
    size = sum(os.path.getsize(os.path.join(DOCS_DIR, d)) for d in docs)
    print(f'{len(docs)} documents, {size/1e6:.1f} MB')


if __name__ == '__main__':
    main()
