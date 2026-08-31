"use client";

import { useEffect, useRef, useState } from "react";
import {
  CHART_CATEGORICAL_PALETTE,
  CHART_FOLD_COLOR,
  CHART_FOLD_LABEL,
} from "./DonutChart";

/**
 * Hand-rolled horizontal SVG bar chart (no dependencies).
 *
 * - Plot area is LTR; Hebrew labels sit in a right-aligned column. Every bar
 *   is direct-labeled (name + value) — non-negotiable.
 * - Thin bars (20px), 4px rounded data-end, square at the baseline.
 * - Default: categorical palette in fixed order, >5 categories fold into
 *   "אחר". Pass per-datum `color` (e.g. status semantics) to override —
 *   folding is skipped then.
 * - Tap toggles a tooltip per bar (hover works too).
 */

interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarDatum[];
  /** Format for the value labels/tooltip (default: String). */
  formatValue?: (v: number) => string;
}

const BAR_H = 20;
const ROW_H = 30;
const LABEL_COL = 112; // 7rem label column
const COL_GAP = 12;
const VALUE_SPACE = 52; // px reserved at the bar tip for the value label
const RADIUS = 4;

function barPath(len: number, h: number): string {
  if (len <= RADIUS) return `M0,0 H${len} V${h} H0 Z`;
  return [
    `M0,0`,
    `H${len - RADIUS}`,
    `A${RADIUS},${RADIUS} 0 0 1 ${len},${RADIUS}`,
    `V${h - RADIUS}`,
    `A${RADIUS},${RADIUS} 0 0 1 ${len - RADIUS},${h}`,
    `H0`,
    "Z",
  ].join(" ");
}

export default function BarChart({ data, formatValue }: BarChartProps) {
  const fmt = formatValue ?? ((v: number) => String(v));
  const containerRef = useRef<HTMLDivElement>(null);
  const [plotWidth, setPlotWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () =>
      setPlotWidth(Math.max(el.clientWidth - LABEL_COL - COL_GAP, 0));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const hasExplicitColors = data.some((d) => d.color);

  // Fold >5 categories into "אחר" (categorical mode only)
  let items: Array<{ label: string; value: number; color: string }>;
  if (hasExplicitColors) {
    items = data.map((d) => ({ ...d, color: d.color ?? CHART_FOLD_COLOR }));
  } else if (data.length > CHART_CATEGORICAL_PALETTE.length) {
    // merge any item already labeled "אחר" into the fold bucket (no duplicate row)
    const head = data.slice(0, CHART_CATEGORICAL_PALETTE.length);
    const kept = head.filter((d) => d.label !== CHART_FOLD_LABEL);
    const keptSum = kept.reduce((s, d) => s + d.value, 0);
    const foldSum = data.reduce((s, d) => s + d.value, 0) - keptSum;
    items = [
      ...kept.map((d, i) => ({ ...d, color: CHART_CATEGORICAL_PALETTE[i] })),
      { label: CHART_FOLD_LABEL, value: foldSum, color: CHART_FOLD_COLOR },
    ];
  } else {
    items = data.map((d, i) => ({ ...d, color: CHART_CATEGORICAL_PALETTE[i] }));
  }

  const max = Math.max(...items.map((d) => d.value), 0);

  if (items.length === 0 || max <= 0) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-sm text-text-muted">אין נתונים</p>
      </div>
    );
  }

  const usable = Math.max(plotWidth - VALUE_SPACE, 0);
  const toggle = (i: number) => setActive((cur) => (cur === i ? null : i));

  return (
    <div ref={containerRef} dir="ltr" className="space-y-2.5">
      {items.map((d, i) => {
        const len = max > 0 ? Math.round((d.value / max) * usable) : 0;
        const drawLen = d.value > 0 ? Math.max(len, 3) : 0;
        return (
          // Hebrew label on the RIGHT; bars grow left→right in the LTR plot.
          <div key={`${d.label}-${i}`} className="flex items-center gap-3">
            <div className="flex-1 relative min-w-0" style={{ height: ROW_H }}>
              <svg
                width="100%"
                height={ROW_H}
                className="block cursor-pointer"
                onClick={() => toggle(i)}
                onPointerEnter={(e) => {
                  if (e.pointerType === "mouse") setActive(i);
                }}
                onPointerLeave={(e) => {
                  if (e.pointerType === "mouse") setActive(null);
                }}
                role="img"
                aria-label={`${d.label}: ${fmt(d.value)}`}
              >
                {drawLen > 0 && (
                  <g transform={`translate(0 ${(ROW_H - BAR_H) / 2})`}>
                    <path
                      d={barPath(drawLen, BAR_H)}
                      fill={d.color}
                      opacity={active === null || active === i ? 1 : 0.4}
                      className="transition-opacity"
                    />
                  </g>
                )}
                <text
                  x={drawLen + 6}
                  y={ROW_H / 2}
                  dominantBaseline="central"
                  className="fill-text text-xs tabular-nums"
                >
                  {fmt(d.value)}
                </text>
              </svg>
              {active === i && (
                <div
                  dir="rtl"
                  className="absolute -top-7 z-10 px-2 py-1 rounded-md bg-text text-white text-xs whitespace-nowrap shadow-md pointer-events-none"
                  style={{ left: Math.min(drawLen, Math.max(usable - 40, 0)) }}
                >
                  {d.label}: <span dir="ltr">{fmt(d.value)}</span>
                </div>
              )}
            </div>
            <div
              dir="rtl"
              className="text-sm text-text text-right truncate shrink-0"
              style={{ width: LABEL_COL }}
              title={d.label}
            >
              {d.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
