-- Create a custom type for the status of an appointment
CREATE TYPE public.appointment_status AS ENUM ('pending', 'scheduled', 'settled');
-- Create a custom type for the status of vaccination
CREATE TYPE public.vaccination_status AS ENUM ('completed', 'partially completed', 'no vaccine');

-- Table to store user-specific information
-- Links to the auth.users table using the id column
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
  first_name text,
  middle_name text,
  last_name text,
  birthday date,
  mobile_number text,
  complete_address text,
  is_admin boolean DEFAULT FALSE,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Table for patient appointment requests
CREATE TABLE public.appointments (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  patient_id uuid REFERENCES public.profiles NOT NULL,
  patient_name text,
  patient_address text,
  patient_age integer,
  patient_birthday date,
  patient_sex text,
  patient_civil_status text,
  patient_contact_number text,
  date_bites date,
  time_of_bite text,
  address_of_bite text,
  animal_type text[],
  animal_ownership text[],
  animal_status text[],
  animal_vaccinated text,
  vaccinated_by text,
  wound_management text[],
  allergies text[],
  status appointment_status DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Table to track vaccination doses for a patient
CREATE TABLE public.vaccinations (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  appointment_id uuid REFERENCES public.appointments,
  patient_id uuid REFERENCES public.profiles NOT NULL,
  dose_number integer,
  dose_date date,
  nurse_name text,
  clinic_address text,
  status vaccination_status DEFAULT 'no vaccine',
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Table for in-app messaging
CREATE TABLE public.messages (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  sender_id uuid REFERENCES public.profiles NOT NULL,
  receiver_id uuid REFERENCES public.profiles NOT NULL,
  message_text text,
  is_read boolean DEFAULT FALSE,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Table for vaccine inventory
CREATE TABLE public.inventory (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  vaccine_name text NOT NULL,
  quantity integer DEFAULT 0,
  alert_threshold integer DEFAULT 10,
  last_updated timestamp with time zone DEFAULT now() NOT NULL
);

-- A trigger to create a new profile for a newly registered user
CREATE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Attach the trigger to the auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();