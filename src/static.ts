const RAIN: [number, number, number, number][] = [
  [132, 0, 120, 0.18],
  [268, 97, 173, 0.26],
  [410, 194, 226, 0.34],
  [590, 291, 279, 0.18],
  [705, 388, 332, 0.26],
  [880, 65, 165, 0.34],
  [1012, 162, 218, 0.18],
  [1190, 259, 271, 0.26],
  [1302, 356, 324, 0.34],
  [1376, 33, 157, 0.18],
  [355, 130, 210, 0.26],
  [940, 227, 263, 0.34],
];

const CHIPS: { label: string; w: number; selected?: boolean }[] = [
  { label: "MANGGARAI", w: 110 },
  { label: "TEBET", w: 74 },
  { label: "CAWANG", w: 83, selected: true },
  { label: "DUREN KALIBATA", w: 154 },
  { label: "PASAR MINGGU", w: 137 },
];

function stage(h: number): HTMLElement {
  const el = document.createElement("div");
  el.className = "stage";
  el.dataset.h = String(h);
  el.style.height = `${h}px`;
  return el;
}

export function buildHero(): HTMLElement {
  const screen = document.createElement("section");
  screen.className = "screen";
  screen.id = "hero";
  screen.dataset.fit = "contain";
  screen.setAttribute("aria-label", "Kurir Hujan");
  const sizer = document.createElement("div");
  sizer.className = "sizer";
  const root = stage(900);
  root.classList.add("hero-stage");

  for (const [x, y, h, opacity] of RAIN) {
    const drop = document.createElement("span");
    drop.className = "rain";
    drop.style.left = `${x}px`;
    drop.style.top = `${y}px`;
    drop.style.height = `${h}px`;
    drop.style.opacity = String(opacity);
    drop.setAttribute("aria-hidden", "true");
    root.append(drop);
  }

  const left = document.createElement("p");
  left.className = "top-note top-left";
  left.textContent = "Sabtu terakhir Januari, 21.00";

  const right = document.createElement("p");
  right.className = "top-note top-right";
  right.textContent = "Manggarai → Pasar Minggu · 5 pos";

  const clock = document.createElement("div");
  clock.className = "clock";
  const k = document.createElement("span");
  k.className = "clock-k";
  k.textContent = "START DALAM";
  const v = document.createElement("span");
  v.className = "clock-v";
  v.textContent = "12H 04J 37M 09D";
  clock.append(k, v);

  const kurir = document.createElement("h1");
  kurir.className = "word-kurir";
  kurir.textContent = "Kurir";
  const hujan = document.createElement("p");
  hujan.className = "word-hujan";
  hujan.textContent = "Hujan";

  root.append(left, right, clock, kurir, hujan);
  sizer.append(root);
  screen.append(sizer);
  return screen;
}

export function buildDaftar(): HTMLElement {
  const screen = document.createElement("section");
  screen.className = "flow";
  screen.id = "daftar";
  screen.dataset.fit = "width";
  screen.setAttribute("aria-label", "Ambil satu pos");
  const root = stage(838);

  const title = document.createElement("h2");
  title.className = "daftar-title";
  title.textContent = "Ambil satu pos.";

  const form = document.createElement("form");
  form.className = "daftar-form";
  form.noValidate = true;

  const nama = field("NAMA", "Nama lu", "text", "name");
  const pos = document.createElement("fieldset");
  pos.className = "field field-pos";
  const legend = document.createElement("legend");
  legend.className = "field-label";
  legend.textContent = "POS PILIHAN";
  const chips = document.createElement("div");
  chips.className = "chips";
  chips.setAttribute("role", "radiogroup");
  chips.setAttribute("aria-label", "Pos pilihan");
  for (const chip of CHIPS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.style.width = `${chip.w}px`;
    btn.textContent = chip.label;
    btn.setAttribute("role", "radio");
    btn.setAttribute("aria-checked", chip.selected ? "true" : "false");
    btn.addEventListener("click", () => {
      chips.querySelectorAll<HTMLButtonElement>(".chip").forEach((other) => {
        other.setAttribute("aria-checked", other === btn ? "true" : "false");
      });
    });
    chips.append(btn);
  }
  pos.append(legend, chips);

  const kontak = field("WA / IG", "08xx atau @username", "text", "off");

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "daftar-btn";
  const label = document.createElement("span");
  label.textContent = "DAFTAR JADI KURIR";
  const arrow = document.createElement("span");
  arrow.className = "daftar-arrow";
  arrow.textContent = "→";
  arrow.setAttribute("aria-hidden", "true");
  submit.append(label, arrow);

  form.append(nama, pos, kontak, submit);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  root.append(title, form);
  screen.append(root);
  return screen;
}

function field(labelText: string, placeholder: string, type: string, auto: string): HTMLLabelElement {
  const label = document.createElement("label");
  label.className = "field";
  const span = document.createElement("span");
  span.className = "field-label";
  span.textContent = labelText;
  const input = document.createElement("input");
  input.type = type;
  input.placeholder = placeholder;
  input.setAttribute("autocomplete", auto);
  label.append(span, input);
  return label;
}

export function buildPenutup(): HTMLElement {
  const screen = document.createElement("section");
  screen.className = "flow";
  screen.id = "penutup";
  screen.dataset.fit = "width";
  screen.setAttribute("aria-label", "Penutup");
  const root = stage(598);

  const line = document.createElement("p");
  line.className = "close-line";
  const basah = document.createElement("span");
  basah.className = "close-basah";
  basah.textContent = "Basah";
  const rest = document.createElement("span");
  rest.className = "close-rest";
  rest.textContent = "itu bagian dari rute.";
  line.append(basah, rest);

  const foot = document.createElement("footer");
  foot.className = "foot";
  const a = document.createElement("p");
  a.textContent = "KURIR HUJAN · MANGGARAI → PASAR MINGGU";
  const b = document.createElement("p");
  b.className = "foot-accent";
  b.textContent = "ACARA FIKTIF · PROYEK DESAIN";
  foot.append(a, b);

  root.append(line, foot);
  screen.append(root);
  return screen;
}
