import gsap from "gsap";
import type { Op, Scene } from "./types.ts";
import type { BuiltScene } from "./layers.ts";
import type { Split } from "./types.ts";
import { clamp, mapEase } from "./ease.ts";
import { createDissolve } from "./dissolve.ts";
import { lineStrings, renderSplit } from "./text.ts";

const splits = new Map<HTMLElement, Split>();

function byTime(a: Op, b: Op): number {
  return a.startMs - b.startMs || a.endMs - b.endMs;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" ? v : fallback;
}

function moveXY(v: unknown): { x: number; y: number } {
  if (v && typeof v === "object") {
    const o = v as { moveX?: number; moveY?: number };
    return { x: o.moveX ?? 0, y: o.moveY ?? 0 };
  }
  return { x: 0, y: 0 };
}

function sizeOf(v: unknown): { width: number; height: number } | null {
  if (v && typeof v === "object" && "width" in v && "height" in v) {
    const o = v as { width: number; height: number };
    return { width: o.width, height: o.height };
  }
  return null;
}

function initialOpacity(ops: Op[], base: number): number {
  const sorted = [...ops].sort(byTime);
  for (const op of sorted) {
    if (op.type === "move" || op.type === "resize" || op.type === "rotate" || op.type === "scale") {
      continue;
    }
    if (op.type === "blurSlideIn" || op.type === "growIn" || op.type === "fadeIn") return 0;
    if (op.type === "opacity") return num(op.params?.fromValue, 0) / 100;
    return base;
  }
  return base;
}

function travel(direction: string | undefined, distance: number, incoming: boolean): { x: number; y: number } {
  const dir = direction ?? "up";
  if (dir === "up") return { x: 0, y: incoming ? distance : -distance };
  if (dir === "down") return { x: 0, y: incoming ? -distance : distance };
  if (dir === "right") return { x: incoming ? -distance : distance, y: 0 };
  if (dir === "left") return { x: incoming ? distance : -distance, y: 0 };
  return { x: 0, y: incoming ? distance : -distance };
}

interface TextTween {
  from: gsap.TweenVars;
  to: gsap.TweenVars;
}

function textTween(effect: string | undefined, params: Op["params"], incoming: boolean): TextTween {
  const blur = params?.blurRadius ?? 20;
  const dist = params?.travelDistance ?? params?.distance ?? 50;
  const dir = params?.slideDirection ?? params?.direction ?? "up";
  const noFade = !!params?.noFade;
  if (!incoming) {
    if (effect === "fadeOut") return { from: { opacity: 1 }, to: { opacity: 0 } };
    const d = travel(dir, dist, false);
    return {
      from: { opacity: 1, x: 0, y: 0, filter: "blur(0px)" },
      to: { opacity: 0, x: d.x, y: d.y, filter: `blur(${blur}px)` },
    };
  }
  if (effect === "appear") return { from: { opacity: 0 }, to: { opacity: 1 } };
  if (effect === "blurIn") {
    return { from: { opacity: 0, filter: `blur(${blur}px)` }, to: { opacity: 1, filter: "blur(0px)" } };
  }
  if (effect === "blurSlideIn") {
    const d = travel(dir, dist, true);
    return {
      from: { opacity: 0, x: d.x, y: d.y, filter: `blur(${blur}px)` },
      to: { opacity: 1, x: 0, y: 0, filter: "blur(0px)" },
    };
  }
  if (effect === "slideAndFade") {
    const d = travel(dir, dist, true);
    // noFade is a mask slide. 50px does not clear a 56px line, so a sliver of the
    // word stays visible. Park it a full line below the clip until the tween.
    if (noFade) return { from: { yPercent: 120 }, to: { yPercent: 0 } };
    return { from: { opacity: 0, x: d.x, y: d.y }, to: { opacity: 1, x: 0, y: 0 } };
  }
  if (effect === "scale") {
    return { from: { opacity: 0, scale: params?.scale ?? 2 }, to: { opacity: 1, scale: 1 } };
  }
  return { from: { opacity: 0 }, to: { opacity: 1 } };
}

