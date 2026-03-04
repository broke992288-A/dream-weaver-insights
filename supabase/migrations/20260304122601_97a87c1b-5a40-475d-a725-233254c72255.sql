
-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'doctor', 'patient', 'support');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Users can read their own role
CREATE POLICY "Users can read own role" ON public.user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Users can set own role (first time)
CREATE POLICY "Users can set own role" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create patients table
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assigned_doctor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    organ_type TEXT NOT NULL CHECK (organ_type IN ('liver', 'kidney')),
    transplant_number INT DEFAULT 1,
    transplant_date DATE,
    rejection_type TEXT,
    dialysis_history BOOLEAN DEFAULT false,
    return_dialysis_date DATE,
    biopsy_result TEXT,
    risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
    linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors see assigned patients" ON public.patients
FOR SELECT TO authenticated
USING (
  assigned_doctor_id = auth.uid() 
  OR linked_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Doctors can insert patients" ON public.patients
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'doctor') 
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Doctors can update patients" ON public.patients
FOR UPDATE TO authenticated
USING (
  assigned_doctor_id = auth.uid() 
  OR public.has_role(auth.uid(), 'admin')
);

-- Create lab_results table
CREATE TABLE public.lab_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    tacrolimus_level NUMERIC,
    alt NUMERIC,
    ast NUMERIC,
    total_bilirubin NUMERIC,
    direct_bilirubin NUMERIC,
    creatinine NUMERIC,
    egfr NUMERIC,
    proteinuria NUMERIC,
    potassium NUMERIC,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors see patient labs" ON public.lab_results
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p 
    WHERE p.id = patient_id 
    AND (p.assigned_doctor_id = auth.uid() OR p.linked_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Doctors can insert labs" ON public.lab_results
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'doctor') 
  OR public.has_role(auth.uid(), 'admin')
);

-- Create patient_events table
CREATE TABLE public.patient_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users see patient events" ON public.patient_events
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p 
    WHERE p.id = patient_id 
    AND (p.assigned_doctor_id = auth.uid() OR p.linked_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Doctors can insert events" ON public.patient_events
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'doctor') 
  OR public.has_role(auth.uid(), 'admin')
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_patients_updated_at
BEFORE UPDATE ON public.patients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
