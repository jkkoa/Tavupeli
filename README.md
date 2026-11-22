# Tavupeli

Offline-capable cooperative Finnish syllable-counting board game built for interactive displays and tablets.

## Publish on GitHub Pages
1. Upload all files in this folder to a GitHub repository (for example `tavupeli`).
2. Open **Settings -> Pages**, choose **Deploy from a branch**, select `main` / `/ (root)`, and click **Save**.
3. Open the published link on your display or tablet and choose **Add to Home Screen** for fullscreen offline play.

## Swapping Illustrations (Zero Code Changes)
Drop `.webp` or `.png` files into `img/words/` or `img/board/` using the exact lowercase filenames below. The game automatically swaps out the built-in SVG fallbacks as soon as matching files exist. Use `gallery.html` to inspect all artwork side-by-side.

### Word Cards (`img/words/`, recommended `1024x1024`, pure `#FFFFFF` background)
- 1 tavu: `kuu.webp`, `luu.webp`, `puu.webp`
- 2 tavua: `kissa.webp`, `koira.webp`, `pilvi.webp`, `sukka.webp`, `vene.webp`
- 3 tavua: `banaani.webp`, `kirahvi.webp`, `kitara.webp`, `omena.webp`, `perhonen.webp`
- 4 tavua: `krokotiili.webp`, `lumiukko.webp`, `paloauto.webp`, `sateenvarjo.webp`
- 5 tavua: `helikopteri.webp`, `jaateloauto.webp`, `liikennevalot.webp`

### Board, Stations, Twists & Cards (`img/board/`, recommended `512x512`–`1024x1024`, transparent background)
- Vignettes: `banaanilaiva.webp`, `lohikaarme.webp`, `aarrearkku.webp`, `linna-idle.webp`, `linna-win.webp`
- Stations: `banaanivuori.webp`, `laava.webp`, `katapultti.webp`, `merirosvo.webp`, `taikapata.webp`
- Twists: `banaaninkuori.webp`, `taikaportti.webp`
- Bear cards / End screen: `karhu-0.webp`, `karhu-win.webp`

## Optional Local Font
Drop a `.woff2` reader font (for example Andika or Nunito) into `fonts/reader.woff2` and uncomment the `@font-face` rule at the top of `style.css`.
