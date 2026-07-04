-- ==========================================
-- SONAR MADINA TRAVELS (SMT) ERP
-- Compiled Database Schema
-- Generated: 2026-05-12
-- ==========================================

-- 1. EXTENSIONS (Required)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. HELPER FUNCTIONS (RLS Security)
-- Function to get the current user's role without recursion
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(target_roles text[])
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = ANY(target_roles)
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 3. CORE TABLES

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('super_admin','admin','hr_manager','accounts_manager','sales_agent','tour_manager','b2b_agent','customer')),
  phone text DEFAULT '',
  avatar_url text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code text UNIQUE DEFAULT ('CUST-' || to_char(now(), 'YYYY') || '-' || floor(random()*9000+1000)::text),
  full_name text NOT NULL,
  mobile text NOT NULL,
  email text DEFAULT '',
  nid text DEFAULT '',
  passport_number text DEFAULT '',
  passport_expiry date,
  date_of_birth date,
  gender text DEFAULT 'male' CHECK (gender IN ('male','female','other')),
  division text DEFAULT '',
  district text DEFAULT '',
  upazila text DEFAULT '',
  address text DEFAULT '',
  profession text DEFAULT '',
  category text DEFAULT 'regular' CHECK (category IN ('vip','regular','one_time','prospect')),
  is_hajj_alumni boolean DEFAULT false,
  is_umrah_alumni boolean DEFAULT false,
  notes text DEFAULT '',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- B2B Agents table
