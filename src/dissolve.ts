const SVG_NS = "http://www.w3.org/2000/svg";

let serial = 0;

/**
 * Ink-soak dissolve. A persistent feTurbulence mask is thresholded by progress
 * so the same noise field fills in and reverses while scrubbing.
 * Frequency is in user space (cycles per px): larger type gets coarser grains.
 */
export function createDissolve(el: HTMLElement, frequency: number): (p: number) => void {
  const id = `dissolve-${serial++}`;
  const holder = document.getElementById("fx-svg");
  if (!holder) return () => {};

  const filter = document.createElementNS(SVG_NS, "filter");
  filter.setAttribute("id", id);
  filter.setAttribute("x", "-8%");
  filter.setAttribute("y", "-8%");
  filter.setAttribute("width", "116%");
  filter.setAttribute("height", "116%");
  filter.setAttribute("primitiveUnits", "userSpaceOnUse");
  filter.setAttribute("color-interpolation-filters", "sRGB");

  const turb = document.createElementNS(SVG_NS, "feTurbulence");
  turb.setAttribute("type", "fractalNoise");
  turb.setAttribute("baseFrequency", String(frequency));
  turb.setAttribute("numOctaves", "2");
  turb.setAttribute("seed", "1");
  turb.setAttribute("stitchTiles", "stitch");
  turb.setAttribute("result", "noise");

  const matrix = document.createElementNS(SVG_NS, "feColorMatrix");
  matrix.setAttribute("in", "noise");
  matrix.setAttribute("type", "matrix");
  matrix.setAttribute("result", "lum");
  matrix.setAttribute(
    "values",
    "0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.2126 0.7152 0.0722 0 0",
  );

  const transfer = document.createElementNS(SVG_NS, "feComponentTransfer");
  transfer.setAttribute("in", "lum");
  transfer.setAttribute("result", "mask");
  const funcA = document.createElementNS(SVG_NS, "feFuncA");
  funcA.setAttribute("type", "linear");
  funcA.setAttribute("slope", "24");
  funcA.setAttribute("intercept", "-24");
  transfer.append(funcA);

  const composite = document.createElementNS(SVG_NS, "feComposite");
  composite.setAttribute("in", "SourceGraphic");
  composite.setAttribute("in2", "mask");
  composite.setAttribute("operator", "in");

  filter.append(turb, matrix, transfer, composite);
  holder.append(filter);

  const slope = 24;
  return (p: number) => {
    const clamped = Math.min(1, Math.max(0, p));
    if (clamped <= 0.001) {
      el.style.visibility = "hidden";
      el.style.filter = "none";
      return;
    }
    el.style.visibility = "visible";
    if (clamped >= 0.995) {
      el.style.filter = "none";
      return;
    }
    el.style.filter = `url(#${id})`;
    const threshold = 1 - clamped;
    funcA.setAttribute("slope", String(slope));
    funcA.setAttribute("intercept", (-slope * threshold).toFixed(4));
  };
}
