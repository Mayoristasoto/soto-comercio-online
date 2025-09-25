-- Address the specific Security Definer issues that the linter flags
-- Keep essential functions but remove problematic ones

-- Check if any view is still causing issues by checking for function calls in views
SELECT viewname, definition
FROM pg_views 
WHERE schemaname = 'public'
AND (
  definition ILIKE '%is_admin%'
  OR definition ILIKE '%current_user%'
  OR definition ILIKE '%get_current%'
);

-- The problem might be that some view is calling a SECURITY DEFINER function
-- Let's see what we have