/** Jitter named easings have no published curves. These are the spec's eye-matched stand-ins. */
export function mapEase(name?: unknown): string {
  const raw =
    typeof name === "string"
      ? name
      : name && typeof name === "object" && "name" in name && typeof name.name === "string"
        ? name.name
        : "";
  if (!raw) return "none";
  const n = raw.toLowerCase();
  if (n.startsWith("slowdown")) return "power3.out";
  if (n.startsWith("smooth")) return "power2.inOut";
  if (n.startsWith("natural")) return "power1.inOut";
  if (n.startsWith("accelerate")) return "power2.in";
  return "none";
}

export function fontFamily(font?: string): string {
  if (!font) return "inherit";
  if (font.startsWith("Hanuman")) return "'Hanuman', serif";
  if (font.startsWith("Happy")) return "'Happy Monkey', cursive";
  if (font.startsWith("Edu")) return "'Edu TAS Beginner', cursive";
  if (font.startsWith("Madimi")) return "'Madimi One', sans-serif";
  if (font.startsWith("Hanken")) return "'Hanken Grotesk', sans-serif";
  if (font.startsWith("Martian")) return "'Martian Mono', ui-monospace, monospace";
  return "sans-serif";
}

export function clamp(n: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, n));
}
