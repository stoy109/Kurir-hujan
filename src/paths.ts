import type { Spline } from "./types.ts";

function xy(p: [number, number], w: number, h: number): string {
  const x = +(p[0] * w).toFixed(2);
  const y = +(p[1] * h).toFixed(2);
  return `${x} ${y}`;
}

/** Normalized Jitter splines (0–1 anchors and handles) → SVG path in the layer box. */
export function splinesToPath(splines: Spline[], w: number, h: number): string {
  const parts: string[] = [];
  for (const sp of splines) {
    const pts = sp.controls;
    if (!pts.length) continue;
    parts.push(`M ${xy(pts[0].anchor, w, h)}`);
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const cur = pts[i];
      const c1 = prev.trailingHandle ?? prev.anchor;
      const c2 = cur.leadingHandle ?? cur.anchor;
      if (!prev.trailingHandle && !cur.leadingHandle) {
        parts.push(`L ${xy(cur.anchor, w, h)}`);
      } else {
        parts.push(`C ${xy(c1, w, h)} ${xy(c2, w, h)} ${xy(cur.anchor, w, h)}`);
      }
    }
    if (sp.closed) {
      const prev = pts[pts.length - 1];
      const first = pts[0];
      const c1 = prev.trailingHandle ?? prev.anchor;
      const c2 = first.leadingHandle ?? first.anchor;
      if (prev.trailingHandle || first.leadingHandle) {
        parts.push(`C ${xy(c1, w, h)} ${xy(c2, w, h)} ${xy(first.anchor, w, h)}`);
      }
      parts.push("Z");
    }
  }
  return parts.join(" ");
}

export function parseStroke(
  stroke: string | number | undefined | null,
): { color: string; width: number } | null {
  if (stroke == null || stroke === 0 || stroke === "0") return null;
  const s = String(stroke);
  const m = s.match(/^(#[0-9A-Fa-f]{3,8})\/(\d+(?:\.\d+)?)$/);
  if (m) return { color: m[1], width: Number(m[2]) };
  if (s.startsWith("#")) return { color: s, width: 1 };
  return null;
}
