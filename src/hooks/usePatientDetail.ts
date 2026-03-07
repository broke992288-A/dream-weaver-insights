import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPatientById } from "@/services/patientService";
import { fetchLabsByPatientId } from "@/services/labService";
import { fetchEventsByPatientId } from "@/services/eventService";

export function usePatientDetail(patientId: string | undefined) {
  const queryClient = useQueryClient();

  const patientQuery = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => fetchPatientById(patientId!),
    enabled: !!patientId,
  });

  const labsQuery = useQuery({
    queryKey: ["patient-labs", patientId],
    queryFn: () => fetchLabsByPatientId(patientId!),
    enabled: !!patientId,
  });

  const eventsQuery = useQuery({
    queryKey: ["patient-events", patientId],
    queryFn: () => fetchEventsByPatientId(patientId!),
    enabled: !!patientId,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["patient", patientId] });
    queryClient.invalidateQueries({ queryKey: ["patient-labs", patientId] });
    queryClient.invalidateQueries({ queryKey: ["patient-events", patientId] });
    queryClient.invalidateQueries({ queryKey: ["risk-snapshots", patientId] });
    queryClient.invalidateQueries({ queryKey: ["risk-snapshot-latest", patientId] });
  };

  return {
    patient: patientQuery.data,
    labs: labsQuery.data ?? [],
    latestLab: labsQuery.data?.[0] ?? null,
    events: eventsQuery.data ?? [],
    loading: patientQuery.isLoading || labsQuery.isLoading || eventsQuery.isLoading,
    invalidateAll,
  };
}

export function usePatientHomeLabs(patientId: string | undefined) {
  return useQuery({
    queryKey: ["patient-labs", patientId],
    queryFn: () => fetchLabsByPatientId(patientId!, 10),
    enabled: !!patientId,
  });
}

export function usePatientHomeEvents(patientId: string | undefined) {
  return useQuery({
    queryKey: ["patient-events", patientId],
    queryFn: () => fetchEventsByPatientId(patientId!, 20),
    enabled: !!patientId,
  });
}
