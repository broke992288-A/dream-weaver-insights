import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { LabResult } from "@/types/patient";
import { REFERENCE_RANGES } from "./LabResultsTable";

const CHART_MARKERS = [
  { key: "creatinine", color: "#ef4444" },
  { key: "alt", color: "#f59e0b" },
  { key: "ast", color: "#8b5cf6" },
  { key: "total_bilirubin", color: "#06b6d4" },
  { key: "tacrolimus_level", color: "#10b981" },
  { key: "potassium", color: "#ec4899" },
  { key: "urea", color: "#6366f1" },
];

interface Props {
  labs: LabResult[];
}

export default function LabTrendCharts({ labs }: Props) {
  const sortedLabs = [...labs].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());

  const charts = CHART_MARKERS.filter((m) => sortedLabs.some((l) => (l as any)[m.key] != null));

  if (charts.length === 0) return <p className="text-muted-foreground text-sm">No trend data available</p>;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {charts.map(({ key, color }) => {
        const ref = REFERENCE_RANGES[key];
        const data = sortedLabs
          .filter((l) => (l as any)[key] != null)
          .map((l) => ({
            date: new Date(l.recorded_at).toLocaleDateString(),
            value: (l as any)[key] as number,
          }));

        if (data.length < 1) return null;

        return (
          <Card key={key} className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                {ref?.label ?? key} {ref ? `(${ref.unit})` : ""}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  {ref && (
                    <>
                      <ReferenceLine y={ref.max} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} />
                      <ReferenceLine y={ref.min} stroke="#3b82f6" strokeDasharray="4 4" strokeOpacity={0.5} />
                    </>
                  )}
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    dot={{ fill: color, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
