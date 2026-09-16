import {ContentError} from './content-engine.mjs';
export function studentBudget(){const n=Number(process.env.STUDENT_TOAPI_BUDGET_CREDITS||100);if(!Number.isFinite(n)||n<=0||n>100)throw new ContentError('ToAPI本輪上限100credits；不允許自行提高');return n;}
