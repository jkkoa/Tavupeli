/* Tavupeli v4 — Dynamic Orthogonal Storybook Board Engine (20–45 squares) */
window.TavupeliBoard = (() => {
  const S = 72;
  const G = 5;
  const P = S + G;

  function organicBlobPath(cx, cy, rx, ry, variant = 0) {
    // Deterministic gentle organic ground patch using 8 smooth quadratic/cubic segments
    const offsets = [
      [1.04, 0.94, 1.06, 0.96, 1.02, 0.93, 1.05, 0.98],
      [0.95, 1.05, 0.96, 1.04, 0.94, 1.06, 0.98, 1.02],
      [1.06, 0.97, 0.94, 1.05, 1.03, 0.95, 0.96, 1.04],
      [0.98, 1.04, 1.02, 0.93, 1.06, 0.97, 0.95, 1.03]
    ][variant % 4];

    const n = offsets.length;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const k = offsets[i];
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }

    const mid = (p1, p2) => [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
    const start = mid(pts[n - 1], pts[0]);
    let d = `M ${start[0].toFixed(1)} ${start[1].toFixed(1)}`;
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const next = pts[(i + 1) % n];
      const m = mid(p, next);
      d += ` Q ${p[0].toFixed(1)} ${p[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;
    }
    return d + ' Z';
  }

  function boxesOverlap(a, b, pad = 12) {
    return !(
      a.x + a.w + pad <= b.x ||
      b.x + b.w + pad <= a.x ||
      a.y + a.h + pad <= b.y ||
      b.y + b.h + pad <= a.y
    );
  }

  function generateTiles(squareCount) {
    const N = Math.max(20, Math.min(45, Math.round(Number(squareCount) || 32)));
    let mode;
    let steps;
    let midC = null;

    if (N <= 23) {
      mode = '3row';
      const r0 = Math.ceil((N - 6) / 3);
      const r2 = N - 6 - 2 * r0;
      const l1 = r0 + 1;
      steps = [
        ...Array(r0).fill('R'),
        'D', 'D',
        ...Array(l1).fill('L'),
        'D', 'D',
        ...Array(r2).fill('R')
      ];
    } else if (N <= 36) {
      mode = '4stair';
      const r0 = Math.ceil((N - 8) / 3);
      const r3 = N - 8 - 2 * r0;
      const l1 = Math.floor((r0 + 1) / 2);
      const l2 = (r0 + 1) - l1;
      midC = 2 + r0 - l1;
      steps = [
        ...Array(r0).fill('R'),
        'D', 'D',
        ...Array(l1).fill('L'),
        'D', 'D',
        ...Array(l2).fill('L'),
        'D', 'D',
        ...Array(r3).fill('R')
      ];
    } else {
      mode = '5snake';
      const r0 = Math.ceil((N - 6) / 5);
      let r2Len = Math.max(3, r0 - 2);
      let r4 = N - 10 - 2 * r0 - 2 * r2Len;
      if (r4 < 3) {
        r2Len = Math.max(3, r0 - 3);
        r4 = N - 10 - 2 * r0 - 2 * r2Len;
      }
      if (r4 > r0) {
        r2Len = r0 - 1;
        r4 = N - 10 - 2 * r0 - 2 * r2Len;
      }
      midC = 1 + r2Len;
      steps = [
        ...Array(r0).fill('R'),
        'D', 'D',
        ...Array(r0 + 1).fill('L'),
        'D', 'D',
        ...Array(r2Len).fill('R'),
        'D', 'D',
        ...Array(r2Len).fill('L'),
        'D', 'D',
        ...Array(r4).fill('R')
      ];
    }

    const coords = [[2, 1]];
    let c = 2;
    let r = 1;
    for (const d of steps) {
      if (d === 'R') c += 1;
      else if (d === 'L') c -= 1;
      else if (d === 'D') r += 1;
      coords.push([c, r]);
    }

    const key = (col, row) => `${col},${row}`;
    const coordSet = new Set(coords.map(([col, row]) => key(col, row)));
    const count = coords.length;

    const tiles = coords.map(([col, row], i) => {
      const isStart = i === 0;
      const isFinish = i === count - 1;
      const hasAbove = coordSet.has(key(col, row - 1));
      const hasBelow = coordSet.has(key(col, row + 1));
      const isMiddleVert = hasAbove && hasBelow;

      let x = col * P;
      const y = row * P;
      let w = S;
      const h = S;

      if (isStart) {
        x -= 26;
        w += 26;
      } else if (isFinish) {
        w += 26;
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
        isMiddleVert,
        feature: null
      };
    });

    const maxC = Math.max(...tiles.map(t => t.col));
    const st = tiles[0];
    const fin = tiles[tiles.length - 1];

    // Bear lurks 1 step behind Square 1
    const bearLurk = { x: st.x - 40, y: st.y + S * 0.54 };

    // Hero landmarks tucked closer so the whole board zooms larger on 65" displays
    const banaanilaiva = { x: st.x - 142, y: st.y - 84, w: 138, h: 112 };
    const linna = { x: fin.x + fin.w + 12, y: fin.y + S - 130, w: 132, h: 136 };

    let triceratops;
    let aarrearkku;
    if (mode === '3row') {
      triceratops = { x: (maxC + 1) * P + 22, y: 1.12 * P, w: 96, h: 88 };
      aarrearkku = { x: -0.26 * P, y: 2.65 * P, w: 76, h: 66 };
    } else if (mode === '4stair') {
      const ax = Math.max(0.2 * P, (midC * 0.48 - 0.55) * P);
      aarrearkku = { x: ax, y: 2.95 * P, w: 76, h: 66 };
      triceratops = { x: (midC + 1.52) * P, y: 4.55 * P, w: 96, h: 88 };
    } else {
      const dx = (midC + 1.52) * P;
      triceratops = { x: dx, y: 4.55 * P, w: 96, h: 88 };
      aarrearkku = { x: dx + 14, y: 6.48 * P, w: 76, h: 66 };
    }

    const vignettes = { banaanilaiva, aarrearkku, triceratops, linna };

    const washes = [
      {
        d: organicBlobPath(banaanilaiva.x + banaanilaiva.w * 0.5, banaanilaiva.y + banaanilaiva.h * 0.62, 80, 50, 0),
        color: '#EFEBE0'
      },
      {
        d: organicBlobPath(triceratops.x + triceratops.w * 0.5, triceratops.y + triceratops.h * 0.56, 66, 50, 1),
        color: '#E9EFE6'
      },
      {
        d: organicBlobPath(aarrearkku.x + aarrearkku.w * 0.5, aarrearkku.y + aarrearkku.h * 0.58, 54, 40, 2),
        color: '#ECE7DD'
      },
      {
        d: organicBlobPath(linna.x + linna.w * 0.5, linna.y + linna.h * 0.58, 80, 64, 3),
        color: '#ECE7DF'
      }
    ];

    // Sparse, calm Style B scenic map accents placed only where guaranteed clear of tiles & landmarks
    const candidateAccents = [];

    if (mode === '3row') {
      candidateAccents.push(
        { id: 'accent-grass', x: aarrearkku.x + 10, y: aarrearkku.y + aarrearkku.h + 24, w: 32, h: 28, opacity: 0.72 },
        { id: 'accent-pebbles', x: triceratops.x + 18, y: triceratops.y + triceratops.h + 20, w: 30, h: 22, opacity: 0.68 },
        { id: 'accent-bush', x: (maxC - 1) * P + 20, y: 0.1 * P, w: 36, h: 28, opacity: 0.68 }
      );
    } else if (mode === '4stair') {
      candidateAccents.push(
        { id: 'accent-bush', x: aarrearkku.x - 52, y: aarrearkku.y + 42, w: 36, h: 28, opacity: 0.7 },
        { id: 'accent-pebbles', x: aarrearkku.x + aarrearkku.w + 32, y: aarrearkku.y - 16, w: 30, h: 22, opacity: 0.68 },
        { id: 'accent-grass', x: triceratops.x + triceratops.w + 24, y: triceratops.y + 32, w: 32, h: 28, opacity: 0.72 },
        { id: 'accent-flower', x: triceratops.x - 14, y: triceratops.y + triceratops.h + 20, w: 30, h: 26, opacity: 0.7 }
      );
    } else {
      candidateAccents.push(
        { id: 'accent-grass', x: triceratops.x + triceratops.w + 22, y: triceratops.y + 18, w: 32, h: 28, opacity: 0.72 },
        { id: 'accent-pebbles', x: aarrearkku.x + aarrearkku.w + 20, y: aarrearkku.y + 22, w: 30, h: 22, opacity: 0.68 },
        { id: 'accent-bush', x: (maxC - 1) * P + 16, y: 0.08 * P, w: 36, h: 28, opacity: 0.68 }
      );
    }

    const blockers = [
      ...tiles.map(t => ({ x: t.x, y: t.y, w: t.w, h: t.h })),
      { x: bearLurk.x - 24, y: bearLurk.y - 24, w: 48, h: 48 }
    ];
    const landmarkBoxes = Object.values(vignettes);

    const accents = candidateAccents.filter(acc => {
      const box = { x: acc.x, y: acc.y, w: acc.w, h: acc.h };
      if (blockers.some(b => boxesOverlap(box, b, 10))) return false;
      if (landmarkBoxes.some(lb => boxesOverlap(box, lb, 10))) return false;
      return true;
    });

    let minX = bearLurk.x - 24;
    let minY = banaanilaiva.y - 4;
    let maxX = linna.x + linna.w;
    let maxY = fin.y + fin.h;

    tiles.forEach(t => {
      minX = Math.min(minX, t.x);
      minY = Math.min(minY, t.y - 16);
      maxX = Math.max(maxX, t.x + t.w);
      maxY = Math.max(maxY, t.y + t.h + 12);
    });

    Object.values(vignettes).forEach(v => {
      minX = Math.min(minX, v.x);
      minY = Math.min(minY, v.y);
      maxX = Math.max(maxX, v.x + v.w);
      maxY = Math.max(maxY, v.y + v.h);
    });

    accents.forEach(a => {
      minX = Math.min(minX, a.x);
      minY = Math.min(minY, a.y);
      maxX = Math.max(maxX, a.x + a.w);
      maxY = Math.max(maxY, a.y + a.h);
    });

    const pad = 10;
    const viewBox = [
      Math.floor(minX - pad),
      Math.floor(minY - pad),
      Math.ceil(maxX - minX + pad * 2),
      Math.ceil(maxY - minY + pad * 2)
    ];

    return { mode, tiles, viewBox, washes, bearLurk, vignettes, accents };
  }

  function assignFeatures(tiles, activeStationIds, twistsEnabled) {
    // Icons sit cleanly inside tiles, so any non-start, non-finish square is eligible
    const eligible = tiles
      .filter(t => !t.isStart && !t.isFinish)
      .map(t => t.index);

    const featureMap = {};
    const used = new Set();

    if (twistsEnabled && eligible.length >= 6) {
      const pairs = tiles.length >= 39 ? 3 : (tiles.length >= 28 ? 2 : 1);
      // Prefer straight horizontal runs for Taikaportti so the +2 dotted arc looks super clean
      const isStraightPlus2 = idx => {
        const a = tiles[idx];
        const b = tiles[idx + 2];
        return a && b && a.row === b.row && Math.abs(b.col - a.col) === 2;
      };

      const candidatesPlusStraight = eligible.filter(idx => idx >= 2 && idx <= tiles.length - 4 && isStraightPlus2(idx));
      const candidatesPlusFallback = eligible.filter(idx => idx >= 2 && idx <= tiles.length - 4);
      const candidatesMinus = eligible.filter(idx => idx >= 4 && idx <= tiles.length - 3);

      const pickAtFraction = (arr, frac) => {
        if (!arr.length) return null;
        const targetPos = Math.floor(arr.length * frac);
        for (let offset = 0; offset < arr.length; offset++) {
          for (const sign of [0, 1, -1]) {
            const p = targetPos + sign * offset;
            if (p >= 0 && p < arr.length) {
              const idx = arr[p];
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

      const fracsPlus = pairs === 3 ? [0.16, 0.48, 0.76] : (pairs === 2 ? [0.22, 0.62] : [0.34]);
      const fracsMinus = pairs === 3 ? [0.32, 0.64, 0.88] : (pairs === 2 ? [0.44, 0.82] : [0.72]);

      for (const f of fracsPlus) {
        const idx = pickAtFraction(candidatesPlusStraight, f) ?? pickAtFraction(candidatesPlusFallback, f);
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

    if (activeStationIds && activeStationIds.length > 0) {
      const openSlots = eligible.filter(idx => !used.has(idx));
      const targetCount = Math.min(
        openSlots.length,
        Math.max(activeStationIds.length, Math.round(openSlots.length * 0.78))
      );

      const chosenSlots = [];
      for (let k = 0; k < targetCount; k++) {
        const pos = Math.round(((k + 0.5) * openSlots.length) / targetCount - 0.5);
        const clamped = Math.max(0, Math.min(openSlots.length - 1, pos));
        const tileIdx = openSlots[clamped];
        if (!chosenSlots.includes(tileIdx)) chosenSlots.push(tileIdx);
      }

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

  function computeTokenPositions(tile, playerIndicesOnTile, bearOnTile) {
    const result = { players: {}, bear: null };
    if (!tile) return result;

    const cx = tile.x + tile.w / 2;
    const cy = tile.y + tile.h / 2 + 2;

    if (tile.isStart || tile.isFinish) {
      if (bearOnTile) {
        result.bear = { x: tile.x + 22, y: tile.y + tile.h / 2 + 2 };
      }
      const leftPad = bearOnTile ? 46 : 16;
      const availW = tile.w - leftPad - 14;
      const n = playerIndicesOnTile.length;

      const placeRow = (slice, yPos) => {
        const cnt = slice.length;
        const stepX = cnt > 1 ? Math.min(22, availW / (cnt - 1)) : 0;
        const rowW = stepX * (cnt - 1);
        const rx = tile.x + leftPad + (availW - rowW) / 2;
        slice.forEach((pIdx, k) => {
          result.players[pIdx] = { x: rx + k * stepX, y: yPos };
        });
      };

      if (n <= 4) {
        placeRow(playerIndicesOnTile, tile.y + tile.h / 2 + 2);
      } else {
        const topCnt = Math.ceil(n / 2);
        placeRow(playerIndicesOnTile.slice(0, topCnt), tile.y + 23);
        placeRow(playerIndicesOnTile.slice(topCnt), tile.y + 49);
      }
      return result;
    }

    const items = [];
    if (bearOnTile) items.push({ kind: 'bear' });
    playerIndicesOnTile.forEach(pIdx => items.push({ kind: 'player', pIdx }));

    const total = items.length;
    if (total === 0) return result;

    const offsetsByCount = {
      1: [[0, 0]],
      2: [[-14, 0], [14, 0]],
      3: [[-15, 8], [15, 8], [0, -11]],
      4: [[-14, -10], [14, -10], [-14, 13], [14, 13]],
      5: [[-19, -10], [0, -10], [19, -10], [-11, 13], [11, 13]],
      6: [[-19, -10], [0, -10], [19, -10], [-19, 13], [0, 13], [19, 13]],
      7: [[-20, -11], [-7, -11], [7, -11], [20, -11], [-14, 13], [0, 13], [14, 13]],
      8: [[-20, -11], [-7, -11], [7, -11], [20, -11], [-20, 13], [-7, 13], [7, 13], [20, 13]]
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
