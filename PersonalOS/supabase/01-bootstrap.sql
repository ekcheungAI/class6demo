-- v0.1.0-rc1: NEW EMPTY STUDENT PROJECT ONLY. Stops if class tables exist.
BEGIN;
DO $$ BEGIN
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE') THEN
 RAISE EXCEPTION 'Class tables already exist. Stop: do not overwrite. Verify version and use existing setup.';
END IF; END $$;
-- Class 4 media library: authenticated-owner data model.
-- All IDs imported from Google Sheets remain as external, stable IDs.

create schema if not exists private;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sources (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_id text not null,
  platform text not null,
  account text,
  profile_url text,
  collection_reason text,
  fetched_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, source_id)
);

create table public.runs (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  run_id text not null,
  provider text,
  platform text,
  requested_count integer,
  collected_count integer,
  request_count integer,
  estimated_cost_usd numeric,
  fetched_at timestamptz,
  status text,
  raw_url text,
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, run_id)
);

create table public.posts (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  post_id text not null,
  source_id text not null,
  platform text not null,
  account text,
  content_type text,
  caption text,
  published_at timestamptz,
  post_url text,
  like_count bigint,
  comment_count bigint,
  view_count bigint,
  share_count bigint,
  save_count bigint,
  fetched_at timestamptz,
  run_id text,
  raw_url text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, post_id),
  foreign key (workspace_id, source_id) references public.sources(workspace_id, source_id),
  foreign key (workspace_id, run_id) references public.runs(workspace_id, run_id)
);

create table public.media (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  media_id text not null,
  post_id text not null,
  asset_index integer,
  media_type text not null,
  source_media_url text,
  drive_file_id text,
  drive_url text,
  archive_status text,
  notes text,
  visual_analysis text,
  reverse_engineering_prompt text,
  prompt_notes text,
  preview_url text,
  preview_storage_path text,
  poster_url text,
  poster_storage_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, media_id),
  foreign key (workspace_id, post_id) references public.posts(workspace_id, post_id)
);

-- Lossless storage for the 26-column legacy/backup tab.
create table public.legacy_records (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  legacy_key text not null,
  source_platform text,
  endpoint text,
  fetched_at_utc timestamptz,
  record_id text,
  raw_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, legacy_key)
);

create index sources_workspace_platform_idx on public.sources(workspace_id, platform);
create index posts_workspace_source_idx on public.posts(workspace_id, source_id);
create index posts_workspace_platform_published_idx on public.posts(workspace_id, platform, published_at desc nulls last);
create index posts_workspace_content_type_idx on public.posts(workspace_id, content_type);
create index media_workspace_post_idx on public.media(workspace_id, post_id);
create index media_workspace_type_idx on public.media(workspace_id, media_type);
create index media_drive_file_id_idx on public.media(drive_file_id) where drive_file_id is not null;
create index runs_workspace_fetched_idx on public.runs(workspace_id, fetched_at desc nulls last);
create index legacy_records_workspace_record_idx on public.legacy_records(workspace_id, record_id);

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure private.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger workspaces_updated_at before update on public.workspaces for each row execute procedure public.set_updated_at();
create trigger sources_updated_at before update on public.sources for each row execute procedure public.set_updated_at();
create trigger posts_updated_at before update on public.posts for each row execute procedure public.set_updated_at();
create trigger media_updated_at before update on public.media for each row execute procedure public.set_updated_at();
create trigger runs_updated_at before update on public.runs for each row execute procedure public.set_updated_at();
create trigger legacy_records_updated_at before update on public.legacy_records for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.sources enable row level security;
alter table public.posts enable row level security;
alter table public.media enable row level security;
alter table public.runs enable row level security;
alter table public.legacy_records enable row level security;

revoke all on table public.profiles, public.workspaces, public.sources, public.posts, public.media, public.runs, public.legacy_records from anon;
revoke all on table public.profiles, public.workspaces, public.sources, public.posts, public.media, public.runs, public.legacy_records from authenticated;
grant select, insert, update, delete on table public.profiles, public.workspaces, public.sources, public.posts, public.media, public.runs, public.legacy_records to authenticated;

