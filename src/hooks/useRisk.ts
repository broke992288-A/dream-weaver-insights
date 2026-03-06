import { useMemo } from "react";
import { calculateRisk } from "@/services/riskService";
import type { OrganType, RiskLevel } from "@/types/patient";

export function useCalculatedRisk(organ: OrganType, labData: Record<string, any>): RiskLevel {
  return useMemo(() => calculateRisk(organ, labData), [organ, labData]);
}