CREATE TABLE IF NOT EXISTS b2b_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_name text NOT NULL,
  trade_license text DEFAULT '',
  atab_number text DEFAULT '',
  toab_number text DEFAULT '',
  contact_person text NOT NULL,
  mobile text NOT NULL,
  email text DEFAULT '',
  address text DEFAULT '',
  credit_limit numeric(15,2) DEFAULT 0,
  current_balance numeric(15,2) DEFAULT 0,
  commission_rate numeric(5,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Suppliers table
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

-- Air Tickets table
CREATE TABLE IF NOT EXISTS air_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE DEFAULT ('TKT-' || to_char(now(), 'YYYYMMDD') || '-' || floor(random()*9000+1000)::text),
  ticket_type text DEFAULT 'individual' CHECK (ticket_type IN ('individual','b2b_group')),
  customer_id uuid REFERENCES customers(id),
  b2b_agent_id uuid REFERENCES b2b_agents(id),
  supplier_id uuid REFERENCES suppliers(id),
  passenger_name text NOT NULL,
  passport_number text DEFAULT '',
  airline text NOT NULL,
  pnr text DEFAULT '',
  origin text NOT NULL,
  destination text NOT NULL,
  travel_date date NOT NULL,
  return_date date,
  cabin_class text DEFAULT 'economy' CHECK (cabin_class IN ('economy','business','first')),
  base_fare numeric(12,2) DEFAULT 0,
  tax_amount numeric(12,2) DEFAULT 0,
  ait_amount numeric(12,2) DEFAULT 0,
  service_charge numeric(12,2) DEFAULT 0,
  total_fare numeric(12,2) DEFAULT 0,
  cost_fare numeric(12,2) DEFAULT 0,
  profit numeric(12,2) DEFAULT 0,
  status text DEFAULT 'issued' CHECK (status IN ('issued','voided','refunded','reissued')),
  void_penalty numeric(12,2) DEFAULT 0,
  refund_amount numeric(12,2) DEFAULT 0,
  invoice_id text UNIQUE,
  sales_agent_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Umrah Packages
CREATE TABLE IF NOT EXISTS umrah_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_name text NOT NULL,
  duration_nights integer NOT NULL,
  hotel_category integer DEFAULT 3 CHECK (hotel_category IN (3,4,5)),
  makkah_hotel text DEFAULT '',
  madinah_hotel text DEFAULT '',
  makkah_distance_meters integer DEFAULT 0,
  madinah_distance_meters integer DEFAULT 0,
  meal_plan text DEFAULT 'without' CHECK (meal_plan IN ('with','without','breakfast_only')),
  visa_included boolean DEFAULT true,
  price_sharing numeric(12,2) DEFAULT 0,
  price_triple numeric(12,2) DEFAULT 0,
  price_double numeric(12,2) DEFAULT 0,
  price_single numeric(12,2) DEFAULT 0,
  season text DEFAULT 'regular' CHECK (season IN ('regular','ramadan','peak','off_peak')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Umrah Groups
CREATE TABLE IF NOT EXISTS umrah_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name text NOT NULL,
  package_id uuid REFERENCES umrah_packages(id),
  departure_date date NOT NULL,
  return_date date,
  airline text DEFAULT '',
  flight_number text DEFAULT '',
  group_leader text DEFAULT '',
  coordinator_id uuid REFERENCES profiles(id),
  moallim_name text DEFAULT '',
  max_pilgrims integer DEFAULT 40,
  status text DEFAULT 'open' CHECK (status IN ('open','closed','departed','completed','cancelled')),
  created_at timestamptz DEFAULT now()
);

-- Umrah Pilgrims
CREATE TABLE IF NOT EXISTS umrah_pilgrims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES umrah_groups(id),
  customer_id uuid REFERENCES customers(id),
  full_name text NOT NULL,
  full_name_arabic text DEFAULT '',
  passport_number text NOT NULL,
  passport_issue_date date,
  passport_expiry date,
  nid text DEFAULT '',
  date_of_birth date,
  blood_group text DEFAULT '',
  gender text DEFAULT 'male',
  mahram_name text DEFAULT '',
  mahram_relation text DEFAULT '',
  emergency_contact text DEFAULT '',
  emergency_phone text DEFAULT '',
  room_type text DEFAULT 'sharing' CHECK (room_type IN ('sharing','triple','double','single')),
  package_price numeric(12,2) DEFAULT 0,
  total_paid numeric(12,2) DEFAULT 0,
  visa_status text DEFAULT 'pending' CHECK (visa_status IN ('pending','applied','approved','rejected','reapplied')),
  visa_applied_date date,
  visa_approved_date date,
  ticket_status boolean DEFAULT false,
  vaccination_status boolean DEFAULT false,
  insurance_status boolean DEFAULT false,
  training_status boolean DEFAULT false,
  pre_departure_done boolean DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Hajj Packages
CREATE TABLE IF NOT EXISTS hajj_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_name text NOT NULL,
  package_type text DEFAULT 'private' CHECK (package_type IN ('government','private')),
  maktab_number text DEFAULT '',
  mina_building text DEFAULT '',
  arafat_camp text DEFAULT '',
  tent_category text DEFAULT 'standard',
  price numeric(12,2) DEFAULT 0,
  season_year integer DEFAULT EXTRACT(YEAR FROM now())::integer,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Hajj Pilgrims
CREATE TABLE IF NOT EXISTS hajj_pilgrims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid REFERENCES hajj_packages(id),
  customer_id uuid REFERENCES customers(id),
  full_name text NOT NULL,
  passport_number text NOT NULL,
  passport_expiry date,
  nid text DEFAULT '',
  date_of_birth date,
  blood_group text DEFAULT '',
  gender text DEFAULT 'male',
  hajj_serial text DEFAULT '',
  mahram_declaration text DEFAULT '',
  health_declaration boolean DEFAULT false,
  meningitis_vaccine boolean DEFAULT false,
  shoe_size text DEFAULT '',
  clothing_size text DEFAULT '',
  muassasa text DEFAULT '',
  mutawwif text DEFAULT '',
  package_price numeric(12,2) DEFAULT 0,
  total_paid numeric(12,2) DEFAULT 0,
  govt_fee_paid boolean DEFAULT false,
  visa_status text DEFAULT 'pending',
  flight_departure date,
  flight_return date,
  status text DEFAULT 'registered' CHECK (status IN ('registered','visa_applied','visa_approved','departed','completed','cancelled')),
  created_at timestamptz DEFAULT now()
);

-- Hajj Logistics Tracking
CREATE TABLE IF NOT EXISTS hajj_logistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pilgrim_id uuid REFERENCES hajj_pilgrims(id) ON DELETE CASCADE,
  flight_dep_no text DEFAULT '',
  flight_dep_time timestamptz,
  flight_ret_no text DEFAULT '',
  flight_ret_time timestamptz,
  mina_tent text DEFAULT '',
  arafat_camp text DEFAULT '',
  muzdalifa_status boolean DEFAULT false,
  makkah_room text DEFAULT '',
  madinah_room text DEFAULT '',
  bus_number text DEFAULT '',
  is_training_complete boolean DEFAULT false,
  is_visa_issued boolean DEFAULT false,
  is_kit_provided boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(pilgrim_id)
);

