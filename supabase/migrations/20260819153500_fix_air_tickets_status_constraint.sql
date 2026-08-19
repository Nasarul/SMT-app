-- Fix air_tickets constraints for status, cabin_class, and ticket_type

-- 1. Status Check Constraint (Permit: issued, hold, voided, refunded, reissued, confirmed, booked, pending, cancelled)
ALTER TABLE public.air_tickets DROP CONSTRAINT IF EXISTS air_tickets_status_check;

ALTER TABLE public.air_tickets 
  ADD CONSTRAINT air_tickets_status_check 
  CHECK (lower(status) IN (
    'issued', 
    'hold', 
    'voided', 
    'refunded', 
    'reissued', 
    'confirmed', 
    'booked', 
    'pending', 
    'cancelled'
  ));

-- 2. Cabin Class Check Constraint (Permit: economy, premium_economy, business, first, executive)
ALTER TABLE public.air_tickets DROP CONSTRAINT IF EXISTS air_tickets_cabin_class_check;

ALTER TABLE public.air_tickets 
  ADD CONSTRAINT air_tickets_cabin_class_check 
  CHECK (lower(cabin_class) IN (
    'economy', 
    'premium_economy', 
    'business', 
    'first', 
    'executive'
  ));

-- 3. Ticket Type Check Constraint (Permit: individual, b2b_group, group, umrah, hajj)
ALTER TABLE public.air_tickets DROP CONSTRAINT IF EXISTS air_tickets_ticket_type_check;

ALTER TABLE public.air_tickets 
  ADD CONSTRAINT air_tickets_ticket_type_check 
  CHECK (lower(ticket_type) IN (
    'individual', 
    'b2b_group', 
    'group', 
    'umrah', 
    'hajj'
  ));
