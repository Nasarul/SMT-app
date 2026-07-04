-- Quotations Table
CREATE TABLE IF NOT EXISTS public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number text UNIQUE DEFAULT ('QT-' || to_char(now(), 'YYYYMMDD') || '-' || floor(random()*9000+1000)::text),
  customer_name text NOT NULL,
  customer_mobile text DEFAULT '',
  subject text NOT NULL,
  date date DEFAULT CURRENT_DATE,
  expiry_date date NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric(12,2) DEFAULT 0,
  discount numeric(12,2) DEFAULT 0,
  total_amount numeric(12,2) DEFAULT 0,
  status text DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  notes text DEFAULT '',
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Authenticated users can view quotations" ON public.quotations;
CREATE POLICY "Authenticated users can view quotations" ON public.quotations FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Sales and above can insert quotations" ON public.quotations;
CREATE POLICY "Sales and above can insert quotations" ON public.quotations FOR INSERT TO authenticated WITH CHECK (has_role(ARRAY['super_admin','admin','sales_agent','tour_manager']));

DROP POLICY IF EXISTS "Sales and above can update quotations" ON public.quotations;
CREATE POLICY "Sales and above can update quotations" ON public.quotations FOR UPDATE TO authenticated USING (has_role(ARRAY['super_admin','admin','sales_agent','tour_manager'])) WITH CHECK (has_role(ARRAY['super_admin','admin','sales_agent','tour_manager']));

DROP POLICY IF EXISTS "Admins can delete quotations" ON public.quotations;
CREATE POLICY "Admins can delete quotations" ON public.quotations FOR DELETE TO authenticated USING (has_role(ARRAY['super_admin','admin']));
