DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'risk_snapshots'
      AND policyname = 'Patients can insert own risk snapshots'
  ) THEN
    CREATE POLICY "Patients can insert own risk snapshots"
      ON public.risk_snapshots
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.patients p
          WHERE p.id = risk_snapshots.patient_id
            AND p.linked_user_id = auth.uid()
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'patient_alerts'
      AND policyname = 'Patients can insert own alerts'
  ) THEN
    CREATE POLICY "Patients can insert own alerts"
      ON public.patient_alerts
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.patients p
          WHERE p.id = patient_alerts.patient_id
            AND p.linked_user_id = auth.uid()
        )
      );
  END IF;
END
$$;

WITH missing_labs AS (
  SELECT
    l.id AS lab_result_id,
    l.patient_id,
    l.created_at AS lab_created_at,
    p.organ_type,
    COALESCE(p.transplant_number, 1) AS transplant_number,
    COALESCE(p.dialysis_history, false) AS dialysis_history,
    l.creatinine,
    l.alt,
    l.ast,
    l.total_bilirubin,
    l.tacrolimus_level,
    l.egfr
  FROM public.lab_results l
  JOIN public.patients p ON p.id = l.patient_id
  LEFT JOIN public.risk_snapshots rs ON rs.lab_result_id = l.id
  WHERE rs.id IS NULL
),
scored AS (
  SELECT
    *,
    CASE
      WHEN organ_type = 'liver' THEN
        (CASE
          WHEN COALESCE(tacrolimus_level, 0) < 5 THEN 30
          WHEN COALESCE(tacrolimus_level, 0) > 15 THEN 20
          ELSE 0
        END)
        + (CASE
          WHEN COALESCE(alt, 0) > 120 THEN 30
          WHEN COALESCE(alt, 0) > 60 THEN 15
          ELSE 0
        END)
        + (CASE
          WHEN COALESCE(ast, 0) > 120 THEN 25
          WHEN COALESCE(ast, 0) > 60 THEN 10
          ELSE 0
        END)
        + (CASE
          WHEN COALESCE(total_bilirubin, 0) > 3 THEN 20
          WHEN COALESCE(total_bilirubin, 0) > 1.5 THEN 10
          ELSE 0
        END)
        + (CASE WHEN transplant_number >= 2 THEN 15 ELSE 0 END)
      ELSE
        (CASE
          WHEN COALESCE(creatinine, 0) > 2.5 THEN 35
          WHEN COALESCE(creatinine, 0) > 1.5 THEN 15
          ELSE 0
        END)
        + (CASE
          WHEN COALESCE(egfr, 999) < 30 THEN 30
          WHEN COALESCE(egfr, 999) < 45 THEN 15
          ELSE 0
        END)
        + (CASE
          WHEN COALESCE(tacrolimus_level, 0) < 5 THEN 20
          WHEN COALESCE(tacrolimus_level, 0) > 15 THEN 15
          ELSE 0
        END)
        + (CASE WHEN dialysis_history THEN 20 ELSE 0 END)
    END AS raw_score
  FROM missing_labs
)
INSERT INTO public.risk_snapshots (
  patient_id,
  lab_result_id,
  score,
  risk_level,
  creatinine,
  alt,
  ast,
  total_bilirubin,
  tacrolimus_level,
  details,
  created_at
)
SELECT
  patient_id,
  lab_result_id,
  LEAST(raw_score, 100) AS score,
  CASE
    WHEN LEAST(raw_score, 100) >= 60 THEN 'high'
    WHEN LEAST(raw_score, 100) >= 30 THEN 'medium'
    ELSE 'low'
  END AS risk_level,
  creatinine,
  alt,
  ast,
  total_bilirubin,
  tacrolimus_level,
  jsonb_build_object('source', 'backfill_from_lab'),
  lab_created_at
FROM scored;

UPDATE public.patients p
SET
  risk_level = latest.risk_level,
  updated_at = now()
FROM (
  SELECT DISTINCT ON (patient_id)
    patient_id,
    risk_level
  FROM public.risk_snapshots
  ORDER BY patient_id, created_at DESC
) latest
WHERE latest.patient_id = p.id
  AND COALESCE(p.risk_level, '') <> COALESCE(latest.risk_level, '');