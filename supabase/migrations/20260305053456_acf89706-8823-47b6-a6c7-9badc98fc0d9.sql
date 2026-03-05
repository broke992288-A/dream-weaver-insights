
CREATE OR REPLACE FUNCTION public.register_patient_self(
  _full_name text,
  _phone text DEFAULT NULL,
  _date_of_birth date DEFAULT NULL,
  _gender text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _patient_id uuid;
BEGIN
  -- Check if user already has a linked patient record
  SELECT id INTO _patient_id FROM public.patients WHERE linked_user_id = auth.uid();
  IF _patient_id IS NOT NULL THEN
    RETURN _patient_id;
  END IF;

  -- Check if there's a patient with matching phone (doctor pre-created)
  IF _phone IS NOT NULL AND _phone <> '' THEN
    SELECT id INTO _patient_id FROM public.patients WHERE phone = _phone AND linked_user_id IS NULL LIMIT 1;
    IF _patient_id IS NOT NULL THEN
      UPDATE public.patients SET linked_user_id = auth.uid(), full_name = _full_name WHERE id = _patient_id;
      RETURN _patient_id;
    END IF;
  END IF;

  -- Create new patient record
  INSERT INTO public.patients (full_name, phone, date_of_birth, gender, linked_user_id, organ_type, risk_level)
  VALUES (_full_name, _phone, _date_of_birth, _gender, auth.uid(), 'kidney', 'low')
  RETURNING id INTO _patient_id;

  RETURN _patient_id;
END;
$$;
