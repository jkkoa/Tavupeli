/* Tavupeli v3 — Rock-Solid Dynamic Orthogonal Board Engine (20–45 squares) */
window.TavupeliBoard = (() => {
  const S = 72;
  const G = 5;
  const P = S + G;

  function randRange(min, max) {
    return min + Math.random() * (max - min);
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

      let iconSide = null;
      if (!isStart && !isFinish && !isMiddleVert) {
        if (!hasAbove) {
          iconSide = 'top';
        } else if (!coordSet.has(key(col + 1, row))) {
          iconSide = 'right';
        } else if (!coordSet.has(key(col - 1, row))) {
          iconSide = 'left';
        }
      }

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
        iconSide,
        feature: null
      };
    });

    const maxC = Math.max(...tiles.map(t => t.col));
    const st = tiles[0];
    const fin = tiles[tiles.length - 1];

    const bearLurk = { x: st.x - 38, y: st.y + S * 0.54 };
    const banaanilaiva = { x: st.x - 118, y: st.y - 64, w: 108, h: 66 };
    const linna = { x: fin.x + fin.w + 16, y: fin.y + S - 130, w: 132, h: 134 };

    let lohikaarme;
    let aarrearkku;
    if (mode === '3row') {
      lohikaarme = { x: (maxC + 1) * P + 34, y: 1.05 * P, w: 122, h: 112 };
      aarrearkku = { x: -0.30 * P, y: 2.55 * P, w: 84, h: 72 };
    } else if (mode === '4stair') {
      const ax = Math.max(0.15 * P, (midC * 0.5 - 0.65) * P);
      aarrearkku = { x: ax, y: 2.85 * P, w: 84, h: 72 };
      lohikaarme = { x: (midC + 1.48) * P, y: 4.35 * P, w: 122, h: 112 };
    } else {
      const dx = (midC + 1.48) * P;
      lohikaarme = { x: dx, y: 4.35 * P, w: 122, h: 112 };
      aarrearkku = { x: dx + 16, y: 6.25 * P, w: 84, h: 72 };
    }

    const vignettes = { banaanilaiva, aarrearkku, lohikaarme, linna };

    const washes = [
      { cx: banaanilaiva.x + 56, cy: banaanilaiva.y + 42, rx: 74, ry: 44, rot: -6, color: '#EFEBE0' },
      { cx: lohikaarme.x + lohikaarme.w / 2, cy: lohikaarme.y + lohikaarme.h / 2, rx: 86, ry: 62, rot: 7, color: '#E9EFE6' },
      { cx: aarrearkku.x + aarrearkku.w / 2, cy: aarrearkku.y + aarrearkku.h / 2, rx: 64, ry: 48, rot: -8, color: '#ECE7DD' },
      { cx: linna.x + linna.w / 2, cy: linna.y + linna.h / 2 + 6, rx: 84, ry: 68, rot: -4, color: '#ECE7DF' }
    ];

    let minX = bearLurk.x - 28;
    let minY = banaanilaiva.y - 8;
    let maxX = linna.x + linna.w;
    let maxY = fin.y + fin.h;

    tiles.forEach(t => {
      minX = Math.min(minX, t.x - (t.iconSide === 'left' ? 28 : 0));
      minY = Math.min(minY, t.y - (t.iconSide === 'top' ? 28 : 0));
      maxX = Math.max(maxX, t.x + t.w + (t.iconSide === 'right' ? 28 : 0));
      maxY = Math.max(maxY, t.y + t.h);
    });

    Object.values(vignettes).forEach(v => {
      minX = Math.min(minX, v.x);
      minY = Math.min(minY, v.y);
      maxX = Math.max(maxX, v.x + v.w);
      maxY = Math.max(maxY, v.y + v.h);
    });

    const pad = 18;
    const viewBox = [
      Math.floor(minX - pad),
      Math.floor(minY - pad),
      Math.ceil(maxX - minX + pad * 2),
      Math.ceil(maxY - minY + pad * 2)
    ];

    return { mode, tiles, viewBox, washes, bearLurk, vignettes };
  }

  function assignFeatures(tiles, activeStationIds, twistsEnabled) {
    const eligible = tiles
      .filter(t => !t.isStart && !t.isFinish && !t.isMiddleVert && t.iconSide !== null)
      .map(t => t.index);

    const featureMap = {};
    const used = new Set();

    const makeMeta = () => ({
      tilt: Math.round(randRange(-9, 9) * 10) / 10,
      shift: Math.round(randRange(-3.5, 3.5) * 10) / 10
    });

    if (twistsEnabled && eligible.length >= 6) {
      const pairs = tiles.length >= 39 ? 3 : (tiles.length >= 28 ? 2 : 1);
      const candidatesPlus = eligible.filter(idx => idx >= 3 && idx <= tiles.length - 5);
      const candidatesMinus = eligible.filter(idx => idx >= 5 && idx <= tiles.length - 3);

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
        const idx = pickAtFraction(candidatesPlus, f);
        if (idx !== null) {
          used.add(idx);
          featureMap[idx] = { type: 'twist', id: 'taikaportti', ...makeMeta() };
        }
      }
      for (const f of fracsMinus) {
        const idx = pickAtFraction(candidatesMinus, f);
        if (idx !== null) {
          used.add(idx);
          featureMap[idx] = { type: 'twist', id: 'banaaninkuori', ...makeMeta() };
        }
      }
    }

    if (activeStationIds && activeStationIds.length > 0) {
      const openSlots = eligible.filter(idx => !used.has(idx));
      const targetCount = Math.min(
        openSlots.length,
        Math.max(activeStationIds.length, Math.round(openSlots.length * 0.82))
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
        featureMap[tileIdx] = { type: 'station', id: stationId, ...makeMeta() };
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
    const cy = tile.y + tile.h / 2 + 4;

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
