export const LEVELS = [
  { title: '清晨果园', rows: 6, cols: 8, kinds: 8, seconds: 180 },
  { title: '午后微风', rows: 7, cols: 8, kinds: 10, seconds: 170 },
  { title: '落日野餐', rows: 8, cols: 8, kinds: 12, seconds: 160 },
];

const shuffled = (items, random) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
const point = (board, index) => ({ r: Math.floor(index / board.cols), c: index % board.cols });
const same = (a, b) => a.r === b.r && a.c === b.c;

// The one-cell empty border is part of the playfield: paths may wrap around it.
export function findPath(board, first, second) {
  if (first === second || first < 0 || second < 0 || first >= board.cells.length || second >= board.cells.length ||
      board.cells[first] == null || board.cells[first] !== board.cells[second]) return null;
  const a = point(board, first), b = point(board, second);
  function clear(from, to) {
    if (from.r !== to.r && from.c !== to.c) return false;
    const dr = Math.sign(to.r - from.r), dc = Math.sign(to.c - from.c);
    let r = from.r, c = from.c;
    while (true) {
      if (!(r === a.r && c === a.c) && !(r === b.r && c === b.c) &&
          r >= 0 && c >= 0 && r < board.rows && c < board.cols && board.cells[r * board.cols + c] != null) return false;
      if (r === to.r && c === to.c) return true;
      r += dr; c += dc;
    }
  }
  const candidates = [[a, b], [a, { r: a.r, c: b.c }, b], [a, { r: b.r, c: a.c }, b]];
  for (let c = -1; c <= board.cols; c++) candidates.push([a, { r: a.r, c }, { r: b.r, c }, b]);
  for (let r = -1; r <= board.rows; r++) candidates.push([a, { r, c: a.c }, { r, c: b.c }, b]);
  const paths = candidates.map(points => points.filter((p, i) => !i || !same(p, points[i - 1])))
    .filter(points => points.slice(1).every((p, i) => clear(points[i], p)))
    .map(points => points.filter((p, i) => !i || i === points.length - 1 ||
      !((points[i - 1].r === p.r && p.r === points[i + 1].r) || (points[i - 1].c === p.c && p.c === points[i + 1].c))));
  const length = path => path.slice(1).reduce((sum, p, i) => sum + Math.abs(p.r - path[i].r) + Math.abs(p.c - path[i].c), 0);
  paths.sort((x, y) => x.length - y.length || length(x) - length(y));
  return paths[0] || null;
}

export function findMatch(board) {
  for (let a = 0; a < board.cells.length; a++) {
    if (board.cells[a] == null) continue;
    for (let b = a + 1; b < board.cells.length; b++) {
      if (board.cells[a] !== board.cells[b]) continue;
      const path = findPath(board, a, b);
      if (path) return { first: a, second: b, path };
    }
  }
  return null;
}

function solves(board) {
  const copy = { ...board, cells: [...board.cells] };
  while (copy.cells.some(value => value != null)) {
    const pair = findMatch(copy);
    if (!pair) return false;
    copy.cells[pair.first] = copy.cells[pair.second] = null;
  }
  return true;
}

export function shuffleBoard(board, random = Math.random) {
  const positions = board.cells.flatMap((value, i) => value == null ? [] : [i]);
  const values = positions.map(i => board.cells[i]);
  if (!values.length) return { ...board, cells: [...board.cells] };
  for (let attempt = 0; attempt < 12; attempt++) {
    const cells = [...board.cells], mixed = shuffled(values, random);
    positions.forEach((index, i) => { cells[index] = mixed[i]; });
    const result = { ...board, cells };
    if (solves(result)) return result;
  }
  // Guaranteed fallback: peel a geometric pair, assign identical fruit, repeat.
  // Following this removal order clears the board, regardless of its holes.
  const mask = { ...board, cells: board.cells.map(value => value == null ? null : 0) };
  const cells = board.cells.map(() => null);
  const pairs = shuffled([...values].sort((a, b) => a - b).filter((_, i) => i % 2 === 0), random);
  for (const value of pairs) {
    const pair = findMatch(mask);
    if (!pair) throw new Error('Unpaired board');
    cells[pair.first] = cells[pair.second] = value;
    mask.cells[pair.first] = mask.cells[pair.second] = null;
  }
  return { ...board, cells };
}

export function createBoard(level = 0, random = Math.random) {
  const { rows, cols, kinds } = LEVELS[level];
  const cells = Array.from({ length: rows * cols }, (_, i) => Math.floor(i / 2) % kinds);
  return shuffleBoard({ rows, cols, cells }, random);
}

export function createRound(mode = 'classic', random = Math.random) {
  if (!['classic', 'zen'].includes(mode)) throw new Error('Unknown mode');
  const state = {
    mode, level: 0, board: createBoard(0, random), status: 'ready', score: 0,
    seconds: LEVELS[0].seconds, elapsed: 0, combo: 0, bestCombo: 0,
    sinceMatch: Infinity, matched: 0, hints: 3, shuffles: 3,
  };
  return {
    state,
    start() { if (state.status === 'ready') state.status = 'playing'; },
    pause() { if (state.status === 'playing') state.status = 'paused'; },
    resume() { if (state.status === 'paused') state.status = 'playing'; },
    tick(dt) {
      if (state.status !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
      const spent = mode === 'classic' ? Math.min(dt, state.seconds) : dt;
      state.elapsed += spent; state.sinceMatch += spent;
      if (state.sinceMatch > 5) state.combo = 0;
      if (mode === 'classic') {
        state.seconds = Math.max(0, state.seconds - spent);
        if (!state.seconds) state.status = 'lost';
      }
    },
    match(first, second) {
      if (state.status !== 'playing') return null;
      const path = findPath(state.board, first, second);
      if (!path) return null;
      state.board.cells[first] = state.board.cells[second] = null;
      state.combo = state.sinceMatch <= 5 ? state.combo + 1 : 1;
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      state.sinceMatch = 0; state.matched++;
      const points = 100 + Math.min(state.combo - 1, 5) * 20;
      state.score += points;
      if (!state.board.cells.some(value => value != null)) {
        state.score += mode === 'classic' ? Math.ceil(state.seconds) * 10 : 0;
        state.status = state.level === LEVELS.length - 1 ? 'won' : 'between';
      }
      return { path, points };
    },
    hint() {
      if (state.status !== 'playing' || !state.hints) return null;
      const pair = findMatch(state.board);
      if (pair) state.hints--;
      return pair;
    },
    shuffle(automatic = false) {
      if (state.status !== 'playing' || (!automatic && !state.shuffles)) return false;
      state.board = shuffleBoard(state.board, random);
      if (!automatic) state.shuffles--;
      state.combo = 0; state.sinceMatch = Infinity;
      return true;
    },
    next() {
      if (state.status !== 'between') return false;
      state.level++; state.board = createBoard(state.level, random);
      state.seconds = LEVELS[state.level].seconds; state.hints = state.shuffles = 3;
      state.combo = 0; state.sinceMatch = Infinity; state.status = 'playing';
      return true;
    },
  };
}
