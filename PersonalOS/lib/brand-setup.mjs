export function brandSetupScore(profile,{configured=false,verified=false,dirty=false}={}){
 if(!configured||!profile)return 0;
 const filled=value=>typeof value==='string'&&value.trim().length>0;
 return [filled(profile.name),filled(profile.tone),filled(profile.styleNotes),profile.interests?.length>0,profile.platforms?.some(p=>p.enabled),/^#[0-9a-f]{6}$/i.test(profile.look?.primaryColor||'')&&/^#[0-9a-f]{6}$/i.test(profile.look?.accentColor||''),verified&&!dirty].filter(Boolean).length;
}
