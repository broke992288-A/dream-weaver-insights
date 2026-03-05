
CREATE POLICY "Doctors can delete patients"
ON public.patients
FOR DELETE
TO authenticated
USING (
  assigned_doctor_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);
