
CREATE POLICY "Doctors can delete labs"
ON public.lab_results
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'doctor'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Doctors can delete events"
ON public.patient_events
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'doctor'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);
