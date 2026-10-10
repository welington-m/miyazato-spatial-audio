import { useRef, useState, useMemo } from "react";
import type { Band } from "./profile";
const width = 1000,
  height = 280;
const x = (f: number) => (Math.log10(f / 20) / 3) * width;
const y = (g: number) => height / 2 - g * 9;
// Response computed only when bands change, using biquad transfer functions at 48 kHz.
function response(b: Band, f: number, rate: number): number {
  if (!b.enabled) return 0;
  const w = (2 * Math.PI * Math.min(b.frequency, rate * 0.45)) / rate,
    c = Math.cos(w),
    s = Math.sin(w),
    a = 10 ** (b.gainDb / 40),
    alpha = s / (2 * b.q),
    t = 2 * Math.sqrt(a) * alpha;
  let b0 = 1,
    b1 = 0,
    b2 = 0,
    a0 = 1,
    a1 = 0,
    a2 = 0;
  switch (b.type) {
    case 0:
      b0 = 1 + alpha * a;
      b1 = -2 * c;
      b2 = 1 - alpha * a;
      a0 = 1 + alpha / a;
      a1 = -2 * c;
      a2 = 1 - alpha / a;
      break;
    case 1:
      b0 = a * (a + 1 - (a - 1) * c + t);
      b1 = 2 * a * (a - 1 - (a + 1) * c);
      b2 = a * (a + 1 - (a - 1) * c - t);
      a0 = a + 1 + (a - 1) * c + t;
      a1 = -2 * (a - 1 + (a + 1) * c);
      a2 = a + 1 + (a - 1) * c - t;
      break;
    case 2:
      b0 = a * (a + 1 + (a - 1) * c + t);
      b1 = -2 * a * (a - 1 + (a + 1) * c);
      b2 = a * (a + 1 + (a - 1) * c - t);
      a0 = a + 1 - (a - 1) * c + t;
      a1 = 2 * (a - 1 - (a + 1) * c);
      a2 = a + 1 - (a - 1) * c - t;
      break;
    case 3:
      b0 = (1 - c) / 2;
      b1 = 1 - c;
      b2 = b0;
      a0 = 1 + alpha;
      a1 = -2 * c;
      a2 = 1 - alpha;
      break;
    case 4:
      b0 = (1 + c) / 2;
      b1 = -(1 + c);
      b2 = b0;
      a0 = 1 + alpha;
      a1 = -2 * c;
      a2 = 1 - alpha;
  }
  const omega = (2 * Math.PI * f) / rate,
    cs = Math.cos(omega),
    sn = Math.sin(omega),
    cs2 = Math.cos(2 * omega),
    sn2 = Math.sin(2 * omega);
  return (
    10 *
    Math.log10(
      Math.max(
        1e-12,
        ((b0 + b1 * cs + b2 * cs2) ** 2 + (b1 * sn + b2 * sn2) ** 2) /
          ((a0 + a1 * cs + a2 * cs2) ** 2 + (a1 * sn + a2 * sn2) ** 2),
      ),
    )
  );
}
export default function EQGraph({
  bands,
  onChange,
  sampleRate = 48000,
}: {
  bands: Band[];
  onChange: (bands: Band[]) => void;
  sampleRate?: number;
}) {
  const ref = useRef<SVGSVGElement>(null),
    [selected, setSelected] = useState(5),
    [dragging, setDragging] = useState(false);
  const curve = useMemo(
    () =>
      Array.from({ length: 180 }, (_, i) => {
        const f = 20 * 1000 ** (i / 179),
          g = bands.reduce((sum, b) => sum + response(b, f, sampleRate), 0);
        return `${i ? "L" : "M"}${x(f).toFixed(1)},${Math.max(0, Math.min(height, y(g))).toFixed(1)}`;
      }).join(" "),
    [bands, sampleRate],
  );
  const update = (index: number, values: Partial<Band>) =>
    onChange(bands.map((b, i) => (i === index ? { ...b, ...values } : b)));
  return (
    <>
      <svg
        ref={ref}
        className="eq-graph"
        viewBox={`0 0 ${width} ${height}`}
        aria-label="Parametric equalizer response"
        onPointerMove={(e) => {
          if (!dragging || !ref.current) return;
          const r = ref.current.getBoundingClientRect();
          update(selected, {
            frequency: Math.round(
              Math.max(
                20,
                Math.min(20000, 20 * 1000 ** ((e.clientX - r.left) / r.width)),
              ),
            ),
            gainDb:
              Math.round(
                Math.max(
                  -12,
                  Math.min(
                    12,
                    (height / 2 - ((e.clientY - r.top) / r.height) * height) /
                      9,
                  ),
                ) * 10,
              ) / 10,
          });
        }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        <defs>
          <linearGradient id="eqfill" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="var(--mse-accent)" stopOpacity=".25" />
            <stop offset="1" stopColor="var(--mse-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[-12, -6, 0, 6, 12].map((g) => (
          <g key={g}>
            <line x1={0} x2={width} y1={y(g)} y2={y(g)} className="grid-line" />
            <text x={8} y={y(g) - 6}>
              {g > 0 ? "+" : ""}
              {g} dB
            </text>
          </g>
        ))}
        {[20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000].map((f) => (
          <line
            key={f}
            x1={x(f)}
            x2={x(f)}
            y1={0}
            y2={height}
            className="grid-line"
          />
        ))}
        <path
          d={`${curve} L${width},${height} L0,${height} Z`}
          fill="url(#eqfill)"
        />
        <path
          d={curve}
          fill="none"
          stroke="var(--mse-accent-highlight)"
          strokeWidth={3}
        />
        {bands.map((b, i) => (
          <circle
            key={i}
            role="slider"
            tabIndex={0}
            aria-label={`Band ${i + 1} gain`}
            aria-valuemin={-12}
            aria-valuemax={12}
            aria-valuenow={b.gainDb}
            cx={x(b.frequency)}
            cy={y(b.gainDb)}
            r={selected === i ? 9 : 6}
            fill={
              b.enabled
                ? "var(--mse-accent-highlight)"
                : "var(--mse-text-muted)"
            }
            onFocus={() => setSelected(i)}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                e.preventDefault();
                update(i, {
                  gainDb: Math.max(
                    -12,
                    Math.min(12, b.gainDb + (e.key === "ArrowUp" ? 0.5 : -0.5)),
                  ),
                });
              }
            }}
            onPointerDown={(e) => {
              setSelected(i);
              setDragging(true);
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
          >
            <title>
              {b.frequency} Hz · {b.gainDb} dB · Q {b.q}
            </title>
          </circle>
        ))}
      </svg>
      <div className="frequency-labels">
        {[20, 50, 100, 200, 500, "1k", "2k", "5k", "10k", "20k"].map((f) => (
          <span key={f}>{f}</span>
        ))}
      </div>
      <div className="band-editor">
        <label>
          Band
          <select
            value={selected}
            onChange={(e) => setSelected(Number(e.target.value))}
          >
            {bands.map((_, i) => (
              <option value={i} key={i}>
                {i + 1}
              </option>
            ))}
          </select>
        </label>
        <label>
          Frequency
          <input
            aria-label="Band frequency"
            type="number"
            min={20}
            max={20000}
            value={bands[selected].frequency}
            onChange={(e) =>
              update(selected, {
                frequency: Math.max(
                  20,
                  Math.min(20000, Number(e.target.value)),
                ),
              })
            }
          />
        </label>
        <label>
          Gain dB
          <input
            aria-label="Band gain"
            type="number"
            min={-12}
            max={12}
            step={0.5}
            value={bands[selected].gainDb}
            onChange={(e) =>
              update(selected, {
                gainDb: Math.max(-12, Math.min(12, Number(e.target.value))),
              })
            }
          />
        </label>
        <label>
          Q
          <input
            aria-label="Band Q"
            type="number"
            min={0.1}
            max={12}
            step={0.1}
            value={bands[selected].q}
            onChange={(e) =>
              update(selected, {
                q: Math.max(0.1, Math.min(12, Number(e.target.value))),
              })
            }
          />
        </label>
        <label>
          Filter
          <select
            value={bands[selected].type}
            onChange={(e) => update(selected, { type: Number(e.target.value) })}
          >
            {["Peak", "Low shelf", "High shelf", "Low pass", "High pass"].map(
              (v, i) => (
                <option value={i} key={v}>
                  {v}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={bands[selected].enabled}
            onChange={(e) => update(selected, { enabled: e.target.checked })}
          />
          Enabled
        </label>
      </div>
    </>
  );
}