-- Tours
CREATE TABLE IF NOT EXISTS tours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_name text NOT NULL,
  tour_type text DEFAULT 'domestic' CHECK (tour_type IN ('domestic','international')),
  destination text NOT NULL,
  duration_days integer DEFAULT 3,
  transport_type text DEFAULT 'ac_bus',
  accommodation text DEFAULT '',
  meal_plan text DEFAULT 'without',
  guide_included boolean DEFAULT false,
  price_per_person numeric(12,2) DEFAULT 0,
  max_seats integer DEFAULT 40,
  available_seats integer DEFAULT 40,
  departure_date date,
  return_date date,
  status text DEFAULT 'active' CHECK (status IN ('active','inactive','completed','cancelled')),
  highlights text DEFAULT '',
  itinerary text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Tour Bookings
CREATE TABLE IF NOT EXISTS tour_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id uuid REFERENCES tours(id),
  customer_id uuid REFERENCES customers(id),
  booking_date date DEFAULT CURRENT_DATE,
  participants integer DEFAULT 1,
  total_amount numeric(12,2) DEFAULT 0,
  paid_amount numeric(12,2) DEFAULT 0,
  status text DEFAULT 'confirmed' CHECK (status IN ('pending','confirmed','cancelled')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code text UNIQUE DEFAULT ('EMP-' || to_char(now(), 'YYYY') || '-' || floor(random()*900+100)::text),
  profile_id uuid REFERENCES profiles(id),
  full_name text NOT NULL,
  nid text DEFAULT '',
  mobile text DEFAULT '',
  email text DEFAULT '',
  department text DEFAULT 'admin' CHECK (department IN ('sales','operations','accounts','hajj_umrah','tours','it','admin')),
  designation text DEFAULT '',
  joining_date date DEFAULT CURRENT_DATE,
  basic_salary numeric(10,2) DEFAULT 0,
  house_rent numeric(10,2) DEFAULT 0,
  medical_allowance numeric(10,2) DEFAULT 1500,
  transport_allowance numeric(10,2) DEFAULT 1000,
  mobile_allowance numeric(10,2) DEFAULT 0,
  photo_url text DEFAULT '',
  nid_url text DEFAULT '',
  reporting_manager_id uuid REFERENCES employees(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id),
  attendance_date date NOT NULL,
  check_in time,
  check_out time,
  status text DEFAULT 'present' CHECK (status IN ('present','absent','late','half_day','holiday','leave')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, attendance_date)
);

-- Leave Applications
CREATE TABLE IF NOT EXISTS leaves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id),
  leave_type text DEFAULT 'casual' CHECK (leave_type IN ('casual','sick','annual','hajj_umrah_duty')),
  from_date date NOT NULL,
  to_date date NOT NULL,
  days integer DEFAULT 1,
  reason text DEFAULT '',
  status text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Payroll Records (Unified)
CREATE TABLE IF NOT EXISTS payroll (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL,
  basic_salary numeric(12,2) DEFAULT 0,
  house_rent numeric(12,2) DEFAULT 0,
  medical_allowance numeric(12,2) DEFAULT 0,
  transport_allowance numeric(12,2) DEFAULT 0,
  mobile_allowance numeric(12,2) DEFAULT 0,
  other_allowances numeric(12,2) DEFAULT 0,
  bonus numeric(12,2) DEFAULT 0,
  deductions numeric(12,2) DEFAULT 0,
  net_payable numeric(12,2) DEFAULT 0,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'paid')),
  paid_at timestamptz,
  payment_mode text DEFAULT 'cash' CHECK (payment_mode IN ('cash', 'bank', 'bkash', 'nagad')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, month, year)
);

