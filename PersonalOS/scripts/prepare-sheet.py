"""Convert four exported Sheet CSV tabs to a reviewable local JSON. Never calls an API."""
import csv,json,sys
from pathlib import Path
root=Path(sys.argv[1]);out=Path(sys.argv[2])
data={}
keys={'Sources':'source_id','Posts':'post_id','Media':'media_id','Runs':'run_id'}
for tab,key in keys.items():
 with (root/(tab+'.csv')).open(encoding='utf-8-sig',newline='') as f:
  reader=csv.DictReader(f)
  if key not in (reader.fieldnames or []):raise ValueError('Missing header '+key+' in '+tab)
  data[tab]=[dict(row) for row in reader if any(str(v or '').strip() for v in row.values())]
 ids=[row[key] for row in data[tab]]
 if any(not i for i in ids) or len(ids)!=len(set(ids)):raise ValueError('Missing or duplicate '+key+'; review source, do not merge blindly')
out.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:len(v) for k,v in data.items()}))
