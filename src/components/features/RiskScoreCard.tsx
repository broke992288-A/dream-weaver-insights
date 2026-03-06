import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { riskColorClass } from "@/utils/risk";
import type { RiskSnapshot } from "@/services/riskSnapshotService";

interface RiskScoreCardProps {
  snapshot: RiskSnapshot | null;
  prevSnapshot?: RiskSnapshot | null;
  loading?: boolean;
}

export default function RiskScoreCard({ snapshot, prevSnapshot, loading }: RiskScoreCardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">Ҳисоблаш...</CardContent>
      </Card>
    );
  }

  if (!snapshot) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Хавф баҳоси
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Таҳлил натижалари киритилмаган</p>
        </CardContent>
      </Card>
    );
  }

  const trend = prevSnapshot
    ? snapshot.score > prevSnapshot.score ? "up" : snapshot.score < prevSnapshot.score ? "down" : "same"
    : null;

  const details = (snapshot.details as { flags?: string[] }) ?? {};
  const flags = details.flags ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Хавф баҳоси
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl font-bold">{snapshot.score}</span>
            <span className="text-muted-foreground text-sm">/ 100</span>
            {trend === "up" && <TrendingUp className="h-5 w-5 text-destructive" />}
            {trend === "down" && <TrendingDown className="h-5 w-5 text-green-600" />}
            {trend === "same" && <Minus className="h-5 w-5 text-muted-foreground" />}
          </div>
          <Badge className={riskColorClass(snapshot.risk_level)}>
            {snapshot.risk_level.toUpperCase()}
          </Badge>
        </div>

        {flags.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Хавф омиллари:</p>
            <ul className="text-sm space-y-1">
              {flags.map((f, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive inline-block" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Сана: {new Date(snapshot.created_at).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}
