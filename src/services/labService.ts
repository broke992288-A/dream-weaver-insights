import { supabase } from "@/integrations/supabase/client";
import type { LabResult } from "@/types/patient";

export async function fetchLatestLabsByPatientIds(patientIds: string[]) {
  if (patientIds.length === 0) return {};
  const { data, error } = await supabase
    .from("lab_results")
    .select("patient_id, tacrolimus_level, creatinine")
    .in("patient_id", patientIds)
    .order("recorded_at", { ascending: false });
  if (error) throw error;
  const labMap: Record<string, { patient_id: string; tacrolimus_level: number | null; creatinine: number | null }> = {};
  data?.forEach((l) => {
    if (!labMap[l.patient_id]) labMap[l.patient_id] = l;
  });
  return labMap;
}

export async function fetchLabsByPatientId(patientId: string, limit?: number) {
  let query = supabase
    .from("lab_results")
    .select("*")
    .eq("patient_id", patientId)
    .order("recorded_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as LabResult[];
}

export async function insertLabResult(labData: Record<string, any>) {
  const { data, error } = await supabase.functions.invoke(
    "ocr-lab-report",
    {
      body: labData
    }
  );

  if (error) throw error;

  return data;
}
