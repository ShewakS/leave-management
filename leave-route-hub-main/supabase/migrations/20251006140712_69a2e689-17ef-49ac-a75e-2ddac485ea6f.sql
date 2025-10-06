-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('student', 'advisor', 'hod');

-- Create enum for leave status
CREATE TYPE leave_status AS ENUM ('pending_advisor', 'advisor_approved', 'advisor_rejected', 'hod_approved', 'hod_rejected');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create academic calendar table
CREATE TABLE public.academic_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on academic calendar
ALTER TABLE public.academic_calendar ENABLE ROW LEVEL SECURITY;

-- Academic calendar policies
CREATE POLICY "Anyone can view calendar"
  ON public.academic_calendar FOR SELECT
  USING (true);

CREATE POLICY "Advisors and HODs can manage calendar"
  ON public.academic_calendar FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('advisor', 'hod')
    )
  );

-- Create leave applications table
CREATE TABLE public.leave_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status leave_status NOT NULL DEFAULT 'pending_advisor',
  advisor_comment TEXT,
  advisor_reviewed_at TIMESTAMPTZ,
  advisor_reviewed_by UUID REFERENCES public.profiles(id),
  hod_comment TEXT,
  hod_reviewed_at TIMESTAMPTZ,
  hod_reviewed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on leave applications
ALTER TABLE public.leave_applications ENABLE ROW LEVEL SECURITY;

-- Leave applications policies
CREATE POLICY "Students can view their own applications"
  ON public.leave_applications FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can create their own applications"
  ON public.leave_applications FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Advisors can view all applications"
  ON public.leave_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'advisor'
    )
  );

CREATE POLICY "Advisors can update pending applications"
  ON public.leave_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'advisor'
    )
    AND status = 'pending_advisor'
  );

CREATE POLICY "HODs can view advisor-approved applications"
  ON public.leave_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'hod'
    )
  );

CREATE POLICY "HODs can update advisor-approved applications"
  ON public.leave_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'hod'
    )
    AND status = 'advisor_approved'
  );

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, department)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student'),
    NEW.raw_user_meta_data->>'department'
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leave_applications_updated_at
  BEFORE UPDATE ON public.leave_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_academic_calendar_updated_at
  BEFORE UPDATE ON public.academic_calendar
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();