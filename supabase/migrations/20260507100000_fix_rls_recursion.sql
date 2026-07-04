/*
  # Fix RLS recursion in profiles table
  
  1. New Functions
    - `get_my_role()`: Returns the role of the current authenticated user. Runs with SECURITY DEFINER to bypass RLS.
    - `has_role(text[])`: Checks if the current user has one of the specified roles.
  
  2. Changes
    - Update `profiles` table policies to use `get_my_role()` or `has_role()` instead of direct subqueries.
    - Update other table policies for consistency and performance.
*/

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

-- Drop existing problematic policies on profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can update any profile" ON profiles;

-- Re-create the policy using the helper function
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    has_role(ARRAY['super_admin', 'admin', 'hr_manager'])
  );

-- Allow Super Admins to update any profile (required for role management)
CREATE POLICY "Super admins can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (has_role(ARRAY['super_admin']))
  WITH CHECK (has_role(ARRAY['super_admin']));

-- Also update settings policies which were likely the trigger
DROP POLICY IF EXISTS "Super admin can manage settings" ON settings;
CREATE POLICY "Super admin can manage settings"
  ON settings FOR ALL TO authenticated
  USING (has_role(ARRAY['super_admin']))
  WITH CHECK (has_role(ARRAY['super_admin']));

-- Update other policies to be more efficient and consistent
-- Customers
DROP POLICY IF EXISTS "Sales and above can insert customers" ON customers;
CREATE POLICY "Sales and above can insert customers"
  ON customers FOR INSERT TO authenticated
  WITH CHECK (has_role(ARRAY['super_admin','admin','sales_agent','tour_manager','accounts_manager']));

DROP POLICY IF EXISTS "Sales and above can update customers" ON customers;
CREATE POLICY "Sales and above can update customers"
  ON customers FOR UPDATE TO authenticated
  USING (has_role(ARRAY['super_admin','admin','sales_agent','tour_manager','accounts_manager']))
  WITH CHECK (has_role(ARRAY['super_admin','admin','sales_agent','tour_manager','accounts_manager']));

-- B2B Agents
DROP POLICY IF EXISTS "Admin can manage b2b agents" ON b2b_agents;
CREATE POLICY "Admin can manage b2b agents"
  ON b2b_agents FOR INSERT TO authenticated
  WITH CHECK (has_role(ARRAY['super_admin','admin','sales_agent']));

DROP POLICY IF EXISTS "Admin can update b2b agents" ON b2b_agents;
CREATE POLICY "Admin can update b2b agents"
  ON b2b_agents FOR UPDATE TO authenticated
  USING (has_role(ARRAY['super_admin','admin','sales_agent']))
  WITH CHECK (has_role(ARRAY['super_admin','admin','sales_agent']));

-- Air Tickets
DROP POLICY IF EXISTS "Sales and above can insert tickets" ON air_tickets;
CREATE POLICY "Sales and above can insert tickets"
  ON air_tickets FOR INSERT TO authenticated
  WITH CHECK (has_role(ARRAY['super_admin','admin','sales_agent']));

DROP POLICY IF EXISTS "Sales and above can update tickets" ON air_tickets;
CREATE POLICY "Sales and above can update tickets"
  ON air_tickets FOR UPDATE TO authenticated
  USING (has_role(ARRAY['super_admin','admin','sales_agent']))
  WITH CHECK (has_role(ARRAY['super_admin','admin','sales_agent']));

-- Umrah Packages
DROP POLICY IF EXISTS "Tour manager can manage umrah packages" ON umrah_packages;
CREATE POLICY "Tour manager can manage umrah packages"
  ON umrah_packages FOR INSERT TO authenticated
  WITH CHECK (has_role(ARRAY['super_admin','admin','tour_manager']));

