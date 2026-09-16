# Queue — Lesson 5

Reference: owner-provided HeyOmmi-main/app/queue/components/drafts-tab.tsx and scheduled-timeline.tsx. PersonalOS keeps platform-specific Drafts and Scheduled, editing and rescheduling, with no publishing API, social-account connection, cron or automatic dispatch.

Every generated text output is already saved in Supabase. Queue reads those records automatically, one card per platform. Existing drafts need no re-generation or manual import. Dates are entered in the browser's labelled time zone, stored as UTC, and displayed with the saved zone across devices. Past scheduled times remain Scheduled / 待發布; they never become Published automatically.

Storage: existing runs.metadata.record.queue[platform] contains status, scheduledAt, timeZone and publishingEnabled:false. No duplicate table is needed for this lesson. Saving uses the existing owner-verified cloudRuntime and personalos_update CAS transaction. record.version changes on each edit/schedule; history is preserved. A stale tab is rejected and must reload. Editing a scheduled platform returns it to Draft. Editing an entire generated bundle in Creator Studio clears its old schedules.

Acceptance:86 tests and build pass. Tests cover platform separation, schedule/cancel/edit, immutable history, past dates, bad zones, stale versions and rejection of publish actions. Paid model calls are not necessary for these actions. Live readback verification is recorded in the teacher's Queue acceptance note.

Class scope: eight navigation entries now include Queue. Drafts and planned scheduling are Lesson 5; connecting accounts and actually publishing remain next class. The100-credit ToAPI cap is unchanged by queue operations.
