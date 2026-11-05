import "./style.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import raw from "./scenes.json";
import type { Scene, SceneFile } from "./types.ts";
import { buildScene } from "./layers.ts";
import { buildTimeline, prepareText } from "./motion.ts";
import { buildDaftar, buildHero, buildPenutup } from "./static.ts";
import { loadFaces } from "./text.ts";

gsap.registerPlugin(ScrollTrigger);

const data = raw as unknown as SceneFile;

/**
 * How scroll drives the pinned scenes. Beat percentages stay linear with time;
 * only the pixels-per-second change.
 *
 * vhPerSecond is pin travel per second of timeline. The first build wrote
 * "+=1100vh", but ScrollTrigger ignores a vh suffix on a relative end, so the
 * scenes were really 1100px and 1200px (~1.64s of timeline per 100px notch).
 * 100/3 vh per second is about 5× that distance: at a 900px-tall window Rute
 * is 6 viewports (5400px) and Surat is 6.6 (5940px), and 100px advances 1/3s.
 * A station of ~2.7s is about 8 notches.
 *
 * scrub `true` ties the timeline to the scrollbar. A number is seconds of
 * catch-up lag (the old 0.6 kept the scene moving after the wheel had stopped).
 * There is no Lenis or other inertia scroller.
 *
 * ?speed= multiplies how fast the timeline advances per pixel. 1 is this config,
 * 0.5 is twice the scroll (slower), 2 is half the scroll (faster). Clamped to 0.2–4.
 * ?scrub=0 (or true) is 1:1. ?scrub=0.3 restores a short catch-up.
 */
const SCROLL = {
  vhPerSecond: 100 / 3,
  scrub: true as boolean | number,
};

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const params = new URLSearchParams(location.search);

function scrollSpeed(): number {
  const raw = params.get("speed");
  if (raw == null || raw === "") return 1;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(4, Math.max(0.2, n));
}

function readScrub(): boolean | number {
  const raw = params.get("scrub");
  if (raw == null || raw === "") return SCROLL.scrub;
  if (raw === "0" || raw === "true") return true;
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 0) return n === 0 ? true : n;
  return SCROLL.scrub;
}

/** Pinned scroll distance for a scene, in vh. */
function pinVh(durationMs: number): number {
  return (SCROLL.vhPerSecond * (durationMs / 1000)) / scrollSpeed();
}

function fitAll(): void {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  document.querySelectorAll<HTMLElement>('[data-fit="contain"]').forEach((screen) => {
    const stage = screen.querySelector<HTMLElement>(".stage");
    const sizer = screen.querySelector<HTMLElement>(".sizer");
    if (!stage || !sizer) return;
    const dh = Number(stage.dataset.h || 900);
    const s = Math.min(vw / 1440, vh / dh);
    sizer.style.width = `${1440 * s}px`;
    sizer.style.height = `${dh * s}px`;
    stage.style.transform = `scale(${s})`;
  });
  document.querySelectorAll<HTMLElement>('[data-fit="width"]').forEach((section) => {
    const stage = section.querySelector<HTMLElement>(".stage");
    if (!stage) return;
    const dh = Number(stage.dataset.h || 900);
    const s = vw / 1440;
    section.style.height = `${dh * s}px`;
    stage.style.transform = `scale(${s})`;
  });
}

function mountScene(key: "rute" | "surat", scene: Scene): gsap.core.Timeline {
  const screen = document.createElement("section");
  screen.className = "screen";
  screen.id = key;
  screen.dataset.fit = "contain";
  screen.setAttribute("aria-label", key === "rute" ? "Lima pos, satu jalur rel" : "Satu surat");

  const sizer = document.createElement("div");
  sizer.className = "sizer";
  const stage = document.createElement("div");
  stage.className = "stage";
  stage.dataset.h = "900";
  stage.style.height = "900px";
  sizer.append(stage);
  screen.append(sizer);
  document.getElementById("app")?.append(screen);

  const built = buildScene(scene, stage);
  prepareText(built);
  const tl = buildTimeline(scene, built);

  const reduced = reduceMotion || params.get("reduced") === "1";
  if (reduced) {
    tl.progress(1);
    return tl;
  }

  const distanceVh = pinVh(scene.durationMs);
  screen.dataset.pinVh = String(Math.round(distanceVh));
  ScrollTrigger.create({
    id: key,
    trigger: screen,
    start: "top top",
    end: () => `+=${Math.round((window.innerHeight * distanceVh) / 100)}`,
    pin: true,
    scrub: readScrub(),
    animation: tl,
    anticipatePin: 1,
    invalidateOnRefresh: true,
  });
  return tl;
}

async function boot(): Promise<void> {
  const app = document.getElementById("app");
  if (!app) return;
  try {
    await loadFaces();
    app.append(buildHero());
    const rute = mountScene("rute", data.scenes.rute);
    const surat = mountScene("surat", data.scenes.surat);
    app.append(buildDaftar());
    app.append(buildPenutup());
    fitAll();
    ScrollTrigger.refresh();
    document.documentElement.classList.remove("booting");
    const speed = scrollSpeed();
    Object.assign(window, {
      __kurir: {
        rute,
        surat,
        ScrollTrigger,
        gsap,
        scroll: {
          vhPerSecond: SCROLL.vhPerSecond,
          speed,
          scrub: readScrub(),
          pinVh: {
            rute: pinVh(data.scenes.rute.durationMs),
            surat: pinVh(data.scenes.surat.durationMs),
          },
        },
      },
    });
    window.addEventListener("resize", () => {
      fitAll();
      ScrollTrigger.refresh();
    });
  } catch (error) {
    document.documentElement.classList.remove("booting");
    console.error(error);
  }
}

void boot();
