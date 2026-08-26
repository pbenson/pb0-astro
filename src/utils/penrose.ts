/**
 * A Penrose P3 (rhombus) tiling grown from an L-system.
 *
 * Ported from the Processing sketch at
 * ~/github/cadhub/Processing3/penroseP3LSystem, which uses the rule set from
 * Prusinkiewicz and Lindenmayer, "The Algorithmic Beauty of Plants" (1990).
 *
 * Two things are done differently from the sketch, both deliberate:
 *
 * 1. Only F draws. The sketch also draws on M, N, O and P, which splits every
 *    rhombus edge into two collinear halves — and then spends a post-processing
 *    pass finding those halves and merging them back. That pass keeps only the
 *    edges it managed to pair, so anything unpaired is silently dropped. Not
 *    drawing on the tile symbols in the first place removes the doubling, the
 *    merge and the dropped edges together.
 *
 * 2. Vertices are exact integers, not floats. The sketch compares positions
 *    with an epsilon while hashing them through Math.round, so two vertices the
 *    epsilon calls equal can land in different buckets and the de-duplication
 *    quietly fails — a problem its own comment flags and does not solve. Every
 *    turtle position here is a sum of unit steps at multiples of 36 degrees, so
 *    it is an exact element of Z[zeta_10] and can be compared for equality
 *    rather than nearness. See {@link Position}.
 */

/** The four tile symbols, and the productions that inflate them. */
export const RULES: Readonly<Record<string, string>> = {
  M: 'OF++PF----NF[-OF----MF]++',
  N: '+OF--PF[---MF--NF]+',
  O: '-MF++NF[+++OF++PF]-',
  P: '--OF++++MF[+PF++++NF]--NF',
};

/** Five copies of N at 72 degrees — where the five-fold symmetry comes from. */
export const AXIOM = '[N]++[N]++[N]++[N]++[N]';

/** Deepest inflation the page offers. Beyond this the tile count stops being
 *  drawable as SVG: level 6 is already 3,470 rhombi. */
export const MAX_LEVEL = 6;

/**
 * A turtle position, exactly.
 *
 * The ten step directions are the tenth roots of unity, and Z[zeta_10] has rank
 * four over Z — the tenth cyclotomic polynomial gives the single relation
 *
 *     e4 - e3 + e2 - e1 + e0 = 0
 *
 * so a position is stored as integer coefficients of e0..e3 with e4 rewritten
 * through that relation. Equality is then integer equality, with no tolerance
 * anywhere.
 */
export type Position = readonly [number, number, number, number];

export const ORIGIN: Position = [0, 0, 0, 0];

const TURN = Math.PI / 5;

/** Unit vectors for e0..e3, used only to place the exact lattice on screen. */
const BASIS = [0, 1, 2, 3].map((i) => ({
  x: Math.cos(TURN * i),
  y: Math.sin(TURN * i),
}));

/** One unit step in direction `d` (0-9, counted in 36 degree turns). */
export function step(position: Position, d: number): Position {
  const next: [number, number, number, number] = [...position];
  const direction = ((d % 10) + 10) % 10;
  const sign = direction < 5 ? 1 : -1;
  const index = direction % 5;
  if (index < 4) {
    next[index] += sign;
  } else {
    // e4 = e3 - e2 + e1 - e0
    next[3] += sign;
    next[2] -= sign;
    next[1] += sign;
    next[0] -= sign;
  }
  return next;
}

/**
 * Rotate a position by 72 degrees about the origin, exactly.
 *
 * Rotation by two steps sends e_k to e_{k+2}; feeding the results above e3 back
 * through e4 = e3 - e2 + e1 - e0 and e5 = -e0 gives the map below. Applying it
 * five times is the identity, which is the five-fold symmetry of the tiling
 * expressed as integer arithmetic rather than as a picture.
 */
export function rotate72(position: Position): Position {
  const [c0, c1, c2, c3] = position;
  // `| 0` only to fold negative zero back to zero: negating a zero coefficient
  // yields -0, which compares unequal to 0 under Object.is and so would make
  // two identical vertices look different.
  return [-(c2 + c3) | 0, c2 | 0, (c0 - c2) | 0, (c1 + c2) | 0];
}

/** The plane point a position stands for. */
export function toPlane(position: Position): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (let i = 0; i < 4; ++i) {
    x += position[i] * BASIS[i].x;
    y += position[i] * BASIS[i].y;
  }
  return { x, y };
}

const keyOf = (position: Position): string => position.join(',');

export interface Edge {
  readonly a: string;
  readonly b: string;
}

export interface Skeleton {
  /** Every distinct vertex, by key. */
  readonly vertices: Map<string, Position>;
  readonly edges: readonly Edge[];
}

/**
 * Walk the L-system and collect its edges.
 *
 * Recursive descent rather than string rewriting: `expand` applied `level + 1`
 * times to the axiom produces a string of roughly 900,000 characters at the
 * deepest level offered, and none of it needs to exist at once. An F survives
 * expansion only if it was introduced by the very last application — F rewrites
 * to nothing — which is why `depth === 1` is the only case that draws.
 */
