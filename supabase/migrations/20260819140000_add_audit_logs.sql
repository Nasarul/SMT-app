-- Audit Logs Migration
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  module text NOT NULL,
  record_id text,
  description text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_email text,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Index for high-performance querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email ON public.audit_logs(user_email);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Authenticated users can view audit_logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can view audit_logs" 
ON public.audit_logs FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert audit_logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit_logs" 
ON public.audit_logs FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Enable Realtime for audit_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