DROP POLICY IF EXISTS "Tour manager can update umrah packages" ON umrah_packages;
CREATE POLICY "Tour manager can update umrah packages"
  ON umrah_packages FOR UPDATE TO authenticated
  USING (has_role(ARRAY['super_admin','admin','tour_manager']))
  WITH CHECK (has_role(ARRAY['super_admin','admin','tour_manager']));

-- Umrah Groups
DROP POLICY IF EXISTS "Tour manager can insert umrah groups" ON umrah_groups;
CREATE POLICY "Tour manager can insert umrah groups"
  ON umrah_groups FOR INSERT TO authenticated
  WITH CHECK (has_role(ARRAY['super_admin','admin','tour_manager']));

DROP POLICY IF EXISTS "Tour manager can update umrah groups" ON umrah_groups;
CREATE POLICY "Tour manager can update umrah groups"
  ON umrah_groups FOR UPDATE TO authenticated
  USING (has_role(ARRAY['super_admin','admin','tour_manager']))
  WITH CHECK (has_role(ARRAY['super_admin','admin','tour_manager']));

-- Umrah Pilgrims
DROP POLICY IF EXISTS "Tour manager can insert umrah pilgrims" ON umrah_pilgrims;
CREATE POLICY "Tour manager can insert umrah pilgrims"
  ON umrah_pilgrims FOR INSERT TO authenticated
  WITH CHECK (has_role(ARRAY['super_admin','admin','tour_manager','sales_agent']));

DROP POLICY IF EXISTS "Tour manager can update umrah pilgrims" ON umrah_pilgrims;
CREATE POLICY "Tour manager can update umrah pilgrims"
  ON umrah_pilgrims FOR UPDATE TO authenticated
  USING (has_role(ARRAY['super_admin','admin','tour_manager','sales_agent']))
  WITH CHECK (has_role(ARRAY['super_admin','admin','tour_manager','sales_agent']));

-- Hajj Packages
DROP POLICY IF EXISTS "Admin can manage hajj packages" ON hajj_packages;
CREATE POLICY "Admin can manage hajj packages"
  ON hajj_packages FOR INSERT TO authenticated
  WITH CHECK (has_role(ARRAY['super_admin','admin','tour_manager']));

DROP POLICY IF EXISTS "Admin can update hajj packages" ON hajj_packages;
CREATE POLICY "Admin can update hajj packages"
  ON hajj_packages FOR UPDATE TO authenticated
  USING (has_role(ARRAY['super_admin','admin','tour_manager']))
  WITH CHECK (has_role(ARRAY['super_admin','admin','tour_manager']));

-- Hajj Pilgrims
DROP POLICY IF EXISTS "Tour manager can manage hajj pilgrims" ON hajj_pilgrims;
CREATE POLICY "Tour manager can manage hajj pilgrims"
  ON hajj_pilgrims FOR INSERT TO authenticated
  WITH CHECK (has_role(ARRAY['super_admin','admin','tour_manager']));

DROP POLICY IF EXISTS "Tour manager can update hajj pilgrims" ON hajj_pilgrims;
CREATE POLICY "Tour manager can update hajj pilgrims"
  ON hajj_pilgrims FOR UPDATE TO authenticated
  USING (has_role(ARRAY['super_admin','admin','tour_manager']))
  WITH CHECK (has_role(ARRAY['super_admin','admin','tour_manager']));

-- Tours
DROP POLICY IF EXISTS "Tour manager can manage tours" ON tours;
CREATE POLICY "Tour manager can manage tours"
  ON tours FOR INSERT TO authenticated
  WITH CHECK (has_role(ARRAY['super_admin','admin','tour_manager']));

DROP POLICY IF EXISTS "Tour manager can update tours" ON tours;
CREATE POLICY "Tour manager can update tours"
  ON tours FOR UPDATE TO authenticated
  USING (has_role(ARRAY['super_admin','admin','tour_manager']))
  WITH CHECK (has_role(ARRAY['super_admin','admin','tour_manager']));

