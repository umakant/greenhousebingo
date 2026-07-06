CREATE TABLE public.host_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  facility_name text NOT NULL,
  facility_type text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  estimated_guests text,
  preferred_date text,
  message text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT INSERT ON public.host_inquiries TO anon;
GRANT INSERT ON public.host_inquiries TO authenticated;
GRANT ALL ON public.host_inquiries TO service_role;

ALTER TABLE public.host_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a host inquiry" ON public.host_inquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can read all inquiries" ON public.host_inquiries FOR SELECT TO service_role USING (true);