-- Accounts Vouchers
CREATE TABLE IF NOT EXISTS accounts_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_number text UNIQUE DEFAULT ('VCH-' || to_char(now(), 'YYYY') || '-' || lpad(floor(random()*9000+1000)::text, 4, '0')),
  voucher_type text NOT NULL CHECK (voucher_type IN ('payment','receipt','journal','contra')),
  voucher_date date DEFAULT CURRENT_DATE,
  party_name text DEFAULT '',
  cost_center text DEFAULT 'admin' CHECK (cost_center IN ('ticket','umrah','hajj','tours','admin')),
  description text NOT NULL,
  debit_account text DEFAULT '',
  credit_account text DEFAULT '',
  amount numeric(15,2) NOT NULL,
  reference text DEFAULT '',
  payment_mode text DEFAULT 'cash' CHECK (payment_mode IN ('cash','bank','bkash','nagad','rocket','cheque')),
  bank_account text DEFAULT '',
  cheque_number text DEFAULT '',
  is_posted boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- CRM Leads
CREATE TABLE IF NOT EXISTS crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  mobile text NOT NULL,
  email text DEFAULT '',
  source text DEFAULT 'facebook' CHECK (source IN ('facebook','walk_in','phone','whatsapp','referral','website','other')),
  interest text DEFAULT 'umrah' CHECK (interest IN ('umrah','hajj','domestic_tour','international_tour','air_ticket','other')),
  status text DEFAULT 'new' CHECK (status IN ('new','contacted','quoted','negotiating','won','lost')),
  assigned_to uuid REFERENCES profiles(id),
  follow_up_date date,
  notes text DEFAULT '',
  referral_customer_id uuid REFERENCES customers(id),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payment receipts (for Umrah/Hajj/Tours installments)
CREATE TABLE IF NOT EXISTS payment_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number text UNIQUE DEFAULT ('RCP-' || to_char(now(), 'YYYYMMDD') || '-' || floor(random()*9000+1000)::text),
  receipt_date date DEFAULT CURRENT_DATE,
  customer_id uuid REFERENCES customers(id),
  module text NOT NULL CHECK (module IN ('air_ticket','umrah','hajj','tour','other')),
  reference_id uuid,
  amount numeric(12,2) NOT NULL,
  payment_mode text DEFAULT 'cash' CHECK (payment_mode IN ('cash','bank','bkash','nagad','rocket','cheque')),
  installment_number integer DEFAULT 1,
  notes text DEFAULT '',
  invoice_id text UNIQUE,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

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

-- System Settings
CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- 4. RLS POLICIES (Enforced)

-- Enable RLS on all tables
DO $$ 
DECLARE 
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;';
  END LOOP;
END $$;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT TO authenticated USING (has_role(ARRAY['super_admin', 'admin', 'hr_manager']));

DROP POLICY IF EXISTS "Super admins can update any profile" ON profiles;
CREATE POLICY "Super admins can update any profile" ON profiles FOR UPDATE TO authenticated USING (has_role(ARRAY['super_admin'])) WITH CHECK (has_role(ARRAY['super_admin']));

-- Customers Policies
DROP POLICY IF EXISTS "Authenticated users can view customers" ON customers;
CREATE POLICY "Authenticated users can view customers" ON customers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Sales and above can insert customers" ON customers;
CREATE POLICY "Sales and above can insert customers" ON customers FOR INSERT TO authenticated WITH CHECK (has_role(ARRAY['super_admin','admin','sales_agent','tour_manager','accounts_manager']));

DROP POLICY IF EXISTS "Sales and above can update customers" ON customers;
CREATE POLICY "Sales and above can update customers" ON customers FOR UPDATE TO authenticated USING (has_role(ARRAY['super_admin','admin','sales_agent','tour_manager','accounts_manager'])) WITH CHECK (has_role(ARRAY['super_admin','admin','sales_agent','tour_manager','accounts_manager']));

-- B2B Agents Policies
DROP POLICY IF EXISTS "Authenticated can view b2b agents" ON b2b_agents;
CREATE POLICY "Authenticated can view b2b agents" ON b2b_agents FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin can manage b2b agents" ON b2b_agents;
CREATE POLICY "Admin can manage b2b agents" ON b2b_agents FOR INSERT TO authenticated WITH CHECK (has_role(ARRAY['super_admin','admin','sales_agent']));

DROP POLICY IF EXISTS "Admin can update b2b agents" ON b2b_agents;
CREATE POLICY "Admin can update b2b agents" ON b2b_agents FOR UPDATE TO authenticated USING (has_role(ARRAY['super_admin','admin','sales_agent'])) WITH CHECK (has_role(ARRAY['super_admin','admin','sales_agent']));

