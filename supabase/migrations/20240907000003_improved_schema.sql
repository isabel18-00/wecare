-- Drop existing tables in reverse order of dependencies
DROP TABLE IF EXISTS public.vaccination_records CASCADE;
DROP TABLE IF EXISTS public.vaccinations CASCADE;
DROP TABLE IF EXISTS public.appointment_notes CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.vaccine_inventory CASCADE;
DROP TABLE IF EXISTS public.vaccines CASCADE;
DROP TABLE IF EXISTS public.patient_medical_history CASCADE;
DROP TABLE IF EXISTS public.patients CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS public.appointment_status CASCADE;
DROP TYPE IF EXISTS public.vaccine_status CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;

-- Create custom types
CREATE TYPE public.user_role AS ENUM ('admin', 'patient');
CREATE TYPE public.appointment_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');
CREATE TYPE public.vaccine_status AS ENUM ('in_stock', 'low_stock', 'out_of_stock', 'expired');

-- User profiles (extends auth.users)
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  middle_name TEXT,
  email TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  date_of_birth DATE,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'patient',
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Philippines',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Patients (extends user_profiles)
CREATE TABLE public.patients (
  id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  medical_record_number TEXT UNIQUE,
  blood_type TEXT,
  height_cm DECIMAL(5,2),
  weight_kg DECIMAL(5,2),
  allergies TEXT[],
  existing_conditions TEXT[],
  medications TEXT[],
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,
  insurance_provider TEXT,
  insurance_policy_number TEXT,
  notes TEXT
);

-- Vaccines catalog
CREATE TABLE public.vaccines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  manufacturer TEXT,
  disease_targeted TEXT NOT NULL,
  number_of_doses INT NOT NULL DEFAULT 1,
  min_age_months INT DEFAULT 0,
  max_age_years INT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vaccine inventory
CREATE TABLE public.vaccine_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vaccine_id UUID NOT NULL REFERENCES public.vaccines(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  quantity_available INT NOT NULL DEFAULT 0,
  quantity_reserved INT NOT NULL DEFAULT 0,
  status vaccine_status NOT NULL DEFAULT 'in_stock',
  manufacturing_date DATE NOT NULL,
  expiration_date DATE NOT NULL,
  supplier TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_quantities CHECK (quantity_available >= 0 AND quantity_reserved >= 0)
);

-- Appointments
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  vaccine_id UUID REFERENCES public.vaccines(id) ON DELETE SET NULL,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status appointment_status NOT NULL DEFAULT 'scheduled',
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_appointment_time CHECK (end_time > start_time)
);

-- Vaccination records
CREATE TABLE public.vaccination_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  vaccine_id UUID NOT NULL REFERENCES public.vaccines(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  inventory_id UUID REFERENCES public.vaccine_inventory(id) ON DELETE SET NULL,
  administered_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  dose_number INT NOT NULL,
  date_administered DATE NOT NULL DEFAULT CURRENT_DATE,
  next_due_date DATE,
  lot_number TEXT,
  site_of_administration TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(patient_id, vaccine_id, dose_number)
);

-- Indexes for better query performance
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX idx_patients_mrn ON public.patients(medical_record_number);
CREATE INDEX idx_appointments_patient ON public.appointments(patient_id, appointment_date DESC);
CREATE INDEX idx_appointments_provider ON public.appointments(provider_id, appointment_date DESC);
CREATE INDEX idx_vaccination_records_patient ON public.vaccination_records(patient_id, date_administered DESC);
CREATE INDEX idx_vaccine_inventory_status ON public.vaccine_inventory(status, expiration_date);

-- Update timestamps function
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_modtime
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

CREATE TRIGGER update_vaccines_modtime
BEFORE UPDATE ON public.vaccines
FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

CREATE TRIGGER update_vaccine_inventory_modtime
BEFORE UPDATE ON public.vaccine_inventory
FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

CREATE TRIGGER update_appointments_modtime
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

CREATE TRIGGER update_vaccination_records_modtime
BEFORE UPDATE ON public.vaccination_records
FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

-- Auto-update vaccine inventory status
CREATE OR REPLACE FUNCTION public.update_vaccine_inventory_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity_available <= 0 THEN
    NEW.status := 'out_of_stock';
  ELSIF NEW.quantity_available <= 10 THEN
    NEW.status := 'low_stock';
  ELSE
    NEW.status := 'in_stock';
  END IF;
  
  IF NEW.expiration_date <= CURRENT_DATE THEN
    NEW.status := 'expired';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vaccine_inventory_status_trigger
BEFORE INSERT OR UPDATE OF quantity_available, expiration_date ON public.vaccine_inventory
FOR EACH ROW EXECUTE FUNCTION public.update_vaccine_inventory_status();

-- Handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'patient')
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;
  
  -- If this is a patient, add to patients table
  IF COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'patient') = 'patient' THEN
    INSERT INTO public.patients (id)
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccine_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccination_records ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_current_user(user_id UUID)
RETURNS boolean AS $$
  SELECT auth.uid() = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile"
ON public.user_profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.user_profiles
FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Admins can manage all user profiles"
ON public.user_profiles
FOR ALL
USING (public.is_admin());

-- RLS Policies for patients
CREATE POLICY "Patients can view their own data"
ON public.patients
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Admins can manage all patient data"
ON public.patients
FOR ALL
USING (public.is_admin());

-- RLS Policies for appointments
CREATE POLICY "Patients can view their own appointments"
ON public.appointments
FOR SELECT
USING (auth.uid() = patient_id);

CREATE POLICY "Patients can create appointments"
ON public.appointments
FOR INSERT
WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Admins can manage all appointments"
ON public.appointments
FOR ALL
USING (public.is_admin());

-- RLS Policies for vaccination records
CREATE POLICY "Patients can view their own vaccination records"
ON public.vaccination_records
FOR SELECT
USING (auth.uid() = patient_id);

CREATE POLICY "Admins can manage all vaccination records"
ON public.vaccination_records
FOR ALL
USING (public.is_admin());

-- RLS Policies for vaccine inventory
CREATE POLICY "All users can view vaccine inventory"
ON public.vaccine_inventory
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage vaccine inventory"
ON public.vaccine_inventory
FOR ALL
USING (public.is_admin());

-- RLS Policies for vaccines
CREATE POLICY "All users can view vaccines"
ON public.vaccines
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage vaccines"
ON public.vaccines
FOR ALL
USING (public.is_admin());

-- Create default admin user (change password after first login)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@wecare.com') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@wecare.com',
      crypt('admin123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"first_name":"Admin","last_name":"User","role":"admin"}',
      '',
      '',
      '',
      ''
    );
  END IF;
END $$;

-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for profile pictures
CREATE POLICY "Profile pictures are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-pictures');

CREATE POLICY "Users can upload their own profile picture"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own profile picture"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
