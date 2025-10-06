-- Drop the problematic policy
DROP POLICY IF EXISTS "Advisors and HODs can view all profiles" ON public.profiles;

-- Create a security definer function to check if user has advisor or HOD role
CREATE OR REPLACE FUNCTION public.is_advisor_or_hod(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id
    AND role IN ('advisor', 'hod')
  );
$$;

-- Create the correct policy using the function
CREATE POLICY "Advisors and HODs can view all profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id OR public.is_advisor_or_hod(auth.uid())
);