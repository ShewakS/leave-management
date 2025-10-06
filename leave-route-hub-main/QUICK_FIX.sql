-- QUICK FIX: Copy and paste this SQL into your Supabase SQL Editor
-- This will fix the RLS policy that's preventing advisor approvals

-- Step 1: Drop the problematic policy
DROP POLICY IF EXISTS "Advisors can update pending applications" ON public.leave_applications;

-- Step 2: Create the corrected policy with WITH CHECK clause
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

-- This fixes the issue where advisors couldn't update applications
-- because the original policy didn't allow the new status values
