-- ============================================
-- PennyWise — Hackathon Demo Seed Data
-- ============================================
-- IMPORTANT NOTE ON MATH:
-- The requested expenses sum up to PKR 103,300.
-- To achieve the requested EDGE status (Case-2) with an 8-12% savings rate,
-- the primary salary has been adjusted to PKR 115,000.
-- With PKR 103,300 expenses, the savings rate will be exactly 10.17%.
-- ============================================

-- Clean up any existing demo user (to make script idempotent)
DELETE FROM users WHERE email = 'demo@pennywise.pk';

DO $$ 
DECLARE
  v_user_id UUID := 'd0000000-0000-4000-8000-000000000000';
BEGIN

  -- 1. Create Demo User
  INSERT INTO users (
    id, email, password_hash, full_name, city, has_children, weekly_tracker_opt_in, profile_complete, is_verified
  ) VALUES (
    v_user_id,
    'demo@pennywise.pk',
    '$2a$10$r8KU4mteYr5cR1KyquMXnuRamZ3lh8Dvhpdr.V8ra.vTB8KNe5ada', -- 'Demo@1234'
    'Hassan Ahmed',
    'Lahore',
    TRUE,
    TRUE,
    TRUE,
    TRUE
  );

  -- 2. Create Work Profile
  INSERT INTO work_profiles (
    user_id, daily_work_hours, work_days_per_month, home_address, office_address, vehicle_type, fuel_type, vehicle_fuel_avg
  ) VALUES (
    v_user_id, 8, 22, 'Johar Town, Lahore', 'Gulberg III, Lahore', 'motorcycle', 'petrol', 45
  );

  -- 3. Create Income
  INSERT INTO income_sources (user_id, source_name, amount, frequency, income_type, expected_month_day) VALUES
  (v_user_id, 'Primary Salary', 115000.00, 'monthly', 'fixed', NULL),
  (v_user_id, 'Committee Payout', 60000.00, 'yearly', 'variable', 8);

  -- 4. Create Expenses (Targeting ~103,300 total)
  INSERT INTO user_expenses (user_id, category_id, custom_label, monthly_amount, area_of_living, grocery_area) VALUES
  (v_user_id, 'a0000000-0000-4000-8001-000000000001', NULL, 22000.00, 'Johar Town', NULL), -- Rent
  (v_user_id, 'a0000000-0000-4000-8002-000000000001', NULL, 8500.00, NULL, NULL), -- Electricity
  (v_user_id, 'a0000000-0000-4000-8002-000000000002', NULL, 2200.00, NULL, NULL), -- Gas
  (v_user_id, 'a0000000-0000-4000-8002-000000000004', NULL, 2500.00, NULL, NULL), -- WiFi
  (v_user_id, 'a0000000-0000-4000-8003-000000000001', NULL, 22000.00, NULL, 'Johar Town'), -- Grocery (High -> trigger)
  (v_user_id, 'a0000000-0000-4000-8004-000000000001', NULL, 6500.00, NULL, NULL), -- Fuel
  (v_user_id, 'a0000000-0000-4000-8005-000000000001', NULL, 12000.00, NULL, NULL), -- School Tuition (2 kids)
  (v_user_id, 'a0000000-0000-4000-8005-000000000002', NULL, 2000.00, NULL, NULL), -- School Allowance
  (v_user_id, 'a0000000-0000-4000-8006-000000000001', NULL, 1500.00, NULL, NULL), -- Medication
  (v_user_id, 'a0000000-0000-4000-8008-000000000001', NULL, 8000.00, NULL, NULL), -- Maid
  (v_user_id, 'a0000000-0000-4000-8009-000000000001', 'Netflix', 1100.00, NULL, NULL), -- Streaming
  (v_user_id, 'a0000000-0000-4000-8009-000000000002', NULL, 4000.00, NULL, NULL), -- Eating Out
  (v_user_id, 'a0000000-0000-4000-8010-000000000002', 'Debt EMI', 5000.00, NULL, NULL), -- Debt EMI
  (v_user_id, 'a0000000-0000-4000-8011-000000000001', NULL, 5000.00, NULL, NULL), -- Committee Contribution
  (v_user_id, NULL, 'Zakat', 1000.00, NULL, NULL); -- Custom Category: Zakat

  -- 5. Create Goal (Umrah)
  INSERT INTO savings_goals (
    user_id, goal_name, target_amount, target_months, monthly_deduction, amount_saved, priority_order
  ) VALUES (
    v_user_id, 'Umrah', 300000.00, 10, 10000.00, 40000.00, 1
  );

  -- 6. Insert Mock Inflation Data (Static for Demo)
  -- Clear existing cache first
  DELETE FROM inflation_cache;
  
  INSERT INTO inflation_cache (data_type, value, unit, source, valid_until) VALUES
  ('petrol_price', 293.00, 'PKR/liter', 'Demo Fallback', NOW() + INTERVAL '30 days'),
  ('chicken_broiler', 390.00, 'PKR/kg', 'Demo Fallback', NOW() + INTERVAL '30 days'),
  ('chicken_desi', 850.00, 'PKR/kg', 'Demo Fallback', NOW() + INTERVAL '30 days'),
  ('cooking_oil', 460.00, 'PKR/liter', 'Demo Fallback', NOW() + INTERVAL '30 days'),
  ('atta', 145.00, 'PKR/kg', 'Demo Fallback', NOW() + INTERVAL '30 days'),
  ('inflation_rate', 12.50, '%', 'Demo Fallback', NOW() + INTERVAL '30 days');

END $$;
