-- Migration: Add Payroll Table
-- Created at: 2026-05-11

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
  payment_mode text DEFAULT 'cash',
  created_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, month, year)
);

-- Enable RLS
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;

-- Policies for HR and Accounts to manage payroll
CREATE POLICY "HR and Accounts can view payroll"
  ON payroll FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','hr_manager','accounts_manager')));

CREATE POLICY "HR and Accounts can manage payroll"
  ON payroll FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','hr_manager','accounts_manager')));
