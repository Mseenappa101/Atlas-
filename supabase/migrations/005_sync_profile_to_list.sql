-- 005: keep the email list in step with the profile. Sign-up step 2 (school, class year,
-- markets, firm types) happens after the account exists, so copy those fields over on update.

CREATE OR REPLACE FUNCTION public.sync_profile_to_list()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.waitlist_subscribers SET
    full_name = coalesce(new.full_name, full_name),
    law_school = coalesce(new.school, law_school),
    class_year = coalesce(new.class_year, class_year),
    target_market = coalesce(new.target_market, target_market),
    target_firm_type = coalesce(new.target_firm_type, target_firm_type)
  WHERE lower(email) = lower(new.email);
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_updated ON public.users;
CREATE TRIGGER on_profile_updated
  AFTER UPDATE OF full_name, school, class_year, target_market, target_firm_type ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_list();

NOTIFY pgrst, 'reload schema';
