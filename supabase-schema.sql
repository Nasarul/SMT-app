-- Migration script for SMT Appwrite to Supabase
-- Copy and paste this entirely into the Supabase SQL Editor and click 'RUN'.

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'hr_manager', 'accounts_manager', 'sales_agent', 'tour_manager', 'b2b_agent', 'customer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Profiles (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name text NOT NULL,
  username text,
  role user_role DEFAULT 'customer',
  phone text,
  address text,
  avatar_url text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Core CRM Tables
CREATE TABLE IF NOT EXISTS customers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name text NOT NULL,
  mobile text NOT NULL,
  email text,
  address text,
  passport_number text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name text NOT NULL,
  contact_person text,
  mobile text,
  email text,
  current_balance numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS b2b_agents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_name text NOT NULL,
  mobile text,
  email text,
  current_balance numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- 4. Tickets (The most important table!)
CREATE TABLE IF NOT EXISTS air_tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number text NOT NULL,
  passenger_name text NOT NULL,
  passport_number text,
  airline text NOT NULL,
  pnr text,
  origin text,
  destination text,
  travel_date text,
  return_date text,
  cabin_class text,
  base_fare numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  ait_amount numeric DEFAULT 0,
  service_charge numeric DEFAULT 0,
  total_fare numeric DEFAULT 0,
  cost_fare numeric DEFAULT 0,
  profit numeric DEFAULT 0,
  status text DEFAULT 'Issued',
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  ticket_type text DEFAULT 'individual',
  sales_agent_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- 5. Accounts & Vouchers
CREATE TABLE IF NOT EXISTS accounts_vouchers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  voucher_no text,
  voucher_date text,
  amount numeric DEFAULT 0,
  type text,
  description text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_name text,
  asset_type text DEFAULT 'liquid',
  current_value numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- 6. HR & Payroll
CREATE TABLE IF NOT EXISTS employees (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_code text,
  full_name text NOT NULL,
  department text,
  designation text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payroll (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  salary_month text,
  amount numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  attendance_date text,
  status text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leaves (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  from_date text,
  to_date text,
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now()
);

-- 7. Umrah, Hajj & Tours
CREATE TABLE IF NOT EXISTS umrah_groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_name text NOT NULL,
  status text DEFAULT 'open',
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS umrah_pilgrims (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  package_price numeric DEFAULT 0,
  total_paid numeric DEFAULT 0,
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hajj_pilgrims (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  package_price numeric DEFAULT 0,
  total_paid numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tours (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_name text NOT NULL,
  status text DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tour_bookings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  tour_id uuid REFERENCES tours(id) ON DELETE CASCADE,
  total_amount numeric DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS visas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  country text,
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now()
);

-- 8. Misc
CREATE TABLE IF NOT EXISTS crm_leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name text,
  mobile text,
  status text DEFAULT 'new',
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  message text,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text UNIQUE,
  value jsonb,
  created_at timestamp with time zone DEFAULT now()
);
