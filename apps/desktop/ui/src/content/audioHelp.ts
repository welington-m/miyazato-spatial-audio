import type { TranslationKey } from "../i18n/types";

export interface AudioHelpEntry {
  title: string;
  description: string;
  usage?: string;
  warning?: string;
  learnMore?: { label: string; href: string };
}

// Stable frontend help identifiers map to semantic locale namespaces.
export const audioHelp = {
  stereoWidth: "stereoWidth",
  bass: "bass",
  clarity: "clarity",
  spatial: "spatial",
  frequency: "frequency",
  gain: "gain",
  q: "q",
  filter: "filter",
  lowShelf: "lowShelf",
  highShelf: "highShelf",
  peak: "peak",
  lowPass: "lowPass",
  highPass: "highPass",
  bandEnabled: "bandEnabled",
  crossfeed: "crossfeed",
  compressor: "compressor",
  Threshold: "threshold",
  Ratio: "ratio",
  Attack: "attack",
  Release: "release",
  Makeup: "makeup",
  "Input headroom": "inputHeadroom",
  "Output gain": "outputGain",
  limiter: "limiter",
  bypass: "bypass",
  sampleRate: "sampleRate",
  channels: "channels",
  buffer: "buffer",
  latency: "latency",
  callback: "callback",
  glitches: "glitches",
  underruns: "underruns",
  overruns: "overruns",
  source: "source",
  output: "output",
  intensity: "intensity",
  room: "room",
  front: "front",
  rear: "rear",
  height: "height",
  center: "center",
  hrtf: "hrtf",
  surround: "surround",
  upmix: "upmix",
  modeMusic: "modeMusic",
  modeMovie: "modeMovie",
  modeGaming: "modeGaming",
  modeFPS: "modeFPS",
  modeVoice: "modeVoice",
  modeStreaming: "modeStreaming",
  modeCustom: "modeCustom",
} as const;
export type AudioHelpKey = keyof typeof audioHelp;
export function helpKey(
  help: AudioHelpKey,
  field: "title" | "description" | "usage" | "warning",
): TranslationKey {
  return `help.${audioHelp[help]}.${field}`;
}
