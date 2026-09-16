// Adapted from HeyOmmi app/dashboard/today-home.tsx: URLs are sources;
// the remaining words are the user's angle, not source evidence.
const URL_GLOBAL_RE=/(?:https?:\/\/|www\.)\S+/gi;
export function parseComposerInput(text){const urls=[...new Set((text.match(URL_GLOBAL_RE)||[]).map(v=>v.replace(/[),.;'"]+$/,'')).map(v=>/^www\./i.test(v)?'https://'+v:v))];if(urls.length>5)throw Error('最多放5個來源連結，請先移除多餘連結');return {urls,opinion:text.replace(URL_GLOBAL_RE,'').trim()};}
