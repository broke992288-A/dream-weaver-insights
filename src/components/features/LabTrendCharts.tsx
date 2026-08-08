import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useIsMobile } from "@/hooks/use-mobile";
import { LazyMount } from "./LazyMount";
import { cn } from "@/lib/utils";
import type { LabResult } from "@/types/patient";
import { REFERENCE_RANGES } from "./LabResultsTable";

/** Cap data points fed to the chart to keep render cost bounded. */
const MAX_CHART_POINTS = 30;

type ChartableKey = keyof Pick<
  LabResult,
  "creatinine" | "alt" | "ast" | "total_bilirubin" | "tacrolimus_level" | "potassium" | "urea"
>;

const CHART_MARKERS: { key: ChartableKey; color: string }[] = [
  { key: "creatinine", color: "hsl(0, 84%, 60%)" },
  { key: "alt", color: "hsl(38, 92%, 50%)" },
  { key: "ast", color: "hsl(262, 83%, 58%)" },
  { key: "total_bilirubin", color: "hsl(189, 94%, 43%)" },
  { key: "tacrolimus_level", color: "hsl(160, 84%, 39%)" },
  { key: "potassium", color: "hsl(330, 81%, 60%)" },
  { key: "urea", color: "hsl(239, 84%, 67%)" },
];

interface Props {
  labs: LabResult[];
}

interface TooltipPayloadEntry {
  value: number;
  payload: { date: string; value: number; rawDate: string };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  unit?: string;
  color?: string;
  ref?: { min: number; max: number };
  t?: (k: string) => string;
}

function CustomTooltip({ active, payload, unit, color, ref, t }: CustomTooltipProps) {
  if (!active || !payload?.length || !t) return null;
  const item = payload[0];
  const value = item.value;
  let status: "normal" | "high" | "low" = "normal";
  if (ref) {
    if (value > ref.max) status = "high";
    else if (value < ref.min) status = "low";
  }
  const statusColor =
    status === "high" ? "text-destructive" : status === "low" ? "text-blue-500" : "text-emerald-500";
  const statusLabel =
    status === "high" ? `↑ ${t("lab.high")}` : status === "low" ? `↓ ${t("lab.low")}` : `✓ ${t("lab.normal")}`;

  return (
    <div className="rounded-lg border bg-popover/95 backdrop-blur-sm shadow-lg px-3 py-2 text-xs">
      <div className="text-muted-foreground mb-1">{item.payload.date}</div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-base font-bold" style={{ color }}>
          {value.toFixed(2)}
        </span>
        <span className="text-muted-foreground">{unit}</span>
      </div>
      {ref && (
        <div className={cn("text-[10px] font-medium mt-0.5 uppercase tracking-wide", statusColor)}>
          {statusLabel}
        </div>
      )}
    </div>
  );
}