export function skeleton(level: number): Skeleton {
  const vertices = new Map<string, Position>();
  const edges: Edge[] = [];
  const seen = new Set<string>();

  let position: Position = ORIGIN;
  let direction = 0;
  const stack: { position: Position; direction: number }[] = [];

  const remember = (p: Position) => {
    const key = keyOf(p);
    if (!vertices.has(key)) vertices.set(key, p);
    return key;
  };
  remember(position);

  const forward = () => {
    const next = step(position, direction);
    const a = remember(position);
    const b = remember(next);
    const edgeKey = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (!seen.has(edgeKey)) {
      seen.add(edgeKey);
      edges.push({ a, b });
    }
    position = next;
  };

  const run = (production: string, depth: number) => {
    for (const c of production) {
      if (c === '+') direction = (direction + 9) % 10;
      else if (c === '-') direction = (direction + 1) % 10;
      else if (c === '[') stack.push({ position, direction });
      else if (c === ']') {
        const saved = stack.pop();
        if (saved) {
          position = saved.position;
          direction = saved.direction;
        }
      } else if (c === 'F') {
        // An F rewrites to nothing, so it only survives if no expansion is
        // left to apply to it — which is exactly the base of the recursion.
        if (depth === 0) forward();
      } else if (RULES[c] && depth > 0) {
        run(RULES[c], depth - 1);
      }
    }
  };

  run(AXIOM, level + 1);
  return { vertices, edges };
}

export type RhombusKind = 'thin' | 'thick';

export interface Rhombus {
  /** Corners in order, in plane coordinates. */
  readonly points: readonly { x: number; y: number }[];
  readonly kind: RhombusKind;
}

export interface Tiling {
  readonly rhombi: readonly Rhombus[];
  readonly thin: number;
  readonly thick: number;
  readonly vertexCount: number;
  readonly edgeCount: number;
  /** Bounding box of the whole figure, for fitting it to a viewport. */
  readonly bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

/**
 * Turn the edge skeleton into filled tiles.
 *
 * Standard planar face traversal: sort the edges around each vertex by angle,
 * then repeatedly follow a directed edge into the next one clockwise around its
 * far endpoint. Every bounded face of this tiling is a rhombus; the one face
 * that comes back with more than four sides is the outer boundary, and is
 * dropped.
 *
 * A thin rhombus (36 degrees) and a thick one (72) are told apart by their
 * shorter diagonal, which is the only thing that differs once every side is a
 * unit step.
 */
export function tiling(level: number): Tiling {
  const { vertices, edges } = skeleton(level);

  const plane = new Map<string, { x: number; y: number }>();
  for (const [key, position] of vertices) plane.set(key, toPlane(position));

  const neighbours = new Map<string, string[]>();
  const push = (from: string, to: string) => {
    const list = neighbours.get(from);
    if (list) list.push(to);
    else neighbours.set(from, [to]);
  };
  for (const { a, b } of edges) {
    push(a, b);
    push(b, a);
  }
  for (const [vertex, list] of neighbours) {
    const origin = plane.get(vertex)!;
    list.sort((m, n) => {
      const p = plane.get(m)!;
      const q = plane.get(n)!;
      return Math.atan2(p.y - origin.y, p.x - origin.x)
        - Math.atan2(q.y - origin.y, q.x - origin.x);
    });
  }

  const walked = new Set<string>();
  const rhombi: Rhombus[] = [];
  let thin = 0;
  let thick = 0;

  for (const { a, b } of edges) {
    for (const [startFrom, startTo] of [[a, b], [b, a]] as const) {
      if (walked.has(`${startFrom}>${startTo}`)) continue;
      const face: string[] = [];
      let from = startFrom;
      let to = startTo;
      // The whole graph is finite; the bound only stops a malformed walk from
      // spinning, and is above the longest outer boundary at MAX_LEVEL.
      for (let guard = 0; guard < 20000; ++guard) {
        walked.add(`${from}>${to}`);
        face.push(from);
        const list = neighbours.get(to)!;
        const next = list[(list.indexOf(from) + 1) % list.length];
        from = to;
        to = next;
        if (from === startFrom && to === startTo) break;
      }
      if (face.length !== 4) continue; // the outer boundary

      const points = face.map((v) => plane.get(v)!);
      const d1 = Math.hypot(points[0].x - points[2].x, points[0].y - points[2].y);
      const d2 = Math.hypot(points[1].x - points[3].x, points[1].y - points[3].y);
      // The thin rhombus's short diagonal is 2*sin(18 deg) = 0.618; the thick
      // one's is 2*sin(36 deg) = 1.176. Anything below one is thin.
      const kind: RhombusKind = Math.min(d1, d2) < 1 ? 'thin' : 'thick';
      if (kind === 'thin') ++thin;
      else ++thick;
      rhombi.push({ points, kind });
    }
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of plane.values()) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return {
    rhombi,
    thin,
    thick,
    vertexCount: vertices.size,
    edgeCount: edges.length,
    bounds: { minX, minY, maxX, maxY },
  };
}

/** The golden ratio, which thick/thin approaches as the level rises. */
export const PHI = (1 + Math.sqrt(5)) / 2;
