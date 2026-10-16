import { memo, useEffect, useRef, useState } from "react";
import {
  native,
  post,
  subscribe,
  type AnalyzerDevice,
  type AnalyzerSource,
  type SpectrumFrame,
} from "../../bridge";
import { useI18n } from "../../i18n";
import HelpTooltip from "../ui/HelpTooltip";
import {
  drawSpectrum,
  frequencyPosition,
  isSpectrumFrame,
  spectrumUiConfig,
} from "./spectrum";
import type { TranslationKey } from "../../i18n/types";

type Phase = "preview" | "awaiting" | "live" | "paused" | "unavailable";
const statusKeys: Record<Phase, TranslationKey> = {
  preview: "spectrum.status.illustrative",
  awaiting: "spectrum.status.awaiting",
  live: "spectrum.status.live",
  paused: "spectrum.status.paused",
  unavailable: "spectrum.status.unavailable",
};
// Fixed browser-only fallback. These bars never move and are never labeled live.
const illustrativeHeights = Array.from(
  { length: spectrumUiConfig.binCount },
  (_, i) =>
    Math.max(6, (Math.sin(i * 0.23) * 0.25 + 0.45) * Math.exp(-i / 95) * 100),
);
const frequencyTicks = [20, 100, 1000, 10000, 20000];
export default memo(function SpectrumAnalyzer({
  running,
  nativeAvailable = native,
  outputId,
}: {
  running: boolean;
  nativeAvailable?: boolean;
  outputId?: string;
}) {
  const { t, number } = useI18n();
  const [source, setSource] = useState<AnalyzerSource>("output");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [devices, setDevices] = useState<AnalyzerDevice[]>([]);
  const independent = outputId !== undefined;
  running = independent || running;
  useEffect(() => {
    if (!nativeAvailable || !independent) return;
    const unsubscribe = subscribe((event) => {
      if (event.type === "analyzer.devices") setDevices(event.devices);
    });
    post("analyzer.devices");
    return unsubscribe;
  }, [nativeAvailable, independent]);
  useEffect(() => {
    if (!nativeAvailable || !independent) return;
    frame.current = null;
    updatePhase("awaiting");
    post("analyzer.select", {
      source,
      endpointId: endpoint ?? (source === "output" ? outputId : ""),
    });
    return () => post("analyzer.stop");
  }, [source, endpoint, outputId, nativeAvailable, independent]);

  const [phase, setPhase] = useState<Phase>(
    nativeAvailable ? (running ? "awaiting" : "paused") : "preview",
  );
  const [format, setFormat] = useState({
    fftSize: 2048,
    sampleRate: 48000,
    minFrequency: 20,
    maxFrequency: 20000,
  });
  const formatRef = useRef(format);
  const phaseRef = useRef(phase);
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useRef<{ value: SpectrumFrame; receivedAt: number } | null>(
    null,
  );
  const floor = useRef<number>(spectrumUiConfig.floorDb);
  const hadLive = useRef(false);
  const canvasReady = useRef(false);
  const runningRef = useRef(running);
  runningRef.current = running;
  const updatePhase = (next: Phase) => {
    if (phaseRef.current !== next) {
      phaseRef.current = next;
      setPhase(next);
    }
  };
  useEffect(() => {
    if (!nativeAvailable) {
      updatePhase("preview");
      return;
    }
    if (!running) {
      frame.current = null;
      updatePhase("paused");
    } else if (phaseRef.current !== "live") updatePhase("awaiting");
    return subscribe((event) => {
      if (
        event.type === "spectrum" &&
        runningRef.current &&
        (!event.source || event.source === source) &&
        isSpectrumFrame(event)
      ) {
        frame.current = { value: event, receivedAt: performance.now() };
        floor.current = event.floorDb;
        hadLive.current = true;
        const previous = formatRef.current;
        if (
          previous.fftSize !== event.fftSize ||
          previous.sampleRate !== event.sampleRate ||
          previous.minFrequency !== event.minFrequency ||
          previous.maxFrequency !== event.maxFrequency
        ) {
          formatRef.current = {
            fftSize: event.fftSize,
            sampleRate: event.sampleRate,
            minFrequency: event.minFrequency,
            maxFrequency: event.maxFrequency,
          };
          setFormat(formatRef.current);
        }
        updatePhase(canvasReady.current ? "live" : "unavailable");
      }
      if (event.type === "spectrum.status" && !event.available) {
        frame.current = null;
        updatePhase(event.paused ? "paused" : "unavailable");
      }
    });
  }, [nativeAvailable, running, source, endpoint, outputId]);
  useEffect(() => {
    if (!nativeAvailable || !canvas.current) return;
    const element = canvas.current;
    let context: CanvasRenderingContext2D | null = null;
    try {
      context = element.getContext("2d");
    } catch {
      /* Canvas failure affects only visualization. */
    }
    if (!context) {
      updatePhase("unavailable");
      return;
    }
    canvasReady.current = true;
    const display = new Float32Array(spectrumUiConfig.binCount).fill(
      floor.current,
    );
    let pixelWidth = 1,
      pixelHeight = 1,
      accent = "#97eb00";
    const resize = () => {
      const bounds = element.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      pixelWidth = Math.max(1, Math.round(bounds.width * dpr));
      pixelHeight = Math.max(1, Math.round(bounds.height * dpr));
      if (element.width !== pixelWidth || element.height !== pixelHeight) {
        element.width = pixelWidth;
        element.height = pixelHeight;
      }
      accent =
        getComputedStyle(element).getPropertyValue("--mse-accent").trim() ||
        "#97eb00";
    };
    resize();
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
    observer?.observe(element);
    window.addEventListener("resize", resize);
    let request = 0,
      lastDraw = 0;
    const render = (now: number) => {
      try {
        if (now - lastDraw >= 1000 / spectrumUiConfig.maxFps - 0.5) {
          const elapsed = Math.min(
            250,
            lastDraw ? now - lastDraw : 1000 / spectrumUiConfig.maxFps,
          );
          lastDraw = now;
          const latest = frame.current;
          const fresh =
            runningRef.current &&
            latest &&
            now - latest.receivedAt <= spectrumUiConfig.staleMs;
          if (!fresh && phaseRef.current === "live")
            updatePhase(runningRef.current ? "unavailable" : "paused");
          const coefficient =
            1 -
            Math.exp(
              -elapsed /
                (fresh
                  ? spectrumUiConfig.transitionMs
                  : spectrumUiConfig.clearMs),
            );
          for (let i = 0; i < display.length; i++) {
            const target = fresh ? latest.value.bins[i] : floor.current;
            display[i] += (target - display[i]) * coefficient;
          }
          if (!observer) resize();
          drawSpectrum(
            context!,
            display,
            floor.current,
            pixelWidth,
            pixelHeight,
            accent,
          );
        }
        request = requestAnimationFrame(render);
      } catch {
        canvasReady.current = false;
        frame.current = null;
        updatePhase("unavailable");
      }
    };
    request = requestAnimationFrame(render);
    return () => {
      canvasReady.current = false;
      cancelAnimationFrame(request);
      observer?.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [nativeAvailable]);
  const illustrative = !hadLive.current && phase !== "unavailable";
  const ticks = [
    ...frequencyTicks.filter(
      (frequency) =>
        frequency >= format.minFrequency && frequency < format.maxFrequency,
    ),
    format.maxFrequency,
  ];
  return (
    <div className="spectrum-panel">
      <div className="section-label">
        <span className="help-label">
          {t("spectrum.title")}
          <HelpTooltip help="spectrum" />
        </span>
        <span className="badge" role="status">
          {t(
            illustrative && phase === "awaiting"
              ? "spectrum.status.illustrativeAwaiting"
              : illustrative && phase === "paused"
                ? "spectrum.status.illustrativePaused"
                : statusKeys[phase],
            { fftSize: format.fftSize },
          )}
        </span>
      </div>
      {independent && (
        <div className="spectrum-info">
          <label>
            {t("spectrum.source")}{" "}
            <select
              value={source}
              onChange={(event) => {
                setSource(event.target.value as AnalyzerSource);
                setEndpoint(null);
                frame.current = null;
                updatePhase("awaiting");
              }}
            >
              <option value="output">{t("spectrum.source.output")}</option>
              <option value="input">{t("spectrum.source.input")}</option>
            </select>
          </label>
          <select
            aria-label={t("spectrum.endpoint")}
            value={endpoint ?? (source === "output" ? outputId : "")}
            onChange={(event) => {
              setEndpoint(event.target.value);
              frame.current = null;
              updatePhase("awaiting");
            }}
          >
            <option value="">{t("spectrum.default")}</option>
            {devices
              .filter((device) => device.source === source)
              .map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
          </select>
        </div>
      )}
      <div className="spectrum-stage">
        <canvas
          ref={canvas}
          className="spectrum-canvas"
          role="img"
          aria-label={
            phase === "live"
              ? t("spectrum.liveAria")
              : `${t("spectrum.title")} · ${t(statusKeys[phase], { fftSize: format.fftSize })}`
          }
          hidden={illustrative}
        />
        {illustrative && (
          <div
            className="spectrum spectrum-fallback"
            role="img"
            aria-label={t("spectrum.aria")}
          >
            {illustrativeHeights.map((height, i) => (
              <i key={i} style={{ height: `${height}%` }} />
            ))}
          </div>
        )}
      </div>
      <div className="spectrum-frequency-labels" aria-hidden="true">
        {ticks.map((frequency, i) => (
          <span
            key={frequency}
            data-frequency={frequency}
            style={{
              left: `${frequencyPosition(frequency, format.minFrequency, format.maxFrequency) * 100}%`,
              transform:
                i === 0
                  ? "none"
                  : i === ticks.length - 1
                    ? "translateX(-100%)"
                    : "translateX(-50%)",
            }}
          >
            {frequency >= 1000
              ? `${number(frequency / 1000, frequency % 1000 ? 1 : 0)}k`
              : number(frequency)}
            {i === 0 || i === ticks.length - 1 ? " Hz" : ""}
          </span>
        ))}
      </div>
      <div className="spectrum-info">
        <small>
          {t(
            phase === "preview"
              ? "spectrum.preview"
              : independent
                ? "spectrum.endpointObservation"
                : "spectrum.observation",
          )}
        </small>
        <span className="help-label">
          FFT <HelpTooltip help="fft" />
          dBFS <HelpTooltip help="dbfs" />
        </span>
      </div>
    </div>
  );
});
