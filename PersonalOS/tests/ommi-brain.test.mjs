import test from 'node:test';
import assert from 'node:assert/strict';
import {brainRevision,defaultBrainProfile,runtimeBrain,validateBrainProfile} from '../lib/ommi-brain.mjs';

const brand={owner:'student',revision:'vault-v1',outputPlatforms:['Threads','Newsletter'],documents:{voice:{text:'---\nstatus: draft\n---\n- Direct and clear'},look:{text:'Primary #08080C accent #7C5CFF'}},assets:[{id:'one'}]};

test('Company Vault becomes a structured Ommi Brain default',()=>{const p=defaultBrainProfile(brand);assert.equal(p.name,'student');assert.deepEqual(p.platforms.filter(x=>x.enabled).map(x=>x.id),['Threads','Newsletter']);assert.equal(p.look.primaryColor,'#08080C');assert.equal(p.look.accentColor,'#7C5CFF');assert.deepEqual(p.look.assetIds,['one']);});

test('Brain validation rejects empty identity and zero enabled platforms',()=>{const p=defaultBrainProfile(brand);assert.throws(()=>validateBrainProfile({...p,name:''}));assert.throws(()=>validateBrainProfile({...p,platforms:p.platforms.map(x=>({...x,enabled:false}))}));});

test('Runtime revision changes with saved settings and reports persistence honestly',()=>{const local=runtimeBrain(brand,null);const changed={...local.brainProfile,tone:'calm and analytical'};const cloud=runtimeBrain(brand,{profile:changed,workspaceId:'ws',updatedAt:'2026-09-14T00:00:00Z'});assert.notEqual(local.revision,cloud.revision);assert.equal(local.persistence.verified,false);assert.equal(cloud.persistence.verified,true);assert.equal(cloud.brainProfile.tone,'calm and analytical');assert.equal(brainRevision(brand.revision,changed),cloud.revision);});
