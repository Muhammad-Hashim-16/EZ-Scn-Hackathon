-- ============================================
-- PennyWise Database Schema
-- Inflation-Aware Household Savings Planner
-- For Pakistani Households
-- ============================================
-- Run this file in the Supabase SQL Editor
-- ============================================

-- Enable UUID generation (usually enabled by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 8.1 Users Table
-- ============================================
CREATE TABLE users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 VARCHAR(255) UNIQUE NOT NULL,
  password_hash         VARCHAR(255) NOT NULL,         -- bcrypt, never plaintext
  full_name             VARCHAR(255) NOT NULL,
  phone_number          VARCHAR(20),
  city                  VARCHAR(100),
  has_children          BOOLEAN DEFAULT FALSE,
  weekly_tracker_opt_in BOOLEAN DEFAULT FALSE,
  notification_enabled  BOOLEAN DEFAULT TRUE,
  cookies_accepted      BOOLEAN DEFAULT FALSE,
  terms_accepted        BOOLEAN DEFAULT FALSE,
  terms_accepted_at     TIMESTAMP,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW(),
  last_login            TIMESTAMP,
  is_verified           BOOLEAN DEFAULT FALSE,
  profile_complete      BOOLEAN DEFAULT FALSE
);

-- ============================================
-- 8.2 Work Profile Table
-- ============================================
CREATE TABLE work_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
  daily_work_hours    DECIMAL(4,2),                  -- e.g., 8.5 hours
  work_days_per_month INTEGER,                        -- e.g., 22 days
  home_address        TEXT,
  office_address      TEXT,
  vehicle_type        VARCHAR(50),                    -- car/motorcycle/public/wfh
  fuel_type           VARCHAR(20),                    -- petrol/diesel/cng/electric
  vehicle_fuel_avg    DECIMAL(5,2),                   -- km per liter
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 8.3 Income Sources Table
-- ============================================
CREATE TABLE income_sources (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
  source_name         VARCHAR(255) NOT NULL,          -- "Primary Salary", "Rental Income"
  amount              DECIMAL(12,2) NOT NULL,
  frequency           VARCHAR(50) NOT NULL,            -- 'monthly', 'irregular'
  income_type         VARCHAR(50) NOT NULL,            -- 'fixed', 'variable'
  expected_month_day  INTEGER,                         -- for committee: day of month
  notes               TEXT,
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 8.4 Expense Categories Master Table
-- ============================================
CREATE TABLE expense_categories (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name       VARCHAR(100) NOT NULL,           -- "Utility Bills", "Grocery"
  parent_category_id  UUID REFERENCES expense_categories(id),  -- for sub-categories
  is_system_defined   BOOLEAN DEFAULT TRUE,
  display_order       INTEGER
);

-- ============================================
-- 8.5 User Expenses Table
-- ============================================
CREATE TABLE user_expenses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
  category_id         UUID REFERENCES expense_categories(id),
  custom_label        VARCHAR(255),                    -- if user adds custom expense
  monthly_amount      DECIMAL(12,2),
  is_active           BOOLEAN DEFAULT TRUE,
  area_of_living      VARCHAR(100),                    -- for rent prediction
  grocery_area        VARCHAR(100),                    -- for grocery price estimation
  notes               TEXT,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 8.6 Weekly Expense Entries Table
-- ============================================
CREATE TABLE weekly_expense_entries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
  week_start_date     DATE NOT NULL,
  week_end_date       DATE NOT NULL,
  category_id         UUID REFERENCES expense_categories(id),
  custom_label        VARCHAR(255),
  amount              DECIMAL(12,2) NOT NULL,
  notes               TEXT,
  entry_method        VARCHAR(20) DEFAULT 'manual',    -- 'prompted', 'manual'
  submitted_at        TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 8.7 Savings Goals Table
-- ============================================
CREATE TABLE savings_goals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
  goal_name           VARCHAR(255) NOT NULL,            -- "Umrah", "New Car"
  target_amount       DECIMAL(12,2) NOT NULL,
  target_months       INTEGER NOT NULL,
  monthly_deduction   DECIMAL(12,2),                   -- auto-calculated or user-set
  amount_saved        DECIMAL(12,2) DEFAULT 0,
  start_date          DATE DEFAULT CURRENT_DATE,
  target_date         DATE,
  is_achieved         BOOLEAN DEFAULT FALSE,
  priority_order      INTEGER DEFAULT 1,
  created_at          TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 8.8 Monthly Analysis Snapshots Table
-- ============================================
CREATE TABLE monthly_snapshots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
  snapshot_month      DATE NOT NULL,                   -- first day of month
  total_income        DECIMAL(12,2),
  total_expenses      DECIMAL(12,2),
  net_savings         DECIMAL(12,2),
  savings_rate        DECIMAL(5,2),                    -- percentage
  health_status       VARCHAR(10),                     -- 'safe', 'edge', 'red'
  inflation_rate      DECIMAL(5,2),                    -- at time of snapshot
  real_savings        DECIMAL(12,2),                   -- inflation-adjusted
  snapshot_data       JSONB,                           -- full breakdown as JSON
  created_at          TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 8.9 Inflation Data Cache Table
-- ============================================
CREATE TABLE inflation_cache (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type           VARCHAR(100) NOT NULL,           -- 'petrol_price', 'cpi', 'chicken_price'
  value               DECIMAL(12,4),
  unit                VARCHAR(50),                     -- 'PKR/liter', 'PKR/kg', '%'
  source              VARCHAR(255),
  fetched_at          TIMESTAMP DEFAULT NOW(),
  valid_until         TIMESTAMP                        -- cache expiry
);

-- ============================================
-- 8.10 Notifications Log Table
-- ============================================
CREATE TABLE notifications_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
  notification_type   VARCHAR(50),                     -- 'inflation', 'weekly_prompt', 'reengagement'
  title               VARCHAR(255),
  body                TEXT,
  sent_at             TIMESTAMP DEFAULT NOW(),
  read_at             TIMESTAMP,
  action_taken        BOOLEAN DEFAULT FALSE
);


