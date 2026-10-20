-- 009: the scraper now also records entry-level attorney roles for new grads (post-grad associate,
-- staff attorney, 0–2 years). Additive: one more allowed posting type.
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_posting_type_check;
ALTER TABLE listings ADD CONSTRAINT listings_posting_type_check
  CHECK (posting_type IN ('summer-associate', 'law-clerk', 'intern', 'fellowship', 'extern', 'associate', 'other'));
NOTIFY pgrst, 'reload schema';
