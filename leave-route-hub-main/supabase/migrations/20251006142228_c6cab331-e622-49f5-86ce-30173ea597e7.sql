-- Allow advisors and HODs to view all profiles
CREATE POLICY "Advisors and HODs can view all profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('advisor', 'hod')
  )
);