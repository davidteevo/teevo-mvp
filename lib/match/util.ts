/** Avoid [...set] / for-of on Map iterators under the project's default TS target. */
export function sortedSetValues<T>(set: Set<T>): T[] {
  return Array.from(set.values()).sort() as T[];
}

export function firstMapValue<K, V>(map: Map<K, V>): V | undefined {
  const values = Array.from(map.values());
  return values[0];
}

export function deepFreezeRecord<T extends Record<string, unknown>>(
  record: T
): Readonly<T> {
  return Object.freeze({ ...record });
}
