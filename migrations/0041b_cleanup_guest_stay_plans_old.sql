-- Cleanup: Drop guest_stay_plans_old if it still exists
-- This table was supposed to be dropped in 0041_fix_my_perfect_week_fk.sql
-- but may still exist if that migration failed partway

DROP TABLE IF EXISTS guest_stay_plans_old;
