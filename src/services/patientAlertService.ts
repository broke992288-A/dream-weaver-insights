import { supabase } from "@/integrations/supabase/client";

export interface PatientAlert {
  id: string;
  patient_id: string;
  risk_snapshot_id: string | null;
  alert_type: string;
  severity: string;
  title: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

export async function insertPatientAlert(data: {
  patient_id: string;
  risk_snapshot_id?: string | null;
  alert_type?: string;
  severity: string;
  title: string;
  message?: string | null;
}) {
  const { error } = await supabase.from("patient_alerts").insert(data as any);
  if (error) throw error;
}

export async function fetchPatientAlerts(patientId: string, limit = 20) {
  const { data, error } = await supabase
    .from("patient_alerts")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as PatientAlert[];
}

export async function fetchUnreadAlertCount(patientId: string) {
  const { count, error } = await supabase
    .from("patient_alerts")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patientId)
    .eq("is_read", false);
  if (error) throw error;
  return count ?? 0;
}

export async function markAlertRead(alertId: string) {
  const { error } = await supabase
    .from("patient_alerts")
    .update({ is_read: true } as any)
    .eq("id", alertId);
  if (error) throw error;
}

export async function markAllAlertsRead(patientId: string) {
  const { error } = await supabase
    .from("patient_alerts")
    .update({ is_read: true } as any)
    .eq("patient_id", patientId)
    .eq("is_read", false);
  if (error) throw error;
}
