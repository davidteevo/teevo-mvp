export type Interval = [number, number];

const SPEED: Array<{
  lim: number;
  flex: Interval;
  weight: Interval;
  loft: Interval;
}> = [
  { lim: 80, flex: [0, 2], weight: [40, 55], loft: [10.5, 12.5] },
  { lim: 90, flex: [1, 2.5], weight: [45, 60], loft: [10, 12] },
  { lim: 100, flex: [2, 3], weight: [50, 65], loft: [9, 11.5] },
  { lim: 110, flex: [2.5, 4], weight: [55, 70], loft: [8.5, 10.5] },
  { lim: Infinity, flex: [3, 5], weight: [60, 75], loft: [8, 10.5] },
];

const CARRY: Array<{ lim: number; flex: Interval }> = [
  { lim: 180, flex: [0, 2] },
  { lim: 200, flex: [2, 2] },
  { lim: 220, flex: [2, 2] },
  { lim: 260, flex: [2, 3] },
  { lim: 280, flex: [3, 3] },
  { lim: Infinity, flex: [3, 4] },
];

export function speedRegion(speed: number): {
  flex: Interval;
  weight: Interval;
  loft: Interval;
} {
  for (const row of SPEED) {
    if (speed < row.lim) {
      return { flex: row.flex, weight: row.weight, loft: row.loft };
    }
  }
  return SPEED[SPEED.length - 1];
}

export function carryRegion(carry: number): {
  flex: Interval;
  weight: null;
  loft: null;
} {
  for (const row of CARRY) {
    if (carry < row.lim) {
      return { flex: row.flex, weight: null, loft: null };
    }
  }
  return { flex: CARRY[CARRY.length - 1].flex, weight: null, loft: null };
}
