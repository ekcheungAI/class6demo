# Creator input workflow reference

Read-only reference: owner-provided HeyOmmi-main source.

- app/dashboard/today-home.tsx: extract/dedupe URLs, keep remaining words as opinion, up to5 sources; text rewrite and topic search are separate actions.
- lib/rewrite-batch/use-source-previews.ts: preview and rewrite reuse extraction; avoid paying twice for the same URL.
- lib/extract.ts: X uses FxTwitter first; paid fallback only after free extraction fails. Generic public-page extraction is separate from platform extraction.
- lib/rewrite-batch/job.server.ts: saved source + brand/voice + platform options flow into rewrite and durable results.

PersonalOS adaptation: same source/opinion split and free-first X lookup; existing TikHub key is the paid fallback instead of adding the original product's TwitterAPI.io credentials. Public HTML uses bounded, DNS-pinned Readability extraction. Saved source snapshots use existing runs metadata with owner-scoped claim, not original production tables.

POST /api/source reads/cache-saves source text; POST /api/create accepts sourceRequestIds and uses those owner-verified snapshots. A URL is never sent to the model as if it were article text. Source fetches do not reserve ToAPI generation credits. Text/image generation keeps the existing shared cap. Find sources remains explicitly WIP; uploading reference images and transcribing clips are not added by this change.

Tests cover mixed URL/opinion input,5-source cap, URL safety, requested-tweet ID matching, free-first behavior and fallback order. Owner's X example2099650526837371378 was retrieved successfully with587 text characters; this does not verify the factual claims in that post.

Verification 2026-09-15:82 automated tests pass. Isolated SQL test confirms a cached source claim is idempotent and does not consume ToAPI credits, while generation reservations and owner isolation remain enforced. Incremental SQL applied only to the authorized student test project. Existing teacher project and original HeyOmmi source were not modified. Combined saved-source-to-model path uses a test provider response; no additional paid text/image call was made. A source in unknown state is held for inspection rather than silently fetched again.

Student flow: paste a public X post or article URL, optionally add your own angle, select output platforms, then press Rewrite into posts. The app reads and saves the source first, then combines it with Ommi Brain. Feed/Inspiration source selection and plain-text ideas continue through the same existing rewrite flow. A failed source fetch stops before paid generation.
