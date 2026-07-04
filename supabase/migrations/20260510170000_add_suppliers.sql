
-- Suppliers/Vendors table for agencies SMT buys from
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_person text NOT NULL,
  mobile text NOT NULL,
  email text DEFAULT '',
  address text DEFAULT '',
  current_balance numeric(15,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage suppliers"
  ON suppliers FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','accounts_manager')));

-- Add supplier_id to air_tickets
ALTER TABLE air_tickets ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES suppliers(id);

-- Update RLS for air_tickets to ensure consistency (usually already handled by previous policies)
