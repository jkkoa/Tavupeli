# Tavupeli v5

Cooperative Finnish syllable-counting adventure board game built for 65" Clevertouch displays, tablets, and laptops.

## Highlights (v5)
- Cohesive Scandinavian ink storybook illustration set (`Taikavuori`, `Laava`, `Katapultti`, `Merirosvo`, `Taikapata`, `Triceratops`, shipwrecked `Banaanilaiva`, half-buried `Aarrearkku`, `Linna`, `Karhu`, and 20 word cards)
- Two-layer 60fps SVG board engine (static GPU-cached `#board-svg` + lightweight `requestAnimationFrame` `#tokens-svg` with subtle tabletop hop-glide) and pre-decoded image cache (`img.decode()`) for zero pop-in
- Unified tabletop layout with slimmer aligned side tray, bigger 65" board & cards, soft pastel tile washes, consistent gap chevrons, and curved dotted `Taikaportti` portal arcs
- Taputus-only syllable counting (`1 → 0` beat-dot step-back) with `Valmis` → numeral + *tavuviiva* reveal → player-colored `Liiku` button, plus short Finnish storybook prompts on station cards
- Subset self-hosted SIL Andika early-reader font (~34 KB total) and full offline PWA caching (`tavupeli-cache-v6`)
