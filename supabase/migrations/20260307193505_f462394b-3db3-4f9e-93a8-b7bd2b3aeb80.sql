CREATE OR REPLACE FUNCTION public.sync_patient_risk_from_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.patients
  SET risk_level = NEW.risk_level,
      updated_at = now()
  WHERE id = NEW.patient_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_patient_risk_from_snapshot ON public.risk_snapshots;

CREATE TRIGGER trg_sync_patient_risk_from_snapshot
AFTER INSERT ON public.risk_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.sync_patient_risk_from_snapshot();