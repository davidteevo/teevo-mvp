export function parseNumber(raw: unknown): {
  value: number | null;
  diagnostic: boolean;
} {
  if (raw === "" || raw == null) {
    return { value: null, diagnostic: false };
  }
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return { value: null, diagnostic: true };
    return { value: raw, diagnostic: false };
  }
  const s = String(raw).trim();
  if (s === "") return { value: null, diagnostic: false };
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(s)) {
    return { value: null, diagnostic: true };
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return { value: null, diagnostic: true };
  return { value: n, diagnostic: false };
}