function LabTrendCharts({ labs }: Props) {
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  const sortedLabs = useMemo(
    () =>
      [...labs].sort(
        (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime(),
      ),
    [labs],
  );

  const charts = useMemo(
    () => CHART_MARKERS.filter((m) => sortedLabs.some((l) => l[m.key] != null)),
    [sortedLabs],
  );

  if (charts.length === 0)
    return <p className="text-muted-foreground text-sm">{t("lab.noTrendData")}</p>;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {charts.map(({ key, color }) => {
        const ref = REFERENCE_RANGES[key];
        const allPoints = sortedLabs
          .filter((l) => l[key] != null)
          .map((l) => ({
            date: new Date(l.recorded_at).toLocaleDateString(),
            rawDate: l.recorded_at,
            value: l[key] as number,
          }));
        // Cap to last MAX_CHART_POINTS to bound recharts work.
        const data =
          allPoints.length > MAX_CHART_POINTS
            ? allPoints.slice(allPoints.length - MAX_CHART_POINTS)
            : allPoints;

        if (data.length < 1) return null;

        const latest = data[data.length - 1].value;
        const previous = data.length > 1 ? data[data.length - 2].value : latest;
        const delta = latest - previous;
        const deltaPct = previous !== 0 ? (delta / previous) * 100 : 0;
        const values = data.map((d) => d.value);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);

        let status: "normal" | "high" | "low" = "normal";
        if (ref) {
          if (latest > ref.max) status = "high";
          else if (latest < ref.min) status = "low";
        }

        const statusBadge =
          status === "high"
            ? { label: t("lab.high"), cls: "bg-destructive/10 text-destructive border-destructive/30", icon: AlertTriangle }
            : status === "low"
              ? { label: t("lab.low"), cls: "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400", icon: AlertTriangle }
              : { label: t("lab.normal"), cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400", icon: CheckCircle2 };

        const StatusIcon = statusBadge.icon;
        const TrendIcon = Math.abs(deltaPct) < 0.5 ? Minus : delta > 0 ? TrendingUp : TrendingDown;
        const trendColor =
          Math.abs(deltaPct) < 0.5
            ? "text-muted-foreground"
            : delta > 0
              ? "text-destructive"
              : "text-emerald-500";

        const gradientId = `grad-${key}`;
        // Y-domain padding for nicer look
        const yMin = ref ? Math.min(min, ref.min) : min;
        const yMax = ref ? Math.max(max, ref.max) : max;
        const pad = (yMax - yMin) * 0.15 || yMax * 0.1 || 1;

        return (
          <Card
            key={key}
            className="overflow-hidden border-border/60 bg-gradient-to-br from-card to-card/50 hover:shadow-lg hover:border-border transition-all duration-300 group"
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1.5 min-w-0">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full ring-2 ring-offset-1 ring-offset-card"
                      style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}80` }}
                    />
                    <span className="truncate">{ref?.label ?? key}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {ref ? `(${ref.unit})` : ""}
                    </span>
                  </CardTitle>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold tabular-nums" style={{ color }}>
                      {latest.toFixed(2)}
                    </span>
                    {data.length > 1 && (
                      <span className={cn("flex items-center gap-0.5 text-xs font-medium tabular-nums", trendColor)}>
                        <TrendIcon className="h-3 w-3" />
                        {Math.abs(deltaPct).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className={cn("gap-1 font-medium shrink-0", statusBadge.cls)}>
                  <StatusIcon className="h-3 w-3" />
                  {statusBadge.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pb-3 px-2">
              <LazyMount minHeight={180} rootMargin="150px">
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      strokeOpacity={0.4}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={24}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      domain={[yMin - pad, yMax + pad]}
                      width={36}
                    />
                    <Tooltip
                      content={<CustomTooltip unit={ref?.unit} color={color} ref={ref} t={t} />}
                      cursor={{ stroke: color, strokeOpacity: 0.3, strokeWidth: 1, strokeDasharray: "3 3" }}
                    />
                    {ref && (
                      <ReferenceArea
                        y1={ref.min}
                        y2={ref.max}
                        fill="hsl(var(--emerald-500, 160 84% 39%))"
                        fillOpacity={0.05}
                        stroke="none"
                      />
                    )}
                    {ref && (
                      <>
                        <ReferenceLine
                          y={ref.max}
                          stroke="hsl(var(--destructive))"
                          strokeDasharray="4 4"
                          strokeOpacity={0.4}
                        />
                        <ReferenceLine
                          y={ref.min}
                          stroke="hsl(217, 91%, 60%)"
                          strokeDasharray="4 4"
                          strokeOpacity={0.4}
                        />
                      </>
                    )}
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={color}
                      strokeWidth={2.5}
                      fill={`url(#${gradientId})`}
                      dot={{ fill: color, r: 3, strokeWidth: 0 }}
                      activeDot={{
                        r: 6,
                        fill: color,
                        stroke: "hsl(var(--background))",
                        strokeWidth: 2,
                      }}
                      isAnimationActive={!isMobile}
                      animationDuration={isMobile ? 0 : 600}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </LazyMount>
              <div className="grid grid-cols-3 gap-2 px-2 pt-2 border-t border-border/40 mt-1">
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("trend.avg")}</div>
                  <div className="text-xs font-semibold tabular-nums">{avg.toFixed(2)}</div>
                </div>
                <div className="text-center border-x border-border/40">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("trend.min")}</div>
                  <div className="text-xs font-semibold tabular-nums">{min.toFixed(2)}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("trend.max")}</div>
                  <div className="text-xs font-semibold tabular-nums">{max.toFixed(2)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default memo(LabTrendCharts);