create policy "profiles: own row" on public.profiles for all to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "workspaces: owner only" on public.workspaces for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create policy "sources: workspace owner only" on public.sources for all to authenticated using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = (select auth.uid()))) with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = (select auth.uid())));
create policy "posts: workspace owner only" on public.posts for all to authenticated using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = (select auth.uid()))) with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = (select auth.uid())));
create policy "media: workspace owner only" on public.media for all to authenticated using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = (select auth.uid()))) with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = (select auth.uid())));
create policy "runs: workspace owner only" on public.runs for all to authenticated using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = (select auth.uid()))) with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = (select auth.uid())));
create policy "legacy_records: workspace owner only" on public.legacy_records for all to authenticated using (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = (select auth.uid()))) with check (exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = (select auth.uid())));

alter table public.media
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists migration_status text not null default 'pending',
  add column if not exists migrated_at timestamptz,
  add column if not exists file_size_bytes bigint,
  add column if not exists mime_type text;

create unique index if not exists media_storage_object_unique
  on public.media(storage_bucket, storage_path)
  where storage_bucket is not null and storage_path is not null;

insert into storage.buckets (id, name, public)
values
  ('media-images', 'media-images', false),
  ('media-videos', 'media-videos', false)
on conflict (id) do update set public = false;


create policy "workspace owner reads private media"
on storage.objects for select to authenticated
using (
  bucket_id in ('media-images', 'media-videos')
  and exists (
    select 1 from public.workspaces w
    where w.id::text = split_part(storage.objects.name, '/', 1)
      and w.owner_id = (select auth.uid())
  )
);

create policy "workspace owner inserts private media"
on storage.objects for insert to authenticated
with check (
  bucket_id in ('media-images', 'media-videos')
  and exists (
    select 1 from public.workspaces w
    where w.id::text = split_part(storage.objects.name, '/', 1)
      and w.owner_id = (select auth.uid())
  )
);

create policy "workspace owner updates private media"
on storage.objects for update to authenticated
using (
  bucket_id in ('media-images', 'media-videos')
  and exists (
    select 1 from public.workspaces w
    where w.id::text = split_part(storage.objects.name, '/', 1)
      and w.owner_id = (select auth.uid())
  )
)
with check (
  bucket_id in ('media-images', 'media-videos')
  and exists (
    select 1 from public.workspaces w
    where w.id::text = split_part(storage.objects.name, '/', 1)
      and w.owner_id = (select auth.uid())
  )
);

create policy "workspace owner deletes private media"
on storage.objects for delete to authenticated
using (
  bucket_id in ('media-images', 'media-videos')
  and exists (
    select 1 from public.workspaces w
    where w.id::text = split_part(storage.objects.name, '/', 1)
      and w.owner_id = (select auth.uid())
  )
);
-- A signed-in app user initializes only their own profile/workspace.
CREATE FUNCTION public.ensure_student_workspace() RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE wid uuid; BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 INSERT INTO public.profiles(id) VALUES(auth.uid()) ON CONFLICT(id) DO NOTHING;
 INSERT INTO public.workspaces(owner_id,name) VALUES(auth.uid(),'My workspace') ON CONFLICT(owner_id) DO NOTHING;
 SELECT id INTO wid FROM public.workspaces WHERE owner_id=auth.uid(); RETURN wid;
END $$;
REVOKE ALL ON FUNCTION public.ensure_student_workspace() FROM public,anon;
GRANT EXECUTE ON FUNCTION public.ensure_student_workspace() TO authenticated;
COMMIT;