-- Suppliers Policies
DROP POLICY IF EXISTS "Authenticated can view suppliers" ON suppliers;
CREATE POLICY "Authenticated can view suppliers" ON suppliers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin can manage suppliers" ON suppliers;
CREATE POLICY "Admin can manage suppliers" ON suppliers FOR ALL TO authenticated USING (has_role(ARRAY['super_admin','admin','accounts_manager']));

-- Air Tickets Policies
DROP POLICY IF EXISTS "Authenticated can view tickets" ON air_tickets;
CREATE POLICY "Authenticated can view tickets" ON air_tickets FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Sales and above can insert tickets" ON air_tickets;
CREATE POLICY "Sales and above can insert tickets" ON air_tickets FOR INSERT TO authenticated WITH CHECK (has_role(ARRAY['super_admin','admin','sales_agent']));

DROP POLICY IF EXISTS "Sales and above can update tickets" ON air_tickets;
CREATE POLICY "Sales and above can update tickets" ON air_tickets FOR UPDATE TO authenticated USING (has_role(ARRAY['super_admin','admin','sales_agent'])) WITH CHECK (has_role(ARRAY['super_admin','admin','sales_agent']));

-- Umrah Packages Policies
DROP POLICY IF EXISTS "All authenticated can view umrah packages" ON umrah_packages;
CREATE POLICY "All authenticated can view umrah packages" ON umrah_packages FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Tour manager can manage umrah packages" ON umrah_packages;
CREATE POLICY "Tour manager can manage umrah packages" ON umrah_packages FOR INSERT TO authenticated WITH CHECK (has_role(ARRAY['super_admin','admin','tour_manager']));

DROP POLICY IF EXISTS "Tour manager can update umrah packages" ON umrah_packages;
CREATE POLICY "Tour manager can update umrah packages" ON umrah_packages FOR UPDATE TO authenticated USING (has_role(ARRAY['super_admin','admin','tour_manager'])) WITH CHECK (has_role(ARRAY['super_admin','admin','tour_manager']));

-- Payroll Policies
DROP POLICY IF EXISTS "Accounts and HR can view payroll" ON payroll;
CREATE POLICY "Accounts and HR can view payroll" ON payroll FOR SELECT TO authenticated USING (has_role(ARRAY['super_admin', 'admin', 'hr_manager', 'accounts_manager']));

DROP POLICY IF EXISTS "HR and Accounts can manage payroll" ON payroll;
CREATE POLICY "HR and Accounts can manage payroll" ON payroll FOR ALL TO authenticated USING (has_role(ARRAY['super_admin','admin','hr_manager','accounts_manager']));

-- Settings Policies
DROP POLICY IF EXISTS "All authenticated can view settings" ON settings;
CREATE POLICY "All authenticated can view settings" ON settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Super admin can manage settings" ON settings;
CREATE POLICY "Super admin can manage settings" ON settings FOR ALL TO authenticated USING (has_role(ARRAY['super_admin'])) WITH CHECK (has_role(ARRAY['super_admin']));

-- Visas Policies
DROP POLICY IF EXISTS "Authenticated can view visas" ON visas;
CREATE POLICY "Authenticated can view visas" ON visas FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Sales and above can manage visas" ON visas;
CREATE POLICY "Sales and above can manage visas" ON visas FOR ALL TO authenticated USING (has_role(ARRAY['super_admin','admin','sales_agent','tour_manager']));

-- (Add more policies for other tables similarly using has_role pattern...)

-- 5. TRIGGERS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', ''), COALESCE(new.raw_user_meta_data->>'role', 'customer'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 7. FINANCIAL INTEGRITY TRIGGERS