-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX idx_work_profiles_user_id ON work_profiles(user_id);
CREATE INDEX idx_income_sources_user_id ON income_sources(user_id);
CREATE INDEX idx_user_expenses_user_id ON user_expenses(user_id);
CREATE INDEX idx_user_expenses_category_id ON user_expenses(category_id);
CREATE INDEX idx_weekly_entries_user_id ON weekly_expense_entries(user_id);
CREATE INDEX idx_weekly_entries_dates ON weekly_expense_entries(week_start_date, week_end_date);
CREATE INDEX idx_savings_goals_user_id ON savings_goals(user_id);
CREATE INDEX idx_monthly_snapshots_user_id ON monthly_snapshots(user_id);
CREATE INDEX idx_monthly_snapshots_month ON monthly_snapshots(snapshot_month);
CREATE INDEX idx_inflation_cache_type ON inflation_cache(data_type);
CREATE INDEX idx_notifications_user_id ON notifications_log(user_id);
CREATE INDEX idx_users_email ON users(email);


-- ============================================
-- SEED DATA: Pakistani Expense Categories
-- (Appendix B from PRD)
-- ============================================

-- ──────────────────────────────────────────
-- Parent Category 1: Housing
-- ──────────────────────────────────────────
INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8000-000000000001', 'Housing', NULL, TRUE, 1);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8001-000000000001', 'Monthly Rent', 'a0000000-0000-4000-8000-000000000001', TRUE, 1);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8001-000000000002', 'House Loan EMI', 'a0000000-0000-4000-8000-000000000001', TRUE, 2);

-- ──────────────────────────────────────────
-- Parent Category 2: Utility Bills
-- ──────────────────────────────────────────
INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8000-000000000002', 'Utility Bills', NULL, TRUE, 2);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8002-000000000001', 'Electricity Bill', 'a0000000-0000-4000-8000-000000000002', TRUE, 1);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8002-000000000002', 'Gas Bill', 'a0000000-0000-4000-8000-000000000002', TRUE, 2);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8002-000000000003', 'Water Bill', 'a0000000-0000-4000-8000-000000000002', TRUE, 3);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8002-000000000004', 'WiFi / Broadband', 'a0000000-0000-4000-8000-000000000002', TRUE, 4);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8002-000000000005', 'Mobile Data', 'a0000000-0000-4000-8000-000000000002', TRUE, 5);

-- ──────────────────────────────────────────
-- Parent Category 3: Grocery & Household
-- ──────────────────────────────────────────
INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8000-000000000003', 'Grocery & Household', NULL, TRUE, 3);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8003-000000000001', 'Monthly Grocery', 'a0000000-0000-4000-8000-000000000003', TRUE, 1);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8003-000000000002', 'Cleaning Supplies', 'a0000000-0000-4000-8000-000000000003', TRUE, 2);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8003-000000000003', 'Kitchen Supplies', 'a0000000-0000-4000-8000-000000000003', TRUE, 3);