-- CLOUD RUNTIME V1
-- Incremental runtime v1. Existing tables/columns/policies remain unchanged.
BEGIN;
CREATE OR REPLACE FUNCTION public.personalos_claim(p_workspace uuid,p_id text,p_kind text,p_payload jsonb,p_limit numeric DEFAULT 100)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE existing jsonb; ledger jsonb; cap numeric; used numeric; reservation numeric;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login required'; END IF;
 PERFORM 1 FROM public.workspaces WHERE id=p_workspace AND owner_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Workspace owner mismatch'; END IF;
 IF p_kind NOT IN ('text','image','source','analysis') OR p_id !~ '^[0-9a-f-]{36}$' OR octet_length(p_payload::text)>150000 THEN RAISE EXCEPTION 'Invalid request'; END IF;
 SELECT metadata INTO existing FROM public.runs WHERE workspace_id=p_workspace AND run_id='job:'||p_id;
 IF FOUND THEN RETURN jsonb_build_object('claimed',false,'job',existing); END IF;
 reservation:=CASE WHEN p_kind='source' THEN 0 ELSE 20 END; -- Source lookup uses its own provider.
 IF reservation>0 THEN
  IF p_limit<=0 OR p_limit>100 THEN RAISE EXCEPTION 'Invalid budget'; END IF;
  INSERT INTO public.runs(workspace_id,run_id,provider,status,metadata) VALUES(p_workspace,'system:toapi-budget','toapis','budget',jsonb_build_object('limit',p_limit,'committed',0)) ON CONFLICT DO NOTHING;
  SELECT metadata INTO ledger FROM public.runs WHERE workspace_id=p_workspace AND run_id='system:toapi-budget' FOR UPDATE;
  cap:=least((ledger->>'limit')::numeric,p_limit); used:=(ledger->>'committed')::numeric;
  IF used+reservation>cap OR coalesce((ledger->>'uncertain')::boolean,false) THEN RAISE EXCEPTION 'Budget insufficient or unresolved'; END IF;
  UPDATE public.runs SET metadata=ledger||jsonb_build_object('limit',cap,'committed',used+reservation),updated_at=now() WHERE workspace_id=p_workspace AND run_id='system:toapi-budget';
 END IF;
 existing:=jsonb_build_object('id',p_id,'kind',p_kind,'state','submitting','version',0,'payload',p_payload,'reservedCredits',reservation,'createdAt',now());
 INSERT INTO public.runs(workspace_id,run_id,provider,status,metadata) VALUES(p_workspace,'job:'||p_id,CASE WHEN p_kind='source' THEN p_payload->>'provider' ELSE 'toapis' END,'submitting',existing);
 RETURN jsonb_build_object('claimed',true,'job',existing);
END $$;

