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
 * About 100vh of travel per 1.6s of timeline.
 * Scroll percent tracks time linearly, which matches the beat table in the spec.
 */
const SCROLL_VH = { rute: 1100, surat: 1200 } as const;

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const params = new URLSearchParams(location.search);

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

  const scrub: boolean | number = params.get("scrub") === "0" ? true : 0.6;
  ScrollTrigger.create({
    id: key,
    trigger: screen,
    start: "top top",
    end: `+=${SCROLL_VH[key]}vh`,
    pin: true,
    scrub,
    animation: tl,
    anticipatePin: 1,
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
    Object.assign(window, { __kurir: { rute, surat, ScrollTrigger, gsap } });
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