-- ──────────────────────────────────────────
-- Parent Category 4: Fuel & Transport
-- ──────────────────────────────────────────
INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8000-000000000004', 'Fuel & Transport', NULL, TRUE, 4);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8004-000000000001', 'Personal Vehicle Fuel', 'a0000000-0000-4000-8000-000000000004', TRUE, 1);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8004-000000000002', 'Public Transport / Uber', 'a0000000-0000-4000-8000-000000000004', TRUE, 2);

-- ──────────────────────────────────────────
-- Parent Category 5: Children
-- ──────────────────────────────────────────
INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8000-000000000005', 'Children', NULL, TRUE, 5);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8005-000000000001', 'School / College Tuition', 'a0000000-0000-4000-8000-000000000005', TRUE, 1);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8005-000000000002', 'Monthly Allowance', 'a0000000-0000-4000-8000-000000000005', TRUE, 2);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8005-000000000003', 'School Transport', 'a0000000-0000-4000-8000-000000000005', TRUE, 3);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8005-000000000004', 'Stationery & Books', 'a0000000-0000-4000-8000-000000000005', TRUE, 4);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8005-000000000005', 'Extracurricular', 'a0000000-0000-4000-8000-000000000005', TRUE, 5);

-- ──────────────────────────────────────────
-- Parent Category 6: Health
-- ──────────────────────────────────────────
INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8000-000000000006', 'Health', NULL, TRUE, 6);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8006-000000000001', 'Regular Medication', 'a0000000-0000-4000-8000-000000000006', TRUE, 1);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8006-000000000002', 'Doctor Consultations', 'a0000000-0000-4000-8000-000000000006', TRUE, 2);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8006-000000000003', 'Medical Insurance', 'a0000000-0000-4000-8000-000000000006', TRUE, 3);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8006-000000000004', 'Gym / Fitness', 'a0000000-0000-4000-8000-000000000006', TRUE, 4);

-- ──────────────────────────────────────────
-- Parent Category 7: Insurance
-- ──────────────────────────────────────────
INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8000-000000000007', 'Insurance', NULL, TRUE, 7);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8007-000000000001', 'Life Insurance', 'a0000000-0000-4000-8000-000000000007', TRUE, 1);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8007-000000000002', 'Vehicle Insurance', 'a0000000-0000-4000-8000-000000000007', TRUE, 2);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8007-000000000003', 'Home Insurance', 'a0000000-0000-4000-8000-000000000007', TRUE, 3);

-- ──────────────────────────────────────────
-- Parent Category 8: Household Help
-- ──────────────────────────────────────────
INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8000-000000000008', 'Household Help', NULL, TRUE, 8);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8008-000000000001', 'Maid / Cook Salary', 'a0000000-0000-4000-8000-000000000008', TRUE, 1);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8008-000000000002', 'Driver Salary', 'a0000000-0000-4000-8000-000000000008', TRUE, 2);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8008-000000000003', 'Other Domestic Staff', 'a0000000-0000-4000-8000-000000000008', TRUE, 3);

-- ──────────────────────────────────────────
-- Parent Category 9: Subscriptions & Entertainment
-- ──────────────────────────────────────────
INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8000-000000000009', 'Subscriptions & Entertainment', NULL, TRUE, 9);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8009-000000000001', 'Streaming Services', 'a0000000-0000-4000-8000-000000000009', TRUE, 1);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8009-000000000002', 'Eating Out / Restaurants', 'a0000000-0000-4000-8000-000000000009', TRUE, 2);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8009-000000000003', 'Gaming', 'a0000000-0000-4000-8000-000000000009', TRUE, 3);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8009-000000000004', 'Other Subscriptions', 'a0000000-0000-4000-8000-000000000009', TRUE, 4);

-- ──────────────────────────────────────────
-- Parent Category 10: Debt Repayments
-- ──────────────────────────────────────────
INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8000-000000000010', 'Debt Repayments', NULL, TRUE, 10);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8010-000000000001', 'Bank Loan EMI', 'a0000000-0000-4000-8000-000000000010', TRUE, 1);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8010-000000000002', 'Personal / Informal Loan', 'a0000000-0000-4000-8000-000000000010', TRUE, 2);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8010-000000000003', 'Credit Card Payment', 'a0000000-0000-4000-8000-000000000010', TRUE, 3);

