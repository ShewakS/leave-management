-- Create a function to handle advisor approvals that bypasses RLS
-- This function will run with SECURITY DEFINER privileges

CREATE OR REPLACE FUNCTION public.advisor_approve_application(
  application_id UUID,
  approved BOOLEAN,
  comment_text TEXT,
  advisor_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  app_record RECORD;
BEGIN
  -- Check if the advisor exists and has the right role
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = advisor_id AND role = 'advisor'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Not an advisor');
  END IF;

  -- Check if the application exists and is in pending_advisor status
  SELECT * INTO app_record 
  FROM public.leave_applications 
  WHERE id = application_id AND status = 'pending_advisor';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Application not found or not in pending status');
  END IF;

  -- Update the application
  UPDATE public.leave_applications 
  SET 
    status = CASE WHEN approved THEN 'advisor_approved' ELSE 'advisor_rejected' END,
    advisor_comment = comment_text,
    advisor_reviewed_at = now(),
    advisor_reviewed_by = advisor_id,
    updated_at = now()
  WHERE id = application_id;

  -- Return success result
  result := json_build_object(
    'success', true, 
    'message', CASE WHEN approved THEN 'Application approved' ELSE 'Application rejected' END,
    'new_status', CASE WHEN approved THEN 'advisor_approved' ELSE 'advisor_rejected' END
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.advisor_approve_application(UUID, BOOLEAN, TEXT, UUID) TO authenticated;