CREATE OR REPLACE FUNCTION public.personalos_update(p_workspace uuid,p_id text,p_version integer,p_state text,p_patch jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE old jsonb; result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.workspaces WHERE id=p_workspace AND owner_id=auth.uid()) THEN RAISE EXCEPTION 'Workspace owner mismatch'; END IF;
 SELECT metadata INTO old FROM public.runs WHERE workspace_id=p_workspace AND run_id='job:'||p_id FOR UPDATE;
 IF NOT FOUND OR (old->>'version')::int<>p_version THEN RAISE EXCEPTION 'Version conflict'; END IF;
 IF p_state NOT IN ('generating','generated','completed','failed','unknown') OR octet_length(p_patch::text)>250000 THEN RAISE EXCEPTION 'Invalid state'; END IF;
 IF old->>'state'='failed' OR (old->>'state'='completed' AND NOT (old->>'kind'='text' AND p_state='completed' AND p_patch ? 'record')) THEN RAISE EXCEPTION 'Terminal task'; END IF;
 result:=old||p_patch||jsonb_build_object('id',p_id,'kind',old->>'kind','state',p_state,'version',p_version+1,'updatedAt',now());
 UPDATE public.runs SET metadata=result,status=p_state,updated_at=now() WHERE workspace_id=p_workspace AND run_id='job:'||p_id;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.personalos_brand(p_workspace uuid,p_expected text,p_brand jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE old jsonb;
BEGIN
 PERFORM 1 FROM public.workspaces WHERE id=p_workspace AND owner_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Workspace owner mismatch'; END IF;
 IF octet_length(p_brand::text)>18000 OR coalesce(p_brand->>'revision','')='' THEN RAISE EXCEPTION 'Brand summary too large or missing revision'; END IF;
 SELECT metadata INTO old FROM public.sources WHERE workspace_id=p_workspace AND source_id='system:brand-runtime';
 IF coalesce(old->>'revision','')<>coalesce(p_expected,'') THEN RAISE EXCEPTION 'Brand version conflict'; END IF;
 INSERT INTO public.sources(workspace_id,source_id,platform,metadata) VALUES(p_workspace,'system:brand-runtime','system',p_brand)
 ON CONFLICT(workspace_id,source_id) DO UPDATE SET metadata=excluded.metadata,updated_at=now();
 RETURN p_brand;
END $$;
CREATE OR REPLACE FUNCTION public.personalos_template(p_workspace uuid,p_id text,p_expected integer,p_template jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE old jsonb; result jsonb;
BEGIN
 PERFORM 1 FROM public.workspaces WHERE id=p_workspace AND owner_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Workspace owner mismatch'; END IF;
 IF p_id !~ '^[0-9a-f-]{36}$' OR octet_length(p_template::text)>70000 THEN RAISE EXCEPTION 'Invalid template'; END IF;
 SELECT metadata INTO old FROM public.sources WHERE workspace_id=p_workspace AND source_id='image-template:'||p_id;
 IF coalesce((old->>'version')::integer,0)<>p_expected THEN RAISE EXCEPTION 'Template version conflict'; END IF;
 result:=p_template||jsonb_build_object('id',p_id,'version',p_expected+1,'template_origin','personalos-image','updatedAt',now());
 INSERT INTO public.sources(workspace_id,source_id,platform,metadata) VALUES(p_workspace,'image-template:'||p_id,'system',result)
 ON CONFLICT(workspace_id,source_id) DO UPDATE SET metadata=excluded.metadata,updated_at=now();
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.personalos_template(uuid,text,integer,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.personalos_template(uuid,text,integer,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.personalos_claim(uuid,text,text,jsonb,numeric),public.personalos_update(uuid,text,integer,text,jsonb),public.personalos_brand(uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.personalos_claim(uuid,text,text,jsonb,numeric),public.personalos_update(uuid,text,integer,text,jsonb),public.personalos_brand(uuid,text,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.personalos_budget_import(p_workspace uuid,p_limit numeric,p_committed numeric,p_uncertain boolean)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
 PERFORM 1 FROM public.workspaces WHERE id=p_workspace AND owner_id=auth.uid() FOR UPDATE;
 IF NOT FOUND OR p_limit<=0 OR p_limit>100 OR p_committed<0 THEN RAISE EXCEPTION 'Invalid budget import'; END IF;
 INSERT INTO public.runs(workspace_id,run_id,provider,status,metadata) VALUES(p_workspace,'system:toapi-budget','toapis','budget',jsonb_build_object('limit',p_limit,'committed',p_committed,'uncertain',p_uncertain))
 ON CONFLICT(workspace_id,run_id) DO UPDATE SET metadata=jsonb_build_object('limit',least((public.runs.metadata->>'limit')::numeric,p_limit),'committed',greatest((public.runs.metadata->>'committed')::numeric,p_committed),'uncertain',coalesce((public.runs.metadata->>'uncertain')::boolean,false) OR p_uncertain),updated_at=now();
END $$;
REVOKE ALL ON FUNCTION public.personalos_budget_import(uuid,numeric,numeric,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.personalos_budget_import(uuid,numeric,numeric,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.personalos_settle(p_workspace uuid,p_id text,p_credits numeric,p_evidence text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE job jsonb; ledger jsonb;
BEGIN
 PERFORM 1 FROM public.workspaces WHERE id=p_workspace AND owner_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Workspace owner mismatch'; END IF;
 SELECT metadata INTO job FROM public.runs WHERE workspace_id=p_workspace AND run_id='job:'||p_id FOR UPDATE;
 IF NOT FOUND OR job->>'kind' NOT IN ('image','text') OR job->>'state' NOT IN ('completed','failed') OR p_credits<0 OR p_credits>(job->>'reservedCredits')::numeric OR length(p_evidence)<8 THEN RAISE EXCEPTION 'Settlement requires terminal task and verified per-task evidence'; END IF;
 IF job ? 'settledCredits' THEN
  IF (job->>'settledCredits')::numeric<>p_credits THEN RAISE EXCEPTION 'Settlement already recorded'; END IF;
  RETURN job;
 END IF;
 SELECT metadata INTO ledger FROM public.runs WHERE workspace_id=p_workspace AND run_id='system:toapi-budget' FOR UPDATE;
 UPDATE public.runs SET metadata=ledger||jsonb_build_object('committed',greatest(0,(ledger->>'committed')::numeric-(job->>'reservedCredits')::numeric+p_credits)),updated_at=now() WHERE workspace_id=p_workspace AND run_id='system:toapi-budget';
 job:=job||jsonb_build_object('settledCredits',p_credits,'billingEvidence',p_evidence);
 UPDATE public.runs SET metadata=job,updated_at=now() WHERE workspace_id=p_workspace AND run_id='job:'||p_id;
 RETURN job;
END $$;
REVOKE ALL ON FUNCTION public.personalos_settle(uuid,text,numeric,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.personalos_settle(uuid,text,numeric,text) TO authenticated;
COMMIT;
