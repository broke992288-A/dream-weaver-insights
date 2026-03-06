
-- Add new lab marker columns to lab_results
ALTER TABLE public.lab_results
  ADD COLUMN IF NOT EXISTS hb numeric,
  ADD COLUMN IF NOT EXISTS tlc numeric,
  ADD COLUMN IF NOT EXISTS platelets numeric,
  ADD COLUMN IF NOT EXISTS pti numeric,
  ADD COLUMN IF NOT EXISTS inr numeric,
  ADD COLUMN IF NOT EXISTS alp numeric,
  ADD COLUMN IF NOT EXISTS ggt numeric,
  ADD COLUMN IF NOT EXISTS total_protein numeric,
  ADD COLUMN IF NOT EXISTS albumin numeric,
  ADD COLUMN IF NOT EXISTS urea numeric,
  ADD COLUMN IF NOT EXISTS sodium numeric,
  ADD COLUMN IF NOT EXISTS calcium numeric,
  ADD COLUMN IF NOT EXISTS magnesium numeric,
  ADD COLUMN IF NOT EXISTS phosphorus numeric,
  ADD COLUMN IF NOT EXISTS uric_acid numeric,
  ADD COLUMN IF NOT EXISTS crp numeric,
  ADD COLUMN IF NOT EXISTS esr numeric,
  ADD COLUMN IF NOT EXISTS ldh numeric,
  ADD COLUMN IF NOT EXISTS ammonia numeric,
  ADD COLUMN IF NOT EXISTS cyclosporine numeric,
  ADD COLUMN IF NOT EXISTS report_file_url text;

-- Create storage bucket for lab reports
INSERT INTO storage.buckets (id, name, public)
VALUES ('lab_reports', 'lab_reports', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can upload to their own folder
CREATE POLICY "Users can upload lab reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'lab_reports');

CREATE POLICY "Users can view lab reports"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'lab_reports');

CREATE POLICY "Users can delete own lab reports"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'lab_reports' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow patients to insert lab results
CREATE POLICY "Patients can insert own labs"
ON public.lab_results FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM patients p
    WHERE p.id = lab_results.patient_id
    AND p.linked_user_id = auth.uid()
  )
);
