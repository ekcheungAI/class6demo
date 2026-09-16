import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  features,
  visibleFeatures,
  isCourseVisible,
  subroutes,
  getFeature,
  isImplemented,
  gateLabel,
  lessonFive,
  lessonSix,
} from "../lib/catalog.mjs";
import {
  connectionConfig,
  listTables,
  listRecords,
  queryParams,
  DataError,
} from "../lib/read-only.mjs";
import { demoResult } from "../lib/demo.mjs";
const env = {
  NEXT_PUBLIC_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_TEST_ONLY",
};
const schema = {
  paths: { "/scraped_posts": { get: {} }, "/rpc/danger": { post: {} } },
  definitions: {
    scraped_posts: {
      properties: {
        id: { type: "integer" },
        caption: { type: "string" },
        likes: { type: "integer" },
      },
    },
  },
};
const json = (d, options = {}) =>
  new Response(JSON.stringify(d), {
    status: 200,
    headers: { "content-type": "application/json", ...options },
  });
test("all 14 original main tabs and 5 development entries retained", () => {
  assert.equal(features.filter((f) => f.group === "main").length, 14);
  assert.equal(features.filter((f) => f.group === "development").length, 5);
  for (const href of [
    "/dashboard",
    "/feed",
    "/inspiration",
    "/collection",
    "/creator-studio",
    "/slides-studio",
    "/classroom",
    "/youtube-studio",
    "/autopilot",
    "/queue",
    "/engage",
    "/voice",
    "/analytics",
    "/open-mcp",
  ])
    assert.ok(features.find((f) => f.href === href));
});
test("lesson labels do not unlock operations", () => {
  for (const f of features.filter((f) => f.lesson === 5 && !f.implemented)) {
    assert.equal(isImplemented(f.href), false);
    assert.equal(gateLabel(f), "WIP 🚧 Lesson 5");
  }
  assert.equal(lessonFive.length, 5);
});
test("unknown future lessons remain unassigned", () => {
  assert.equal(getFeature("/autopilot").lesson, null);
  assert.equal(getFeature("/ads").lesson, null);
  assert.equal(isImplemented("/not-a-feature"), false);
});
test("retained child pages resolve to their parent gates", () => {
  assert.equal(getFeature("/video-studio").parentHref, "/video-studio");
  assert.equal(getFeature("/youtube-studio/projects/abc").implemented, false);
  assert.equal(getFeature("/feed/ai").label, "AI Newsroom");
  assert.equal(
    subroutes["/voice"].find((x) => x.label === "Look").lesson,
    5,
  );
});
test("missing configuration fails closed; no automatic demo", () => {
  assert.throws(
    () => connectionConfig({}),
    (e) => e.code === "NOT_CONFIGURED",
  );
  assert.equal(demoResult().mode, "demo");
});
test("secret and service role API keys rejected", () => {
  for (const key of [
    "sb_secret_should-never-be-used",
    "eyJtest." +
      Buffer.from(JSON.stringify({ role: "service_role" })).toString(
        "base64url",
      ) +
      ".test",
  ])
    assert.throws(
      () =>
        connectionConfig({ ...env, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key }),
      (e) => e.code === "UNSAFE_KEY",
    );
});
test("untrusted endpoints cannot receive credentials", () => {
  for (const url of [
    "http://localhost:3000",
    "https://evil.test",
    "https://abcdefghijklmnopqrst.supabase.co@evil.test",
    "https://abcdefghijklmnopqrst.supabase.co/path",
  ])
    assert.throws(() =>
      connectionConfig({ ...env, NEXT_PUBLIC_SUPABASE_URL: url }),
    );
});
test("schema discovery only exposes GET tables, not RPC", async () => {
  const t = await listTables(connectionConfig(env), undefined, async () =>
    json(schema),
  );
  assert.deepEqual(
    t.map((x) => x.name),
    ["scraped_posts"],
  );
  assert.equal(t[0].columns[1].name, "caption");
});
test("records use existing table and actual columns, GET only", async () => {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    return calls.length === 1
      ? json(schema)
      : json([{ id: 1, caption: "Actual fixture row", likes: 0 }], {
          "content-range": "0-0/1",
        });
  };
  const r = await listRecords(
    connectionConfig(env),
    new URLSearchParams("table=scraped_posts"),
    undefined,
    fetcher,
  );
  assert.equal(r.mode, "live");
  assert.equal(r.total, 1);
  assert.equal(r.rows[0].likes, 0);
  assert.equal(r.writeActions, 0);
  assert.ok(calls.every((x) => x.options.method === "GET"));
  assert.ok(
    calls[1].url.includes("select=") && calls[1].url.includes("limit=25"),
  );
  assert.equal(
    calls[0].options.headers.apikey,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
});
test("401/403 not converted to empty or demo data", async () => {
  for (const status of [401, 403])
    await assert.rejects(
      listTables(
        connectionConfig(env),
        undefined,
        async () => new Response("", { status }),
      ),
      (e) => e instanceof DataError && e.status === status,
    );
});
test("unknown table blocked before records request", async () => {
  let calls = 0;
  await assert.rejects(
    listRecords(
      connectionConfig(env),
      new URLSearchParams("table=unknown"),
      undefined,
      async () => {
        calls++;
        return json(schema);
      },
    ),
    (e) => e.code === "UNKNOWN_TABLE",
  );
  assert.equal(calls, 1);
});
test("pagination, search and field controls are bounded", () => {
  const cols = [{ name: "caption", type: "string" }];
  assert.throws(() =>
    queryParams(new URLSearchParams("page=-1"), "posts", cols),
  );
  assert.throws(() =>
    queryParams(
      new URLSearchParams("search=abc&column=caption.or(id.gt.0)"),
      "posts",
      cols,
    ),
  );
  assert.throws(() =>
    queryParams(new URLSearchParams("search=abc&column=id"), "posts", cols),
  );
  const { query } = queryParams(
    new URLSearchParams("search=hello%25&column=caption&page=2"),
    "posts",
    cols,
  );
  assert.equal(query.get("offset"), "50");
  assert.equal(query.get("caption"), "ilike.%hello\\%%");
});
test("empty successful SELECT remains distinct from connection failure", async () => {
  let calls = 0;
  const r = await listRecords(
    connectionConfig(env),
    new URLSearchParams("table=scraped_posts"),
    undefined,
    async () =>
      ++calls === 1 ? json(schema) : json([], { "content-range": "*/0" }),
  );
  assert.equal(r.total, 0);
  assert.equal(r.mode, "live");
  assert.equal(r.rows.length, 0);
});
test("no schema mutation or write API routes in student source", () => {
  for (const file of [
    "app/api/connection/route.ts",
    "app/api/tables/route.ts",
    "app/api/records/route.ts",
  ]) {
    const code = fs.readFileSync(
      new URL("../" + file, import.meta.url),
      "utf8",
    );
    assert.ok(code.includes("function GET"));
    assert.ok(!/function (POST|PUT|PATCH|DELETE)/.test(code));
  }
});

