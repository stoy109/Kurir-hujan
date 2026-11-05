import type { Layer, Op, Scene } from "./types.ts";
import { fontFamily } from "./ease.ts";
import { parseStroke, splinesToPath } from "./paths.ts";

const SVG_NS = "http://www.w3.org/2000/svg";

export interface BuiltScene {
  stage: HTMLElement;
  byId: Map<string, HTMLElement>;
  /** Text layers that should be line-wrapped and split. */
  textLayers: { el: HTMLElement; layer: Layer }[];
}

function place(el: HTMLElement, layer: Layer, z: number): void {
  el.classList.add("layer");
  el.dataset.name = layer.name;
  el.dataset.id = layer.id;
  el.style.left = `${layer.x}px`;
  el.style.top = `${layer.y}px`;
  el.style.width = `${layer.w}px`;
  el.style.height = `${layer.h}px`;
  el.style.zIndex = String(z);
  el.style.opacity = String((layer.opacity ?? 100) / 100);
}

function paintBox(el: HTMLElement, layer: Layer): void {
  const hasFill = layer.hasFill !== 0 && layer.fill && layer.fill !== "0" && typeof layer.fill === "string";
  if (hasFill) el.style.background = String(layer.fill);
  const stroke = parseStroke(layer.stroke);
  if (stroke) {
    el.style.border = `${stroke.width}px solid ${stroke.color}`;
  }
}

function raiseStationLabel(layer: Layer): Layer {
  if (layer.name !== "label Manggarai" && layer.name !== "label Pasar Minggu") return layer;
  const next = { ...layer };
  const scale = 16 / 12;
  const cx = layer.x + layer.w / 2;
  const cy = layer.y + layer.h / 2;
  next.fontSize = 16;
  next.w = Math.round(layer.w * scale);
  next.h = Math.round(16 * 1.4);
  next.x = Math.round((cx - next.w / 2) * 10) / 10;
  next.y = Math.round((cy - next.h / 2) * 10) / 10;
  return next;
}

function isFilm(layer: Layer, ops: Op[]): boolean {
  return ops.some(
    (op) => op.target === layer.id && op.params?.presetId === "film-roll",
  );
}

function makeFilm(layer: Layer): HTMLElement {
  const el = document.createElement("div");
  el.dataset.film = "1";
  el.classList.add("film-window");
  const strip = document.createElement("div");
  strip.className = "film-strip";
  const pad = document.createElement("div");
  pad.className = "film-cell";
  const digit = document.createElement("div");
  digit.className = "film-cell film-digit";
  digit.textContent = layer.text ?? "";
  digit.style.fontFamily = fontFamily(layer.font);
  digit.style.fontSize = `${layer.fontSize ?? 96}px`;
  digit.style.lineHeight = `${(layer.lineHeightPct ?? 110) / 100}`;
  digit.style.color = typeof layer.fill === "string" ? layer.fill : "#9FC3E6";
  strip.append(pad, digit);
  el.append(strip);
  return el;
}

function makeShape(layer: Layer): HTMLElement {
  const el = document.createElement("div");
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${layer.w} ${layer.h}`);
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("overflow", "visible");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", splinesToPath(layer.path?.splines ?? [], layer.w, layer.h));
  const stroke = parseStroke(layer.stroke);
  const hasFill = layer.hasFill !== 0 && typeof layer.fill === "string" && layer.fill !== "0";
  path.setAttribute("fill", hasFill ? String(layer.fill) : "none");
  if (stroke) {
    path.setAttribute("stroke", stroke.color);
    path.setAttribute("stroke-width", String(stroke.width));
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
  }
  svg.append(path);
  el.append(svg);
  return el;
}

function makeText(layer: Layer): HTMLElement {
  const el = document.createElement("div");
  el.classList.add("text");
  el.style.fontFamily = fontFamily(layer.font);
  el.style.fontSize = `${layer.fontSize ?? 18}px`;
  el.style.lineHeight = `${(layer.lineHeightPct ?? 110) / 100}`;
  el.style.letterSpacing = `${(layer.letterSpacing ?? 0) / 100}em`;
  el.style.textAlign = layer.align === "center" ? "center" : "left";
  if (typeof layer.fill === "string" && layer.fill !== "0") el.style.color = layer.fill;
  el.textContent = layer.text ?? "";
  return el;
}

export function buildScene(scene: Scene, stage: HTMLElement): BuiltScene {
  const byId = new Map<string, HTMLElement>();
  const textLayers: BuiltScene["textLayers"] = [];
  const elements: HTMLElement[] = [];
  byId.set("artboard", stage);

  const total = scene.layers.length;
  scene.layers.forEach((raw, index) => {
    const layer = raiseStationLabel(raw);
    const ops = scene.operations;
    let el: HTMLElement;
    if (layer.type === "layerGrp") {
      el = document.createElement("div");
      el.classList.add("group");
    } else if (layer.type === "text" && isFilm(layer, ops)) {
      el = makeFilm(layer);
    } else if (layer.type === "text") {
      el = makeText(layer);
      textLayers.push({ el, layer });
    } else if (layer.type === "shape") {
      el = makeShape(layer);
      el.setAttribute("aria-hidden", "true");
    } else if (layer.type === "ellipse") {
      el = document.createElement("div");
      el.classList.add("ellipse");
      el.setAttribute("aria-hidden", "true");
      paintBox(el, layer);
    } else {
      el = document.createElement("div");
      el.classList.add("rect");
      el.setAttribute("aria-hidden", "true");
      paintBox(el, layer);
    }
    place(el, layer, total - index);
    if (layer.angle) el.dataset.angle = String(layer.angle);
    el.dataset.baseOpacity = String((layer.opacity ?? 100) / 100);
    byId.set(layer.id, el);
    elements.push(el);
  });

  scene.layers.forEach((raw) => {
    const el = byId.get(raw.id);
    if (!el) return;
    const parent = byId.get(raw.parent) ?? stage;
    parent.append(el);
  });

  return { stage, byId, textLayers };
}
