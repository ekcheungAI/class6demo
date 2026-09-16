from pathlib import Path
import zipfile, hashlib
root=Path(__file__).resolve().parent.parent
target=root.parent/'PersonalOS-Class05-Student-Pack-RC4.zip'
exclude={'.git','node_modules','.next','.student-data','.vercel','__pycache__'}
required=['.env.example','supabase/01-bootstrap.sql','supabase/02-runtime.sql','package-lock.json','course/index.html','course/prompts.json','.agents/skills/my-branding-skill/SKILL.md']
for name in required: assert (root/name).is_file(),name
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as out:
 out.writestr('PersonalOS-Class05/START-HERE.md','# PersonalOS\n解壓後以Codex開啟PersonalOS資料夾，瀏覽器開course/index.html。工作位置用目前專案，Vault只作品牌來源。API設定檔由老師另外提供，Codex自動匯入。此RC仍須核對docs/RELEASE-GATES.md的實測結果。\n')
 for file in sorted(root.rglob('*')):
  rel=file.relative_to(root)
  if not file.is_file() or file.is_symlink() or any(x in exclude for x in rel.parts) or file.name=='.DS_Store' or file.suffix in {'.zip','.tsbuildinfo'} or (file.name.startswith('.env') and file.name!='.env.example'):continue
  out.write(file,'PersonalOS-Class05/PersonalOS/'+rel.as_posix())
with zipfile.ZipFile(target) as out:
 assert out.testzip() is None
 for name in required:assert out.read('PersonalOS-Class05/PersonalOS/'+name)==(root/name).read_bytes()
print(target);print(hashlib.sha256(target.read_bytes()).hexdigest())
