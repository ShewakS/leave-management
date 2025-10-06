-- Fix the advisor update policy to allow status transitions
-- The issue is that the USING clause only allows updates when status = 'pending_advisor'
-- but we need a WITH CHECK clause to allow the new status values

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Advisors can update pending applications" ON public.leave_applications;

-- Create a new policy with proper USING and WITH CHECK clauses
CREATE POLICY "Advisors can update pending applications"
  ON public.leave_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'advisor'
    )
    AND status = 'pending_advisor'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'advisor'
    )
    AND status IN ('advisor_approved', 'advisor_rejected')
  );
