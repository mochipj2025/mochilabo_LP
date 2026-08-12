# 鉢の色を五色に振り分ける。
#
# 生成し直さない。既存の十二景の絵から、鉢と土の画素（暖色帯）だけ色相を回す。
# 本体（水色 180〜210°）と植物（緑 60〜120°）には触らない。
# 同じ絵の鉢だけが変わるので、生成し直すより絵柄が揃う。
#
#   python tools/recolor-pot.py
#   → images/{景}-{色}.png を 30枚（TEXT-goshiki.md の「色ごとに起こる景は6つだけ」に従う）

import os
import numpy as np
from PIL import Image
from scipy import ndimage

# ヒーローに出すドット絵と、書き出すカードのリッチな絵。両方ぶん作る。
DIRS = ['images', 'images_pixel']

# 色 → 起こりうる景（TEXT-goshiki.md の表そのまま）
KEI_BY_COLOR = {
    'ao':    ['futaba', 'tsubomi', 'minori', 'ochiba', 'kaze', 'ne'],
    'shiro': ['futaba', 'tsubomi', 'minori', 'ochiba', 'kaze', 'ne'],
    'aka':   ['me', 'wakagi', 'mankai', 'irozuki', 'tsuchi', 'tane'],
    'ki':    ['me', 'wakagi', 'mankai', 'irozuki', 'tsuchi', 'tane'],
    'kuro':  ['me', 'wakagi', 'mankai', 'irozuki', 'tsuchi', 'tane'],
}

# 目標の色相（度）／彩度の倍率／明度の傾き。
# 幅は、元の暖色帯の色相差をどれだけ残すか（0で単色、1で元のまま）。
TARGET = {
    'ao':    {'hue': 212, 'sat': 1.00, 'val': 0.94, 'spread': 0.30},
    'aka':   {'hue':   8, 'sat': 1.12, 'val': 1.00, 'spread': 0.45},
    'ki':    {'hue':  44, 'sat': 1.05, 'val': 1.04, 'spread': 0.35},
    'shiro': {'hue':  35, 'sat': 0.13, 'val': 1.22, 'spread': 0.30},
    'kuro':  {'hue': 225, 'sat': 0.22, 'val': 0.42, 'spread': 0.30},
}

WARM_LO, WARM_HI = 330.0, 62.0   # 330°〜360°と0°〜62°を暖色帯として扱う
SAT_FLOOR = 0.10                 # ほぼ無彩の画素（白いハイライト等）は動かさない
MIN_BLOB = 0.40                  # 最大の塊の40%未満は鉢ではないとみなす
LOW_HALF = 0.50                  # 重心が上半分にある塊は鉢ではない（花・葉）

def pot_only(warm):
    """暖色の中から鉢と土だけを取り出す。

    花・蕾・目・ほっぺも暖色なので、色だけでは切れない。位置だけでも切れない
    （目とほっぺが鉢のふちより下に来る絵がある）。

    実測すると、鉢は必ず最大の塊で重心が下（y≒700）、花と葉は7〜22%で重心が上
    （y≒230）、目とほっぺは1〜3%。大きさと重心の両方で見れば確実に分かれる。
    """
    lab, n = ndimage.label(warm)
    if n == 0:
        return warm
    idx = range(1, n + 1)
    sizes = np.array(ndimage.sum(warm, lab, idx))
    cy = np.array([c[0] for c in ndimage.center_of_mass(warm, lab, idx)])
    big = sizes >= sizes.max() * MIN_BLOB
    low = cy >= warm.shape[0] * LOW_HALF
    keep = np.zeros(n + 1, dtype=bool)
    keep[1:] = big & low
    return keep[lab]


def rgb_to_hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a[..., :3].max(-1), a[..., :3].min(-1)
    d = mx - mn
    h = np.zeros_like(mx)
    m = d > 1e-6
    ri, gi, bi = (mx == r) & m, (mx == g) & m, (mx == b) & m
    h[ri] = ((g - b)[ri] / d[ri]) % 6
    h[gi] = ((b - r)[gi] / d[gi]) + 2
    h[bi] = ((r - g)[bi] / d[bi]) + 4
    h *= 60.0
    s = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0.0)
    return h, s, mx


def hsv_to_rgb(h, s, v):
    h = np.mod(h, 360.0) / 60.0
    i = np.floor(h).astype(np.int32)
    f = h - i
    p, q, t = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
    i = i % 6
    r = np.select([i == 0, i == 1, i == 2, i == 3, i == 4, i == 5], [v, q, p, p, t, v])
    g = np.select([i == 0, i == 1, i == 2, i == 3, i == 4, i == 5], [t, v, v, q, p, p])
    b = np.select([i == 0, i == 1, i == 2, i == 3, i == 4, i == 5], [p, p, t, v, v, q])
    return np.stack([r, g, b], -1)


def recolor(path, spec):
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im).astype(np.float32) / 255.0
    h, s, v = rgb_to_hsv(a)

    warm = (((h >= WARM_LO) | (h <= WARM_HI)) & (s > SAT_FLOOR) & (a[..., 3] > 0.02))

    # 花・蕾・目・ほっぺを落とし、鉢と土だけ残す。
    warm = pot_only(warm)

    # 暖色帯の中心からのずれを測る（330〜360 は負の側に置き直す）
    hh = np.where(h > 180.0, h - 360.0, h)          # -30 〜 62
    center = (WARM_LO - 360.0 + WARM_HI) / 2.0      # ≒ 16
    delta = hh - center

    k = warm.astype(np.float32)
    th = spec['hue'] + delta * spec['spread']
    nh = np.where(k > 0, h + ((th - h + 180.0) % 360.0 - 180.0) * k, h)
    ns = np.clip(s * (1 + (spec['sat'] - 1) * k), 0, 1)
    nv = np.clip(v * (1 + (spec['val'] - 1) * k), 0, 1)

    rgb = hsv_to_rgb(nh, ns, nv)
    out = np.concatenate([rgb, a[..., 3:4]], -1)
    return Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA'), int(warm.sum())


if __name__ == '__main__':
    total = 0
    for d in DIRS:
        for color, keis in KEI_BY_COLOR.items():
            for kei in keis:
                src = os.path.join(d, kei + '.png')
                if not os.path.exists(src):
                    print('元が無い:', src)
                    continue
                img, n = recolor(src, TARGET[color])
                dst = os.path.join(d, '%s-%s.png' % (kei, color))
                img.save(dst, optimize=True)
                total += 1
        print(d, 'ぶん done')
    print('計', total, '枚')
