import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchLabsByPatientId, fetchLatestLabsByPatientIds } from "@/services/labService";

export function usePatientLabs(patientId: string | undefined, limit?: number) {
  return useQuery({
    queryKey: ["patient-labs", patientId, limit],
    queryFn: () => fetchLabsByPatientId(patientId!, limit),
    enabled: !!patientId,
  });
}

export function useLatestLabsMap(patientIds: string[]) {
  return useQuery({
    queryKey: ["latest-labs-map", patientIds],
    queryFn: () => fetchLatestLabsByPatientIds(patientIds),
    enabled: patientIds.length > 0,
  });
}

export function useInvalidateLabs(patientId: string | undefined) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["patient-labs", patientId] });
  };
}
