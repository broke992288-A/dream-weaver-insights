
-- Risk snapshots table
CREATE TABLE public.risk_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  lab_result_id uuid REFERENCES public.lab_results(id) ON DELETE SET NULL,
  score numeric NOT NULL DEFAULT 0,
  risk_level text NOT NULL DEFAULT 'low',
  creatinine numeric,
  alt numeric,
  ast numeric,
  total_bilirubin numeric,
  tacrolimus_level numeric,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_risk_snapshots_patient ON public.risk_snapshots(patient_id, created_at DESC);

ALTER TABLE public.risk_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users see risk snapshots"
  ON public.risk_snapshots FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients p
    WHERE p.id = risk_snapshots.patient_id
    AND (p.assigned_doctor_id = auth.uid() OR p.linked_user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Doctors can insert risk snapshots"
  ON public.risk_snapshots FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Doctors can delete risk snapshots"
  ON public.risk_snapshots FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'admin'));

-- Patient alerts table
CREATE TABLE public.patient_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  risk_snapshot_id uuid REFERENCES public.risk_snapshots(id) ON DELETE SET NULL,
  alert_type text NOT NULL DEFAULT 'risk',
  severity text NOT NULL DEFAULT 'warning',
  title text NOT NULL,
  message text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_patient_alerts_patient ON public.patient_alerts(patient_id, created_at DESC);
CREATE INDEX idx_patient_alerts_unread ON public.patient_alerts(patient_id, is_read) WHERE NOT is_read;

ALTER TABLE public.patient_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users see patient alerts"
  ON public.patient_alerts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients p
    WHERE p.id = patient_alerts.patient_id
    AND (p.assigned_doctor_id = auth.uid() OR p.linked_user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Doctors can insert patient alerts"
  ON public.patient_alerts FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Doctors can update patient alerts"
  ON public.patient_alerts FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients p
    WHERE p.id = patient_alerts.patient_id
    AND (p.assigned_doctor_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "Doctors can delete patient alerts"
  ON public.patient_alerts FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'admin'));

-- Enable realtime for alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_alerts;
