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
