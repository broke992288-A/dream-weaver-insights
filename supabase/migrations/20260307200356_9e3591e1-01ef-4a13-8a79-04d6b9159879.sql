
CREATE POLICY "Patients can update own alerts"
  ON public.patient_alerts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = patient_alerts.patient_id
        AND p.linked_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = patient_alerts.patient_id
        AND p.linked_user_id = auth.uid()
    )
  );
