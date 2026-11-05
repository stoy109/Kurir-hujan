export interface SplinePoint {
  anchor: [number, number];
  leadingHandle?: [number, number];
  trailingHandle?: [number, number];
}

export interface Spline {
  controls: SplinePoint[];
  closed?: boolean;
}

export interface Layer {
  id: string;
  parent: string;
  type: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  font?: string;
  fontSize?: number;
  lineHeightPct?: number;
  letterSpacing?: number;
  fill?: string | number | { r?: number };
  stroke?: string | number;
  opacity?: number;
  angle?: number;
  align?: string;
  hasFill?: number;
  path?: { splines: Spline[] };
}

export interface OpParams {
  effect?: string;
  nodeDuration?: number;
  nodeEasing?: string | { name?: string };
  offset?: number;
  order?: string;
  split?: string;
  scale?: number;
  blurRadius?: number;
  direction?: string;
  distance?: number;
  slideDirection?: string;
  travelDistance?: number;
  noFade?: boolean;
  zoomContent?: boolean;
  presetId?: string;
  anchor?: string;
  fromValue?: unknown;
  toValue?: unknown;
}

export interface Op {
  target: string;
  targetName: string;
  type: string;
  startMs: number;
  endMs: number;
  durMs: number;
  easing: string;
  params?: OpParams;
}

export interface ScrollBeat {
  beat: string;
  startMs: number;
  endMs: number;
  scrollStartPct: number;
  scrollEndPct: number;
}

export interface Scene {
  artboardId: string;
  name: string;
  width: number;
  height: number;
  bg: string;
  durationMs: number;
  layers: Layer[];
  operations: Op[];
  scrollBeats: ScrollBeat[];
}

export interface SceneFile {
  scenes: {
    surat: Scene;
    rute: Scene;
  };
}

export interface Split {
  words: HTMLElement[];
  lines: HTMLElement[];
  clips: HTMLElement[];
}