-- Tour Bookings
DROP POLICY IF EXISTS "Sales can manage tour bookings" ON tour_bookings;
CREATE POLICY "Sales can manage tour bookings"
  ON tour_bookings FOR INSERT TO authenticated
  WITH CHECK (has_role(ARRAY['super_admin','admin','tour_manager','sales_agent']));

DROP POLICY IF EXISTS "Sales can update tour bookings" ON tour_bookings;
CREATE POLICY "Sales can update tour bookings"
  ON tour_bookings FOR UPDATE TO authenticated
  USING (has_role(ARRAY['super_admin','admin','tour_manager','sales_agent']))
  WITH CHECK (has_role(ARRAY['super_admin','admin','tour_manager','sales_agent']));

-- Employees
DROP POLICY IF EXISTS "HR can view all employees" ON employees;
CREATE POLICY "HR can view all employees"
  ON employees FOR SELECT TO authenticated
  USING (has_role(ARRAY['super_admin','admin','hr_manager','accounts_manager']));

DROP POLICY IF EXISTS "HR can insert employees" ON employees;
CREATE POLICY "HR can insert employees"
  ON employees FOR INSERT TO authenticated
  WITH CHECK (has_role(ARRAY['super_admin','admin','hr_manager']));

DROP POLICY IF EXISTS "HR can update employees" ON employees;
CREATE POLICY "HR can update employees"
  ON employees FOR UPDATE TO authenticated
  USING (has_role(ARRAY['super_admin','admin','hr_manager']))
  WITH CHECK (has_role(ARRAY['super_admin','admin','hr_manager']));

-- Attendance
DROP POLICY IF EXISTS "HR can view attendance" ON attendance;
CREATE POLICY "HR can view attendance"
  ON attendance FOR SELECT TO authenticated
  USING (has_role(ARRAY['super_admin','admin','hr_manager']));

DROP POLICY IF EXISTS "HR can manage attendance" ON attendance;
CREATE POLICY "HR can manage attendance"
  ON attendance FOR INSERT TO authenticated
  WITH CHECK (has_role(ARRAY['super_admin','admin','hr_manager']));

DROP POLICY IF EXISTS "HR can update attendance" ON attendance;
CREATE POLICY "HR can update attendance"
  ON attendance FOR UPDATE TO authenticated
  USING (has_role(ARRAY['super_admin','admin','hr_manager']))
  WITH CHECK (has_role(ARRAY['super_admin','admin','hr_manager']));

-- Leaves
DROP POLICY IF EXISTS "HR can view leaves" ON leaves;
CREATE POLICY "HR can view leaves"
  ON leaves FOR SELECT TO authenticated
  USING (has_role(ARRAY['super_admin','admin','hr_manager']));

DROP POLICY IF EXISTS "HR can manage leaves" ON leaves;
CREATE POLICY "HR can manage leaves"
  ON leaves FOR INSERT TO authenticated
  WITH CHECK (has_role(ARRAY['super_admin','admin','hr_manager']));

DROP POLICY IF EXISTS "HR can update leaves" ON leaves;
CREATE POLICY "HR can update leaves"
  ON leaves FOR UPDATE TO authenticated
  USING (has_role(ARRAY['super_admin','admin','hr_manager']))
  WITH CHECK (has_role(ARRAY['super_admin','admin','hr_manager']));

-- Accounts Vouchers
DROP POLICY IF EXISTS "Accounts can view vouchers" ON accounts_vouchers;
CREATE POLICY "Accounts can view vouchers"
  ON accounts_vouchers FOR SELECT TO authenticated
  USING (has_role(ARRAY['super_admin','admin','accounts_manager']));

DROP POLICY IF EXISTS "Accounts can insert vouchers" ON accounts_vouchers;
CREATE POLICY "Accounts can insert vouchers"
  ON accounts_vouchers FOR INSERT TO authenticated
  WITH CHECK (has_role(ARRAY['super_admin','admin','accounts_manager']));

