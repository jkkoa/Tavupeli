/* Tavupeli — Asymmetric Storybook Board Layouts (18, 24, 30 squares)
 * Tightly connected orthogonal squares (5px gap) with wide vertical row gaps,
 * plain vertical turn connectors, wide Square 1 staging zone, open pockets for
 * landscape washes + Banaanilaiva + Lohikäärme + Aarrearkku + commanding Linna.
 */
window.TavupeliBoard = (() => {
  const S = 68; // standard square size
  const G = 5;  // tightly connected path gap
  const P = S + G; // 73px pitch

  // Hand-tuned asymmetric winding configurations
  const LAYOUTS = {
    18: {
      startCol: 2,
      startRow: 1,
      steps: 'RRRRDDLLDDLLDDRRR'.split(''),
      viewBox: [14, -22, 692, 634],
      washes: [
        { cx: 148, cy: 255, rx: 112, ry: 74, rot: -8,  color: '#EFEBE0' },
        { cx: 565, cy: 245, rx: 108, ry: 82, rot: 10,  color: '#E9EFE6' },
        { cx: 575, cy: 500, rx: 122, ry: 95, rot: -5,  color: '#ECE7DF' }
      ],
      vignettes: {
        banaanilaiva: { x: 48,  y: -14, w: 136, h: 82 },
        aarrearkku:   { x: 96,  y: 205, w: 102, h: 86 },
        lohikaarme:   { x: 520, y: 184, w: 156, h: 144 },
        linna:        { x: 488, y: 374, w: 206, h: 214 }
      }
    },
    24: {
      startCol: 2,
      startRow: 1,
      steps: 'RRRRRDDLLLDDLLLDDRRRRRR'.split(''),
      viewBox: [14, -22, 846, 634],
      washes: [
        { cx: 168, cy: 252, rx: 108, ry: 68, rot: -7,  color: '#EFEBE0' },
        { cx: 525, cy: 382, rx: 126, ry: 76, rot: 5,   color: '#E9EFE6' },
        { cx: 735, cy: 492, rx: 118, ry: 98, rot: -4,  color: '#ECE7DF' }
      ],
      vignettes: {
        banaanilaiva: { x: 48,  y: -14, w: 136, h: 82 },
        aarrearkku:   { x: 118, y: 204, w: 102, h: 86 },
        lohikaarme:   { x: 444, y: 310, w: 158, h: 146 },
        linna:        { x: 634, y: 372, w: 214, h: 218 }
      }
    },
    30: {
      startCol: 2,
      startRow: 1,
      steps: 'RRRRRRRRDDLLLLDDLLLLLDDRRRRRR'.split(''),
      viewBox: [14, -22, 868, 634],
      washes: [
        { cx: 268, cy: 252, rx: 148, ry: 72, rot: -5,  color: '#E9EFE6' },
        { cx: 618, cy: 356, rx: 94,  ry: 58, rot: 8,   color: '#EFEBE0' },
        { cx: 752, cy: 492, rx: 120, ry: 98, rot: -4,  color: '#ECE7DF' }
      ],
      vignettes: {
        banaanilaiva: { x: 48,  y: -14, w: 136, h: 82 },
        lohikaarme:   { x: 196, y: 176, w: 158, h: 146 },
        aarrearkku:   { x: 540, y: 304, w: 100, h: 84 },
        linna:        { x: 650, y: 372, w: 214, h: 218 }
      }
    }
  };

  function generateTiles(squareCount) {
    const cfg = LAYOUTS[squareCount] || LAYOUTS[24];
    const coords = [[cfg.startCol, cfg.startRow]];
    let c = cfg.startCol;
    let r = cfg.startRow;

    for (const d of cfg.steps) {
      if (d === 'R') c += 1;
      else if (d === 'L') c -= 1;
      else if (d === 'D') r += 1;
      coords.push([c, r]);
    }

    const coordKey = (col, row) => `${col},${row}`;
    const coordSet = new Set(coords.map(([col, row]) => coordKey(col, row)));
    const n = coords.length;

    const tiles = coords.map(([col, row], i) => {
      const isStart = i === 0;
      const isFinish = i === n - 1;
      const hasAbove = coordSet.has(coordKey(col, row - 1));
      let x = col * P;
      const y = row * P;
      let w = S;
      const h = S;

      if (isStart) {
        x -= 64; // wide staging zone for up to 7 players + Bear
        w += 64;
      } else if (isFinish) {
        w += 42; // generous arrival space right outside Linna gate
      }

      return {
        index: i,
        col,
        row,
        x,
        y,
        w,
        h,
        isStart,
        isFinish,
        isConnector: hasAbove && !isFinish,
        feature: null // { type: 'station'|'twist', id: ... }
      };
    });

    return {
      tiles,
      viewBox: cfg.viewBox,
      washes: cfg.washes,
      vignettes: cfg.vignettes
    };
  }

  /* Place active stations & twists on eligible non-connector horizontal tiles.
   * Spaces identical stations far apart automatically to avoid classroom bottlenecks.
   */
  function assignFeatures(tiles, activeStationIds, twistsEnabled) {
    const eligible = tiles
      .filter(t => !t.isStart && !t.isFinish && !t.isConnector)
      .map(t => t.index);

    const featureMap = {};
    const used = new Set();

    // 1. Place Twists first (spaced nicely in the middle-to-late stretch)
    if (twistsEnabled && eligible.length >= 6) {
      const twistPairs = tiles.length >= 28 ? 2 : 1; // 1 each on 18/24, 2 each on 30
      const candidatesPlus = eligible.filter(idx => idx >= 3 && idx <= tiles.length - 5);
      const candidatesMinus = eligible.filter(idx => idx >= 5 && idx <= tiles.length - 3);

      // Spread twists across the board
      const pickAtFraction = (arr, frac) => {
        if (!arr.length) return null;
        const targetPos = Math.floor(arr.length * frac);
        for (let offset = 0; offset < arr.length; offset++) {
          for (const sign of [0, 1, -1]) {
            const p = targetPos + sign * offset;
            if (p >= 0 && p < arr.length) {
              const idx = arr[p];
              // Avoid adjacent twists or chaining directly into another twist
              if (
                !used.has(idx) &&
                !used.has(idx - 1) && !used.has(idx + 1) &&
                !used.has(idx - 2) && !used.has(idx + 2)
              ) {
                return idx;
              }
            }
          }
        }
        return null;
      };

      const fracsPlus = twistPairs === 2 ? [0.22, 0.62] : [0.35];
      const fracsMinus = twistPairs === 2 ? [0.46, 0.82] : [0.72];

      for (const f of fracsPlus) {
        const idx = pickAtFraction(candidatesPlus, f);
        if (idx !== null) {
          used.add(idx);
          featureMap[idx] = { type: 'twist', id: 'taikaportti' };
        }
      }
      for (const f of fracsMinus) {
        const idx = pickAtFraction(candidatesMinus, f);
        if (idx !== null) {
          used.add(idx);
          featureMap[idx] = { type: 'twist', id: 'banaaninkuori' };
        }
      }
    }

    // 2. Place Stations across remaining eligible tiles, cycling through a
    // shuffled order so identical stations are always maximally separated.
    if (activeStationIds && activeStationIds.length > 0) {
      const openSlots = eligible.filter(idx => !used.has(idx));
      // Target ~55-65% of remaining open slots so the path keeps airy plain breather tiles too
      const targetCount = Math.min(
        openSlots.length,
        Math.max(activeStationIds.length, Math.round(openSlots.length * 0.62))
      );

      // Pick evenly distributed indices from openSlots
      const chosenSlots = [];
      for (let k = 0; k < targetCount; k++) {
        const pos = Math.round(((k + 0.5) * openSlots.length) / targetCount - 0.5);
        const clamped = Math.max(0, Math.min(openSlots.length - 1, pos));
        const tileIdx = openSlots[clamped];
        if (!chosenSlots.includes(tileIdx)) {
          chosenSlots.push(tileIdx);
        }
      }

      // Shuffle station list once, then cycle cleanly in round-robin so identical
      // stations are always spaced at maximum distance apart along the path
      const order = [...activeStationIds];
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }

      chosenSlots.forEach((tileIdx, i) => {
        const stationId = order[i % order.length];
        featureMap[tileIdx] = { type: 'station', id: stationId };
      });
    }

    tiles.forEach(t => {
      t.feature = featureMap[t.index] || null;
    });

    return featureMap;
  }

  /* Auto-pack tokens cleanly inside the open zone of any tile (below perched icons).
   * Tokens stay fixed size always; Bear gets its own clear slot.
   * Returns { players: { [playerIndex]: {x, y} }, bear: {x, y} } for a tile.
   */
  function computeTokenPositions(tile, playerIndicesOnTile, bearOnTile) {
    const result = { players: {}, bear: null };
    const cx = tile.x + tile.w / 2;
    const cy = tile.y + tile.h / 2 + 2; // slightly below center to clear top rim

    // Wide Square 1 staging zone: Bear sits cleanly on left, up to 7 players pack cleanly on right
    if (tile.isStart) {
      if (bearOnTile) {
        result.bear = { x: tile.x + 25, y: tile.y + tile.h / 2 + 1 };
      }
      const n = playerIndicesOnTile.length;
      const startX = bearOnTile ? tile.x + 56 : tile.x + 22;
      const availW = (tile.x + tile.w - 14) - startX;

      if (n <= 4) {
        const stepX = n > 1 ? Math.min(22, availW / (n - 1)) : 0;
        const rowW = stepX * (n - 1);
        const rx = startX + (availW - rowW) / 2;
        playerIndicesOnTile.forEach((pIdx, k) => {
          result.players[pIdx] = { x: rx + k * stepX, y: tile.y + tile.h / 2 + 2 };
        });
      } else {
        const topCount = Math.ceil(n / 2);
        const botCount = n - topCount;
        const placeRow = (slice, yPos) => {
          const cnt = slice.length;
          const stepX = cnt > 1 ? Math.min(22, availW / (cnt - 1)) : 0;
          const rowW = stepX * (cnt - 1);
          const rx = startX + (availW - rowW) / 2;
          slice.forEach((pIdx, k) => {
            result.players[pIdx] = { x: rx + k * stepX, y: yPos };
          });
        };
        placeRow(playerIndicesOnTile.slice(0, topCount), tile.y + 22);
        placeRow(playerIndicesOnTile.slice(topCount), tile.y + 47);
      }
      return result;
    }

    // Wide Finish tile: generous room for up to 7 arriving players (+ Bear if Bear reaches finish)
    if (tile.isFinish) {
      const n = playerIndicesOnTile.length;
      if (bearOnTile) {
        result.bear = { x: tile.x + 24, y: tile.y + tile.h / 2 + 1 };
      }
      const leftPad = bearOnTile ? 52 : 16;
      const availW = tile.w - leftPad - 14;
      const topCount = n <= 4 ? n : Math.ceil(n / 2);
      const botCount = n - topCount;
      const placeRow = (slice, yPos) => {
        const cnt = slice.length;
        const stepX = cnt > 1 ? Math.min(23, availW / (cnt - 1)) : 0;
        const rowW = stepX * (cnt - 1);
        const rx = tile.x + leftPad + (availW - rowW) / 2;
        slice.forEach((pIdx, k) => {
          result.players[pIdx] = { x: rx + k * stepX, y: yPos };
        });
      };
      if (botCount === 0) {
        placeRow(playerIndicesOnTile, tile.y + tile.h / 2 + 2);
      } else {
        placeRow(playerIndicesOnTile.slice(0, topCount), tile.y + 22);
        placeRow(playerIndicesOnTile.slice(topCount), tile.y + 47);
      }
      return result;
    }

    // Standard square (68x68)
    const items = [];
    if (bearOnTile) items.push({ kind: 'bear' });
    playerIndicesOnTile.forEach(pIdx => items.push({ kind: 'player', pIdx }));

    const total = items.length;
    if (total === 0) return result;

    // Pre-balanced tidy packing layouts inside 68x68
    const offsetsByCount = {
      1: [[0, 0]],
      2: [[-13, 0], [13, 0]],
      3: [[-15, 7], [15, 7], [0, -11]],
      4: [[-13, -11], [13, -11], [-13, 12], [13, 12]],
      5: [[-18, -11], [0, -11], [18, -11], [-11, 12], [11, 12]],
      6: [[-18, -11], [0, -11], [18, -11], [-18, 12], [0, 12], [18, 12]],
      7: [[-19, -12], [-6, -12], [7, -12], [20, -12], [-14, 12], [0, 12], [14, 12]],
      8: [[-19, -12], [-6, -12], [7, -12], [20, -12], [-19, 12], [-6, 12], [7, 12], [20, 12]]
    };

    const slots = offsetsByCount[Math.min(total, 8)];
    items.forEach((item, k) => {
      const [dx, dy] = slots[k];
      if (item.kind === 'bear') {
        result.bear = { x: cx + dx, y: cy + dy };
      } else {
        result.players[item.pIdx] = { x: cx + dx, y: cy + dy };
      }
    });

    return result;
  }

  return { generateTiles, assignFeatures, computeTokenPositions, TILE_SIZE: S };
})();
