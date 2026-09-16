import test from 'node:test';
import assert from 'node:assert/strict';
import {studentBudget} from '../lib/student-budget.mjs';
test('teacher-approved cap defaults to 100, respects lower limits and rejects higher values',()=>{
 const old=process.env.STUDENT_TOAPI_BUDGET_CREDITS;
 try{delete process.env.STUDENT_TOAPI_BUDGET_CREDITS;assert.equal(studentBudget(),100);
 process.env.STUDENT_TOAPI_BUDGET_CREDITS='50';assert.equal(studentBudget(),50);
 process.env.STUDENT_TOAPI_BUDGET_CREDITS='100';assert.equal(studentBudget(),100);
 process.env.STUDENT_TOAPI_BUDGET_CREDITS='101';assert.throws(studentBudget);
 }finally{if(old===undefined)delete process.env.STUDENT_TOAPI_BUDGET_CREDITS;else process.env.STUDENT_TOAPI_BUDGET_CREDITS=old;}
});