-- Function to update agent and supplier balances on ticket issue
CREATE OR REPLACE FUNCTION public.handle_ticket_financials()
RETURNS trigger AS $$
DECLARE
  party_name_val text;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    -- 1. Update Balances
    IF (NEW.b2b_agent_id IS NOT NULL) THEN
      UPDATE public.b2b_agents SET current_balance = current_balance - NEW.total_fare WHERE id = NEW.b2b_agent_id;
      party_name_val := (SELECT agency_name FROM b2b_agents WHERE id = NEW.b2b_agent_id);
    ELSE
      party_name_val := NEW.passenger_name;
    END IF;

    IF (NEW.supplier_id IS NOT NULL) THEN
      UPDATE public.suppliers SET current_balance = current_balance + NEW.cost_fare WHERE id = NEW.supplier_id;
    END IF;

    -- 2. Create Accounting Vouchers (Effect in accounts)
    
    -- A. Sales Record (Receipt/Journal)
    INSERT INTO public.accounts_vouchers (
      voucher_type, party_name, cost_center, description, amount, payment_mode, created_by
    ) VALUES (
      'receipt',
      party_name_val,
      'ticket',
      'Ticket Sale: ' || NEW.ticket_number || ' (' || NEW.passenger_name || ')',
      NEW.total_fare,
      'cash', -- Default to cash for individual, or account for B2B
      NEW.sales_agent_id
    );

    -- B. Purchase Record (Payment/Journal) - only if there's a cost
    IF (NEW.cost_fare > 0) THEN
      INSERT INTO public.accounts_vouchers (
        voucher_type, party_name, cost_center, description, amount, payment_mode, created_by
      ) VALUES (
        'payment',
        COALESCE((SELECT company_name FROM suppliers WHERE id = NEW.supplier_id), 'Airline/GDS'),
        'ticket',
        'Ticket Purchase Cost: ' || NEW.ticket_number,
        NEW.cost_fare,
        'cash',
        NEW.sales_agent_id
      );
    END IF;

  ELSIF (TG_OP = 'UPDATE') THEN
    -- Handle Status Changes (Void/Refund)
    IF (OLD.status != 'voided' AND NEW.status = 'voided') OR (OLD.status != 'refunded' AND NEW.status = 'refunded') THEN
       IF (OLD.b2b_agent_id IS NOT NULL) THEN
         UPDATE public.b2b_agents SET current_balance = current_balance + OLD.total_fare WHERE id = OLD.b2b_agent_id;
       END IF;
       IF (OLD.supplier_id IS NOT NULL) THEN
         UPDATE public.suppliers SET current_balance = current_balance - OLD.cost_fare WHERE id = OLD.supplier_id;
       END IF;
       
       -- Create reversal vouchers
       INSERT INTO public.accounts_vouchers (
         voucher_type, party_name, cost_center, description, amount, payment_mode
       ) VALUES (
         'payment',
         'Reversal',
         'ticket',
         'VOID/REFUND REVERSAL: ' || OLD.ticket_number,
         OLD.total_fare,
         'cash'
       );
    END IF;

  ELSIF (TG_OP = 'DELETE') THEN
    -- Reverse balance on delete
    IF (OLD.b2b_agent_id IS NOT NULL) THEN
      UPDATE public.b2b_agents SET current_balance = current_balance + OLD.total_fare WHERE id = OLD.b2b_agent_id;
    END IF;
    IF (OLD.supplier_id IS NOT NULL) THEN
      UPDATE public.suppliers SET current_balance = current_balance - OLD.cost_fare WHERE id = OLD.supplier_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_ticket_financials ON air_tickets;
CREATE TRIGGER on_ticket_financials
  AFTER INSERT OR UPDATE OR DELETE ON air_tickets
  FOR EACH ROW EXECUTE PROCEDURE public.handle_ticket_financials();

