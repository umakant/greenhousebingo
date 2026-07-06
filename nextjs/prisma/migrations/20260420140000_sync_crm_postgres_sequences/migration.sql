-- Align SERIAL sequences with MAX(id) after rows were inserted with explicit ids (seeds, imports).
-- Prevents Prisma create() from failing with: Unique constraint failed on the fields: (`id`)

DO $body$
DECLARE
  tbl text;
  seqname text;
  maxid bigint;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'crm_pipelines',
    'crm_pipeline_stages',
    'crm_leads',
    'crm_lead_activities',
    'crm_deals',
    'crm_deal_activities'
  ]
  LOOP
    seqname := pg_get_serial_sequence(format('public.%I', tbl), 'id');
    IF seqname IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('SELECT COALESCE(MAX(id), 0)::bigint FROM public.%I', tbl) INTO maxid;
    IF maxid < 1 THEN
      EXECUTE format('SELECT setval(%L, 1, false)', seqname);
    ELSE
      EXECUTE format('SELECT setval(%L, %s, true)', seqname, maxid);
    END IF;
  END LOOP;
END
$body$;
