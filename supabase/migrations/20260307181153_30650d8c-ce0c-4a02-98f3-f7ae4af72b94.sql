CREATE POLICY "Patients can insert own events"
ON public.patient_events
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = patient_events.patient_id
    AND p.linked_user_id = auth.uid()
  )
);