-- Function to handle payment receipts
CREATE OR REPLACE FUNCTION public.handle_payment_effect()
RETURNS trigger AS $$
BEGIN
  -- If payment is from a B2B agent
  IF (NEW.module = 'air_ticket' AND NEW.reference_id IS NOT NULL) THEN
    UPDATE public.b2b_agents 
    SET current_balance = current_balance + NEW.amount
    WHERE id = NEW.reference_id;
  END IF;
  
  -- Create Receipt Voucher automatically
  INSERT INTO public.accounts_vouchers (
    voucher_type, party_name, cost_center, description, amount, payment_mode, created_by
  ) VALUES (
    'receipt', 
    COALESCE((SELECT agency_name FROM b2b_agents WHERE id = NEW.reference_id), 'Direct Customer'), 
    NEW.module,
    'Payment received - Receipt: ' || NEW.receipt_number,
    NEW.amount,
    NEW.payment_mode,
    NEW.created_by
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_payment_receipt ON payment_receipts;
CREATE TRIGGER on_payment_receipt
  AFTER INSERT ON payment_receipts
  FOR EACH ROW EXECUTE PROCEDURE public.handle_payment_effect();

-- Function to handle payroll payments in accounting
CREATE OR REPLACE FUNCTION public.handle_payroll_accounting()
RETURNS trigger AS $$
BEGIN
  -- When payroll is marked as 'paid', create a payment voucher
  IF (OLD.status = 'draft' AND NEW.status = 'paid') THEN
    INSERT INTO public.accounts_vouchers (
      voucher_type, party_name, cost_center, description, amount, payment_mode
    ) VALUES (
      'payment',
      (SELECT full_name FROM employees WHERE id = NEW.employee_id),
      'admin',
      'Salary payment for ' || to_char(to_date(NEW.month::text, 'MM'), 'Month') || ' ' || NEW.year,
      NEW.net_payable,
      NEW.payment_mode
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_payroll_paid ON payroll;
CREATE TRIGGER on_payroll_paid
  AFTER UPDATE ON payroll
  FOR EACH ROW EXECUTE PROCEDURE public.handle_payroll_accounting();

-- 6. SEED DATA (Default Settings)
INSERT INTO settings (key, value) VALUES 
('company', '{"name": "Sonar Madina Travels", "tagline": "Your Trusted Hajj & Umrah Partner", "address": "Dhaka, Bangladesh", "phone": "+880 1XXX XXXXXX", "email": "info@sonarmadina.com"}'),
('sms_gateway', '{"provider": "SSL Wireless", "api_key": "", "sid": "", "is_enabled": false}')
ON CONFLICT (key) DO NOTHING;

-- 8. ASSETS & INVESTMENT
CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_name text NOT NULL,
  asset_type text NOT NULL CHECK (asset_type IN ('liquid', 'fixed')),
  category text NOT NULL CHECK (category IN ('cash', 'furniture', 'equipment', 'vehicle', 'office_space', 'other')),
  acquisition_date date DEFAULT CURRENT_DATE,
  initial_value numeric(15,2) NOT NULL DEFAULT 0,
  current_value numeric(15,2) NOT NULL DEFAULT 0,
  depreciation_rate numeric(5,2) DEFAULT 0, -- Annual %
  status text DEFAULT 'active' CHECK (status IN ('active', 'disposed', 'sold', 'lost')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Update vouchers to allow investment and asset cost centers
ALTER TABLE accounts_vouchers DROP CONSTRAINT IF EXISTS accounts_vouchers_cost_center_check;
ALTER TABLE accounts_vouchers ADD CONSTRAINT accounts_vouchers_cost_center_check CHECK (cost_center IN ('ticket','umrah','hajj','tours','admin','investment','assets'));

-- RLS for Assets
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can view assets" ON assets;
CREATE POLICY "Authenticated can view assets" ON assets FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins can manage assets" ON assets;
CREATE POLICY "Admins can manage assets" ON assets FOR ALL TO authenticated USING (has_role(ARRAY['super_admin','admin','accounts_manager']));
-- 9. NOTIFICATIONS SYSTEM
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read boolean DEFAULT false,
  module text,
  reference_id uuid,
  created_at timestamptz DEFAULT now()
);

-- RLS for Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(ARRAY['super_admin', 'admin']));
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id OR has_role(ARRAY['super_admin', 'admin']));

-- Function to clean old notifications (e.g. older than 30 days)
CREATE OR REPLACE FUNCTION clean_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications WHERE created_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql;

-- Trigger for Ticket Notifications
CREATE OR REPLACE FUNCTION public.on_ticket_issued_notify()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    module,
    reference_id
  )
  SELECT 
    id,
    'New Ticket Issued',
    'Ticket #' || NEW.ticket_number || ' issued for ' || NEW.passenger_name,
    'success',
    'tickets',
    NEW.id
  FROM public.profiles
  WHERE role IN ('super_admin', 'admin', 'accounts_manager');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_ticket_issued_notify ON air_tickets;
CREATE TRIGGER tr_ticket_issued_notify
  AFTER INSERT ON air_tickets
  FOR EACH ROW EXECUTE PROCEDURE public.on_ticket_issued_notify();