function targetsFor(el: HTMLElement, op: Op): HTMLElement[] {
  const split = splits.get(el);
  if (!split) return [el];
  const mode = op.params?.split ?? "words";
  if (mode === "lines") return split.lines;
  return split.words;
}

/** Opacity the element should already be at when `op` starts. */
function opacityAt(ops: Op[], op: Op, base: number): number {
  let shown = base;
  for (const other of [...ops].sort(byTime)) {
    if (other === op || other.startMs > op.startMs) break;
    if (other.type === "fadeIn" || other.type === "growIn" || other.type === "blurSlideIn") {
      shown = base === 0 ? 1 : base;
    } else if (other.type === "opacity") {
      shown = num(other.params?.toValue, 100) / 100;
    } else if (other.type === "fadeOut") {
      shown = 0;
    }
  }
  return shown;
}

function addTextOp(tl: gsap.core.Timeline, el: HTMLElement, op: Op, incoming: boolean): void {
  const params = op.params ?? {};
  const pieces = targetsFor(el, op);
  if (!pieces.length) return;
  const tween = textTween(params.effect, params, incoming);
  const nodeDur = (params.nodeDuration ?? op.durMs) / 1000;
  const each = (params.offset ?? 0) / 1000;
  const nodeEase = mapEase(params.nodeEasing);
  const start = op.startMs / 1000;
  if (incoming) {
    gsap.set(pieces, { ...tween.from, transformOrigin: "50% 50%" });
    if (params.noFade) {
      splits.get(el)?.clips.forEach((clip) => {
        clip.classList.add("is-mask");
      });
    }
  }
  tl.fromTo(
    pieces,
    { ...tween.from },
    {
      ...tween.to,
      duration: nodeDur,
      ease: nodeEase,
      transformOrigin: "50% 50%",
      immediateRender: false,
      stagger: { each, from: "start" },
    },
    start,
  );
  if (incoming && params.noFade) {
    const clips = splits.get(el)?.clips ?? [];
    const total = each * Math.max(0, pieces.length - 1) + nodeDur;
    tl.fromTo(
      clips,
      { overflow: "hidden" },
      { overflow: "visible", duration: 0.001, ease: "none", immediateRender: true },
      start + total,
    );
  }
  if (String(tween.to.filter ?? "").includes("blur(0px)") || String(tween.from.filter ?? "").includes("blur")) {
    const total = each * Math.max(0, pieces.length - 1) + nodeDur;
    tl.set(pieces, { filter: "none" }, start + total + 0.02);
  }
}

function clipClosed(direction?: string): string {
  if (direction === "up") return "inset(100% 0% 0% 0%)";
  if (direction === "down") return "inset(0% 0% 100% 0%)";
  if (direction === "left") return "inset(0% 0% 0% 100%)";
  return "inset(0% 100% 0% 0%)";
}

/** Station-sign flicker. Progress is already eased; steps accelerate then settle. */
export function blinkOpacity(p: number): number {
  const keys: [number, number][] = [
    [0, 0],
    [0.05, 1],
    [0.2, 0.12],
    [0.32, 1],
    [0.44, 0.35],
    [0.54, 1],
    [0.62, 0.6],
    [0.7, 1],
  ];
  let v = 0;
  for (const [t, val] of keys) if (p >= t) v = val;
  return v;
}

function crackOpacity(t: number): number {
  if (t >= 11.3) return 0;
  if (t >= 11.0) {
    const u = (t - 11.0) / 0.3;
    const eased = gsap.parseEase("power2.inOut")(u);
    return 1 - eased;
  }
  const steps: [number, number][] = [
    [10.1, 1],
    [10.28, 0],
    [10.42, 1],
    [10.52, 0],
    [10.59, 1],
  ];
  let v = 1;
  for (const [time, val] of steps) if (t >= time) v = val;
  return v;
}

function localProgress(t: number, start: number, end: number, easeName?: string): number {
  const u = clamp((t - start) / Math.max(0.001, end - start), 0, 1);
  return gsap.parseEase(mapEase(easeName))(u);
}

