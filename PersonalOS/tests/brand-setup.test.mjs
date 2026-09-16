import test from 'node:test';import assert from 'node:assert/strict';import {brandSetupScore} from '../lib/brand-setup.mjs';
const p={name:'My Brand',tone:'Template tone',styleNotes:'Template text',interests:['Topic'],platforms:[{enabled:true}],look:{primaryColor:'#08080C',accentColor:'#7C5CFF'}};
test('unconfigured placeholders never count as setup progress',()=>{assert.equal(brandSetupScore(p,{configured:false,verified:true}),0);});
test('real configured fields count but unsaved edits lose the saved checkpoint',()=>{assert.equal(brandSetupScore(p,{configured:true,verified:false}),6);assert.equal(brandSetupScore(p,{configured:true,verified:true}),7);assert.equal(brandSetupScore(p,{configured:true,verified:true,dirty:true}),6);});
