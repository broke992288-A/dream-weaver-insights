import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck } from "lucide-react";
import { usePatientAlerts, useInvalidatePatientAlerts } from "@/hooks/usePatientAlerts";
import { markAlertRead, markAllAlertsRead } from "@/services/patientAlertService";
import { useToast } from "@/hooks/use-toast";

interface PatientAlertsCardProps {
  patientId: string;
}

const severityClass: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  warning: "bg-warning text-warning-foreground",
  info: "bg-primary text-primary-foreground",
};

export default function PatientAlertsCard({ patientId }: PatientAlertsCardProps) {
  const { data: alerts = [], isLoading } = usePatientAlerts(patientId);
  const invalidate = useInvalidatePatientAlerts();
  const { toast } = useToast();

  const unread = alerts.filter((a) => !a.is_read);

  const handleMarkAll = async () => {
    try {
      await markAllAlertsRead(patientId);
      invalidate(patientId);
    } catch (err: any) {
      toast({ title: "Хатолик", description: err.message, variant: "destructive" });
    }
  };

  const handleMarkOne = async (id: string) => {
    try {
      await markAlertRead(id);
      invalidate(patientId);
    } catch {
      // silent
    }
  };

  if (isLoading) return null;
  if (alerts.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-5 w-5 text-destructive" />
          Огоҳлантиришлар
          {unread.length > 0 && (
            <Badge variant="destructive" className="ml-1">{unread.length}</Badge>
          )}
        </CardTitle>
        {unread.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleMarkAll}>
            <CheckCheck className="h-4 w-4 mr-1" /> Барчасини ўқилди
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.slice(0, 10).map((alert) => (
          <div
            key={alert.id}
            className={`rounded-lg border p-3 cursor-pointer transition-colors ${
              alert.is_read ? "opacity-60" : "border-destructive/30 bg-destructive/5"
            }`}
            onClick={() => !alert.is_read && handleMarkOne(alert.id)}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">{alert.title}</span>
              <Badge className={severityClass[alert.severity] ?? severityClass.info}>
                {alert.severity.toUpperCase()}
              </Badge>
            </div>
            {alert.message && <p className="text-xs text-muted-foreground">{alert.message}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(alert.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
