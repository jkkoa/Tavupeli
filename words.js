/* Tavupeli — 20-Word Calibration Deck
 * Expand to 40–60 words by adding entries below and dropping matching
 * 1024x1024 .webp (or .png) files into img/words/<id>.webp
 */
window.TAVUPELI_WORDS = [
  // 1 tavu (3)
  { id: 'kuu', syllables: ['KUU'] },
  { id: 'luu', syllables: ['LUU'] },
  { id: 'puu', syllables: ['PUU'] },

  // 2 tavua (5)
  { id: 'kissa', syllables: ['KIS', 'SA'] },
  { id: 'koira', syllables: ['KOI', 'RA'] },
  { id: 'pilvi', syllables: ['PIL', 'VI'] },
  { id: 'sukka', syllables: ['SUK', 'KA'] },
  { id: 'vene', syllables: ['VE', 'NE'] },

  // 3 tavua (5)
  { id: 'banaani', syllables: ['BA', 'NAA', 'NI'] },
  { id: 'kirahvi', syllables: ['KI', 'RAH', 'VI'] },
  { id: 'kitara', syllables: ['KI', 'TA', 'RA'] },
  { id: 'omena', syllables: ['O', 'ME', 'NA'] },
  { id: 'perhonen', syllables: ['PER', 'HO', 'NEN'] },

  // 4 tavua (4)
  { id: 'krokotiili', syllables: ['KRO', 'KO', 'TII', 'LI'] },
  { id: 'lumiukko', syllables: ['LU', 'MI', 'UK', 'KO'] },
  { id: 'paloauto', syllables: ['PA', 'LO', 'AU', 'TO'] },
  { id: 'sateenvarjo', syllables: ['SA', 'TEEN', 'VAR', 'JO'] },

  // 5 tavua (3)
  { id: 'helikopteri', syllables: ['HE', 'LI', 'KOP', 'TE', 'RI'] },
  { id: 'jaateloauto', syllables: ['JÄÄ', 'TE', 'LÖ', 'AU', 'TO'] },
  { id: 'liikennevalot', syllables: ['LII', 'KEN', 'NE', 'VA', 'LOT'] }
];

window.TAVUPELI_STATIONS = [
  { id: 'taikavuori', name: 'Taikavuori', letters: 1, desc: 'Kiipeä vuorelle ja tee kirjaintaika.' },
  { id: 'laava',      name: 'Laava',      letters: 3, desc: 'Hypi kiviä pitkin laavavirran yli.' },
  { id: 'katapultti', name: 'Katapultti', letters: 1, desc: 'Laukaise banaani dinosauruksen suuhun.' },
  { id: 'merirosvo',  name: 'Merirosvo',  letters: 1, desc: 'Auta merirosvoa etsimään aarre.' },
  { id: 'taikapata',  name: 'Taikapata',  letters: 1, desc: 'Lisää ainesosa noidan kattilaan.' }
];

window.TAVUPELI_TWISTS = [
  { id: 'banaaninkuori', name: 'Banaaninkuori', delta: -2, label: '−2' },
  { id: 'taikaportti',   name: 'Taikaportti',   delta:  2, label: '+2' }
];

window.TAVUPELI_PLAYER_COLORS = [
  '#D94B43', // 1: Coral Red
  '#2E6FB8', // 2: Cobalt Blue
  '#388E5A', // 3: Meadow Green
  '#D8931E', // 4: Marigold Amber
  '#7D4EA6', // 5: Plum Purple
  '#1F8A8C', // 6: Teal
  '#C44B7D'  // 7: Berry Rose
];

window.TAVUPELI_ALPHABET = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
  'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
  'U', 'V', 'W', 'X', 'Y', 'Z', 'Å', 'Ä', 'Ö'
];