-- ──────────────────────────────────────────
-- Parent Category 11: Committee
-- ──────────────────────────────────────────
INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8000-000000000011', 'Committee', NULL, TRUE, 11);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8011-000000000001', 'Monthly Committee Contribution', 'a0000000-0000-4000-8000-000000000011', TRUE, 1);

-- ──────────────────────────────────────────
-- Parent Category 12: Clothing & Personal Care
-- ──────────────────────────────────────────
INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8000-000000000012', 'Clothing & Personal Care', NULL, TRUE, 12);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8012-000000000001', 'Clothing Budget', 'a0000000-0000-4000-8000-000000000012', TRUE, 1);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8012-000000000002', 'Personal Care / Salon', 'a0000000-0000-4000-8000-000000000012', TRUE, 2);

-- ──────────────────────────────────────────
-- Parent Category 13: Social & Religious
-- ──────────────────────────────────────────
INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8000-000000000013', 'Social & Religious', NULL, TRUE, 13);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8013-000000000001', 'Zakat / Sadaqah', 'a0000000-0000-4000-8000-000000000013', TRUE, 1);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8013-000000000002', 'Wedding / Event Gifts', 'a0000000-0000-4000-8000-000000000013', TRUE, 2);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8013-000000000003', 'Family Support', 'a0000000-0000-4000-8000-000000000013', TRUE, 3);

INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8013-000000000004', 'Religious Occasions', 'a0000000-0000-4000-8000-000000000013', TRUE, 4);

-- ──────────────────────────────────────────
-- Parent Category 14: Custom Expenses
-- ──────────────────────────────────────────
INSERT INTO expense_categories (id, category_name, parent_category_id, is_system_defined, display_order)
VALUES ('a0000000-0000-4000-8000-000000000014', 'Custom Expenses', NULL, TRUE, 14);


-- ============================================
-- SEED DATA: Demo User
-- Email: hassan@pennywise.com
-- Password: Demo@1234
-- ============================================

-- Demo user
INSERT INTO users (
  id, email, password_hash, full_name, phone_number, city,
  has_children, weekly_tracker_opt_in, notification_enabled,
  cookies_accepted, terms_accepted, terms_accepted_at,
  created_at, updated_at, last_login,
  is_verified, profile_complete
) VALUES (
  'b0000000-0000-4000-8000-000000000001',
  'hassan@pennywise.com',
  '$2b$12$KVTVXU/0fYw.q97EHqv9UukZg6QDyjL.9EiM41IDl4M6I7sMVJjVK',
  'Hassan Ahmed',
  '+92-300-1234567',
  'Lahore',
  TRUE,   -- has_children
  TRUE,   -- weekly_tracker_opt_in
  TRUE,   -- notification_enabled
  TRUE,   -- cookies_accepted
  TRUE,   -- terms_accepted
  NOW(),  -- terms_accepted_at
  NOW(),  -- created_at
  NOW(),  -- updated_at
  NULL,   -- last_login
  TRUE,   -- is_verified
  TRUE    -- profile_complete
);

-- Demo work profile
INSERT INTO work_profiles (
  id, user_id, daily_work_hours, work_days_per_month,
  home_address, office_address,
  vehicle_type, fuel_type, vehicle_fuel_avg,
  created_at, updated_at
) VALUES (
  'b0000000-0000-4000-8000-000000000002',
  'b0000000-0000-4000-8000-000000000001',
  8.00,
  22,
  'Johar Town, Lahore',
  'Gulberg III, Lahore',
  'motorcycle',
  'petrol',
  45.00,
  NOW(),
  NOW()
);

-- Demo primary income (Government Teacher Salary)
INSERT INTO income_sources (
  id, user_id, source_name, amount, frequency, income_type,
  expected_month_day, notes, is_active, created_at
) VALUES (
  'b0000000-0000-4000-8000-000000000003',
  'b0000000-0000-4000-8000-000000000001',
  'Government Teacher Salary',
  85000.00,
  'monthly',
  'fixed',
  NULL,
  NULL,
  TRUE,
  NOW()
);

-- Demo committee payout (variable income)
INSERT INTO income_sources (
  id, user_id, source_name, amount, frequency, income_type,
  expected_month_day, notes, is_active, created_at
) VALUES (
  'b0000000-0000-4000-8000-000000000004',
  'b0000000-0000-4000-8000-000000000001',
  'Committee Payout',
  60000.00,
  'irregular',
  'variable',
  8,
  'Expected in August',
  TRUE,
  NOW()
);


-- ============================================
-- DONE! PennyWise schema is ready.
-- ============================================
