-- Add Picture and NID Document columns to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS photo_url text DEFAULT '',
ADD COLUMN IF NOT EXISTS nid_url text DEFAULT '';

-- Note: Ensure a storage bucket named 'employee-docs' exists in Supabase 
-- with public access or appropriate RLS policies.
