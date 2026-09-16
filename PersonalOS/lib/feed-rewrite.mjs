import {ContentError} from './content-engine.mjs';
export function feedBrief(source,brand,{voiceRules='',sourceId=''}={}){
 const platforms=brand.outputPlatforms||['Threads','Newsletter'];
 if(platforms.some(p=>!['Threads','Newsletter','Instagram','X','LinkedIn'].includes(p)))throw new ContentError('請核對Ommi Brain的輸出平台設定');
 const rules=voiceRules?'\n\n'+voiceRules+'\n規則只改開場、句式、段落、稱呼、例子嘅講法；任何數字、日期、名稱、功能聲稱、價格、來源 ID 一個字都唔准改。':'';
 const facts='\n\n另外喺同一個 JSON 加 "facts_check"：一個陣列，每行 {"original":"原句","rewritten":"改寫句","changed":"講法"|"事實"}，最少三行；原文冇嘅數字或聲稱一律標 "事實"。'+(sourceId?' 來源 ID：'+sourceId+'。':'');
 return {input:'依品牌語氣直接改寫此來源，為指定平台各寫一份完整草稿。Threads使用精簡自然短帖（最多500字元）；Newsletter包含subject、開場、重點及CTA。Instagram用易讀caption及CTA；X用精簡短帖；LinkedIn用專業但自然的分段觀點。保留來源歸屬，不能冒充原作者。來源若只有標題或預覽，只可評論已知內容、提出有標示的觀點；不能聲稱讀過全文或補作數字／事件細節。只輸出JSON outputs。'+rules+facts,platforms,brand:{revision:brand.revision},source:{post_id:source.post_id,workspace_id:source.workspace_id,url:source.post_url,original:source.article?.text?[source.caption,source.article.text].join('\n\n'):source.caption,content_depth:source.article?.text?'extracted-public-article':source.content_depth||'unknown',mode:'provided-source'}};
}
