import type { Layer, Split } from "./types.ts";
import { fontFamily } from "./ease.ts";

const LINE_BREAKS: Record<string, string> = {
  // 96px box is exactly four lines. Locked to the Jitter end frame.
  "headline 6": "Isinya\ndibuka\ndi Pasar\nMinggu.",
};

let probe: HTMLSpanElement | null = null;

function textWidth(text: string, font: string, letterSpacing: string): number {
  if (!probe) {
    probe = document.createElement("span");
    probe.style.position = "absolute";
    probe.style.left = "-9999px";
    probe.style.top = "0";
    probe.style.whiteSpace = "nowrap";
    probe.style.visibility = "hidden";
    document.body.append(probe);
  }
  probe.style.font = font;
  probe.style.letterSpacing = letterSpacing;
  probe.textContent = text;
  return probe.getBoundingClientRect().width;
}

function greedyWrap(words: string[], maxW: number, measure: (t: string) => number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur ? `${cur} ${w}` : w;
    if (cur && measure(trial) > maxW) {
      lines.push(cur);
      cur = w;
    } else {
      cur = trial;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

export function lineStrings(layer: Layer): string[] {
  const forced = LINE_BREAKS[layer.name];
  if (forced) return forced.split("\n");
  const raw = layer.text ?? "";
  if (raw.includes("\n")) return raw.split("\n");
  const size = layer.fontSize ?? 18;
  const lh = (layer.lineHeightPct ?? 110) / 100;
  const maxLines = Math.max(1, Math.round(layer.h / (size * lh)));
  const font = `400 ${size}px ${fontFamily(layer.font)}`;
  const ls = `${(layer.letterSpacing ?? 0) / 100}em`;
  const measure = (t: string) => textWidth(t, font, ls);
  if (maxLines === 1 || measure(raw) <= layer.w) return [raw];
  const words = raw.split(" ");
  const natural = greedyWrap(words, layer.w - 1, measure);
  if (natural.length <= maxLines) return natural;
  // The box only holds two lines. Balance them so a wider face still reads as two lines.
  if (maxLines === 2) {
    let best = natural;
    let score = Number.POSITIVE_INFINITY;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(" ");
      const b = words.slice(i).join(" ");
      const wa = measure(a);
      const wb = measure(b);
      const overflow = Math.max(0, wa - layer.w) + Math.max(0, wb - layer.w);
      const next = Math.abs(wa - wb) + overflow * 0.2;
      if (next < score) {
        score = next;
        best = [a, b];
      }
    }
    return best;
  }
  return natural;
}

export function renderSplit(el: HTMLElement, lines: string[]): Split {
  el.replaceChildren();
  const split: Split = { words: [], lines: [], clips: [] };
  for (const line of lines) {
    const lineEl = document.createElement("span");
    lineEl.className = "line";
    const tokens = line.length ? line.split(" ") : [];
    tokens.forEach((token, i) => {
      if (!token) return;
      const clip = document.createElement("span");
      clip.className = "clip";
      const word = document.createElement("span");
      word.className = "word";
      word.textContent = token;
      clip.append(word);
      lineEl.append(clip);
      if (i < tokens.length - 1) lineEl.append(document.createTextNode(" "));
      split.words.push(word);
      split.clips.push(clip);
    });
    el.append(lineEl);
    split.lines.push(lineEl);
  }
  return split;
}

export async function loadFaces(): Promise<void> {
  const faces = [
    "400 300px 'Edu TAS Beginner'",
    "400 300px 'Madimi One'",
    "400 96px 'Madimi One'",
    "400 140px Hanuman",
    "400 96px Hanuman",
    "400 56px Hanuman",
    "400 360px 'Happy Monkey'",
    "400 96px 'Happy Monkey'",
    "400 18px 'Hanken Grotesk'",
    "400 16px 'Martian Mono'",
    "400 12px 'Martian Mono'",
  ];
  await document.fonts.ready;
  await Promise.all(faces.map((f) => document.fonts.load(f)));
}
