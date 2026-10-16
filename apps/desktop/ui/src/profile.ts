export const frequencies = [
  31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000,
];
export const modes = [
  "Music",
  "Movie",
  "Gaming",
  "FPS",
  "Voice",
  "Streaming",
  "Custom",
] as const;
export type Mode = (typeof modes)[number];
export interface Band {
  frequency: number;
  gainDb: number;
  q: number;
  enabled: boolean;
  type: number;
}
export interface Profile {
  name: string;
  category: Mode;
  eq: Band[];
  bass: number;
  clarity: number;
  width: number;
  crossfeed: number;
  preampDb: number;
  outputDb: number;
  compressorEnabled: boolean;
  thresholdDb: number;
  ratio: number;
  attackMs: number;
  releaseMs: number;
  makeupDb: number;
  bypass: boolean;
}
export const variants: Record<Mode, string[]> = {
  Music: [
    "Balanced",
    "Hi-Fi",
    "Bass Boost",
    "Vocal",
    "Rock",
    "Electronic",
    "Hip-Hop",
    "Jazz",
    "Classical",
    "Acoustic",
  ],
  Movie: ["Cinema", "Action", "Dialogue", "Night Mode", "Immersive"],
  Gaming: ["Balanced", "Immersive", "RPG", "Racing", "Simulation"],
  FPS: ["Competitive", "Tactical", "Immersive"],
  Voice: ["Meeting", "Podcast", "Dialogue", "Voice Clarity"],
  Streaming: ["YouTube", "Streaming Video", "Live Stream", "General"],
  Custom: ["Personal"],
};
const curves: Record<Mode, number[]> = {
  Music: [1, 2, 1, 0, -1, 0, 1, 1, 2, 1],
  Movie: [2, 3, 2, 0, -1, 1, 2, 1, 0, 0],
  Gaming: [1, 1, 0, -1, 0, 1, 2, 2, 1, 0],
  FPS: [-5, -4, -2, -1, 1, 2, 4, 3, 1, 0],
  Voice: [-5, -3, -1, 0, 1, 3, 3, 2, 0, -2],
  Streaming: [0, 1, 0, 0, 0, 1, 2, 1, 0, 0],
  Custom: Array(10).fill(0),
};
export function preset(
  category: Mode,
  variant = variants[category][0],
): Profile {
  const bass =
    category === "FPS" || category === "Voice"
      ? 0
      : category === "Movie"
        ? 42
        : 26;
  const p: Profile = {
    name: `${category} ${variant}`,
    category,
    eq: frequencies.map((frequency, i) => ({
      frequency,
      gainDb: curves[category][i],
      q: 0.707,
      enabled: true,
      type: 0,
    })),
    bass,
    clarity: category === "Voice" ? 65 : category === "Movie" ? 40 : 20,
    width: category === "Gaming" ? 125 : 100,
    crossfeed: 0,
    preampDb: -6,
    outputDb: 0,
    compressorEnabled: category === "Voice",
    thresholdDb: -18,
    ratio: 2,
    attackMs: 10,
    releaseMs: 120,
    makeupDb: 0,
    bypass: false,
  };
  if (
    variant === "Bass Boost" ||
    variant === "Hip-Hop" ||
    variant === "Electronic"
  ) {
    p.bass = 65;
    p.eq[1].gainDb += 2;
  }
  if (
    variant === "Vocal" ||
    variant === "Dialogue" ||
    variant === "Voice Clarity"
  ) {
    p.clarity = 75;
    p.eq[6].gainDb += 1;
  }
  if (variant === "Night Mode") {
    p.compressorEnabled = true;
    p.thresholdDb = -26;
    p.ratio = 4;
    p.bass = 10;
  }
  if (variant === "Hi-Fi" || variant === "Classical") {
    p.eq.forEach((b) => (b.gainDb = 0));
    p.bass = 0;
    p.clarity = 0;
  }
  if (
    ["Immersive", "Cinema", "Action", "RPG", "Racing", "Simulation"].includes(
      variant,
    )
  ) {
    p.width = 135;
    p.bass += 8;
  }
  if (variant === "Tactical") {
    p.eq[6].gainDb = 5;
    p.eq[7].gainDb = 4;
  }
  if (variant === "Rock") {
    p.eq[3].gainDb = 2;
    p.eq[7].gainDb = 3;
  }
  if (variant === "Jazz" || variant === "Acoustic") {
    p.bass = 12;
    p.eq[5].gainDb = 2;
  }
  if (variant === "Podcast" || variant === "Meeting") {
    p.compressorEnabled = true;
    p.clarity = 55;
  }
  if (variant === "Live Stream") {
    p.compressorEnabled = true;
    p.ratio = 3;
  }
  if (variant === "Streaming Video") {
    p.clarity = 40;
    p.bass = 35;
  }
  if (variant === "General") {
    p.eq.forEach((b) => (b.gainDb = 0));
    p.clarity = 10;
  }
  return p;
}
export function isProfile(v: unknown): v is Profile {
  if (!v || typeof v !== "object") return false;
  const p = v as Profile;
  return (
    modes.includes(p.category) &&
    typeof p.name === "string" &&
    Array.isArray(p.eq) &&
    p.eq.length === 10 &&
    p.eq.every(
      (b) =>
        b &&
        Number.isFinite(b.frequency) &&
        b.frequency >= 20 &&
        b.frequency <= 20000 &&
        Number.isFinite(b.gainDb) &&
        Math.abs(b.gainDb) <= 12 &&
        Number.isFinite(b.q) &&
        b.q >= 0.1 &&
        b.q <= 12 &&
        Number.isInteger(b.type) &&
        b.type >= 0 &&
        b.type <= 4 &&
        typeof b.enabled === "boolean",
    ) &&
    [
      "bass",
      "clarity",
      "width",
      "crossfeed",
      "preampDb",
      "outputDb",
      "thresholdDb",
      "ratio",
      "attackMs",
      "releaseMs",
      "makeupDb",
    ].every((k) => Number.isFinite(p[k as keyof Profile])) &&
    p.bass >= 0 &&
    p.bass <= 100 &&
    p.clarity >= 0 &&
    p.clarity <= 100 &&
    p.width >= 0 &&
    p.width <= 200 &&
    p.crossfeed >= 0 &&
    p.crossfeed <= 100 &&
    p.preampDb >= -24 &&
    p.preampDb <= 0 &&
    p.outputDb >= -24 &&
    p.outputDb <= 6 &&
    p.thresholdDb >= -60 &&
    p.thresholdDb <= 0 &&
    p.ratio >= 1 &&
    p.ratio <= 20 &&
    p.attackMs >= 0.1 &&
    p.attackMs <= 200 &&
    p.releaseMs >= 10 &&
    p.releaseMs <= 2000 &&
    p.makeupDb >= 0 &&
    p.makeupDb <= 12 &&
    typeof p.bypass === "boolean" &&
    typeof p.compressorEnabled === "boolean"
  );
}
export interface Settings {
  version: 1;
  profile: Profile;
  outputId: string;
  sourceId: string;
  effects: "Off" | "Low" | "Medium" | "High";
  custom: Profile[];
}
export const initialSettings: Settings = {
  version: 1,
  profile: preset("Music"),
  outputId: "",
  sourceId: "",
  effects: "Medium",
  custom: [],
};
export function parseSettings(value: unknown): Settings {
  if (!value || typeof value !== "object")
    return structuredClone(initialSettings);
  const s = value as Settings;
  if (s.version !== 1 || !isProfile(s.profile))
    return structuredClone(initialSettings);
  return {
    ...s,
    outputId: typeof s.outputId === "string" ? s.outputId : "",
    sourceId: typeof s.sourceId === "string" ? s.sourceId : "",
    effects: ["Off", "Low", "Medium", "High"].includes(s.effects)
      ? s.effects
      : "Medium",
    custom: Array.isArray(s.custom) ? s.custom.filter(isProfile) : [],
  };
}