DROP POLICY IF EXISTS "Accounts can update vouchers" ON accounts_vouchers;
CREATE POLICY "Accounts can update vouchers"
  ON accounts_vouchers FOR UPDATE TO authenticated
  USING (has_role(ARRAY['super_admin','admin','accounts_manager']))
  WITH CHECK (has_role(ARRAY['super_admin','admin','accounts_manager']));

-- CRM Leads
DROP POLICY IF EXISTS "Sales can view leads" ON crm_leads;
CREATE POLICY "Sales can view leads"
  ON crm_leads FOR SELECT TO authenticated
  USING (has_role(ARRAY['super_admin','admin','sales_agent','tour_manager']));

DROP POLICY IF EXISTS "Sales can insert leads" ON crm_leads;
CREATE POLICY "Sales can insert leads"
  ON crm_leads FOR INSERT TO authenticated
  WITH CHECK (has_role(ARRAY['super_admin','admin','sales_agent','tour_manager']));

DROP POLICY IF EXISTS "Sales can update leads" ON crm_leads;
CREATE POLICY "Sales can update leads"
  ON crm_leads FOR UPDATE TO authenticated
  USING (has_role(ARRAY['super_admin','admin','sales_agent','tour_manager']))
  WITH CHECK (has_role(ARRAY['super_admin','admin','sales_agent','tour_manager']));

-- Payment Receipts
DROP POLICY IF EXISTS "Accounts can view receipts" ON payment_receipts;
CREATE POLICY "Accounts can view receipts"
  ON payment_receipts FOR SELECT TO authenticated
  USING (has_role(ARRAY['super_admin','admin','accounts_manager','sales_agent','tour_manager']));

DROP POLICY IF EXISTS "Accounts can insert receipts" ON payment_receipts;
CREATE POLICY "Accounts can insert receipts"
  ON payment_receipts FOR INSERT TO authenticated
  WITH CHECK (has_role(ARRAY['super_admin','admin','accounts_manager','sales_agent','tour_manager']));

DROP POLICY IF EXISTS "Accounts can update receipts" ON payment_receipts;
CREATE POLICY "Accounts can update receipts"
  ON payment_receipts FOR UPDATE TO authenticated
  USING (has_role(ARRAY['super_admin','admin','accounts_manager']))
  WITH CHECK (has_role(ARRAY['super_admin','admin','accounts_manager']));

-- Payroll
DROP POLICY IF EXISTS "Accounts and HR can view payroll" ON payroll;
CREATE POLICY "Accounts and HR can view payroll"
  ON payroll FOR SELECT TO authenticated
  USING (has_role(ARRAY['super_admin', 'admin', 'hr_manager', 'accounts_manager']));

DROP POLICY IF EXISTS "HR can manage payroll" ON payroll;
CREATE POLICY "HR can manage payroll"
  ON payroll FOR INSERT TO authenticated
  WITH CHECK (has_role(ARRAY['super_admin', 'admin', 'hr_manager']));

DROP POLICY IF EXISTS "HR can update payroll" ON payroll;
CREATE POLICY "HR can update payroll"
  ON payroll FOR UPDATE TO authenticated
  USING (has_role(ARRAY['super_admin', 'admin', 'hr_manager']))
  WITH CHECK (has_role(ARRAY['super_admin', 'admin', 'hr_manager']));

-- Hajj Logistics
DROP POLICY IF EXISTS "Tour manager can manage logistics" ON hajj_logistics;
CREATE POLICY "Tour manager can manage logistics"
  ON hajj_logistics FOR INSERT TO authenticated
  WITH CHECK (has_role(ARRAY['super_admin', 'admin', 'tour_manager']));

DROP POLICY IF EXISTS "Tour manager can update logistics" ON hajj_logistics;
CREATE POLICY "Tour manager can update logistics"
  ON hajj_logistics FOR UPDATE TO authenticated
  USING (has_role(ARRAY['super_admin', 'admin', 'tour_manager']))
  WITH CHECK (has_role(ARRAY['super_admin', 'admin', 'tour_manager']));
