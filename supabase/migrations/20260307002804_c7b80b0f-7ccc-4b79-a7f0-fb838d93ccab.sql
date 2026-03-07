
-- Drop old policies
DROP POLICY IF EXISTS "Patients upload own reports" ON storage.objects;
DROP POLICY IF EXISTS "Patients view own reports" ON storage.objects;
DROP POLICY IF EXISTS "Doctors can delete reports" ON storage.objects;

-- Upload: users upload to their own user_id folder
CREATE POLICY "Patients upload own reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lab_reports'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- View: patient owns folder, or doctor assigned to patient linked to that user_id
CREATE POLICY "Patients view own reports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'lab_reports'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[1] IN (
      SELECT p.linked_user_id::text FROM public.patients p WHERE p.assigned_doctor_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  )
);

-- Delete: doctors/admins
CREATE POLICY "Doctors can delete reports"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'lab_reports'
  AND (
    public.has_role(auth.uid(), 'doctor')
    OR public.has_role(auth.uid(), 'admin')
  )
);
