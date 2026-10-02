#!/usr/bin/env python3
"""Hit shapes for the countries of earlier foundations on the "Where we are" map.

docs/assets/world-map-blue.svg draws every pale-blue country (a foundation in
the past, no community today) as one merged path, so the page cannot tell them
apart. This splits that path into its rings, gives each ring to the country
that owns it: a ring containing a country's reference point is that country's
mainland, and every other ring (islands, exclaves, holes) goes to the country
whose mainland coast lies nearest. It then simplifies the outlines and writes them, with the
country's name, year and label point, to docs/js/earlier-foundations.js for
the site and to assets/earlier-foundations.js for the design file
(SJA Mobile.dc.html), which loads its artwork from assets/.

Run from anywhere:  python3 tools/earlier_foundations.py
No dependencies. Re-run whenever the map artwork changes.
"""
import json
import math
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVG = os.path.join(ROOT, 'docs', 'assets', 'world-map-blue.svg')
OUTS = [os.path.join(ROOT, 'docs', 'js', 'earlier-foundations.js'),
        os.path.join(ROOT, 'assets', 'earlier-foundations.js')]
PALE = '#b0d6f7'
W, H = 1600, 820.4
TOLERANCE = 1.0       # px in the 1600-wide artwork; a hit area, not a drawing
MIN_AREA = 2          # px²; specks below this cannot be hovered anyway

# name, first foundation (from the Congregation's foundations map), label point
# and extra reference points (lon, lat) that pull outlying rings to the country
COUNTRIES = [
    # New Brunswick and Prince Edward Island are drawn apart from the mainland
    # and touch Maine, so they need points of their own
    ('Canada', '2003', (-100, 56), [(-66.6, 46.3), (-63.3, 46.4)]),
    # the Alaska panhandle, and the western Aleutians at the far right edge
    ('United States', '1930', (-98, 39), [(-131, 56), (173.1, 52.9)]),
    ('Haiti', '1968', (-72.5, 19), []),
    ('Argentina', '1969', (-64, -34), [(-68, -54)]),
    ('Mauritania', '1959', (-10.5, 20), []),
    ('Algeria', '1835', (2.6, 28), []),
    ('Libya', '1854', (17, 27), []),
    ('Egypt', '1866', (30, 26.5), []),
    ('Sudan', '1873', (30, 15.5), []),
    ('Bulgaria', '1886', (25.2, 42.7), []),
    ('Turkey', '1887', (35, 39), [(27.5, 41.3)]),
    ('Armenia', '1852', (44.9, 40.2), []),
    # the foundations map names Yugoslavia but prints no year for it
    ('Former Yugoslavia', '', (19.5, 44), [(20.8, 44), (16, 45.3), (17.8, 44.2), (14.8, 46.1),
                                            (21.7, 41.6), (19.3, 42.8), (20.9, 42.6), (16.5, 43.3)]),
]


def merc(lat):
    return math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


def project(lon, lat):
    return ((lon + 130) / 310 * W, (merc(72) - merc(lat)) / (merc(72) - merc(-47)) * H)


def rings_of(d):
    out, cur = [], []
    for cmd, args in re.findall(r'([MLZz])([^MLZz]*)', d):
        nums = [float(n) for n in re.findall(r'-?\d*\.?\d+(?:e-?\d+)?', args)]
        if cmd == 'M' and cur:
            out.append(cur)
            cur = []
        cur += list(zip(nums[0::2], nums[1::2]))
        if cmd in 'Zz' and cur:
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    return out


def area(ring):
    return abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]))) / 2


def centroid(ring):
    xs, ys = zip(*ring)
    return sum(xs) / len(xs), sum(ys) / len(ys)


def inside(pt, ring):
    x, y = pt
    c = False
    for (x1, y1), (x2, y2) in zip(ring, ring[-1:] + ring[:-1]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


def simplify(pts, tol):
    """Douglas-Peucker on an open polyline."""
    if len(pts) < 3:
        return pts
    (ax, ay), (bx, by) = pts[0], pts[-1]
    dx, dy = bx - ax, by - ay
    norm = math.hypot(dx, dy) or 1e-9
    far, idx = 0, 0
    for i in range(1, len(pts) - 1):
        px, py = pts[i]
        d = abs(dy * px - dx * py + bx * ay - by * ax) / norm if (dx or dy) else math.hypot(px - ax, py - ay)
        if d > far:
            far, idx = d, i
    if far <= tol:
        return [pts[0], pts[-1]]
    return simplify(pts[:idx + 1], tol)[:-1] + simplify(pts[idx:], tol)


def main():
    svg = open(SVG, encoding='utf-8').read()
    m = re.search(r'<path fill="' + PALE + r'" d="([^"]*)"', svg)
    rings = [r for r in rings_of(m.group(1)) if area(r) >= MIN_AREA]

    refs = []      # (country index, point)
    for i, (_, _, label, extra) in enumerate(COUNTRIES):
        for p in [label] + extra:
            refs.append((i, project(*p)))

    owners = [next((i for i, p in refs if inside(p, ring)), None) for ring in rings]
    mainland = [(owner, ring) for owner, ring in zip(owners, rings) if owner is not None]
    missing = set(range(len(COUNTRIES))) - {o for o, _ in mainland}
    assert not missing, 'no mainland found for ' + ', '.join(COUNTRIES[i][0] for i in missing)

    def coast_distance(pt, ring):
        return min(math.hypot(pt[0] - x, pt[1] - y) for x, y in ring)

    parts = {i: [] for i in range(len(COUNTRIES))}
    for owner, ring in zip(owners, rings):
        if owner is None:
            c = centroid(ring)
            assert c[0] < W - 2, 'unclaimed ring at the right edge: give it a reference point'
            owner = min(mainland, key=lambda m: coast_distance(c, m[1]))[0]
        # split the closed ring in two so the line simplifier keeps its shape
        half = len(ring) // 2
        pts = simplify(ring[:half + 1], TOLERANCE)[:-1] + simplify(ring[half:] + ring[:1], TOLERANCE)[:-1]
        if len(pts) >= 3:
            parts[owner].append(pts)

    data = []
    for i, (name, year, label, _) in enumerate(COUNTRIES):
        x, y = project(*label)
        d = ''.join('M' + 'L'.join(f'{px:.1f},{py:.1f}' for px, py in ring) + 'Z' for ring in parts[i])
        data.append({'name': name, 'year': year, 'x': round(x / W * 100, 2), 'y': round(y / H * 100, 2), 'd': d})
        print(f'{name:18} {len(parts[i]):3} rings  {len(d):6} chars')

    text = ('/* Generated by tools/earlier_foundations.py from assets/world-map-blue.svg —\n'
            '   do not edit by hand. Countries of earlier foundations (no community\n'
            '   today): name, year of first foundation, label point in % of the map,\n'
            '   and an outline in the artwork\'s 1600x820.4 space for hover and tap. */\n'
            'window.SJA_EARLIER_FOUNDATIONS = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    for out in OUTS:
        with open(out, 'w', encoding='utf-8') as f:
            f.write(text)
        print(f'{os.path.getsize(out) / 1024:.1f} KB written to {os.path.relpath(out, ROOT)}')


if __name__ == '__main__':
    main()
