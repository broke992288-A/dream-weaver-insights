
-- Fix RLS policies: change from RESTRICTIVE to PERMISSIVE

-- patients table
DROP POLICY IF EXISTS "Doctors can delete patients" ON public.patients;
DROP POLICY IF EXISTS "Doctors can insert patients" ON public.patients;
DROP POLICY IF EXISTS "Doctors can update patients" ON public.patients;
DROP POLICY IF EXISTS "Doctors see assigned patients" ON public.patients;

CREATE POLICY "Doctors can delete patients" ON public.patients FOR DELETE TO authenticated
  USING (assigned_doctor_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Doctors can insert patients" ON public.patients FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Doctors can update patients" ON public.patients FOR UPDATE TO authenticated
  USING (assigned_doctor_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Doctors see assigned patients" ON public.patients FOR SELECT TO authenticated
  USING (assigned_doctor_id = auth.uid() OR linked_user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- lab_results table
DROP POLICY IF EXISTS "Doctors can delete labs" ON public.lab_results;
DROP POLICY IF EXISTS "Doctors can insert labs" ON public.lab_results;
DROP POLICY IF EXISTS "Doctors see patient labs" ON public.lab_results;

CREATE POLICY "Doctors can delete labs" ON public.lab_results FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Doctors can insert labs" ON public.lab_results FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Doctors see patient labs" ON public.lab_results FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = lab_results.patient_id AND (p.assigned_doctor_id = auth.uid() OR p.linked_user_id = auth.uid() OR has_role(auth.uid(), 'admin'))));

-- patient_events table
DROP POLICY IF EXISTS "Authorized users see patient events" ON public.patient_events;
DROP POLICY IF EXISTS "Doctors can delete events" ON public.patient_events;
DROP POLICY IF EXISTS "Doctors can insert events" ON public.patient_events;

CREATE POLICY "Authorized users see patient events" ON public.patient_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM patients p WHERE p.id = patient_events.patient_id AND (p.assigned_doctor_id = auth.uid() OR p.linked_user_id = auth.uid() OR has_role(auth.uid(), 'admin'))));

CREATE POLICY "Doctors can delete events" ON public.patient_events FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Doctors can insert events" ON public.patient_events FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'admin'));

-- Add ON DELETE CASCADE to foreign keys
ALTER TABLE public.lab_results DROP CONSTRAINT IF EXISTS lab_results_patient_id_fkey;
ALTER TABLE public.lab_results ADD CONSTRAINT lab_results_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;

ALTER TABLE public.patient_events DROP CONSTRAINT IF EXISTS patient_events_patient_id_fkey;
ALTER TABLE public.patient_events ADD CONSTRAINT patient_events_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;
