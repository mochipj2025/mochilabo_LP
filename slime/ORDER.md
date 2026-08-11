# 指示書 — 鉢植えスライム 十二景 残り11枚

## 前提

参照画像を2枚渡してあります。

1. 元のキャラ（フード付き。フードは無視）
2. **鉢植えの「芽」** ← 鉢の形・大きさ・土の見え方はこの1枚が正解

この2枚を毎回見てから描くこと。**自分が直前に出した絵を参照にしない**（少しずつずれるため）。

## 使う経路

- 組み込みの `image_gen` ツールを使う。**CLIフォールバック（`scripts/image_gen.py`）は使わない**
  （`OPENAI_API_KEY` が要る＝課金になるため）
- 透過は既定どおり、単色背景で出して `remove_chroma_key.py` で抜く
- 1枚ずつ11回。`n` で複数出さない

## 作るもの（11枚）

各プロンプトは以下の形。`___` だけ差し替える。

```
Use the attached reference images as the character. Keep the same character and the same pot.
No hood, no hat, no clothing.
The slime sits down into the pot with soil around its base, exactly as in the reference.
Its plant grows from the top of its head.

THIS IMAGE ONLY: ___

Square 1024x1024, centred. Flat solid magenta background. No text, no watermark.
```

| # | 景 | ファイル名 | `___` |
|---|---|---|---|
| 2 | 双葉 | `futaba.png` | `two round cotyledon leaves, with a water droplet on one` |
| 3 | 若木 | `wakagi.png` | `a slim stem with three small leaves` |
| 4 | 蕾 | `tsubomi.png` | `one closed pale pink flower bud on a short stem` |
| 5 | 満開 | `mankai.png` | `one open flower, five petals in clear cherry-blossom pink with a golden centre` |
| 6 | 実り | `minori.png` | `a short stem bending under one small red berry` |
| 7 | 色づき | `irozuki.png` | `two leaves turned autumn orange and red, one resting on the pot rim` |
| 8 | 落ち葉 | `ochiba.png` | `a bare stem with no leaves, dry brown leaves scattered around the pot` |

**9〜12 は植物が無い回。** 上のブロックから `Its plant grows from the top of its head.` の行を**外す**こと。

| # | 景 | ファイル名 | `___` |
|---|---|---|---|
| 9 | 土 | `tsuchi.png` | `nothing is growing; the slime is sunk deep into the soil, only its face showing above the surface` |
| 11 | 種 | `tane.png` | `nothing is growing; one small brown seed sits on top of its head` |
| 12 | 根 | `ne.png` | `nothing is growing; a few pale roots hang out of the hole in the bottom of the pot` |

**10（風）だけ鉢が空になる。** ブロックの鉢の行を差し替える。

```
Use the attached reference images as the character. Keep the same character and the same pot.
No hood, no hat, no clothing.
The same pot as in the reference stands there, but it is EMPTY - only soil in it, no slime inside.

THIS IMAGE ONLY: the slime has blown out of the pot and floats to one side in the wind,
leaning and stretched a little, with a few thin curved wind lines and two small leaves blowing past

Square 1024x1024, centred. Flat solid magenta background. No text, no watermark.
```

ファイル名は `kaze.png`。

## 保存

透過処理まで済ませたPNGを `D:\00000\slime\images\` に置く。
参照に使った「芽」も `me.png` として同じ場所にコピーする（全12枚そろえる）。

中間ファイル（マゼンタ背景のもの、作業用スクリプト）は images には入れない。

## 終わったら報告すること

1. 12枚そろったか。足りないものがあればファイル名
2. **体が水色のままか**（景ごとに塗り分けられていないか）
3. 鉢の形が参照画像から変わってしまった枚があるか

大きさや線の太さのばらつきは直さなくてよい。揃える必要はない。
