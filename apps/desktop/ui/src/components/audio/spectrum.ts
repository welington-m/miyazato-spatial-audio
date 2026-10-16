import type { SpectrumFrame } from "../../bridge";
export const spectrumUiConfig = {
  binCount: 64,
  maxFps: 60,
  staleMs: 1000,
  transitionMs: 24,
  clearMs: 250,
  floorDb: -90,
} as const;
export function isSpectrumFrame(value: unknown): value is SpectrumFrame {
  if (!value || typeof value !== "object") return false;
  const frame = value as SpectrumFrame;
  return (
    Number.isSafeInteger(frame.sequence) &&
    frame.sequence > 0 &&
    Number.isFinite(frame.timestamp) &&
    frame.timestamp >= 0 &&
    [1024, 2048, 4096, 8192].includes(frame.fftSize) &&
    Number.isFinite(frame.sampleRate) &&
    frame.sampleRate >= 8000 &&
    frame.sampleRate <= 192000 &&
    Number.isFinite(frame.minFrequency) &&
    frame.minFrequency >= 1 &&
    Number.isFinite(frame.maxFrequency) &&
    frame.maxFrequency > frame.minFrequency &&
    frame.maxFrequency <= frame.sampleRate / 2 &&
    Number.isFinite(frame.floorDb) &&
    frame.floorDb < 0 &&
    frame.floorDb >= -200 &&
    Array.isArray(frame.bins) &&
    frame.bins.length === spectrumUiConfig.binCount &&
    frame.bins.every(
      (bin) => Number.isFinite(bin) && bin >= frame.floorDb && bin <= 0,
    ) &&
    [
      frame.computeMs,
      frame.updatesPerSecond,
      frame.droppedBlocks,
      frame.droppedFrames,
    ].every((number) => Number.isFinite(number) && number >= 0)
  );
}
export function frequencyPosition(
  frequency: number,
  min: number,
  max: number,
): number {
  return Math.log(frequency / min) / Math.log(max / min);
}
export function drawSpectrum(
  context: CanvasRenderingContext2D,
  bins: ArrayLike<number>,
  floorDb: number,
  width: number,
  height: number,
  accent: string,
) {
  context.clearRect(0, 0, width, height);
  context.fillStyle = accent;
  const stride = width / spectrumUiConfig.binCount;
  const gap = Math.min(3, stride * 0.35);
  for (let i = 0; i < spectrumUiConfig.binCount; i++) {
    const db = Number.isFinite(bins[i])
      ? Math.max(floorDb, Math.min(0, bins[i]))
      : floorDb;
    const barHeight = Math.max(0, ((db - floorDb) / -floorDb) * height);
    if (barHeight > 0.25)
      context.fillRect(i * stride, height - barHeight, stride - gap, barHeight);
  }
}
