"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/utils";

/**
 * Hand-rolled SVG column chart for a 12-month revenue trend (no dependencies).
 *
 * - Single series (revenue) in the first categorical hue → no legend needed.
 * - ONE axis (revenue). The bookings count rides each column as its direct
 *   label line — never a second axis.
 * - Thin columns (≤24px), 4px rounded top (data-end), square baseline;
 *   hairline recessive gridlines; LTR plot (months grow left→right).
 * - Tap toggles a tooltip per column (hover works too).
 */

export const HEBREW_MONTHS = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

/** "2026-08" → "אוגוסט 2026" */
export function hebrewMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return month;
  return `${HEBREW_MONTHS[m - 1]} ${y}`;
}

interface TrendPoint {
  month: string; // YYYY-MM
  revenue: number;
  bookings: number;
}

interface BarsOverTimeProps {
  data: TrendPoint[];
}

const SERIES_COLOR = "#2e9e5b";
const H = 220;
const M_TOP = 22; // room for bookings direct labels
const M_BOTTOM = 22; // month tick labels
const M_LEFT = 48; // y-axis tick labels
const M_RIGHT = 8;
const RADIUS = 4;

function niceStep(rough: number): number {
  if (rough <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const frac = rough / pow;
  const nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5 : frac <= 5 ? 5 : 10;
  return nice * pow;
}

function columnPath(x: number, y0: number, y1: number, w: number): string {
  const h = y0 - y1;
  if (h <= RADIUS) return `M${x},${y0} V${y1} H${x + w} V${y0} Z`;
  return [
    `M${x},${y0}`,
    `V${y1 + RADIUS}`,
    `A${RADIUS},${RADIUS} 0 0 1 ${x + RADIUS},${y1}`,
    `H${x + w - RADIUS}`,
    `A${RADIUS},${RADIUS} 0 0 1 ${x + w},${y1 + RADIUS}`,
    `V${y0}`,
    "Z",
  ].join(" ");
}

export default function BarsOverTime({ data }: BarsOverTimeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [tipHalf, setTipHalf] = useState(100);

  // measure the real tooltip half-width so edge columns don't clip it
  useLayoutEffect(() => {
    if (tooltipRef.current) setTipHalf(tooltipRef.current.offsetWidth / 2);
  }, [active]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const hasData = data.some((d) => d.revenue > 0 || d.bookings > 0);
  if (data.length === 0 || !hasData) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-sm text-text-muted">אין נתונים</p>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 0);
  const step = niceStep(maxRevenue / 4 || 1);
  const niceMax = Math.max(step * Math.ceil(maxRevenue / step || 1), step);
  const ticks: number[] = [];
  for (let t = 0; t <= niceMax + 0.001; t += step) ticks.push(t);

  const innerW = Math.max(width - M_LEFT - M_RIGHT, 0);
  const innerH = H - M_TOP - M_BOTTOM;
  const slot = data.length > 0 ? innerW / data.length : 0;
  const barW = Math.min(24, Math.max(slot * 0.62, 4));
  const y = (v: number) => M_TOP + innerH - (v / niceMax) * innerH;
  const baseY = M_TOP + innerH;
  const labelEvery = slot >= 34 ? 1 : 2;

  const toggle = (i: number) => setActive((cur) => (cur === i ? null : i));
  const activePoint = active !== null ? data[active] : null;
  const activeX =
    active !== null ? M_LEFT + active * slot + slot / 2 : 0;

  return (
    <div
      ref={containerRef}
      dir="ltr"
      className="relative w-full"
      style={{ minHeight: H }}
    >
      {width > 0 && (
        <svg
          width={width}
          height={H}
          className="block"
          role="img"
          aria-label={`הכנסות לפי חודש: ${data
            .map(
              (d) =>
                `${hebrewMonthLabel(d.month)}: ${formatPrice(d.revenue)}, ${d.bookings} הזמנות`
            )
            .join("; ")}`}
        >
          {/* recessive hairline gridlines + y ticks */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={M_LEFT}
                x2={width - M_RIGHT}
                y1={y(t)}
                y2={y(t)}
                className="stroke-border"
                strokeWidth={1}
              />
              <text
                x={M_LEFT - 6}
                y={y(t)}
                textAnchor="end"
                dominantBaseline="central"
                className="fill-text-muted text-[10px] tabular-nums"
              >
                {t.toLocaleString("he-IL")}
              </text>
            </g>
          ))}

          {data.map((d, i) => {
            const x = M_LEFT + i * slot + (slot - barW) / 2;
            const [yy, mm] = d.month.split("-");
            const topY = y(d.revenue);
            return (
              <g key={d.month}>
                {/* invisible hit target covering the whole slot */}
                <rect
                  x={M_LEFT + i * slot}
                  y={M_TOP}
                  width={Math.max(slot, 1)}
                  height={innerH}
                  fill="transparent"
                  className="cursor-pointer"
                  onClick={() => toggle(i)}
                  onPointerEnter={(e) => {
                    if (e.pointerType === "mouse") setActive(i);
                  }}
                  onPointerLeave={(e) => {
                    if (e.pointerType === "mouse") setActive(null);
                  }}
                />
                {d.revenue > 0 && (
                  <path
                    d={columnPath(x, baseY, topY, barW)}
                    fill={SERIES_COLOR}
                    opacity={active === null || active === i ? 1 : 0.4}
                    className="transition-opacity pointer-events-none"
                  />
                )}
                {/* direct label line: bookings count above the column */}
                {d.bookings > 0 && (
                  <text
                    x={M_LEFT + i * slot + slot / 2}
                    y={(d.revenue > 0 ? topY : baseY) - 6}
                    textAnchor="middle"
                    className="fill-text-secondary text-[10px] tabular-nums pointer-events-none"
                  >
                    {d.bookings}
                  </text>
                )}
                {/* month tick label */}
                {(data.length - 1 - i) % labelEvery === 0 && (
                  <text
                    x={M_LEFT + i * slot + slot / 2}
                    y={H - 6}
                    textAnchor="middle"
                    className="fill-text-muted text-[10px] tabular-nums"
                  >
                    {parseInt(mm, 10)}/{yy.slice(2)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}

      {activePoint && (
        <div
          ref={tooltipRef}
          dir="rtl"
          className="absolute top-0 z-10 px-2.5 py-1.5 rounded-md bg-text text-white text-xs whitespace-nowrap shadow-md pointer-events-none -translate-x-1/2"
          style={{
            left: Math.min(Math.max(activeX, tipHalf), Math.max(width - tipHalf, tipHalf)),
          }}
        >
          <span className="font-medium">{hebrewMonthLabel(activePoint.month)}</span>
          {" · "}
          <span dir="ltr">{formatPrice(activePoint.revenue)}</span>
          {" · "}
          {activePoint.bookings} הזמנות
        </div>
      )}
    </div>
  );
}
