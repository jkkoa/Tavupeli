/* Tavupeli — Main Game Engine & UI Controller
 * Cooperative Finnish syllable-counting adventure board game.
 */
(() => {
  'use strict';

  const STORAGE_KEYS = {
    PREFS: 'tavupeli_prefs_v1',
    GAME: 'tavupeli_game_state_v1',
    WORD_BAG: 'tavupeli_word_bag_v1'
  };

  const TIMING = {
    READING_HOLD_MS: 700,
    SYLLABLE_GLIDE_MS: 500,
    SYLLABLE_PAUSE_MS: 420,   // ~920ms total per syllable
    TWIST_HOLD_MS: 1000,
    BEAR_REVEAL_HOLD_MS: 800,
    BEAR_ZERO_HOLD_MS: 2200,
    BEAR_GLIDE_MS: 620,
    BEAR_PAUSE_MS: 480        // ~1100ms total per Bear step
  };

  const SVG_NS = 'http://www.w3.org/2000/svg';

  // ---- Setup State (letters ALWAYS start completely empty!) ----
  const defaultPrefs = {
    playerCount: 4,
    activeStations: window.TAVUPELI_STATIONS.map(s => s.id),
    twistsEnabled: true,
    squareCount: 24,
    mode: 'taputus',      // 'taputus' | 'numerot'
    panelSide: 'right',   // 'left' | 'right'
    audioEnabled: true
  };

  let prefs = loadPrefs();
  let selectedLetters = []; // Strictly never loaded from localStorage

  // ---- Active Game State ----
  let state = null;
  let boardData = null; // { tiles, viewBox, washes, vignettes }
  let isAnimating = false;
  let runToken = 0; // incremented on exit/reset to cancel pending async waits safely

  // ---- DOM References ----
  const el = {
    setupScreen: document.getElementById('setup-screen'),
    gameScreen: document.getElementById('game-screen'),
    setupPlayers: document.getElementById('setup-players'),
    setupStations: document.getElementById('setup-stations'),
    setupTwists: document.getElementById('setup-twists'),
    setupSquares: document.getElementById('setup-squares'),
    setupMode: document.getElementById('setup-mode'),
    setupSide: document.getElementById('setup-side'),
    setupAudio: document.getElementById('setup-audio'),
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

  // ---- Utilities ----
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
      const parsed = JSON.parse(raw);
      return {
        playerCount: Math.max(1, Math.min(7, Number(parsed.playerCount) || 4)),
        activeStations: Array.isArray(parsed.activeStations)
          ? parsed.activeStations.filter(id => window.TAVUPELI_STATIONS.some(s => s.id === id))
          : [...defaultPrefs.activeStations],
        twistsEnabled: typeof parsed.twistsEnabled === 'boolean' ? parsed.twistsEnabled : true,
        squareCount: [18, 24, 30].includes(Number(parsed.squareCount)) ? Number(parsed.squareCount) : 24,
        mode: parsed.mode === 'numerot' ? 'numerot' : 'taputus',
        panelSide: parsed.panelSide === 'left' ? 'left' : 'right',
        audioEnabled: typeof parsed.audioEnabled === 'boolean' ? parsed.audioEnabled : true
      };
    } catch {
      return { ...defaultPrefs };
    }
  }

  function savePrefs() {
    try {
      localStorage.setItem(STORAGE_KEYS.PREFS, JSON.stringify(prefs));
    } catch { /* ignore storage quota errors */ }
  }

  function saveGameState() {
    if (!state) return;
    try {
      localStorage.setItem(STORAGE_KEYS.GAME, JSON.stringify(state));
    } catch { /* ignore */ }
  }

  function clearSavedGame() {
    try {
      localStorage.removeItem(STORAGE_KEYS.GAME);
    } catch { /* ignore */ }
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

  // ---- Persistent Non-Repeating Word Bag ----
  function drawWord() {
    const allIds = window.TAVUPELI_WORDS.map(w => w.id);
    let bag = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.WORD_BAG);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          bag = parsed.filter(id => allIds.includes(id));
        }
      }
    } catch {
      bag = [];
    }

    if (bag.length === 0) {
      bag = shuffle(allIds);
    }
    const wordId = bag.pop();
    try {
      localStorage.setItem(STORAGE_KEYS.WORD_BAG, JSON.stringify(bag));
    } catch { /* ignore */ }

    return window.TAVUPELI_WORDS.find(w => w.id === wordId) || window.TAVUPELI_WORDS[0];
  }

  // ---- Fair Letter Shuffle-Bag ----
  function drawLetters(count) {
    const pool = state.letters;
    if (!pool || pool.length === 0) return [];

    const drawn = [];
    // Ensure distinct letters when drawing 3 for Laava (whenever pool has >= 3 letters)
    for (let i = 0; i < count; i++) {
      if (!state.letterBag || state.letterBag.length === 0) {
        state.letterBag = shuffle(pool);
      }

      // If we still have unused distinct choices in pool, pick one not yet in drawn
      let pickIdx = -1;
      if (pool.length > drawn.length) {
        pickIdx = state.letterBag.findIndex(ch => !drawn.includes(ch));
        if (pickIdx === -1) {
          // Refill bag with letters not yet drawn first, then rest
          const remainingDistinct = shuffle(pool.filter(ch => !drawn.includes(ch)));
          state.letterBag = [...state.letterBag, ...remainingDistinct];
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

  // ---- Finite Shuffled Bear Deck (never pulls three 3s in a row) ----
  function buildFreshBearDeck(recentDraws = []) {
    const base = [1, 1, 2, 2, 2, 3, 3, 0];
    let deck = shuffle(base);
    // Guarantee never three 3s in a row across deck boundaries
    const lastTwoWereThree =
      recentDraws.length >= 2 &&
      recentDraws[recentDraws.length - 1] === 3 &&
      recentDraws[recentDraws.length - 2] === 3;

    if (lastTwoWereThree && deck[deck.length - 1] === 3) {
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

  // ---- Setup Screen Rendering ----
  function renderSetup() {
    // Players 1..7
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

    // Stations (5 solo stations)
    el.setupStations.innerHTML = '';
    window.TAVUPELI_STATIONS.forEach(st => {
      const active = prefs.activeStations.includes(st.id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `station-chip${active ? ' active' : ''}`;
      const iconSpan = document.createElement('span');
      iconSpan.className = 'chip-icon';
      window.TavupeliArt.renderHtml(iconSpan, 'board', st.id, st.name);
      const labelSpan = document.createElement('span');
      labelSpan.textContent = st.name;
      b.appendChild(iconSpan);
      b.appendChild(labelSpan);
      b.addEventListener('click', () => {
        if (active) {
          prefs.activeStations = prefs.activeStations.filter(id => id !== st.id);
        } else {
          prefs.activeStations = [...prefs.activeStations, st.id];
        }
        savePrefs();
        renderSetup();
      });
      el.setupStations.appendChild(b);
    });

    // Twists
    renderSegmented(el.setupTwists, [
      { value: true, label: 'Päällä' },
      { value: false, label: 'Pois' }
    ], prefs.twistsEnabled, v => {
      prefs.twistsEnabled = v;
      savePrefs();
      renderSetup();
    });

    // Squares
    renderSegmented(el.setupSquares, [
      { value: 18, label: '18' },
      { value: 24, label: '24' },
      { value: 30, label: '30' }
    ], prefs.squareCount, v => {
      prefs.squareCount = v;
      savePrefs();
      renderSetup();
    });

    // Mode
    renderSegmented(el.setupMode, [
      { value: 'taputus', label: 'Taputus' },
      { value: 'numerot', label: 'Numerot' }
    ], prefs.mode, v => {
      prefs.mode = v;
      savePrefs();
      renderSetup();
    });

    // Panel side
    renderSegmented(el.setupSide, [
      { value: 'left', label: 'Vasen' },
      { value: 'right', label: 'Oikea' }
    ], prefs.panelSide, v => {
      prefs.panelSide = v;
      savePrefs();
      renderSetup();
    });

    // Audio
    renderSegmented(el.setupAudio, [
      { value: true, label: 'Päällä' },
      { value: false, label: 'Pois' }
    ], prefs.audioEnabled, v => {
      prefs.audioEnabled = v;
      window.TavupeliAudio.setMuted(!v);
      savePrefs();
      renderSetup();
    });

    // Letters (always starts empty on opening Setup)
    el.setupLetters.innerHTML = '';
    window.TAVUPELI_ALPHABET.forEach(ch => {
      const isSelected = selectedLetters.includes(ch);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `letter-btn${isSelected ? ' active' : ''}`;
      b.textContent = ch;
      b.addEventListener('click', () => {
        if (isSelected) {
          selectedLetters = selectedLetters.filter(c => c !== ch);
        } else {
          selectedLetters = [...selectedLetters, ch];
        }
        renderSetup();
      });
      el.setupLetters.appendChild(b);
    });

    el.btnClearLetters.disabled = selectedLetters.length === 0;

    // Aloita peli disabled until >= 1 letter is picked when letter stations are active
    const needsLetters = prefs.activeStations.length > 0;
    el.btnStartGame.disabled = needsLetters && selectedLetters.length === 0;

    // Mid-game recovery button if unfinished game exists in localStorage
    const saved = loadSavedGame();
    el.btnResumeGame.classList.toggle('hidden', !saved);
  }

  function renderSegmented(container, options, currentVal, onSelect) {
    container.innerHTML = '';
    options.forEach(opt => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `seg-btn${currentVal === opt.value ? ' active' : ''}`;
      b.textContent = opt.label;
      b.addEventListener('click', () => onSelect(opt.value));
      container.appendChild(b);
    });
  }

  // ---- Start / Resume Game ----
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
      mode: prefs.mode,
      panelSide: prefs.panelSide,
      activeStations: [...prefs.activeStations],
      twistsEnabled: prefs.twistsEnabled,
      letters: [...selectedLetters],
      letterBag: shuffle(selectedLetters),
      featureMap,
      players,
      bearPos: 0,
      bearDeck: buildFreshBearDeck([]),
      bearHistory: [],
      turnIndex: 0,
      phase: 'player-draw', // 'player-draw' | 'player-count' | 'player-station' | 'bear-ready' | 'ended'
      currentWord: null,
      countInput: 0,
      currentStation: null, // { id, name, letters: [...] }
      castleLit: false,
      winner: null
    };

    boardData = layout;
    window.TavupeliAudio.setMuted(!prefs.audioEnabled);
    saveGameState();
    enterGameScreen();
  }

  function resumeSavedGame() {
    const saved = loadSavedGame();
    if (!saved) return;
    runToken++;
    isAnimating = false;

    state = saved;
    // Recover cleanly into a safe interactive phase if reloaded mid-animation
    if (!['player-draw', 'player-count', 'player-station', 'bear-ready'].includes(state.phase)) {
      state.phase = 'player-draw';
      state.currentWord = null;
      state.countInput = 0;
    }

    boardData = window.TavupeliBoard.generateTiles(state.squareCount);
    boardData.tiles.forEach(t => {
      t.feature = (state.featureMap && state.featureMap[t.index]) || null;
    });

    window.TavupeliAudio.setMuted(!prefs.audioEnabled);
    enterGameScreen();
  }

  function enterGameScreen() {
    el.setupScreen.classList.add('hidden');
    el.endScreen.classList.add('hidden');
    el.exitModal.classList.add('hidden');
    el.gameScreen.classList.remove('hidden');
    el.gameScreen.classList.toggle('layout-left', state.panelSide === 'left');
    el.gameScreen.classList.toggle('layout-right', state.panelSide !== 'left');

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
    selectedLetters = []; // Strictly start empty every time Setup opens!
    el.endScreen.classList.add('hidden');
    el.exitModal.classList.add('hidden');
    el.gameScreen.classList.add('hidden');
    el.setupScreen.classList.remove('hidden');
    renderSetup();
  }

  // ---- Board SVG Rendering (100% still idle board) ----
  function buildBoardSvg() {
    const { tiles, viewBox, washes, vignettes } = boardData;
    el.boardSvg.setAttribute('viewBox', viewBox.join(' '));

    let html = '';

    // 1. Ultra-low-contrast flat landscape washes in open pockets
    html += '<g class="layer-washes">';
    washes.forEach(w => {
      html += `<ellipse cx="${w.cx}" cy="${w.cy}" rx="${w.rx}" ry="${w.ry}" fill="${w.color}" transform="rotate(${w.rot} ${w.cx} ${w.cy})" />`;
    });
    html += '</g>';

    // 2. Story vignettes (Banaanilaiva, Lohikäärme, Aarrearkku, big Linna)
    html += '<g class="layer-vignettes">';
    const v = vignettes;
    html += window.TavupeliArt.buildBoardSvgNode('banaanilaiva', v.banaanilaiva.x, v.banaanilaiva.y, v.banaanilaiva.w, v.banaanilaiva.h);
    html += window.TavupeliArt.buildBoardSvgNode('aarrearkku', v.aarrearkku.x, v.aarrearkku.y, v.aarrearkku.w, v.aarrearkku.h);
    html += window.TavupeliArt.buildBoardSvgNode('lohikaarme', v.lohikaarme.x, v.lohikaarme.y, v.lohikaarme.w, v.lohikaarme.h);
    html += `<g id="castle-anchor">${renderCastleMarkup()}</g>`;
    html += '</g>';

    // 3. Uniform pure-white squares with thin neutral borders (NO text, NO numbers)
    html += '<g class="layer-tiles">';
    tiles.forEach(t => {
      html += `<rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" rx="9" fill="#FFFFFF" stroke="#D5D0C6" stroke-width="1.8" />`;
    });
    html += '</g>';

    // 4. Perched station & twist icons resting on the top rim (leaving square interiors open!)
    html += '<g class="layer-icons">';
    tiles.forEach(t => {
      if (!t.feature) return;
      const iconSize = 42;
      const ix = t.x + (t.w - iconSize) / 2;
      const iy = t.y - 30; // perches neatly on top rim without crowding interior
      html += window.TavupeliArt.buildBoardSvgNode(t.feature.id, ix, iy, iconSize, iconSize);
    });
    html += '</g>';

    // 5. Tokens layer (Bear + up to 7 fixed-size high-contrast circular discs)
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
    if (anchor) {
      anchor.innerHTML = renderCastleMarkup();
    }
  }

  function updateBoardTokens(instant = false) {
    const tiles = boardData.tiles;
    const byTile = new Map();

    state.players.forEach(p => {
      if (!byTile.has(p.pos)) byTile.set(p.pos, { players: [], bear: false });
      byTile.get(p.pos).players.push(p.id);
    });
    if (!byTile.has(state.bearPos)) byTile.set(state.bearPos, { players: [], bear: false });
    byTile.get(state.bearPos).bear = true;

    byTile.forEach((group, tileIdx) => {
      const tile = tiles[tileIdx];
      if (!tile) return;
      const packed = window.TavupeliBoard.computeTokenPositions(tile, group.players, group.bear);

      if (packed.bear) {
        const bearEl = document.getElementById('token-bear');
        if (bearEl) {
          if (instant) bearEl.classList.add('no-transition');
          bearEl.style.transform = `translate(${packed.bear.x}px, ${packed.bear.y}px)`;
          if (instant) {
            bearEl.getBoundingClientRect();
            bearEl.classList.remove('no-transition');
          }
        }
      }

      group.players.forEach(pId => {
        const pos = packed.players[pId];
        const pEl = document.getElementById(`token-p-${pId}`);
        const pObj = state.players[pId];
        if (pEl && pos) {
          pEl.classList.toggle('paused-token', pObj.paused);
          if (instant) pEl.classList.add('no-transition');
          pEl.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
          if (instant) {
            pEl.getBoundingClientRect();
            pEl.classList.remove('no-transition');
          }
        }
      });
    });
  }

  // ---- Top Quiet Bar (Player dots + Mute & Exit) ----
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

    // Mute icon
    const muted = window.TavupeliAudio.isMuted();
    el.btnMute.innerHTML = muted
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>`;

    // Exit / menu icon
    el.btnExit.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  }

  function togglePlayerPause(idx) {
    if (!state || isAnimating) return;
    const p = state.players[idx];
    if (p.finished) return;

    // Prevent pausing the last remaining active unfinished player
    const activeUnfinished = state.players.filter(pl => !pl.paused && !pl.finished);
    if (!p.paused && activeUnfinished.length <= 1) return;

    p.paused = !p.paused;
    updateBoardTokens(true);

    // If the currently active player was just paused while waiting to draw, advance cleanly
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

  // ---- Phase Renderer ----
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
      renderCountControls();
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

    const textSlot = document.createElement('div');
    textSlot.className = 'word-text-slot';
    textSlot.id = 'word-text-slot';

    if (revealed) {
      textSlot.appendChild(buildSyllableTextElement(word));
    }

    card.appendChild(artBox);
    card.appendChild(textSlot);
    el.cardStage.appendChild(card);
  }

  function buildSyllableTextElement(word) {
    const fullStr = word.syllables.join('-');
    const div = document.createElement('div');
    div.className = `word-text${fullStr.length >= 13 ? ' long-word' : ''}`;
    word.syllables.forEach((syl, idx) => {
      if (idx > 0) {
        const hy = document.createElement('span');
        hy.className = 'syl-hyphen';
        hy.textContent = '-';
        div.appendChild(hy);
      }
      const sp = document.createElement('span');
      sp.className = 'syl-span';
      sp.dataset.sylIndex = String(idx);
      sp.textContent = syl;
      div.appendChild(sp);
    });
    return div;
  }

  // ---- Taputus / Numerot Controls ----
  function renderCountControls() {
    el.controlDock.innerHTML = '';

    if (state.mode === 'taputus') {
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
          // Tapping any lit dot steps back to that count
          if (i <= state.countInput) {
            state.countInput = i;
            window.TavupeliAudio.playSyllable(i - 1);
            renderCountControls();
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
        // Tapping past 6 gently resets to 0
        if (state.countInput >= 6) {
          state.countInput = 0;
        } else {
          state.countInput += 1;
          window.TavupeliAudio.playSyllable(state.countInput - 1);
        }
        renderCountControls();
      });
      el.controlDock.appendChild(pad);
    } else {
      // Numerot mode (1–5)
      const row = document.createElement('div');
      row.className = 'numerot-row';
      for (let n = 1; n <= 5; n++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `num-btn${state.countInput === n ? ' active' : ''}`;
        b.textContent = String(n);
        b.addEventListener('click', () => {
          if (isAnimating) return;
          state.countInput = n;
          window.TavupeliAudio.playSyllable(n - 1);
          renderCountControls();
        });
        row.appendChild(b);
      }
      el.controlDock.appendChild(row);
    }

    const valmis = document.createElement('button');
    valmis.type = 'button';
    valmis.className = 'btn-valmis';
    valmis.textContent = 'Valmis';
    valmis.disabled = state.countInput < 1;
    valmis.addEventListener('click', onConfirmSyllables);
    el.controlDock.appendChild(valmis);
  }

  // ---- Reveal -> Reading Hold -> Synchronized Step-by-Step Glide ----
  async function onConfirmSyllables() {
    if (isAnimating || state.phase !== 'player-count' || state.countInput < 1) return;
    isAnimating = true;
    const myToken = runToken;

    const word = state.currentWord;
    const p = getActivePlayer();
    const finishIdx = boardData.tiles.length - 1;

    // Clear bottom controls cleanly so focus stays on the revealed word
    el.controlDock.innerHTML = '';

    // Reveal intact Finnish word with tavuviiva
    const textSlot = document.getElementById('word-text-slot');
    if (textSlot) {
      textSlot.innerHTML = '';
      textSlot.appendChild(buildSyllableTextElement(word));
    }

    // Short reading hold (~700 ms)
    if (!(await sleep(TIMING.READING_HOLD_MS, myToken))) return;

    // Step-by-step glide across board (~920 ms per syllable) in sync with syllable highlight
    for (let i = 0; i < word.syllables.length; i++) {
      const sylEl = el.cardStage.querySelector(`.syl-span[data-syl-index="${i}"]`);
      if (sylEl) sylEl.classList.add('lit');

      window.TavupeliAudio.playSyllable(i);

      if (p.pos < finishIdx) {
        p.pos += 1;
        updateBoardTokens(false);
        if (p.pos === finishIdx) {
          onPlayerReachedFinish(p);
        }
      }

      if (!(await sleep(TIMING.SYLLABLE_GLIDE_MS + TIMING.SYLLABLE_PAUSE_MS, myToken))) return;

      if (p.finished) {
        // Light remaining syllables quietly or stop cleanly once inside Linna
        break;
      }
    }

    saveGameState();

    // Check cooperative victory
    if (checkAllActivePlayersFinished()) {
      triggerEndScreen('players');
      return;
    }

    // Check landing tile feature (Twist or Station) if player has not finished
    if (!p.finished) {
      const landedTile = boardData.tiles[p.pos];
      if (landedTile && landedTile.feature) {
        if (landedTile.feature.type === 'twist') {
          await resolveTwist(landedTile.feature.id, myToken);
          return;
        }
        if (landedTile.feature.type === 'station') {
          openStation(landedTile.feature.id);
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

  // ---- Twist Resolution (-2 or +2) ----
  async function resolveTwist(twistId, myToken) {
    const twist = window.TAVUPELI_TWISTS.find(t => t.id === twistId);
    if (!twist) {
      isAnimating = false;
      advanceTurnAfterPlayer();
      return;
    }

    const p = getActivePlayer();
    const finishIdx = boardData.tiles.length - 1;

    // Render Twist Card: ONLY icon + name + −2/+2
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

    // Hold ~1.0 s before gliding
    if (!(await sleep(TIMING.TWIST_HOLD_MS, myToken))) return;

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

    // If twist landed on a station, open it cleanly (never chain twists)
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

  // ---- Station Activity Card ----
  function openStation(stationId) {
    const st = window.TAVUPELI_STATIONS.find(s => s.id === stationId);
    if (!st) {
      isAnimating = false;
      advanceTurnAfterPlayer();
      return;
    }

    const letters = drawLetters(st.letters);
    state.currentStation = {
      id: st.id,
      name: st.name,
      letters
    };
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

  // ---- Turn Advancement & Manual Bear Turn ----
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
      // End of round -> stop on face-down Bear card so someone taps it once group watches
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
        <circle cx="24" cy="18" r="14" fill="#2B2E33" stroke="#17191D" stroke-width="5" />
        <circle cx="88" cy="18" r="14" fill="#2B2E33" stroke="#17191D" stroke-width="5" />
        <circle cx="24" cy="18" r="6" fill="#3D4249" />
        <circle cx="88" cy="18" r="6" fill="#3D4249" />
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
    btn.innerHTML = buildBearEarsSvg();
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

    // Reveal Bear card (ONLY numeral + peeking ears on 1–3, or 0 + banana distraction art)
    el.cardStage.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'bear-card-wrap card-enter';

    const face = document.createElement('div');
    face.className = 'bear-card-face';

    if (steps === 0) {
      const zeroNum = document.createElement('div');
      zeroNum.className = 'bear-zero-numeral';
      zeroNum.textContent = '0';
      const zeroArt = document.createElement('div');
      zeroArt.className = 'bear-zero-art';
      window.TavupeliArt.renderHtml(zeroArt, 'board', 'karhu-0', '');
      face.appendChild(zeroArt);
      face.appendChild(zeroNum);
    } else {
      face.innerHTML = `${buildBearEarsSvg()}<div class="bear-numeral">${steps}</div>`;
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

    // Bear reaches Linna before all players -> Bear wins
    if (state.bearPos >= finishIdx && !checkAllActivePlayersFinished()) {
      triggerEndScreen('bear');
      return;
    }

    // Start next round with first active unfinished player
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

  // ---- End Screen (One illustration, one short line, Uusi peli) ----
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

  // ---- 2-Step Protected Exit Modal ----
  function openExitModal() {
    el.exitStep1.classList.remove('hidden');
    el.exitStep2.classList.add('hidden');
    el.exitModal.classList.remove('hidden');
  }

  function closeExitModal() {
    el.exitModal.classList.add('hidden');
  }

  // ---- Event Bindings ----
  el.btnClearLetters.addEventListener('click', () => {
    selectedLetters = [];
    renderSetup();
  });

  el.btnStartGame.addEventListener('click', startNewGame);
  el.btnResumeGame.addEventListener('click', resumeSavedGame);

  el.btnMute.addEventListener('click', () => {
    const nextMuted = !window.TavupeliAudio.isMuted();
    window.TavupeliAudio.setMuted(nextMuted);
    prefs.audioEnabled = !nextMuted;
    savePrefs();
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

  // ---- Service Worker Registration (Offline PWA) ----
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  // ---- Boot ----
  window.TavupeliAudio.setMuted(!prefs.audioEnabled);
  // Render Setup immediately with fallback SVGs, then refresh chips silently if external art exists
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
