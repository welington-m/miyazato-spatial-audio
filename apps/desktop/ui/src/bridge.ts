export interface Device {
  id: string;
  name: string;
  channels: number;
  sampleRate: number;
  bits: number;
  isDefault: boolean;
  floatFormat: boolean;
}
export interface Analyzer {
  peakL: number;
  peakR: number;
  rmsL: number;
  rmsR: number;
  reductionDb: number;
  waveform: number[];
}
export interface SpectrumFrame {
  sequence: number;
  timestamp: number;
  fftSize: number;
  sampleRate: number;
  minFrequency: number;
  maxFrequency: number;
  floorDb: number;
  bins: number[];
  computeMs: number;
  updatesPerSecond: number;
  droppedBlocks: number;
  droppedFrames: number;
}
export interface Status {
  sourceId: string;
  outputId: string;
  running: boolean;
  underruns: number;
  overruns: number;
  glitches: number;
  bufferMs: number;
  callbackMs: number;
  error: string;
}
export type HostEvent =
  | ({ type: "spectrum" } & SpectrumFrame)
  | { type: "spectrum.status"; available: boolean; paused: boolean }
  | { type: "devices"; devices: Device[] }
  | { type: "settings"; value: unknown }
  | ({ type: "status" } & Status)
  | ({ type: "analyzer" } & Analyzer)
  | { type: "error"; message: string };
interface Webview {
  postMessage: (value: unknown) => void;
  addEventListener: (
    type: "message",
    handler: (event: MessageEvent<HostEvent>) => void,
  ) => void;
  removeEventListener: (
    type: "message",
    handler: (event: MessageEvent<HostEvent>) => void,
  ) => void;
}
declare global {
  interface Window {
    chrome?: { webview?: Webview };
  }
}
export const native = !!window.chrome?.webview;
export function post(type: string, payload: Record<string, unknown> = {}) {
  window.chrome?.webview?.postMessage({ type, ...payload });
}
export function subscribe(handler: (event: HostEvent) => void) {
  const callback = (e: MessageEvent<HostEvent>) => handler(e.data);
  window.chrome?.webview?.addEventListener("message", callback);
  return () => window.chrome?.webview?.removeEventListener("message", callback);
}
