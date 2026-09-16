import test from 'node:test';import assert from 'node:assert/strict';import {presentInspirationCost,summarizeInspirationCosts} from '../lib/inspiration-cost.mjs';
const now=Date.parse('2026-09-15T12:00:00Z');
const run=(estimated_cost_usd,metadata={},fetched_at='2026-09-14T12:00:00Z')=>({estimated_cost_usd,metadata,fetched_at});

test('unknown TikHub costs never render as zero',()=>{const summary=summarizeInspirationCosts([run(null),run(0)],now);assert.equal(summary.status,'unknown');assert.deepEqual(presentInspirationCost(summary),{value:'—',note:'費用待核對 · 0/2 runs 有估價'});});
test('known estimates retain numeric strings and disclose partial coverage',()=>{const summary=summarizeInspirationCosts([run('0.002',{cost_status:'estimated'}),run(null)],now);assert.equal(summary.status,'partial');assert.equal(summary.estimatedUsd,.002);assert.equal(presentInspirationCost(summary).value,'≈ US$0.002');assert.match(presentInspirationCost(summary).note,/部分估算 · 1\/2/);});
test('zero is displayed only when explicitly verified',()=>{const summary=summarizeInspirationCosts([run(0,{cost_status:'verified_zero'})],now);assert.equal(summary.status,'verified_zero');assert.equal(presentInspirationCost(summary).value,'US$0.000');});
test('old runs stay outside the thirty day view',()=>{const summary=summarizeInspirationCosts([run(.002,{cost_status:'estimated'},'2026-08-01T12:00:00Z')],now);assert.equal(summary.status,'empty');});
