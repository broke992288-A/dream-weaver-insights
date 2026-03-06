// Alert service — currently alerts use static data.
// When alerts move to the database, queries will be added here.

export interface Alert {
  id: number;
  type: "critical" | "warning" | "info" | "success";
  title: string;
  patient: string | null;
  patientId?: string;
  message: string;
  time: string;
  read: boolean;
}

export function filterAlerts(alerts: Alert[], type: string): Alert[] {
  return type === "all" ? alerts : alerts.filter((a) => a.type === type);
}
