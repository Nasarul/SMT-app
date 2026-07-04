/*
  # Sonar Madina Travels (SMT) — Core Schema

  ## Overview
  Complete database schema for a Bangladesh-based travel agency management system.

  ## Tables Created
  1. profiles — User profiles linked to auth.users (roles: super_admin, admin, hr_manager, accounts_manager, sales_agent, tour_manager, b2b_agent, customer)
  2. customers — Individual customer records with NID/passport, Bangladesh address fields
  3. b2b_agents — Travel agency partners with ATAB/TOAB details and credit limits
  4. air_tickets — Air ticket records (individual and B2B group)
  5. umrah_packages — Umrah package definitions with pricing tiers
  6. umrah_groups — Umrah travel groups
  7. umrah_pilgrims — Individual pilgrim records for Umrah
  8. hajj_packages — Hajj package types (govt/private)
  9. hajj_pilgrims — Hajj pilgrim registrations
  10. tours — Tour package definitions
  11. tour_bookings — Tour booking records
  12. employees — HR employee profiles
  13. attendance — Daily attendance records
  14. leaves — Leave applications
  15. payroll — Monthly payroll records
  16. accounts_vouchers — Accounting voucher entries (PV/RV/JV/CV)
  17. crm_leads — CRM lead management
  18. sms_campaigns — Bulk SMS campaign records

  ## Security
  - RLS enabled on all tables
  - Authenticated users can read/write based on role (enforced at app level via profiles)
*/

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

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid()
      AND p.role IN ('super_admin','admin','hr_manager')
    )
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

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sales and above can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid()
      AND p.role IN ('super_admin','admin','sales_agent','tour_manager','accounts_manager')
    )
  );

CREATE POLICY "Sales and above can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid()
      AND p.role IN ('super_admin','admin','sales_agent','tour_manager','accounts_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid()
      AND p.role IN ('super_admin','admin','sales_agent','tour_manager','accounts_manager')
    )
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

ALTER TABLE b2b_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view b2b agents"
  ON b2b_agents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can manage b2b agents"
  ON b2b_agents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','sales_agent'))
  );

CREATE POLICY "Admin can update b2b agents"
  ON b2b_agents FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','sales_agent')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','sales_agent')));

-- Air Tickets table
CREATE TABLE IF NOT EXISTS air_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE DEFAULT ('TKT-' || to_char(now(), 'YYYYMMDD') || '-' || floor(random()*9000+1000)::text),
  ticket_type text DEFAULT 'individual' CHECK (ticket_type IN ('individual','b2b_group')),
  customer_id uuid REFERENCES customers(id),
  b2b_agent_id uuid REFERENCES b2b_agents(id),
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
  sales_agent_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE air_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view tickets"
  ON air_tickets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sales and above can insert tickets"
  ON air_tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','sales_agent'))
  );

CREATE POLICY "Sales and above can update tickets"
  ON air_tickets FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','sales_agent')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','sales_agent')));

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

ALTER TABLE umrah_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view umrah packages"
  ON umrah_packages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Tour manager can manage umrah packages"
  ON umrah_packages FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','tour_manager')));

CREATE POLICY "Tour manager can update umrah packages"
  ON umrah_packages FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','tour_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','tour_manager')));

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

ALTER TABLE umrah_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view umrah groups"
  ON umrah_groups FOR SELECT TO authenticated USING (true);

CREATE POLICY "Tour manager can insert umrah groups"
  ON umrah_groups FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','tour_manager')));

CREATE POLICY "Tour manager can update umrah groups"
  ON umrah_groups FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','tour_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','tour_manager')));

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

ALTER TABLE umrah_pilgrims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view umrah pilgrims"
  ON umrah_pilgrims FOR SELECT TO authenticated USING (true);

CREATE POLICY "Tour manager can insert umrah pilgrims"
  ON umrah_pilgrims FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','tour_manager','sales_agent')));

CREATE POLICY "Tour manager can update umrah pilgrims"
  ON umrah_pilgrims FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','tour_manager','sales_agent')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','tour_manager','sales_agent')));

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

ALTER TABLE hajj_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view hajj packages"
  ON hajj_packages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage hajj packages"
  ON hajj_packages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','tour_manager')));

CREATE POLICY "Admin can update hajj packages"
  ON hajj_packages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','tour_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','tour_manager')));

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

ALTER TABLE hajj_pilgrims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view hajj pilgrims"
  ON hajj_pilgrims FOR SELECT TO authenticated USING (true);

CREATE POLICY "Tour manager can manage hajj pilgrims"
  ON hajj_pilgrims FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','tour_manager')));

CREATE POLICY "Tour manager can update hajj pilgrims"
  ON hajj_pilgrims FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','tour_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','tour_manager')));

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

