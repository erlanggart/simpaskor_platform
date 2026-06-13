-- Material numbering now restarts per school category. The previous unique
-- index forced a single sequence per assessment category, which prevented
-- SD #1 and SMP #1 from coexisting. Uniqueness is now enforced in application
-- code, scoped to the material's school category.
DROP INDEX IF EXISTS "event_materials_event_id_event_assessment_category_id_numbe_key";

-- Replace it with a plain lookup index used by the materials list query.
CREATE INDEX IF NOT EXISTS "event_materials_event_id_event_assessment_category_id_idx" ON "event_materials" ("event_id", "event_assessment_category_id");
