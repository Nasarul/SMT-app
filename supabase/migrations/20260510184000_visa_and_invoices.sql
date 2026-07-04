
-- Visa Applications Table
CREATE TABLE IF NOT EXISTS visas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  passenger_name text NOT NULL,
  passport_number text NOT NULL,
  visa_type text NOT NULL CHECK (visa_type IN ('tourist', 'business', 'umrah', 'hajj', 'student', 'work')),
  country text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'processing', 'stamped', 'rejected', 'delivered')),
  submission_date date,
  delivery_date date,
  visa_fee numeric(12,2) DEFAULT 0,
  service_charge numeric(12,2) DEFAULT 0,
  total_amount numeric(12,2) DEFAULT 0,
  cost_amount numeric(12,2) DEFAULT 0,
  profit numeric(12,2) DEFAULT 0,
  notes text DEFAULT '',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE visas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view visas" ON visas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Sales and above can manage visas" ON visas FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','sales_agent','tour_manager')));

-- Add Invoicing fields to existing tables if not present
ALTER TABLE air_tickets ADD COLUMN IF NOT EXISTS invoice_id text UNIQUE;
ALTER TABLE payment_receipts ADD COLUMN IF NOT EXISTS invoice_id text UNIQUE;

-- Payment Gateway Config Placeholder in Settings
-- This is handled via the 'settings' table JSON values