export function prepareText(built: BuiltScene): void {
  for (const { el, layer } of built.textLayers) {
    const lines = lineStrings(layer);
    splits.set(el, renderSplit(el, lines));
  }
}

export function buildTimeline(scene: Scene, built: BuiltScene): gsap.core.Timeline {
  const tl = gsap.timeline({ paused: true });
  const specials: ((t: number) => void)[] = [];
  const opsByTarget = new Map<string, Op[]>();
  for (const op of scene.operations) {
    const list = opsByTarget.get(op.target) ?? [];
    list.push(op);
    opsByTarget.set(op.target, list);
  }

  for (const [id, ops] of opsByTarget) {
    const el = built.byId.get(id);
    if (!el) continue;
    const base = Number(el.dataset.baseOpacity ?? "1");
    const angle = Number(el.dataset.angle ?? "0");
    gsap.set(el, { opacity: initialOpacity(ops, base), transformOrigin: "50% 50%" });

    const scaleOp = ops
      .filter((op) => op.type === "growIn" || op.type === "scale")
      .sort(byTime)[0];
    if (scaleOp?.type === "growIn") gsap.set(el, { scale: 0 });
    else if (scaleOp?.type === "scale") gsap.set(el, { scale: num(scaleOp.params?.fromValue, 1) });

    const rot = ops.filter((op) => op.type === "rotate").sort(byTime)[0];
    if (rot) gsap.set(el, { rotation: angle + num(rot.params?.fromValue, 0) });

    const moves = ops.filter((op) => op.type === "move").sort(byTime);
    let accX = 0;
    let accY = 0;
    moves.forEach((op, index) => {
      const from = moveXY(op.params?.fromValue);
      const to = moveXY(op.params?.toValue);
      const fromX = accX + from.x;
      const fromY = accY + from.y;
      const toX = accX + to.x;
      const toY = accY + to.y;
      if (index === 0) gsap.set(el, { x: fromX, y: fromY });
      tl.fromTo(
        el,
        { x: fromX, y: fromY },
        {
          x: toX,
          y: toY,
          duration: op.durMs / 1000,
          ease: mapEase(op.easing),
          immediateRender: false,
        },
        op.startMs / 1000,
      );
      accX = toX;
      accY = toY;
    });

    for (const op of ops) {
      const start = op.startMs / 1000;
      const dur = Math.max(op.durMs / 1000, 0.001);
      const ease = mapEase(op.easing);
      const params = op.params ?? {};

      if (op.type === "blurSlideIn" && !params.effect) {
        const d = travel(params.direction, params.distance ?? 50, true);
        const blur = params.blurRadius ?? 20;
        const parkedX = Number(gsap.getProperty(el, "x")) || 0;
        const parkedY = Number(gsap.getProperty(el, "y")) || 0;
        const fromVars: gsap.TweenVars = { opacity: 0, filter: `blur(${blur}px)` };
        const toVars: gsap.TweenVars = {
          opacity: base === 0 ? 1 : base,
          filter: "blur(0px)",
          duration: dur,
          ease,
          immediateRender: false,
        };
        if (d.x) {
          fromVars.x = parkedX + d.x;
          toVars.x = parkedX;
        }
        if (d.y) {
          fromVars.y = parkedY + d.y;
          toVars.y = parkedY;
        }
        gsap.set(el, fromVars);
        tl.fromTo(el, { ...fromVars }, toVars, start);
        tl.set(el, { filter: "none" }, start + dur + 0.02);
      } else if (op.type === "maskRevealIn") {
        if (op.durMs <= 0) continue;
        const closed = clipClosed(params.direction);
        gsap.set(el, { clipPath: closed });
        tl.fromTo(
          el,
          { clipPath: closed },
          { clipPath: "inset(0% 0% 0% 0%)", duration: dur, ease, immediateRender: false },
          start,
        );
      } else if (op.type === "growIn") {
        tl.fromTo(
          el,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: base, duration: dur, ease, immediateRender: false, transformOrigin: "50% 50%" },
          start,
        );
      } else if (op.type === "fadeIn") {
        tl.fromTo(
          el,
          { opacity: 0 },
          { opacity: base, duration: dur, ease, immediateRender: false },
          start,
        );
      } else if (op.type === "fadeOut") {
        if (el.dataset.name === "crack") continue;
        const fromOpacity = opacityAt(ops, op, base);
        tl.fromTo(
          el,
          { opacity: fromOpacity },
          { opacity: 0, duration: dur, ease, immediateRender: false },
          start,
        );
      } else if (op.type === "opacity") {
        if (el.dataset.name === "crack") continue;
        tl.fromTo(
          el,
          { opacity: num(params.fromValue, 0) / 100 },
          { opacity: num(params.toValue, 100) / 100, duration: dur, ease, immediateRender: false },
          start,
        );
      } else if (op.type === "scale") {
        tl.fromTo(
          el,
          { scale: num(params.fromValue, 1) },
          {
            scale: num(params.toValue, 1),
            duration: dur,
            ease,
            immediateRender: false,
            transformOrigin: "50% 50%",
          },
          start,
        );
      } else if (op.type === "rotate") {
        tl.fromTo(
          el,
          { rotation: angle + num(params.fromValue, 0) },
          {
            rotation: angle + num(params.toValue, 0),
            duration: dur,
            ease,
            immediateRender: false,
            transformOrigin: "50% 50%",
          },
          start,
        );
      } else if (op.type === "resize") {
        const from = sizeOf(params.fromValue);
        const to = sizeOf(params.toValue);
        if (!from || !to) continue;
        const cx = op.targetName === "letter" ? 720 : Number.parseFloat(el.style.left) + from.width / 2;
        const cy = op.targetName === "letter" ? 440 : Number.parseFloat(el.style.top) + from.height / 2;
        tl.fromTo(
          el,
          {
            width: from.width,
            height: from.height,
            left: cx - from.width / 2,
            top: cy - from.height / 2,
          },
          {
            width: to.width,
            height: to.height,
            left: cx - to.width / 2,
            top: cy - to.height / 2,
            duration: dur,
            ease,
            immediateRender: false,
          },
          start,
        );
      } else if (op.type === "textIn") {
        addTextOp(tl, el, op, true);
      } else if (op.type === "textOut") {
        addTextOp(tl, el, op, false);
      } else if (op.type === "customShaderIn") {
        const preset = params.presetId;
        const t0 = op.startMs / 1000;
        const t1 = op.endMs / 1000;
        if (preset === "dissolve") {
          const freq = (el.dataset.name ?? "").includes("headline") ? 0.045 : 0.11;
          const apply = createDissolve(el, freq);
          specials.push((t) => apply(localProgress(t, t0, t1, op.easing)));
        } else if (preset === "film-roll") {
          const strip = el.querySelector<HTMLElement>(".film-strip");
          if (!strip) continue;
          specials.push((t) => {
            const p = localProgress(t, t0, t1, op.easing);
            strip.style.transform = `translate3d(${(-p * 50).toFixed(3)}%, 0, 0)`;
            const blur = (1 - p) * 6;
            strip.style.filter = blur < 0.15 ? "none" : `blur(${blur.toFixed(2)}px)`;
          });
        } else if (preset === "blink") {
          specials.push((t) => {
            const p = localProgress(t, t0, t1, op.easing);
            el.style.opacity = String(blinkOpacity(p));
          });
        }
      }
    }
  }

  const crack = built.byId.get(
    scene.layers.find((layer) => layer.name === "crack")?.id ?? "",
  );
  if (crack) {
    specials.push((t) => {
      crack.style.opacity = String(crackOpacity(t));
    });
  }

  tl.set({}, {}, scene.durationMs / 1000);
  const sync = () => {
    const t = tl.time();
    for (const fn of specials) fn(t);
  };
  tl.eventCallback("onUpdate", sync);
  sync();
  return tl;
}
