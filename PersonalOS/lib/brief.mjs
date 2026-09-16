export function prepareBrief({source,input,platforms,brand}){
 if(!input.trim()||!platforms.length||!brand?.revision)throw new Error('Brief needs content, platform and brand revision');
 return {kind:'content-brief',status:'prepared-not-generated',source:source?{post_id:source.post_id,workspace_id:source.workspace_id,url:source.post_url,original:source.caption,mode:source.__demo?'demo':'live-readback'}:null,input,platforms:[...platforms],brand:{owner:brand.owner,revision:brand.revision},createdAt:new Date().toISOString()};
}
