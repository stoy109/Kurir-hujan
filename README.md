# Kurir Hujan

One-page scroll story. A courier runs one letter through five stations, from Manggarai to Pasar Minggu, on the last Saturday night in January.

Desktop layout is a 1440×900 stage. Hero, Daftar, and Penutup are static frames. Rute and Surat are each one pinned screen: the whole Jitter timeline is scrubbed by scroll, and elements keep moving inside that screen.

## Run

```bash
npm install
npm run dev
```

Dev server: [http://127.0.0.1:4731](http://127.0.0.1:4731). `npm run build` typechecks and writes `dist/`.

Fonts are self-hosted in `public/fonts/` (Hanuman, Happy Monkey, Edu TAS Beginner, Madimi One, Hanken Grotesk, Martian Mono). Reference frames live in `ref/`. Scene data is `src/scenes.json`.

`?scrub=0` turns off the 0.6s scrub lag (useful for frame grabs). `?reduced=1` forces the reduced-motion end states.

## Structure

| Path | Role |
|---|---|
| `src/main.ts` | Page order, stage scaling, ScrollTrigger pins |
| `src/static.ts` | Hero, Daftar, Penutup |
| `src/layers.ts` | DOM for a Jitter scene (rects, ellipses, seal paths, text) |
| `src/motion.ts` | One paused GSAP timeline per scene |
| `src/text.ts` | Line breaks and per-word splits |
| `src/dissolve.ts` | Ink-soak mask |
| `src/paths.ts` | Normalized seal splines → SVG |
| `src/style.css` | Tokens and the static frames |

## Scroll → timeline

Scroll percent tracks time linearly. That matches the beat tables. There is no snap.

| Scene | Timeline | Scroll while pinned | Beats |
|---|---|---|---|
| Rute | 18.0s | 1100vh | Title 0–13%, Manggarai 13–28%, Tebet 28–43%, Cawang 43–58%, Duren Kalibata 58–73%, Pasar Minggu 73–88%, Finish 88–100% |
| Surat | 19.8s | 1200vh | Write 0–15%, Fold 15–29%, Seal 29–43%, Crack 43–60%, Hand-off 60–80%, Open 80–100% |

`scrub: 0.6` eases the catch-up. Eases live on each tween, not on the scroll.

The Rute camera is the `world` group's x. Moves stack: 0 → −720 → −1820 → −2920 → −4020 → −5120. Cards, stems, and the lit progress segments play inside that moving world. Ghost numerals have no intro; they are always there, and the frame crops some of them on purpose.

Surat has no camera. The letter rect is the spine: 520×560 → 520×227 → 120×52 → 520×560, center fixed at (720, 440). The seal rides the same x moves, then the two halves fly out to the scattered end positions.

## Shaders (recreated, scrub-safe)

Driven by timeline time, so they reverse when you scroll back.

- **Dissolve** (Surat body 1, final headline). SVG `feTurbulence` (seed 1) with a luminance threshold. Progress 0 hides the element; progress 1 removes the filter so the type is sharp.
- **Film-roll** (Rute numerals 1–4). The digit sits in an `overflow: hidden` window, slides in from the right, and blurs while it travels. Numeral 5 scales in instead, as in the timeline.
- **Blink** (Rute station names). Stepped opacity on the eased progress: full, dim, full, with shrinking gaps, then it holds. Same idea as the seal-crack flicker, which is a series of hard opacity sets (on at 10.10s, off 10.28s, on 10.42s, off 10.52s, on 10.59s) and then a fade.

## Decisions on the open questions

1. **Edu TAS Beginner** is weight 400. Weight 300 does not exist.
2. **Hero clock** stays the static string `12H 04J 37M 09D`.
3. **Surat station labels** (`MANGGARAI`, `PASAR MINGGU`) are 16px Martian Mono, like the Rute data line. Each box is scaled around its original center.
4. **Surat body 5** keeps the fast pass (199ms, stagger 37, slide from the right).
5. **Seal halves** stay scattered at the end, ±8°, as in the last frame.
6. **Body 1** stays in the narrow 358px column. Hanken Grotesk at 18px is wider than that column, so the copy is balanced into the two lines the 56px box allows. The lines run a little past 358px and still sit inside the letter.
7. **Hero, Daftar, and Penutup** are static. Nothing in the spec animates them.
8. **Easings** use the spec's stand-ins: slowdown → `power3.out`, smooth → `power2.inOut`, natural → `power1.inOut`, accelerate → `power2.in`. Word starts use the given `offset` evenly. Redistributing those starts with the outer ease held later words back against the reference frames, so the outer ease is not also applied to the stagger. Each word still uses its own node easing.
9. **No mobile layout.** Full-viewport scenes scale with `min(vw/1440, vh/900)` and stay centered. Daftar and Penutup scale with viewport width. On a phone the type gets small; that is the graceful scale-down, not a second layout.
10. **Seal marks** use the paths in `scenes.json` (rain ticks and two rules). The written spec thought those paths had not been exported.

`prefers-reduced-motion` (and `?reduced=1`) skips pinning and shows the last frame of each scene. The page is then just the five frames stacked.

## Known gaps

- Jitter's named curves are not published. The stand-ins above are close, not identical, so a frame in the middle of a move can sit a few dozen pixels off the render.
- Dissolve, film-roll, and blink are recreations. Film-roll blur is a uniform CSS blur, not a true horizontal smear. Blink is a fixed step pattern, not the original shader.
- Body 2 and body 3 fit on one line at 18px in a 640px measure, so they are not forced onto two lines.
- Figma and Jitter rasterize the same font files slightly differently. Hero, Daftar, and Penutup match the frames closely; remaining error is mostly antialiasing.
- The countdown does not tick. The form selects a station (Cawang starts selected) and does not post anywhere.
- Scroll length is long on purpose (about 1.6s of timeline per viewport). There is no snap.
