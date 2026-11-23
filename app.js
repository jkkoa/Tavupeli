/* Tavupeli v3 — Main Game Engine & UI Controller */
(() => {
  'use strict';

  const STORAGE_KEYS = {
    PREFS: 'tavupeli_v3_prefs',
    GAME: 'tavupeli_v3_game_state',
    WORD_BAG: 'tavupeli_v3_word_bag'
  };

  const SQUARE_BOUNDS = { MIN: 20, MAX: 45, DEFAULT: 32 };

  const TIMING = {
    REVEAL_HOLD_MS: 1150,
    SYLLABLE_GLIDE_MS: 500,
    SYLLABLE_PAUSE_MS: 420,
    TWIST_HOLD_MS: 1000,
    BEAR_REVEAL_HOLD_MS: 950,
    BEAR_ZERO_HOLD_MS: 2200,
    BEAR_GLIDE_MS: 620,
    BEAR_PAUSE_MS: 480
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

  function loadPrefs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PREFS);
      if (!raw) return { ...defaultPrefs };
      const p = JSON.parse(raw);
      const sq = Number(p.squareCount);
      return {
        playerCount: Math.max(1, Math.min(7, Number(p.playerCount) || 4)),
        activeStations: Array.isArray(p.activeStations)
          ? p.activeStations.filter(id => window.TAVUPELI_STATIONS.some(s => s.id === id))
          : [...defaultPrefs.activeStations],
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

  function renderSetup() {
    el.setupPlayers.innerHTML = '';
    for (let n = 1; n <= 7; n++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `seg-btn${prefs.playerCount === n ? ' active' : ''}`;
      b.textContent = String(n);
      b.addEventListener('click', () => {
        prefs.playerCount = n;
        savePrefs();
        renderSetup();
      });
      el.setupPlayers.appendChild(b);
    }

    el.setupStations.innerHTML = '';
    window.TAVUPELI_STATIONS.forEach(st => {
      const active = prefs.activeStations.includes(st.id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `station-chip${active ? ' active' : ''}`;
      const iconSpan = document.createElement('span');
      iconSpan.className = 'chip-icon';
      window.TavupeliArt.renderHtml(iconSpan, 'board', st.id, st.name);
      const txt = document.createElement('span');
      txt.textContent = st.name;
      b.appendChild(iconSpan);
      b.appendChild(txt);
      b.addEventListener('click', () => {
        if (active) prefs.activeStations = prefs.activeStations.filter(id => id !== st.id);
        else prefs.activeStations = [...prefs.activeStations, st.id];
        savePrefs();
        renderSetup();
      });
      el.setupStations.appendChild(b);
    });

    el.setupTwists.innerHTML = '';
    [
      { val: true, label: 'Päällä' },
      { val: false, label: 'Pois' }
    ].forEach(opt => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `seg-btn${prefs.twistsEnabled === opt.val ? ' active' : ''}`;
      b.textContent = opt.label;
      b.addEventListener('click', () => {
        prefs.twistsEnabled = opt.val;
        savePrefs();
        renderSetup();
      });
      el.setupTwists.appendChild(b);
    });

    el.setupSquaresVal.textContent = String(prefs.squareCount);
    el.btnSqMinus.disabled = prefs.squareCount <= SQUARE_BOUNDS.MIN;
    el.btnSqPlus.disabled = prefs.squareCount >= SQUARE_BOUNDS.MAX;

    el.setupLetters.innerHTML = '';
    window.TAVUPELI_ALPHABET.forEach(ch => {
      const isSel = selectedLetters.includes(ch);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `letter-btn${isSel ? ' active' : ''}`;
      b.textContent = ch;
      b.addEventListener('click', () => {
        if (isSel) selectedLetters = selectedLetters.filter(c => c !== ch);
        else selectedLetters = [...selectedLetters, ch];
        renderSetup();
      });
      el.setupLetters.appendChild(b);
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
      renderSetup();
    }
  }

  function startNewGame() {
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
    const saved = loadSavedGame();
    if (!saved) return;
    runToken++;
    isAnimating = false;

    state = saved;
    if (!['player-draw', 'player-count', 'player-station', 'bear-ready'].includes(state.phase)) {
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
    updateBoardTokens(true);
    renderPanelTop();
    renderPhase(true);
  }

  function returnToSetup() {
    runToken++;
    isAnimating = false;
    state = null;
    clearSavedGame();
    selectedLetters = [];
    el.endScreen.classList.add('hidden');
    el.exitModal.classList.add('hidden');
    el.gameScreen.classList.add('hidden');
    el.setupScreen.classList.remove('hidden');
    renderSetup();
  }

  function buildBoardSvg() {
    const { tiles, viewBox, washes, vignettes } = boardData;
    el.boardSvg.setAttribute('viewBox', viewBox.join(' '));

    let html = '<defs>';
    tiles.forEach(t => {
      if (t.feature && t.feature.id === 'laava') {
        html += `<clipPath id="clip-tile-${t.index}"><rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" rx="10" /></clipPath>`;
      }
    });
    html += '</defs>';

    html += '<g class="layer-washes">';
    washes.forEach(w => {
      html += `<ellipse cx="${w.cx}" cy="${w.cy}" rx="${w.rx}" ry="${w.ry}" fill="${w.color}" transform="rotate(${w.rot} ${w.cx} ${w.cy})" />`;
    });
    html += '</g>';

    html += '<g class="layer-vignettes">';
    const v = vignettes;
    html += window.TavupeliArt.buildBoardSvgNode('banaanilaiva', v.banaanilaiva.x, v.banaanilaiva.y, v.banaanilaiva.w, v.banaanilaiva.h);
    html += window.TavupeliArt.buildBoardSvgNode('aarrearkku', v.aarrearkku.x, v.aarrearkku.y, v.aarrearkku.w, v.aarrearkku.h);
    html += window.TavupeliArt.buildBoardSvgNode('lohikaarme', v.lohikaarme.x, v.lohikaarme.y, v.lohikaarme.w, v.lohikaarme.h);
    html += `<g id="castle-anchor">${renderCastleMarkup()}</g>`;
    html += '</g>';

    html += '<g class="layer-tiles">';
    tiles.forEach(t => {
      html += `<rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" rx="10" fill="#FFFFFF" stroke="#D2CCC0" stroke-width="1.9" />`;
      if (t.feature && t.feature.id === 'laava') {
        const inset = -4;
        html += `<g clip-path="url(#clip-tile-${t.index})">${window.TavupeliArt.buildBoardSvgNode('laava', t.x + inset, t.y + inset, t.w - inset * 2, t.h - inset * 2, 'laava-in-tile')}</g>`;
        html += `<rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" rx="10" fill="none" stroke="#D2CCC0" stroke-width="1.9" />`;
      }
    });
    html += '</g>';

    html += '<g class="layer-icons">';
    tiles.forEach(t => {
      if (!t.feature || t.feature.id === 'laava') return;
      const iconSize = 42;
      const tilt = typeof t.feature.tilt === 'number' ? t.feature.tilt : 0;
      const shift = typeof t.feature.shift === 'number' ? t.feature.shift : 0;

      let ix;
      let iy;
      if (t.iconSide === 'right') {
        ix = t.x + t.w - iconSize * 0.34;
        iy = t.y + (t.h - iconSize) / 2 + shift;
      } else if (t.iconSide === 'left') {
        ix = t.x - iconSize * 0.66;
        iy = t.y + (t.h - iconSize) / 2 + shift;
      } else {
        ix = t.x + (t.w - iconSize) / 2 + shift;
        iy = t.y - iconSize * 0.66;
      }

      const cx = ix + iconSize / 2;
      const cy = iy + iconSize / 2;
      html += window.TavupeliArt.buildBoardSvgNode(
        t.feature.id,
        ix,
        iy,
        iconSize,
        iconSize,
        '',
        `rotate(${tilt} ${cx.toFixed(1)} ${cy.toFixed(1)})`
      );
    });
    html += '</g>';

    html += '<g id="layer-tokens">';
    html += `<g id="token-bear" class="token-group bear-token">${window.TavupeliArt.getBearTokenSvg()}</g>`;
    state.players.forEach(p => {
      html += `
        <g id="token-p-${p.id}" class="token-group${p.paused ? ' paused-token' : ''}">
          <circle cx="0" cy="0" r="10.5" fill="${p.color}" stroke="#FFFFFF" stroke-width="2.4" />
          <circle cx="0" cy="0" r="10.5" fill="none" stroke="rgba(30,34,38,0.16)" stroke-width="0.9" />
          <circle cx="-2.8" cy="-2.8" r="2.6" fill="rgba(255,255,255,0.22)" />
        </g>`;
    });
    html += '</g>';

    el.boardSvg.innerHTML = html;
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

  function positionEl(node, x, y, instant) {
    if (!node) return;
    if (instant) node.classList.add('no-transition');
    node.style.transform = `translate(${x}px, ${y}px)`;
    if (instant) {
      node.getBoundingClientRect();
      node.classList.remove('no-transition');
    }
  }

  function updateBoardTokens(instant = false) {
    const tiles = boardData.tiles;
    const bearEl = document.getElementById('token-bear');

    if (state.bearPos < 0) {
      positionEl(bearEl, boardData.bearLurk.x, boardData.bearLurk.y, instant);
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

      if (packed.bear) {
        positionEl(bearEl, packed.bear.x, packed.bear.y, instant);
      }

      group.players.forEach(pId => {
        const pos = packed.players[pId];
        const pEl = document.getElementById(`token-p-${pId}`);
        const pObj = state.players[pId];
        if (pEl && pos) {
          pEl.classList.toggle('paused-token', pObj.paused);
          positionEl(pEl, pos.x, pos.y, instant);
        }
      });
    });
  }

  function renderPanelTop() {
    el.playerDots.innerHTML = '';
    const isBearPhase = state.phase === 'bear-ready' || state.phase === 'bear-move';

    state.players.forEach((p, idx) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'player-dot-btn';
      dot.style.setProperty('--dot-color', p.color);
      if (!isBearPhase && idx === state.turnIndex && !p.paused && !p.finished) {
        dot.classList.add('active');
      }
      if (p.paused) dot.classList.add('paused');
      if (p.finished) dot.classList.add('finished');
      dot.setAttribute('aria-label', `Pelaaja ${idx + 1}`);
      dot.addEventListener('click', () => togglePlayerPause(idx));
      el.playerDots.appendChild(dot);
    });

    const muted = window.TavupeliAudio.isMuted();
    el.btnMute.innerHTML = muted
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>`;

    el.btnExit.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  }

  function togglePlayerPause(idx) {
    if (!state || isAnimating) return;
    const p = state.players[idx];
    if (p.finished) return;

    const activeUnfinished = state.players.filter(pl => !pl.paused && !pl.finished);
    if (!p.paused && activeUnfinished.length <= 1) return;

    p.paused = !p.paused;
    updateBoardTokens(true);

    if (p.paused && state.turnIndex === idx && (state.phase === 'player-draw' || state.phase === 'player-count')) {
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
    el.cardStage.innerHTML = '';
    el.controlDock.innerHTML = '';

    if (state.phase === 'player-draw') {
      const p = getActivePlayer();
      setPanelPlayerColor(p.color);
      renderDrawDeck();
    } else if (state.phase === 'player-count') {
      const p = getActivePlayer();
      setPanelPlayerColor(p.color);
      renderWordCard(animateCard, false);
      renderTaputusControls();
    } else if (state.phase === 'player-station') {
      const p = getActivePlayer();
      setPanelPlayerColor(p.color);
      renderStationCard(animateCard);
      renderStationControls();
    } else if (state.phase === 'bear-ready') {
      renderBearFaceDown(animateCard);
    }
  }

  function renderDrawDeck() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'deck-stack';
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
    if (isAnimating || state.phase !== 'player-draw') return;
    state.currentWord = drawWord();
    state.countInput = 0;
    state.phase = 'player-count';
    saveGameState();
    renderPhase(true);
  }

  function renderWordCard(animateCard, revealed) {
    const word = state.currentWord;
    const card = document.createElement('div');
    card.className = `game-card${animateCard ? ' card-enter' : ''}`;

    const artBox = document.createElement('div');
    artBox.className = 'word-art';
    window.TavupeliArt.renderHtml(artBox, 'words', word.id, '');
    card.appendChild(artBox);

    if (revealed) {
      const fullStr = word.syllables.join('-');
      const rev = document.createElement('div');
      rev.className = 'reveal-block';
      rev.innerHTML = `
        <div class="reveal-numeral">${word.syllables.length}</div>
        <div class="reveal-word${fullStr.length >= 13 ? ' long-word' : ''}">${fullStr}</div>
      `;
      card.appendChild(rev);
    }

    el.cardStage.appendChild(card);
  }

  function renderTaputusControls() {
    el.controlDock.innerHTML = '';

    const dotsRow = document.createElement('div');
    dotsRow.className = 'beat-dots-row';
    for (let i = 1; i <= 6; i++) {
      const dot = document.createElement('button');
      dot.type = 'button';
      const isLit = i <= state.countInput;
      dot.className = `beat-dot${isLit ? ' lit' : ''}`;
      dot.setAttribute('aria-label', String(i));
      dot.addEventListener('click', () => {
        if (isAnimating) return;
        if (i <= state.countInput) {
          state.countInput = i;
          window.TavupeliAudio.playSyllable(i - 1);
          renderTaputusControls();
        }
      });
      dotsRow.appendChild(dot);
    }
    el.controlDock.appendChild(dotsRow);

    const pad = document.createElement('button');
    pad.type = 'button';
    pad.className = 'tap-pad';
    pad.setAttribute('aria-label', 'Taputa');
    pad.innerHTML = '<span class="tap-pad-ring"></span>';
    pad.addEventListener('click', () => {
      if (isAnimating) return;
      if (state.countInput >= 6) {
        state.countInput = 0;
      } else {
        state.countInput += 1;
        window.TavupeliAudio.playSyllable(state.countInput - 1);
      }
      renderTaputusControls();
    });
    el.controlDock.appendChild(pad);

    const valmis = document.createElement('button');
    valmis.type = 'button';
    valmis.className = 'btn-valmis';
    valmis.textContent = 'Valmis';
    valmis.disabled = state.countInput < 1;
    valmis.addEventListener('click', onConfirmSyllables);
    el.controlDock.appendChild(valmis);
  }

  async function onConfirmSyllables() {
    if (isAnimating || state.phase !== 'player-count' || state.countInput < 1) return;
    isAnimating = true;
    const myToken = runToken;

    const word = state.currentWord;
    const p = getActivePlayer();
    const finishIdx = boardData.tiles.length - 1;
    const sylCount = word.syllables.length;

    el.controlDock.innerHTML = '';
    el.cardStage.innerHTML = '';
    renderWordCard(false, true);

    if (!(await sleep(TIMING.REVEAL_HOLD_MS, myToken))) return;

    el.cardStage.innerHTML = '';

    for (let i = 0; i < sylCount; i++) {
      window.TavupeliAudio.playSyllable(i);
      if (p.pos < finishIdx) {
        p.pos += 1;
        updateBoardTokens(false);
        if (p.pos === finishIdx) {
          onPlayerReachedFinish(p);
        }
      }
      if (!(await sleep(TIMING.SYLLABLE_GLIDE_MS + TIMING.SYLLABLE_PAUSE_MS, myToken))) return;
      if (p.finished) break;
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
        updateBoardTokens(false);
        if (p.pos === finishIdx) {
          onPlayerReachedFinish(p);
        }
      }
      if (!(await sleep(TIMING.SYLLABLE_GLIDE_MS + 280, myToken))) return;
      if (p.finished) break;
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
    const st = window.TAVUPELI_STATIONS.find(s => s.id === stationId);
    if (!st) {
      isAnimating = false;
      advanceTurnAfterPlayer();
      return;
    }

    const letters = drawLetters(st.letters);
    state.currentStation = { id: st.id, name: st.name, letters };
    state.phase = 'player-station';
    isAnimating = false;
    saveGameState();
    renderPhase(true);
  }

  function renderStationCard(animateCard) {
    const st = state.currentStation;
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
      if (isAnimating || state.phase !== 'player-station') return;
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
      renderPhase(false);
    } else {
      state.phase = 'bear-ready';
      state.currentWord = null;
      state.countInput = 0;
      saveGameState();
      renderPhase(true);
    }
  }

  function buildBearEarsSvg() {
    return `
      <svg class="bear-ears" viewBox="0 0 112 26" aria-hidden="true">
        <circle cx="24" cy="18" r="14" fill="#ECE7DE" stroke="#4A443E" stroke-width="5" />
        <circle cx="88" cy="18" r="14" fill="#ECE7DE" stroke="#4A443E" stroke-width="5" />
        <circle cx="24" cy="18" r="6" fill="#C9C1B4" />
        <circle cx="88" cy="18" r="6" fill="#C9C1B4" />
      </svg>
    `;
  }

  function renderBearFaceDown(animateCard) {
    const wrap = document.createElement('div');
    wrap.className = `bear-card-wrap${animateCard ? ' card-enter' : ''}`;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bear-card-btn';
    btn.setAttribute('aria-label', 'Karhun kortti');
    btn.innerHTML = `${buildBearEarsSvg()}${window.TavupeliArt.getPawPrintSvg()}`;
    btn.addEventListener('click', onTapBearCard);

    wrap.appendChild(btn);
    el.cardStage.appendChild(wrap);
  }

  async function onTapBearCard() {
    if (isAnimating || state.phase !== 'bear-ready') return;
    isAnimating = true;
    const myToken = runToken;
    state.phase = 'bear-move';

    const steps = drawBearCard();
    const finishIdx = boardData.tiles.length - 1;

    el.cardStage.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'bear-card-wrap card-enter';

    const face = document.createElement('div');
    face.className = 'bear-card-face';

    if (steps === 0) {
      const zeroArt = document.createElement('div');
      zeroArt.className = 'bear-zero-art';
      window.TavupeliArt.renderHtml(zeroArt, 'board', 'karhu-0', '');
      const zeroNum = document.createElement('div');
      zeroNum.className = 'bear-zero-numeral';
      zeroNum.textContent = '0';
      face.innerHTML = buildBearEarsSvg();
      face.appendChild(zeroArt);
      face.appendChild(zeroNum);
    } else {
      let pawsHtml = '';
      for (let k = 0; k < steps; k++) {
        pawsHtml += window.TavupeliArt.getPawPrintSvg();
      }
      face.innerHTML = `
        ${buildBearEarsSvg()}
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
          updateBoardTokens(false);
        }
        if (!(await sleep(TIMING.BEAR_GLIDE_MS + TIMING.BEAR_PAUSE_MS, myToken))) return;
        if (state.bearPos >= finishIdx) break;
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
    renderPhase(false);
  }

  function triggerEndScreen(winner) {
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

  el.btnSqMinus.addEventListener('click', () => adjustSquares(-1));
  el.btnSqPlus.addEventListener('click', () => adjustSquares(1));

  el.btnClearLetters.addEventListener('click', () => {
    selectedLetters = [];
    renderSetup();
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

  renderSetup();
  window.TavupeliArt.preloadAll().then(() => {
    if (!el.setupScreen.classList.contains('hidden')) {
      renderSetup();
    } else if (state) {
      buildBoardSvg();
      updateBoardTokens(true);
      renderPhase(false);
    }
  });
})();
