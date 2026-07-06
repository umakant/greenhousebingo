
-- Expand enum
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'customer';
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'partner';

-- Add new profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS business_type TEXT,
  ADD COLUMN IF NOT EXISTS partner_type TEXT;

-- Update the new user handler
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  acct public.account_type;
BEGIN
  BEGIN
    acct := COALESCE(NULLIF(meta->>'account_type', ''), 'customer')::public.account_type;
  EXCEPTION WHEN others THEN
    acct := 'customer';
  END;

  INSERT INTO public.profiles (
    id, full_name, account_type, venue_name, phone, username, email,
    company_name, address, city, state, website, business_type, partner_type
  )
  VALUES (
    NEW.id,
    COALESCE(meta->>'full_name', meta->>'name', ''),
    acct,
    NULLIF(meta->>'venue_name', ''),
    NULLIF(meta->>'phone', ''),
    NULLIF(meta->>'username', ''),
    NEW.email,
    NULLIF(meta->>'company_name', ''),
    NULLIF(meta->>'address', ''),
    NULLIF(meta->>'city', ''),
    NULLIF(meta->>'state', ''),
    NULLIF(meta->>'website', ''),
    NULLIF(meta->>'business_type', ''),
    NULLIF(meta->>'partner_type', '')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, acct)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