ALTER TABLE tours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view tours"
  ON tours FOR SELECT TO authenticated USING (true);

CREATE POLICY "Tour manager can manage tours"
  ON tours FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','tour_manager')));

CREATE POLICY "Tour manager can update tours"
  ON tours FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','tour_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','tour_manager')));

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

ALTER TABLE tour_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view tour bookings"
  ON tour_bookings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Sales can manage tour bookings"
  ON tour_bookings FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','tour_manager','sales_agent')));

CREATE POLICY "Sales can update tour bookings"
  ON tour_bookings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','tour_manager','sales_agent')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','tour_manager','sales_agent')));

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
  reporting_manager_id uuid REFERENCES employees(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can view all employees"
  ON employees FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','hr_manager','accounts_manager')));

CREATE POLICY "HR can insert employees"
  ON employees FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','hr_manager')));

CREATE POLICY "HR can update employees"
  ON employees FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','hr_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','hr_manager')));

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

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can view attendance"
  ON attendance FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','hr_manager')));

CREATE POLICY "HR can manage attendance"
  ON attendance FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','hr_manager')));

CREATE POLICY "HR can update attendance"
  ON attendance FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','hr_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','hr_manager')));

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

ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR can view leaves"
  ON leaves FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','hr_manager')));

CREATE POLICY "HR can manage leaves"
  ON leaves FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','hr_manager')));

CREATE POLICY "HR can update leaves"
  ON leaves FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','hr_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','hr_manager')));

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

ALTER TABLE accounts_vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accounts can view vouchers"
  ON accounts_vouchers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','accounts_manager')));

CREATE POLICY "Accounts can insert vouchers"
  ON accounts_vouchers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','accounts_manager')));

CREATE POLICY "Accounts can update vouchers"
  ON accounts_vouchers FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','accounts_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','accounts_manager')));

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

ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sales can view leads"
  ON crm_leads FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','sales_agent','tour_manager')));

CREATE POLICY "Sales can insert leads"
  ON crm_leads FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','sales_agent','tour_manager')));

CREATE POLICY "Sales can update leads"
  ON crm_leads FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','sales_agent','tour_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','sales_agent','tour_manager')));

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
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accounts can view receipts"
  ON payment_receipts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','accounts_manager','sales_agent','tour_manager')));

CREATE POLICY "Accounts can insert receipts"
  ON payment_receipts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','accounts_manager','sales_agent','tour_manager')));

CREATE POLICY "Accounts can update receipts"
  ON payment_receipts FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','accounts_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','accounts_manager')));

-- Insert demo data for profiles trigger
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

-- Payroll Records
CREATE TABLE IF NOT EXISTS payroll (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id),
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  year integer NOT NULL,
  basic_salary numeric(12,2) DEFAULT 0,
  house_rent numeric(12,2) DEFAULT 0,
  medical_allowance numeric(12,2) DEFAULT 0,
  transport_allowance numeric(12,2) DEFAULT 0,
  mobile_allowance numeric(12,2) DEFAULT 0,
  other_allowances numeric(12,2) DEFAULT 0,
  bonus numeric(12,2) DEFAULT 0,
  deductions numeric(12,2) DEFAULT 0,
  net_payable numeric(12,2) NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'paid')),
  paid_at timestamptz,
  payment_mode text DEFAULT 'bank' CHECK (payment_mode IN ('cash', 'bank', 'bkash', 'nagad')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, month, year)
);

ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accounts and HR can view payroll"
  ON payroll FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'admin', 'hr_manager', 'accounts_manager')));

CREATE POLICY "HR can manage payroll"
  ON payroll FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'admin', 'hr_manager')));

CREATE POLICY "HR can update payroll"
  ON payroll FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'admin', 'hr_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'admin', 'hr_manager')));

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

ALTER TABLE hajj_logistics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view logistics"
  ON hajj_logistics FOR SELECT TO authenticated USING (true);

CREATE POLICY "Tour manager can manage logistics"
  ON hajj_logistics FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'admin', 'tour_manager')));

CREATE POLICY "Tour manager can update logistics"
  ON hajj_logistics FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'admin', 'tour_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin', 'admin', 'tour_manager')));

-- System Settings
CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view settings"
  ON settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admin can manage settings"
  ON settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'super_admin'));

-- Default Settings
INSERT INTO settings (key, value) VALUES 
('company', '{"name": "Sonar Madina Travels", "tagline": "Your Trusted Hajj & Umrah Partner", "address": "Dhaka, Bangladesh", "phone": "+880 1XXX XXXXXX", "email": "info@sonarmadina.com"}'),
('sms_gateway', '{"provider": "SSL Wireless", "api_key": "", "sid": "", "is_enabled": false}')
ON CONFLICT (key) DO NOTHING;
