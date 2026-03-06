import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchRiskSnapshots, fetchLatestRiskSnapshot } from "@/services/riskSnapshotService";

export function useRiskSnapshots(patientId: string | undefined, limit = 10) {
  return useQuery({
    queryKey: ["risk-snapshots", patientId, limit],
    queryFn: () => fetchRiskSnapshots(patientId!, limit),
    enabled: !!patientId,
  });
}

export function useLatestRiskSnapshot(patientId: string | undefined) {
  return useQuery({
    queryKey: ["risk-snapshot-latest", patientId],
    queryFn: () => fetchLatestRiskSnapshot(patientId!),
    enabled: !!patientId,
  });
}

export function useInvalidateRiskSnapshots() {
  const qc = useQueryClient();
  return (patientId: string) => {
    qc.invalidateQueries({ queryKey: ["risk-snapshots", patientId] });
    qc.invalidateQueries({ queryKey: ["risk-snapshot-latest", patientId] });
  };
}
