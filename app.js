/* Tavupeli v5 — 60fps Two-Layer Tabletop Engine & UI Controller */
(() => {
  'use strict';

  const STORAGE_KEYS = {
    PREFS: 'tavupeli_v3_prefs',
    GAME: 'tavupeli_v3_game_state',
    WORD_BAG: 'tavupeli_v3_word_bag'
  };

  const SQUARE_BOUNDS = { MIN: 20, MAX: 45, DEFAULT: 32 };

  const TIMING = {
    TAP_DEBOUNCE_MS: 160,
    LIIKU_GUARD_MS: 450,
    SYLLABLE_GLIDE_MS: 420,
    SYLLABLE_PAUSE_MS: 260,
    TWIST_HOLD_MS: 1150,
    TWIST_STEP_MS: 380,
    TWIST_PAUSE_MS: 200,
    BEAR_REVEAL_HOLD_MS: 1000,
    BEAR_ZERO_HOLD_MS: 2100,
    BEAR_GLIDE_MS: 540,
    BEAR_PAUSE_MS: 340
  };

  // Soft muted storybook tile washes behind inside-square icons (harmonizes with Laava)
  const TILE_WASHES = {
    taikavuori:    { fill: '#EEF2F7', stroke: '#C8D1DC' },
    katapultti:    { fill: '#F6EFE2', stroke: '#D8CEBC' },
    merirosvo:     { fill: '#E9F2F1', stroke: '#C3D5D2' },
    taikapata:     { fill: '#EFEAF4', stroke: '#CFC6D9' },
    taikaportti:   { fill: '#EBEEF7', stroke: '#C3CAE0' },
    banaaninkuori: { fill: '#FBF4DF', stroke: '#DFD2AC' }
  };

  const defaultPrefs = {
    playerCount: 4,
    activeStations: window.TAVUPELI_STATIONS.map(s => s.id),
    twistsEnabled: true,
    squareCount: SQUARE_BOUNDS.DEFAULT
  };

  let prefs = loadPrefs();
  let selectedLetters = [];

  let state = null;
  let boardData = null;
  let isAnimating = false;
  let runToken = 0;
  let lastActionAt = 0;
  let liikuReadyAt = 0;
  let activeRafId = null;

  // Live SVG coordinates of each token for silky rAF interpolation
  const tokenCoords = new Map();

  const setupRefs = {
    initialized: false,
    players: [],
    stations: [],
    twists: [],
    letters: []
  };

  const panelTopRefs = {
    playerCount: 0,
    dots: [],
    lastMuted: null,
    exitInitialized: false
  };

  let taputusRefs = null;

  const el = {
    setupScreen: document.getElementById('setup-screen'),
    gameScreen: document.getElementById('game-screen'),
    setupPlayers: document.getElementById('setup-players'),
    setupStations: document.getElementById('setup-stations'),
    setupTwists: document.getElementById('setup-twists'),
    btnSqMinus: document.getElementById('btn-sq-minus'),
    btnSqPlus: document.getElementById('btn-sq-plus'),
    setupSquaresVal: document.getElementById('setup-squares-val'),
    setupLetters: document.getElementById('setup-letters'),
    btnClearLetters: document.getElementById('btn-clear-letters'),
    btnStartGame: document.getElementById('btn-start-game'),
    btnResumeGame: document.getElementById('btn-resume-game'),

    boardSvg: document.getElementById('board-svg'),
    tokensSvg: document.getElementById('tokens-svg'),
    playerDots: document.getElementById('player-dots'),
    btnMute: document.getElementById('btn-mute'),
    btnExit: document.getElementById('btn-exit'),
    cardStage: document.getElementById('card-stage'),
    controlDock: document.getElementById('control-dock'),

    exitModal: document.getElementById('exit-modal'),
    exitStep1: document.getElementById('exit-step-1'),
    exitStep2: document.getElementById('exit-step-2'),
    btnModalCancel: document.getElementById('btn-modal-cancel'),
    btnModalStep2: document.getElementById('btn-modal-step2'),
    btnModalBack: document.getElementById('btn-modal-back'),
    btnModalConfirm: document.getElementById('btn-modal-confirm'),

    endScreen: document.getElementById('end-screen'),
    endArt: document.getElementById('end-art'),
    endLine: document.getElementById('end-line'),
    btnEndNew: document.getElementById('btn-end-new')
  };

  function migrateStationId(id) {
    return id === 'banaanivuori' ? 'taikavuori' : id;
  }

  function guardTap(ms = TIMING.TAP_DEBOUNCE_MS) {
    const now = performance.now();
    if (now - lastActionAt < ms) return false;
    lastActionAt = now;
    return true;
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function sleep(ms, token) {
    return new Promise(resolve => {
      setTimeout(() => resolve(token === runToken), ms);
    });
  }

  function cancelActiveRaf() {
    if (activeRafId !== null) {
      cancelAnimationFrame(activeRafId);
      activeRafId = null;
    }
  }

  function loadPrefs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PREFS);
      if (!raw) return { ...defaultPrefs };
      const p = JSON.parse(raw);
      const sq = Number(p.squareCount);
      const validIds = new Set(window.TAVUPELI_STATIONS.map(s => s.id));
      const mappedStations = Array.isArray(p.activeStations)
        ? [...new Set(p.activeStations.map(migrateStationId).filter(id => validIds.has(id)))]
        : [...defaultPrefs.activeStations];

      return {
        playerCount: Math.max(1, Math.min(7, Number(p.playerCount) || 4)),
        activeStations: mappedStations,
        twistsEnabled: typeof p.twistsEnabled === 'boolean' ? p.twistsEnabled : true,
        squareCount: Number.isFinite(sq)
          ? Math.max(SQUARE_BOUNDS.MIN, Math.min(SQUARE_BOUNDS.MAX, Math.round(sq)))
          : SQUARE_BOUNDS.DEFAULT
      };
    } catch {
      return { ...defaultPrefs };
    }
  }

  function savePrefs() {
    try { localStorage.setItem(STORAGE_KEYS.PREFS, JSON.stringify(prefs)); } catch {}
  }

  function saveGameState() {
    if (!state) return;
    try { localStorage.setItem(STORAGE_KEYS.GAME, JSON.stringify(state)); } catch {}
  }

  function clearSavedGame() {
    try { localStorage.removeItem(STORAGE_KEYS.GAME); } catch {}
  }

  function loadSavedGame() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.GAME);
      if (!raw) return null;
      const g = JSON.parse(raw);
      if (!g || !Array.isArray(g.players) || g.phase === 'ended') return null;

      // Migrate legacy banaanivuori feature IDs cleanly
      if (g.featureMap) {
        Object.values(g.featureMap).forEach(f => {
          if (f && f.id === 'banaanivuori') f.id = 'taikavuori';
        });
      }
      if (g.currentStation && g.currentStation.id === 'banaanivuori') {
        const st = window.TAVUPELI_STATIONS.find(s => s.id === 'taikavuori');
        g.currentStation.id = 'taikavuori';
        g.currentStation.name = st ? st.name : 'Taikavuori';
        g.currentStation.desc = st ? st.desc : '';
      }
      return g;
    } catch {
      return null;
    }
  }

  function drawWord() {
    const allIds = window.TAVUPELI_WORDS.map(w => w.id);
    let bag = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.WORD_BAG);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) bag = parsed.filter(id => allIds.includes(id));
      }
    } catch { bag = []; }

    if (bag.length === 0) bag = shuffle(allIds);
    const wordId = bag.pop();
    try { localStorage.setItem(STORAGE_KEYS.WORD_BAG, JSON.stringify(bag)); } catch {}

    return window.TAVUPELI_WORDS.find(w => w.id === wordId) || window.TAVUPELI_WORDS[0];
  }

  function drawLetters(count) {
    const pool = state.letters;
    if (!pool || pool.length === 0) return [];

    const drawn = [];
    for (let i = 0; i < count; i++) {
      if (!state.letterBag || state.letterBag.length === 0) {
        state.letterBag = shuffle(pool);
      }

      let pickIdx = -1;
      if (pool.length > drawn.length) {
        pickIdx = state.letterBag.findIndex(ch => !drawn.includes(ch));
        if (pickIdx === -1) {
          const extra = shuffle(pool.filter(ch => !drawn.includes(ch)));
          state.letterBag = [...state.letterBag, ...extra];
          pickIdx = state.letterBag.findIndex(ch => !drawn.includes(ch));
        }
      } else {
        pickIdx = state.letterBag.length - 1;
      }

      const [ch] = state.letterBag.splice(pickIdx, 1);
      drawn.push(ch);
    }
    return drawn;
  }

  function buildFreshBearDeck(recentDraws = []) {
    const deck = shuffle([1, 1, 2, 2, 2, 3, 3, 0]);
    const lastTwoThrees =
      recentDraws.length >= 2 &&
      recentDraws[recentDraws.length - 1] === 3 &&
      recentDraws[recentDraws.length - 2] === 3;

    if (lastTwoThrees && deck[deck.length - 1] === 3) {
      const swapIdx = deck.findIndex(v => v !== 3);
      if (swapIdx >= 0) {
        [deck[deck.length - 1], deck[swapIdx]] = [deck[swapIdx], deck[deck.length - 1]];
      }
    }
    return deck;
  }

  function drawBearCard() {
    if (!state.bearDeck || state.bearDeck.length === 0) {
      state.bearDeck = buildFreshBearDeck(state.bearHistory || []);
    }
    const val = state.bearDeck.pop();
    state.bearHistory = [...(state.bearHistory || []), val].slice(-3);
    return val;
  }

  /* SETUP SCREEN — BUILT ONCE, UPDATED IN PLACE (ZERO ICON FLASH) */
  function initSetupDom() {
    if (setupRefs.initialized) return;
    setupRefs.initialized = true;

    el.setupPlayers.innerHTML = '';
    for (let n = 1; n <= 7; n++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'seg-btn';
      b.textContent = String(n);
      b.addEventListener('click', () => {
        prefs.playerCount = n;
        savePrefs();
        updateSetupUi();
      });
      el.setupPlayers.appendChild(b);
      setupRefs.players.push({ val: n, btn: b });
    }

    el.setupStations.innerHTML = '';
    window.TAVUPELI_STATIONS.forEach(st => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'station-chip';
      const iconSpan = document.createElement('span');
      iconSpan.className = 'chip-icon';
      window.TavupeliArt.renderHtml(iconSpan, 'board', st.id, st.name);
      const txt = document.createElement('span');
      txt.textContent = st.name;
      b.appendChild(iconSpan);
      b.appendChild(txt);
      b.addEventListener('click', () => {
        const isActive = prefs.activeStations.includes(st.id);
        if (isActive) prefs.activeStations = prefs.activeStations.filter(id => id !== st.id);
        else prefs.activeStations = [...prefs.activeStations, st.id];
        savePrefs();
        updateSetupUi();
      });
      el.setupStations.appendChild(b);
      setupRefs.stations.push({ id: st.id, name: st.name, btn: b, iconSpan, renderedUrl: window.TavupeliArt.getResolvedUrl('board', st.id) });
    });

    el.setupTwists.innerHTML = '';
    [
      { val: true, label: 'Päällä' },
      { val: false, label: 'Pois' }
    ].forEach(opt => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'seg-btn';
      b.textContent = opt.label;
      b.addEventListener('click', () => {
        prefs.twistsEnabled = opt.val;
        savePrefs();
        updateSetupUi();
      });
      el.setupTwists.appendChild(b);
      setupRefs.twists.push({ val: opt.val, btn: b });
    });

    el.setupLetters.innerHTML = '';
    window.TAVUPELI_ALPHABET.forEach(ch => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'letter-btn';
      b.textContent = ch;
      b.addEventListener('click', () => {
        const isSel = selectedLetters.includes(ch);
        if (isSel) selectedLetters = selectedLetters.filter(c => c !== ch);
        else selectedLetters = [...selectedLetters, ch];
        updateSetupUi();
      });
      el.setupLetters.appendChild(b);
      setupRefs.letters.push({ ch, btn: b });
    });
  }

  function refreshSetupStationArt() {
    setupRefs.stations.forEach(item => {
      const nextUrl = window.TavupeliArt.getResolvedUrl('board', item.id);
      if (nextUrl !== item.renderedUrl) {
        item.renderedUrl = nextUrl;
        window.TavupeliArt.renderHtml(item.iconSpan, 'board', item.id, item.name);
      }
    });
  }

  function updateSetupUi() {
    initSetupDom();

    setupRefs.players.forEach(item => {
      item.btn.classList.toggle('active', prefs.playerCount === item.val);
    });

    setupRefs.stations.forEach(item => {
      item.btn.classList.toggle('active', prefs.activeStations.includes(item.id));
    });

    setupRefs.twists.forEach(item => {
      item.btn.classList.toggle('active', prefs.twistsEnabled === item.val);
    });

    el.setupSquaresVal.textContent = String(prefs.squareCount);
    el.btnSqMinus.disabled = prefs.squareCount <= SQUARE_BOUNDS.MIN;
    el.btnSqPlus.disabled = prefs.squareCount >= SQUARE_BOUNDS.MAX;

    setupRefs.letters.forEach(item => {
      item.btn.classList.toggle('active', selectedLetters.includes(item.ch));
    });

    el.btnClearLetters.disabled = selectedLetters.length === 0;
    const needsLetters = prefs.activeStations.length > 0;
    el.btnStartGame.disabled = needsLetters && selectedLetters.length === 0;

    const saved = loadSavedGame();
    el.btnResumeGame.classList.toggle('hidden', !saved);
  }

  function adjustSquares(delta) {
    const next = Math.max(SQUARE_BOUNDS.MIN, Math.min(SQUARE_BOUNDS.MAX, prefs.squareCount + delta));
    if (next !== prefs.squareCount) {
      prefs.squareCount = next;
      savePrefs();
      updateSetupUi();
    }
  }

  function startNewGame() {
    if (!guardTap()) return;
    cancelActiveRaf();
    runToken++;
    isAnimating = false;

    const layout = window.TavupeliBoard.generateTiles(prefs.squareCount);
    const featureMap = window.TavupeliBoard.assignFeatures(
      layout.tiles,
      prefs.activeStations,
      prefs.twistsEnabled
    );

    const players = [];
    for (let i = 0; i < prefs.playerCount; i++) {
      players.push({
        id: i,
        color: window.TAVUPELI_PLAYER_COLORS[i],
        pos: 0,
        paused: false,
        finished: false
      });
    }

    state = {
      squareCount: prefs.squareCount,
      activeStations: [...prefs.activeStations],
      twistsEnabled: prefs.twistsEnabled,
      letters: [...selectedLetters],
      letterBag: shuffle(selectedLetters),
      featureMap,
      players,
      bearPos: -1,
      bearDeck: buildFreshBearDeck([]),
      bearHistory: [],
      turnIndex: 0,
      phase: 'player-draw',
      currentWord: null,
      countInput: 0,
      currentStation: null,
      castleLit: false,
      winner: null
    };

    boardData = layout;
    saveGameState();
    enterGameScreen();
  }

  function resumeSavedGame() {
    if (!guardTap()) return;
    const saved = loadSavedGame();
    if (!saved) return;
    cancelActiveRaf();
    runToken++;
    isAnimating = false;

    state = saved;
    if (!['player-draw', 'player-count', 'player-reveal', 'player-station', 'bear-ready'].includes(state.phase)) {
      state.phase = 'player-draw';
      state.currentWord = null;
      state.countInput = 0;
    }

    boardData = window.TavupeliBoard.generateTiles(state.squareCount);
    boardData.tiles.forEach(t => {
      t.feature = (state.featureMap && state.featureMap[t.index]) || null;
    });

    enterGameScreen();
  }

  function enterGameScreen() {
    el.setupScreen.classList.add('hidden');
    el.endScreen.classList.add('hidden');
    el.exitModal.classList.add('hidden');
    el.gameScreen.classList.remove('hidden');

    buildBoardSvg();
    placeTokensInstant();
    renderPanelTop();
    renderPhase(true);
  }

  function returnToSetup() {
    cancelActiveRaf();
    runToken++;
    isAnimating = false;
    state = null;
    clearSavedGame();
    selectedLetters = [];
    el.endScreen.classList.add('hidden');
    el.exitModal.classList.add('hidden');
    el.gameScreen.classList.add('hidden');
    el.setupScreen.classList.remove('hidden');
    updateSetupUi();
  }

  /* CONSISTENT QUIET CHEVRONS IN EVERY TILE GAP */
  function buildPathCuesSvg(tiles) {
    let out = '';
    for (let i = 0; i < tiles.length - 1; i++) {
      const a = tiles[i];
      const b = tiles[i + 1];
      const dx = b.col - a.col;
      const dy = b.row - a.row;

      let pts;
      if (dx === 1 && dy === 0) {
        const mx = a.x + a.w + 2.5;
        const my = a.y + a.h / 2;
        pts = `${mx - 1.6},${my - 3.4} ${mx + 1.8},${my} ${mx - 1.6},${my + 3.4}`;
      } else if (dx === -1 && dy === 0) {
        const mx = a.x - 2.5;
        const my = a.y + a.h / 2;
        pts = `${mx + 1.6},${my - 3.4} ${mx - 1.8},${my} ${mx + 1.6},${my + 3.4}`;
      } else if (dy === 1 && dx === 0) {
        const mx = a.x + a.w / 2;
        const my = a.y + a.h + 2.5;
        pts = `${mx - 3.4},${my - 1.6} ${mx},${my + 1.8} ${mx + 3.4},${my - 1.6}`;
      } else {
        continue;
      }

      out += `<polyline points="${pts}" fill="none" stroke="#C8C1B3" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />`;
    }
    return out;
  }

  function buildPortalArcsSvg(tiles) {
    let out = '';
    tiles.forEach((t, idx) => {
      if (!t.feature || t.feature.id !== 'taikaportti') return;
      const target = tiles[Math.min(tiles.length - 1, idx + 2)];
      if (!target || target === t) return;

      const sameRow = t.row === target.row;
      let x1, y1, x2, y2, cx, cy;

      if (sameRow) {
        const dir = target.col > t.col ? 1 : -1;
        const midTile = tiles[idx + 1];
        const hasTileAbove = [t, midTile, target].some(
          sq => sq && tiles.some(other => other.col === sq.col && other.row === sq.row - 1)
        );
        x1 = t.x + t.w / 2 + dir * 10;
        x2 = target.x + target.w / 2 - dir * 10;
        if (hasTileAbove) {
          y1 = t.y + t.h - 1;
          y2 = target.y + target.h - 1;
          cx = (x1 + x2) / 2;
          cy = Math.max(y1, y2) + 23;
        } else {
          y1 = t.y + 1;
          y2 = target.y + 1;
          cx = (x1 + x2) / 2;
          cy = Math.min(y1, y2) - 23;
        }
      } else {
        x1 = t.x + t.w / 2;
        y1 = t.y + t.h / 2;
        x2 = target.x + target.w / 2;
        y2 = target.y + target.h / 2;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        cx = (x1 + x2) / 2 + nx * 28;
        cy = (y1 + y2) / 2 + ny * 28;
      }

      const tx = x2 - cx;
      const ty = y2 - cy;
      const tLen = Math.hypot(tx, ty) || 1;
      const ux = tx / tLen;
      const uy = ty / tLen;
      const ax1 = x2 - ux * 7 - uy * 4.5;
      const ay1 = y2 - uy * 7 + ux * 4.5;
      const ax2 = x2 - ux * 7 + uy * 4.5;
      const ay2 = y2 - uy * 7 - ux * 4.5;

      out += `
        <g class="portal-arc" opacity="0.78">
          <path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}"
            fill="none" stroke="#6271A8" stroke-width="2.4" stroke-dasharray="4 5" stroke-linecap="round" />
          <circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="2.6" fill="#6271A8" />
          <polyline points="${ax1.toFixed(1)},${ay1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)} ${ax2.toFixed(1)},${ay2.toFixed(1)}"
            fill="none" stroke="#6271A8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
        </g>
      `;
    });
    return out;
  }

  /* TWO-LAYER SVG: STATIC #board-svg + GPU-ISOLATED #tokens-svg */
  function buildBoardSvg() {
    const { tiles, viewBox, washes, vignettes, accents } = boardData;
    const vbStr = viewBox.join(' ');
    el.boardSvg.setAttribute('viewBox', vbStr);
    el.tokensSvg.setAttribute('viewBox', vbStr);

    let html = '<defs>';
    tiles.forEach(t => {
      if (t.feature && t.feature.id === 'laava') {
        html += `<clipPath id="clip-tile-${t.index}"><rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" rx="10" /></clipPath>`;
      }
    });
    html += '</defs>';

    // 1. Organic ground patches beneath landmarks
    html += '<g class="layer-washes">';
    washes.forEach(w => {
      html += `<path d="${w.d}" fill="${w.color}" />`;
    });
    html += '</g>';

    // 2. Sparse Style B scenic accents
    html += '<g class="layer-accents">';
    (accents || []).forEach(a => {
      html += `<g opacity="${a.opacity}">${window.TavupeliArt.buildBoardSvgNode(a.id, a.x, a.y, a.w, a.h)}</g>`;
    });
    html += '</g>';

    // 3. Background pocket landmarks (Aarrearkku & Triceratops)
    html += '<g class="layer-vignettes">';
    const v = vignettes;
    html += window.TavupeliArt.buildBoardSvgNode('aarrearkku', v.aarrearkku.x, v.aarrearkku.y, v.aarrearkku.w, v.aarrearkku.h);
    html += window.TavupeliArt.buildBoardSvgNode('triceratops', v.triceratops.x, v.triceratops.y, v.triceratops.w, v.triceratops.h);
    html += '</g>';

    // 4. Consistent quiet directional chevrons in every tile gap
    html += `<g class="layer-path-cues">${buildPathCuesSvg(tiles)}</g>`;

    // 5. Tiles (die-cut depth, soft pastel washes for stations/twists, empty pebbles, Start/Finish tints)
    html += '<g class="layer-tiles">';
    tiles.forEach(t => {
      const wash = t.feature ? TILE_WASHES[t.feature.id] : null;
      const fill = t.isStart
        ? '#FCF9F1'
        : (t.isFinish ? '#FFFDF5' : (wash ? wash.fill : '#FFFFFF'));
      const stroke = t.isFinish
        ? '#DEC47B'
        : (wash ? wash.stroke : '#D2CCC0');
      const strokeW = t.isFinish ? '2.2' : '1.8';

      html += `<rect x="${t.x}" y="${t.y + 2.4}" width="${t.w}" height="${t.h}" rx="10" fill="#E1DBCE" />`;
      html += `<rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" rx="10" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}" />`;

      if (t.feature && t.feature.id === 'laava') {
        const inset = -3;
        html += `<g clip-path="url(#clip-tile-${t.index})">${window.TavupeliArt.buildBoardSvgNode('laava', t.x + inset, t.y + inset, t.w - inset * 2, t.h - inset * 2, 'laava-in-tile')}</g>`;
        html += `<rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" rx="10" fill="none" stroke="#D2CCC0" stroke-width="1.8" />`;
      } else if (t.feature) {
        const iconSize = 50;
        const ix = t.x + (t.w - iconSize) / 2;
        const iy = t.y + (t.h - iconSize) / 2;
        html += window.TavupeliArt.buildBoardSvgNode(t.feature.id, ix, iy, iconSize, iconSize, 'tile-icon-inside');
      } else if (!t.isStart && !t.isFinish) {
        const cx = t.x + t.w / 2;
        const cy = t.y + t.h / 2;
        html += `
          <g fill="#ECE7DC">
            <ellipse cx="${(cx - 5).toFixed(1)}" cy="${(cy + 3).toFixed(1)}" rx="8.5" ry="5.5" transform="rotate(-10 ${(cx - 5).toFixed(1)} ${(cy + 3).toFixed(1)})" />
            <ellipse cx="${(cx + 8).toFixed(1)}" cy="${(cy - 3).toFixed(1)}" rx="5.5" ry="3.8" transform="rotate(14 ${(cx + 8).toFixed(1)} ${(cy - 3).toFixed(1)})" />
            <circle cx="${(cx + 5).toFixed(1)}" cy="${(cy + 8).toFixed(1)}" r="2.6" />
          </g>
        `;
      }
    });
    html += '</g>';

    // 6. Start & Finish Hero Landmarks nestled cleanly over tile edges (tokens-svg always stays above!)
    html += '<g class="layer-landmarks-front">';
    html += window.TavupeliArt.buildBoardSvgNode('banaanilaiva', v.banaanilaiva.x, v.banaanilaiva.y, v.banaanilaiva.w, v.banaanilaiva.h);
    html += `<g id="castle-anchor">${renderCastleMarkup()}</g>`;
    html += '</g>';

    // 7. Dotted curved portal arcs (Taikaportti → +2 square)
    html += `<g class="layer-portals">${buildPortalArcsSvg(tiles)}</g>`;
    el.boardSvg.innerHTML = html;

    // 7. Tokens in lightweight separate #tokens-svg (zero board repaints when moving!)
    let tokHtml = '<g id="layer-tokens">';
    tokHtml += `<g id="token-bear" class="token-group bear-token">${window.TavupeliArt.getBearTokenSvg()}</g>`;
    state.players.forEach(p => {
      tokHtml += `
        <g id="token-p-${p.id}" class="token-group${p.paused ? ' paused-token' : ''}">
          <circle class="token-active-ring" cx="0" cy="0" r="15.2" fill="none" stroke="${p.color}" stroke-width="2.4" stroke-dasharray="3.5 3" />
          <ellipse cx="0" cy="4.2" rx="11.2" ry="9.4" fill="rgba(34,30,26,0.24)" />
          <circle cx="0" cy="0" r="11" fill="${p.color}" stroke="#FFFFFF" stroke-width="2.6" />
          <circle cx="0" cy="0" r="11" fill="none" stroke="rgba(30,34,38,0.18)" stroke-width="0.9" />
          <ellipse cx="-3" cy="-3.4" rx="3.4" ry="2.2" transform="rotate(-24 -3 -3.4)" fill="rgba(255,255,255,0.28)" />
        </g>`;
    });
    tokHtml += '</g>';
    el.tokensSvg.innerHTML = tokHtml;
    tokenCoords.clear();
  }

  function renderCastleMarkup() {
    const c = boardData.vignettes.linna;
    const castleId = state.castleLit ? 'linna-win' : 'linna-idle';
    return window.TavupeliArt.buildBoardSvgNode(castleId, c.x, c.y, c.w, c.h);
  }

  function refreshCastleVisual() {
    const anchor = document.getElementById('castle-anchor');
    if (anchor) anchor.innerHTML = renderCastleMarkup();
  }

  function updateActiveTokenHighlight() {
    if (!state) return;
    const layer = document.getElementById('layer-tokens');
    const isBearPhase = state.phase === 'bear-ready' || state.phase === 'bear-move';
    const activeId = !isBearPhase ? state.turnIndex : -1;

    state.players.forEach(p => {
      const node = document.getElementById(`token-p-${p.id}`);
      if (!node) return;
      const isActive = p.id === activeId && !p.paused && !p.finished;
      node.classList.toggle('active-token', isActive);
      // Only raise z-order when not already on top (prevents unnecessary SVG mutation)
      if (isActive && layer && layer.lastElementChild !== node) {
        layer.appendChild(node);
      }
    });

    if (isBearPhase && layer) {
      const bearNode = document.getElementById('token-bear');
      if (bearNode && layer.lastElementChild !== bearNode) {
        layer.appendChild(bearNode);
      }
    }
  }

  function computeAllTokenTargets() {
    const tiles = boardData.tiles;
    const targets = new Map();

    if (state.bearPos < 0) {
      targets.set('bear', { x: boardData.bearLurk.x, y: boardData.bearLurk.y });
    }

    const byTile = new Map();
    state.players.forEach(p => {
      if (!byTile.has(p.pos)) byTile.set(p.pos, { players: [], bear: false });
      byTile.get(p.pos).players.push(p.id);
    });
    if (state.bearPos >= 0) {
      if (!byTile.has(state.bearPos)) byTile.set(state.bearPos, { players: [], bear: false });
      byTile.get(state.bearPos).bear = true;
    }

    byTile.forEach((group, tileIdx) => {
      const tile = tiles[tileIdx];
      if (!tile) return;
      const packed = window.TavupeliBoard.computeTokenPositions(tile, group.players, group.bear);
      if (packed.bear) targets.set('bear', packed.bear);
      group.players.forEach(pId => {
        if (packed.players[pId]) targets.set(`p-${pId}`, packed.players[pId]);
      });
    });

    return targets;
  }

  function applyTokenTransform(key, x, y) {
    const id = key === 'bear' ? 'token-bear' : `token-${key}`;
    const node = document.getElementById(id);
    if (node) {
      node.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
    }
    tokenCoords.set(key, { x, y });
  }

  function placeTokensInstant() {
    cancelActiveRaf();
    const targets = computeAllTokenTargets();
    targets.forEach((pos, key) => {
      applyTokenTransform(key, pos.x, pos.y);
    });
    state.players.forEach(p => {
      const pEl = document.getElementById(`token-p-${p.id}`);
      if (pEl) pEl.classList.toggle('paused-token', p.paused);
    });
    updateActiveTokenHighlight();
  }

  /* 60FPS REQUESTANIMATIONFRAME TABLETOP HOP-GLIDE */
  function animateTokensStep(durationMs, arcKey, arcHeight, myToken) {
    cancelActiveRaf();
    const targets = computeAllTokenTargets();
    const entries = [];

    targets.forEach((to, key) => {
      const from = tokenCoords.get(key) || to;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
        const id = key === 'bear' ? 'token-bear' : `token-${key}`;
        const node = document.getElementById(id);
        if (node) {
          entries.push({
            key,
            node,
            fx: from.x,
            fy: from.y,
            tx: to.x,
            ty: to.y,
            lift: key === arcKey ? arcHeight : 0
          });
        }
      }
    });

    if (entries.length === 0) return Promise.resolve(myToken === runToken);

    return new Promise(resolve => {
      const start = performance.now();
      const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

      const frame = now => {
        if (myToken !== runToken) {
          activeRafId = null;
          resolve(false);
          return;
        }
        const rawT = Math.min(1, (now - start) / durationMs);
        const e = easeOutCubic(rawT);
        const arcFactor = Math.sin(rawT * Math.PI);

        for (let i = 0; i < entries.length; i++) {
          const item = entries[i];
          const x = item.fx + (item.tx - item.fx) * e;
          const y = item.fy + (item.ty - item.fy) * e - item.lift * arcFactor;
          item.node.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
        }

        if (rawT < 1) {
          activeRafId = requestAnimationFrame(frame);
        } else {
          activeRafId = null;
          for (let i = 0; i < entries.length; i++) {
            const item = entries[i];
            tokenCoords.set(item.key, { x: item.tx, y: item.ty });
          }
          resolve(true);
        }
      };

      activeRafId = requestAnimationFrame(frame);
    });
  }

  /* TOP BAR — BUILT ONCE PER GAME, UPDATED IN PLACE (ZERO DOM CHURN) */
  function renderPanelTop() {
    if (!state) return;

    if (panelTopRefs.playerCount !== state.players.length || panelTopRefs.dots.length !== state.players.length) {
      el.playerDots.innerHTML = '';
      panelTopRefs.dots = [];
      panelTopRefs.playerCount = state.players.length;

      state.players.forEach((p, idx) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'player-dot-btn';
        dot.style.setProperty('--dot-color', p.color);
        dot.setAttribute('aria-label', `Pelaaja ${idx + 1}`);
        dot.addEventListener('click', () => togglePlayerPause(idx));
        el.playerDots.appendChild(dot);
        panelTopRefs.dots.push(dot);
      });
    }

    const isBearPhase = state.phase === 'bear-ready' || state.phase === 'bear-move';
    state.players.forEach((p, idx) => {
      const dot = panelTopRefs.dots[idx];
      if (!dot) return;
      dot.style.setProperty('--dot-color', p.color);
      dot.classList.toggle('active', !isBearPhase && idx === state.turnIndex && !p.paused && !p.finished);
      dot.classList.toggle('paused', p.paused);
      dot.classList.toggle('finished', p.finished);
    });

    const muted = window.TavupeliAudio.isMuted();
    if (panelTopRefs.lastMuted !== muted) {
      panelTopRefs.lastMuted = muted;
      el.btnMute.innerHTML = muted
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>`;
    }

    if (!panelTopRefs.exitInitialized) {
      panelTopRefs.exitInitialized = true;
      el.btnExit.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    }
  }

  function togglePlayerPause(idx) {
    if (!state || isAnimating) return;
    const p = state.players[idx];
    if (p.finished) return;

    const activeUnfinished = state.players.filter(pl => !pl.paused && !pl.finished);
    if (!p.paused && activeUnfinished.length <= 1) return;

    p.paused = !p.paused;
    placeTokensInstant();

    if (p.paused && state.turnIndex === idx && (state.phase === 'player-draw' || state.phase === 'player-count' || state.phase === 'player-reveal')) {
      advanceTurnAfterPlayer();
      return;
    }

    saveGameState();
    renderPanelTop();
  }

  function getActivePlayer() {
    return state.players[state.turnIndex];
  }

  function setPanelPlayerColor(color) {
    el.gameScreen.style.setProperty('--player-color', color);
  }

  function renderPhase(animateCard = true) {
    renderPanelTop();
    updateActiveTokenHighlight();
    el.cardStage.innerHTML = '';
    el.controlDock.innerHTML = '';
    taputusRefs = null;

    if (state.phase === 'player-draw') {
      const p = getActivePlayer();
      setPanelPlayerColor(p.color);
      renderDrawDeck(animateCard);
    } else if (state.phase === 'player-count') {
      const p = getActivePlayer();
      setPanelPlayerColor(p.color);
      renderWordCard(animateCard ? 'flip' : 'none', false);
      renderTaputusControls();
    } else if (state.phase === 'player-reveal') {
      const p = getActivePlayer();
      setPanelPlayerColor(p.color);
      renderWordCard('none', true);
      renderLiikuControls(false);
    } else if (state.phase === 'player-station') {
      const p = getActivePlayer();
      setPanelPlayerColor(p.color);
      renderStationCard(animateCard);
      renderStationControls();
    } else if (state.phase === 'bear-ready') {
      renderBearFaceDown(animateCard);
    }
  }

  function renderDrawDeck(animateCard = false) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `deck-stack${animateCard ? ' card-enter' : ''}`;
    btn.setAttribute('aria-label', 'Nosta kortti');
    btn.innerHTML = `
      <span class="deck-peek deck-peek-1"></span>
      <span class="deck-peek deck-peek-2"></span>
      <span class="deck-top"><span class="deck-mark"></span></span>
    `;
    btn.addEventListener('click', onTapDrawDeck);
    el.cardStage.appendChild(btn);
  }

  function onTapDrawDeck() {
    if (isAnimating || state.phase !== 'player-draw' || !guardTap()) return;
    state.currentWord = drawWord();
    state.countInput = 0;
    state.phase = 'player-count';
    saveGameState();
    renderPhase(true);
  }

  function createRevealBlock(word) {
    const fullStr = word.syllables.join('-');
    const rev = document.createElement('div');
    rev.className = 'reveal-block';
    rev.innerHTML = `
      <div class="reveal-numeral">${word.syllables.length}</div>
      <div class="reveal-word${fullStr.length >= 13 ? ' long-word' : ''}">${fullStr}</div>
    `;
    return rev;
  }

  function renderWordCard(animMode, revealed) {
    const word = state.currentWord;
    const card = document.createElement('div');
    const animClass = animMode === 'flip' ? ' card-flip-in' : (animMode === 'enter' ? ' card-enter' : '');
    card.className = `game-card${animClass}`;
    card.id = 'active-word-card';

    const artBox = document.createElement('div');
    artBox.className = 'word-art';
    window.TavupeliArt.renderHtml(artBox, 'words', word.id, '');
    card.appendChild(artBox);

    if (revealed) {
      card.appendChild(createRevealBlock(word));
    }

    el.cardStage.appendChild(card);
  }

  function renderTaputusControls() {
    el.controlDock.innerHTML = '';

    const dotsRow = document.createElement('div');
    dotsRow.className = 'beat-dots-row';
    const dotEls = [];

    for (let i = 1; i <= 6; i++) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'beat-dot';
      dot.setAttribute('aria-label', String(i));
      dot.addEventListener('click', () => {
        if (isAnimating || state.phase !== 'player-count') return;
        if (i <= state.countInput) {
          state.countInput = i === state.countInput ? i - 1 : i;
          if (state.countInput > 0) {
            window.TavupeliAudio.playSyllable(state.countInput - 1);
          }
          syncTaputusControls();
        }
      });
      dotsRow.appendChild(dot);
      dotEls.push(dot);
    }
    el.controlDock.appendChild(dotsRow);

    const pad = document.createElement('button');
    pad.type = 'button';
    pad.className = 'tap-pad';
    pad.setAttribute('aria-label', 'Taputa');
    pad.innerHTML = '<span class="tap-pad-ring"></span>';
    pad.addEventListener('click', () => {
      if (isAnimating || state.phase !== 'player-count') return;
      if (state.countInput >= 6) {
        state.countInput = 0;
      } else {
        state.countInput += 1;
        window.TavupeliAudio.playSyllable(state.countInput - 1);
      }
      syncTaputusControls();
    });
    el.controlDock.appendChild(pad);

    const valmis = document.createElement('button');
    valmis.type = 'button';
    valmis.className = 'btn-valmis';
    valmis.textContent = 'Valmis';
    valmis.addEventListener('click', onConfirmSyllables);
    el.controlDock.appendChild(valmis);

    taputusRefs = { dotEls, valmis };
    syncTaputusControls();
  }

  function syncTaputusControls() {
    if (!taputusRefs) return;
    taputusRefs.dotEls.forEach((dot, idx) => {
      dot.classList.toggle('lit', idx + 1 <= state.countInput);
    });
    taputusRefs.valmis.disabled = state.countInput < 1;
  }

  function onConfirmSyllables() {
    if (isAnimating || state.phase !== 'player-count' || state.countInput < 1 || !guardTap()) return;

    state.phase = 'player-reveal';
    saveGameState();

    const existingCard = document.getElementById('active-word-card');
    if (existingCard && !existingCard.querySelector('.reveal-block')) {
      existingCard.appendChild(createRevealBlock(state.currentWord));
    } else {
      el.cardStage.innerHTML = '';
      renderWordCard('none', true);
    }

    renderLiikuControls(true);
  }

  function renderLiikuControls(withGuard = true) {
    el.controlDock.innerHTML = '';
    taputusRefs = null;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-liiku';
    btn.textContent = 'Liiku';

    if (withGuard) {
      liikuReadyAt = performance.now() + TIMING.LIIKU_GUARD_MS;
      btn.classList.add('guard-locked');
      const myToken = runToken;
      setTimeout(() => {
        if (myToken === runToken && btn.isConnected) {
          btn.classList.remove('guard-locked');
        }
      }, TIMING.LIIKU_GUARD_MS);
    } else {
      liikuReadyAt = 0;
    }

    btn.addEventListener('click', onTapLiiku);
    el.controlDock.appendChild(btn);
  }

  async function onTapLiiku() {
    if (isAnimating || state.phase !== 'player-reveal') return;
    if (performance.now() < liikuReadyAt) return;
    if (!guardTap()) return;

    isAnimating = true;
    const myToken = runToken;

    const word = state.currentWord;
    const p = getActivePlayer();
    const finishIdx = boardData.tiles.length - 1;
    const sylCount = word.syllables.length;

    el.controlDock.innerHTML = '';
    el.cardStage.innerHTML = '';

    // Ensure active pawn is on top ONCE before movement begins
    updateActiveTokenHighlight();

    for (let i = 0; i < sylCount; i++) {
      window.TavupeliAudio.playSyllable(i);
      if (p.pos < finishIdx) {
        p.pos += 1;
        const ok = await animateTokensStep(TIMING.SYLLABLE_GLIDE_MS, `p-${p.id}`, 5.5, myToken);
        if (!ok) return;
        if (p.pos === finishIdx) {
          onPlayerReachedFinish(p);
        }
      }
      if (p.finished) break;
      if (!(await sleep(TIMING.SYLLABLE_PAUSE_MS, myToken))) return;
    }

    saveGameState();

    if (checkAllActivePlayersFinished()) {
      triggerEndScreen('players');
      return;
    }

    if (!p.finished) {
      const landed = boardData.tiles[p.pos];
      if (landed && landed.feature) {
        if (landed.feature.type === 'twist') {
          await resolveTwist(landed.feature.id, myToken);
          return;
        }
        if (landed.feature.type === 'station') {
          openStation(landed.feature.id);
          return;
        }
      }
    }

    isAnimating = false;
    advanceTurnAfterPlayer();
  }

  function onPlayerReachedFinish(player) {
    player.finished = true;
    if (!state.castleLit) {
      state.castleLit = true;
      refreshCastleVisual();
    }
    renderPanelTop();
  }

  function checkAllActivePlayersFinished() {
    const active = state.players.filter(p => !p.paused);
    return active.length > 0 && active.every(p => p.finished);
  }

  async function resolveTwist(twistId, myToken) {
    const twist = window.TAVUPELI_TWISTS.find(t => t.id === twistId);
    if (!twist) {
      isAnimating = false;
      advanceTurnAfterPlayer();
      return;
    }

    const p = getActivePlayer();
    const finishIdx = boardData.tiles.length - 1;

    el.cardStage.innerHTML = '';
    el.controlDock.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'game-card twist-card card-enter';

    const art = document.createElement('div');
    art.className = 'station-card-art';
    window.TavupeliArt.renderHtml(art, 'board', twist.id, twist.name);

    const title = document.createElement('h2');
    title.className = 'card-title';
    title.textContent = twist.name;

    const delta = document.createElement('div');
    delta.className = 'twist-delta';
    delta.textContent = twist.label;

    card.appendChild(art);
    card.appendChild(title);
    card.appendChild(delta);
    el.cardStage.appendChild(card);

    if (!(await sleep(TIMING.TWIST_HOLD_MS, myToken))) return;

    el.cardStage.innerHTML = '';

    const steps = Math.abs(twist.delta);
    const dir = twist.delta > 0 ? 1 : -1;
    for (let s = 0; s < steps; s++) {
      const nextPos = Math.max(0, Math.min(finishIdx, p.pos + dir));
      if (nextPos !== p.pos) {
        p.pos = nextPos;
        window.TavupeliAudio.playSyllable(dir > 0 ? s + 2 : Math.max(0, 2 - s));
        const ok = await animateTokensStep(TIMING.TWIST_STEP_MS, `p-${p.id}`, 5, myToken);
        if (!ok) return;
        if (p.pos === finishIdx) {
          onPlayerReachedFinish(p);
        }
      }
      if (p.finished) break;
      if (!(await sleep(TIMING.TWIST_PAUSE_MS, myToken))) return;
    }

    saveGameState();

    if (checkAllActivePlayersFinished()) {
      triggerEndScreen('players');
      return;
    }

    if (!p.finished) {
      const landed = boardData.tiles[p.pos];
      if (landed && landed.feature && landed.feature.type === 'station') {
        openStation(landed.feature.id);
        return;
      }
    }

    isAnimating = false;
    advanceTurnAfterPlayer();
  }

  function openStation(stationId) {
    const id = migrateStationId(stationId);
    const st = window.TAVUPELI_STATIONS.find(s => s.id === id);
    if (!st) {
      isAnimating = false;
      advanceTurnAfterPlayer();
      return;
    }

    const letters = drawLetters(st.letters);
    state.currentStation = { id: st.id, name: st.name, desc: st.desc || '', letters };
    state.phase = 'player-station';
    isAnimating = false;
    saveGameState();
    renderPhase(true);
  }

  function renderStationCard(animateCard) {
    const st = state.currentStation;
    const def = window.TAVUPELI_STATIONS.find(s => s.id === st.id);
    const descText = st.desc || (def && def.desc) || '';

    const card = document.createElement('div');
    card.className = `game-card activity-card${animateCard ? ' card-enter' : ''}`;

    const art = document.createElement('div');
    art.className = 'station-card-art';
    window.TavupeliArt.renderHtml(art, 'board', st.id, st.name);

    const title = document.createElement('h2');
    title.className = 'card-title';
    title.textContent = st.name;

    card.appendChild(art);
    card.appendChild(title);

    if (descText) {
      const desc = document.createElement('p');
      desc.className = 'card-desc';
      desc.textContent = descText;
      card.appendChild(desc);
    }

    if (st.letters && st.letters.length > 0) {
      const boxes = document.createElement('div');
      boxes.className = `letter-boxes${st.letters.length === 3 ? ' staggered' : ''}`;
      st.letters.forEach(ch => {
        const box = document.createElement('div');
        box.className = 'letter-box';
        box.textContent = ch;
        boxes.appendChild(box);
      });
      card.appendChild(boxes);
    }

    el.cardStage.appendChild(card);
  }

  function renderStationControls() {
    el.controlDock.innerHTML = '';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-valmis';
    btn.textContent = 'Valmis';
    btn.addEventListener('click', () => {
      if (isAnimating || state.phase !== 'player-station' || !guardTap()) return;
      state.currentStation = null;
      advanceTurnAfterPlayer();
    });
    el.controlDock.appendChild(btn);
  }

  function findNextEligiblePlayerAfter(startIdx) {
    for (let i = startIdx + 1; i < state.players.length; i++) {
      const p = state.players[i];
      if (!p.paused && !p.finished) return i;
    }
    return -1;
  }

  function findFirstEligiblePlayer() {
    for (let i = 0; i < state.players.length; i++) {
      const p = state.players[i];
      if (!p.paused && !p.finished) return i;
    }
    return -1;
  }

  function advanceTurnAfterPlayer() {
    if (checkAllActivePlayersFinished()) {
      triggerEndScreen('players');
      return;
    }

    const nextIdx = findNextEligiblePlayerAfter(state.turnIndex);
    if (nextIdx !== -1) {
      state.turnIndex = nextIdx;
      state.phase = 'player-draw';
      state.currentWord = null;
      state.countInput = 0;
      saveGameState();
      renderPhase(true);
    } else {
      state.phase = 'bear-ready';
      state.currentWord = null;
      state.countInput = 0;
      saveGameState();
      renderPhase(true);
    }
  }

  function renderBearFaceDown(animateCard) {
    const wrap = document.createElement('div');
    wrap.className = `bear-card-wrap${animateCard ? ' card-enter' : ''}`;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bear-card-btn';
    btn.setAttribute('aria-label', 'Karhun kortti');
    btn.innerHTML = window.TavupeliArt.getPawPrintSvg();
    btn.addEventListener('click', onTapBearCard);

    wrap.appendChild(btn);
    el.cardStage.appendChild(wrap);
  }

  async function onTapBearCard() {
    if (isAnimating || state.phase !== 'bear-ready' || !guardTap()) return;
    isAnimating = true;
    const myToken = runToken;
    state.phase = 'bear-move';
    updateActiveTokenHighlight();

    const steps = drawBearCard();
    const finishIdx = boardData.tiles.length - 1;

    el.cardStage.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'bear-card-wrap card-flip-in';

    const face = document.createElement('div');
    face.className = 'bear-card-face';

    if (steps === 0) {
      const zeroArt = document.createElement('div');
      zeroArt.className = 'bear-zero-art';
      window.TavupeliArt.renderHtml(zeroArt, 'board', 'karhu-0', '');
      const zeroNum = document.createElement('div');
      zeroNum.className = 'bear-zero-numeral';
      zeroNum.textContent = '0';
      face.appendChild(zeroArt);
      face.appendChild(zeroNum);
    } else {
      let pawsHtml = '';
      for (let k = 0; k < steps; k++) {
        pawsHtml += window.TavupeliArt.getPawPrintSvg();
      }
      face.innerHTML = `
        <div class="bear-numeral">${steps}</div>
        <div class="bear-paws-row">${pawsHtml}</div>
      `;
    }

    wrap.appendChild(face);
    el.cardStage.appendChild(wrap);

    if (steps === 0) {
      if (!(await sleep(TIMING.BEAR_ZERO_HOLD_MS, myToken))) return;
    } else {
      if (!(await sleep(TIMING.BEAR_REVEAL_HOLD_MS, myToken))) return;

      for (let s = 0; s < steps; s++) {
        if (state.bearPos < finishIdx) {
          state.bearPos += 1;
          window.TavupeliAudio.playBearStep(s);
          const ok = await animateTokensStep(TIMING.BEAR_GLIDE_MS, 'bear', 4, myToken);
          if (!ok) return;
        }
        if (state.bearPos >= finishIdx) break;
        if (!(await sleep(TIMING.BEAR_PAUSE_MS, myToken))) return;
      }
    }

    saveGameState();

    if (state.bearPos >= finishIdx && !checkAllActivePlayersFinished()) {
      triggerEndScreen('bear');
      return;
    }

    const firstIdx = findFirstEligiblePlayer();
    if (firstIdx === -1) {
      triggerEndScreen('players');
      return;
    }

    state.turnIndex = firstIdx;
    state.phase = 'player-draw';
    isAnimating = false;
    saveGameState();
    renderPhase(true);
  }

  function triggerEndScreen(winner) {
    cancelActiveRaf();
    isAnimating = false;
    state.phase = 'ended';
    state.winner = winner;
    clearSavedGame();

    if (winner === 'players') {
      window.TavupeliArt.renderHtml(el.endArt, 'board', 'linna-win', 'Linna');
      el.endLine.textContent = 'Kaikki pääsivät linnaan!';
    } else {
      window.TavupeliArt.renderHtml(el.endArt, 'board', 'karhu-win', 'Karhu');
      el.endLine.textContent = 'Karhu ehti ensin!';
    }

    el.endScreen.classList.remove('hidden');
  }

  function openExitModal() {
    el.exitStep1.classList.remove('hidden');
    el.exitStep2.classList.add('hidden');
    el.exitModal.classList.remove('hidden');
  }

  function closeExitModal() {
    el.exitModal.classList.add('hidden');
  }

  // Silently unlock Web Audio on first user interaction
  const unlockOnce = () => {
    window.TavupeliAudio.unlock();
    window.removeEventListener('pointerdown', unlockOnce);
  };
  window.addEventListener('pointerdown', unlockOnce, { passive: true });

  el.btnSqMinus.addEventListener('click', () => adjustSquares(-1));
  el.btnSqPlus.addEventListener('click', () => adjustSquares(1));

  el.btnClearLetters.addEventListener('click', () => {
    selectedLetters = [];
    updateSetupUi();
  });

  el.btnStartGame.addEventListener('click', startNewGame);
  el.btnResumeGame.addEventListener('click', resumeSavedGame);

  el.btnMute.addEventListener('click', () => {
    window.TavupeliAudio.setMuted(!window.TavupeliAudio.isMuted());
    renderPanelTop();
  });

  el.btnExit.addEventListener('click', openExitModal);
  el.btnModalCancel.addEventListener('click', closeExitModal);
  el.btnModalStep2.addEventListener('click', () => {
    el.exitStep1.classList.add('hidden');
    el.exitStep2.classList.remove('hidden');
  });
  el.btnModalBack.addEventListener('click', () => {
    el.exitStep2.classList.add('hidden');
    el.exitStep1.classList.remove('hidden');
  });
  el.btnModalConfirm.addEventListener('click', returnToSetup);
  el.btnEndNew.addEventListener('click', returnToSetup);

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  updateSetupUi();
  const wasPreloaded = window.TavupeliArt.isPreloaded();
  window.TavupeliArt.preloadAll().then(() => {
    refreshSetupStationArt();
    if (!wasPreloaded && !el.gameScreen.classList.contains('hidden') && state && !isAnimating) {
      buildBoardSvg();
      placeTokensInstant();
      renderPhase(false);
    }
  });
})();
