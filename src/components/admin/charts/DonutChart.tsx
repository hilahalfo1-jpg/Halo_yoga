"use client";

import { useState } from "react";

/**
 * Hand-rolled SVG donut chart (no dependencies).
 *
 * - Categorical palette in FIXED order (CVD-validated); >5 categories fold
 *   into "אחר" (gray). Pass `colors` to override per-datum (aligned to data).
 * - Direct labels live in the legend list beside/below the ring (Hebrew
 *   name + value + percent) — leader lines don't fit Hebrew labels on mobile.
 * - 2px white (surface) gaps between segments; donut, not a filled pie.
 * - Tap toggles a per-segment readout in the donut center (hover works too).
 */

export const CHART_CATEGORICAL_PALETTE = [
  "#2e9e5b",
  "#3B82F6",
  "#e8830c",
  "#9256c8",
  "#d5477a",
];
export const CHART_FOLD_COLOR = "#8a8f8a";
export const CHART_FOLD_LABEL = "אחר";

interface DonutDatum {
  label: string;
  value: number;
}

interface DonutChartProps {
  data: DonutDatum[];
  /** Per-datum colors, aligned with `data`. Omit for the categorical palette (+fold). */
  colors?: string[];
  /** Rendered diameter of the ring in px. */
  size?: number;
}

const VIEW = 120;
const CX = VIEW / 2;
const CY = VIEW / 2;
const OUTER_R = 56;
const THICKNESS = 20;
const INNER_R = OUTER_R - THICKNESS;
const MID_R = (OUTER_R + INNER_R) / 2;

function polar(r: number, angle: number): [number, number] {
  // angle in radians from 12 o'clock, clockwise
  return [CX + r * Math.sin(angle), CY - r * Math.cos(angle)];
}

function segmentPath(startAngle: number, endAngle: number): string {
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  const [ox1, oy1] = polar(OUTER_R, startAngle);
  const [ox2, oy2] = polar(OUTER_R, endAngle);
  const [ix1, iy1] = polar(INNER_R, endAngle);
  const [ix2, iy2] = polar(INNER_R, startAngle);
  return [
    `M ${ox1.toFixed(3)} ${oy1.toFixed(3)}`,
    `A ${OUTER_R} ${OUTER_R} 0 ${largeArc} 1 ${ox2.toFixed(3)} ${oy2.toFixed(3)}`,
    `L ${ix1.toFixed(3)} ${iy1.toFixed(3)}`,
    `A ${INNER_R} ${INNER_R} 0 ${largeArc} 0 ${ix2.toFixed(3)} ${iy2.toFixed(3)}`,
    "Z",
  ].join(" ");
}

export default function DonutChart({ data, colors, size = 160 }: DonutChartProps) {
  const [active, setActive] = useState<number | null>(null);

  // Fold >5 categories into "אחר" (only in default categorical mode)
  let items: Array<{ label: string; value: number; color: string }>;
  if (colors) {
    items = data.map((d, i) => ({
      ...d,
      color: colors[i] ?? CHART_FOLD_COLOR,
    }));
  } else if (data.length > CHART_CATEGORICAL_PALETTE.length) {
    const head = data.slice(0, CHART_CATEGORICAL_PALETTE.length);
    const restSum = data
      .slice(CHART_CATEGORICAL_PALETTE.length)
      .reduce((s, d) => s + d.value, 0);
    items = [
      ...head.map((d, i) => ({ ...d, color: CHART_CATEGORICAL_PALETTE[i] })),
      { label: CHART_FOLD_LABEL, value: restSum, color: CHART_FOLD_COLOR },
    ];
  } else {
    items = data.map((d, i) => ({ ...d, color: CHART_CATEGORICAL_PALETTE[i] }));
  }

  const total = items.reduce((s, d) => s + d.value, 0);

  if (total <= 0) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-sm text-text-muted">אין נתונים</p>
      </div>
    );
  }

  const visible = items
    .map((d, originalIndex) => ({ ...d, originalIndex }))
    .filter((d) => d.value > 0);

  // 2px surface gap on each side of a segment boundary (in radians at mid-radius)
  const pad = visible.length > 1 ? 1 / MID_R : 0;

  let cursor = 0;
  const segments = visible.map((d) => {
    const sweep = (d.value / total) * Math.PI * 2;
    const start = cursor + pad;
    const end = Math.max(cursor + sweep - pad, start + 0.001);
    cursor += sweep;
    return { ...d, start, end, fullCircle: sweep >= Math.PI * 2 - 0.0001 };
  });

  const pct = (v: number) => `${Math.round((v / total) * 100)}%`;
  const activeItem = active !== null ? items[active] : null;

  const toggle = (i: number) => setActive((cur) => (cur === i ? null : i));

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          width={size}
          height={size}
          role="img"
          aria-label={items.map((d) => `${d.label}: ${d.value}`).join(", ")}
        >
          {segments.map((seg) =>
            seg.fullCircle ? (
              <circle
                key={seg.originalIndex}
                cx={CX}
                cy={CY}
                r={MID_R}
                fill="none"
                stroke={seg.color}
                strokeWidth={THICKNESS}
                className="cursor-pointer"
                onClick={() => toggle(seg.originalIndex)}
                onPointerEnter={(e) => {
                  if (e.pointerType === "mouse") setActive(seg.originalIndex);
                }}
                onPointerLeave={(e) => {
                  if (e.pointerType === "mouse") setActive(null);
                }}
              />
            ) : (
              <path
                key={seg.originalIndex}
                d={segmentPath(seg.start, seg.end)}
                fill={seg.color}
                opacity={active === null || active === seg.originalIndex ? 1 : 0.4}
                className="cursor-pointer transition-opacity"
                onClick={() => toggle(seg.originalIndex)}
                onPointerEnter={(e) => {
                  if (e.pointerType === "mouse") setActive(seg.originalIndex);
                }}
                onPointerLeave={(e) => {
                  if (e.pointerType === "mouse") setActive(null);
                }}
              />
            )
          )}
        </svg>
        {/* Center readout: total by default, tapped/hovered segment otherwise */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-6">
          {activeItem ? (
            <>
              <p className="text-[11px] text-text-muted leading-tight max-w-full truncate">
                {activeItem.label}
              </p>
              <p className="text-sm font-bold text-text" dir="ltr">
                {activeItem.value}
              </p>
              <p className="text-[11px] text-text-muted" dir="ltr">
                {pct(activeItem.value)}
              </p>
            </>
          ) : (
            <>
              <p className="text-[11px] text-text-muted">סה״כ</p>
              <p className="text-lg font-bold text-text" dir="ltr">
                {total}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Legend list = the direct labels (name + value + percent) */}
      <ul className="flex-1 w-full space-y-1.5 min-w-0">
        {items.map((d, i) => (
          <li key={`${d.label}-${i}`}>
            <button
              type="button"
              onClick={() => toggle(i)}
              className="w-full flex items-center gap-2 text-right rounded-md px-1 py-0.5 hover:bg-surface/60"
            >
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: d.color }}
                aria-hidden
              />
              <span className="flex-1 text-sm text-text truncate">{d.label}</span>
              <span
                className="text-sm text-text-muted tabular-nums shrink-0"
                dir="ltr"
              >
                {d.value} ({pct(d.value)})
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