test('demo search counts match visible filtered records',()=>{assert.equal(demoResult('Threads').total,1);assert.equal(demoResult('does-not-exist').total,0);});

test('course exclusions stay hidden while Creator Studio uses a product-accurate route',()=>{for(const path of ['/script-lab','/youtube-studio','/youtube-studio/projects','/instagram-lab','/creator-studio/shoot']){if(!path.startsWith('/instagram-lab'))assert.ok(getFeature(path));assert.equal(isCourseVisible(path),false);assert.ok(!visibleFeatures.some(f=>f.href===path));}assert.equal(isCourseVisible('/creator-studio'),true);assert.ok(visibleFeatures.some(f=>f.href==='/creator-studio'&&f.implemented));assert.ok(lessonFive.every(o=>isCourseVisible(o.href)));assert.ok(lessonFive.some(o=>o.label==='多平台內容成果包'&&o.href==='/creator-studio'));assert.ok(!visibleFeatures.some(f=>f.href==='/video-studio')); });

test('Queue drafts and scheduling open in Lesson 5; formal review remains later',()=>{assert.equal(getFeature('/queue').lesson,5);assert.equal(isImplemented('/queue'),true);assert.ok(!lessonFive.some(o=>o.href==='/queue'));assert.ok(lessonSix.some(o=>o.href==='/queue'));});

test('Class 4 opt-in bypasses restricted discovery and supports search with stable pagination', async () => {
  const calls = [];
  const config = connectionConfig({...env, STUDENT_TABLE_ALLOWLIST: 'posts,media', STUDENT_SCHEMA_PROFILE: 'class4'});
  const result = await listRecords(config, new URLSearchParams('table=posts&search=IKEA&column=caption&page=1&order=published_at'), undefined, async (url, options) => {
    calls.push({url,options});
    return json([], {'content-range':'*/12'});
  });
  assert.equal(calls.length,1);
  const q=new URL(calls[0].url).searchParams;
  assert.equal(q.get('caption'),'ilike.%IKEA%');
  assert.equal(q.get('offset'),'25');
  assert.equal(q.get('order'),'published_at.desc,workspace_id.asc,post_id.asc');
  assert.equal(result.rows.length,0);
  assert.equal(calls[0].options.method,'GET');
  assert.equal((await listTables(connectionConfig({...env,STUDENT_TABLE_ALLOWLIST:'posts'})))[0].columns.length,0);
});
test('missing table grants are access denial, not invalid keys or empty data',async()=>{
  await assert.rejects(listRecords(connectionConfig({...env,STUDENT_TABLE_ALLOWLIST:'posts'}),new URLSearchParams('table=posts'),undefined,async()=>new Response(JSON.stringify({code:'42501'}),{status:401})),e=>e.code==='ACCESS_DENIED'&&e.status===403);
});

test('removed studios remain in metadata but not the sidebar',()=>{for(const path of ['/slides-studio','/classroom','/video-studio','/guides']){assert.ok(features.some(f=>f.href===path));assert.ok(!visibleFeatures.some(f=>f.href===path||f.href.startsWith(path+'/')));}});

test('source and brain modules all belong to Lesson 5 without unlocking future operations',()=>{for(const href of ['/feed','/inspiration','/voice']){assert.equal(getFeature(href).lesson,5);for(const child of subroutes[href]||[])assert.equal(child.lesson,5);}assert.equal(isImplemented('/feed'),false);assert.equal(isImplemented('/inspiration'),false);assert.equal(getFeature('/queue').lesson,5);});

test('Lesson 5 navigation shows the eight agreed entries including Queue while retaining future modules',()=>{assert.deepEqual(visibleFeatures.map(f=>f.href),['/dashboard','/feed','/inspiration','/creator-studio','/queue','/voice','/connections','/settings']);for(const path of ['/newsletter','/queue','/analytics','/autopilot','/skills','/model-costs'])assert.ok(features.some(f=>f.href===path));});
