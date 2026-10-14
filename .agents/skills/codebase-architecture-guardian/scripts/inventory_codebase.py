#!/usr/bin/env python3
"""Produce a bounded, read-only repository inventory for architecture discovery."""
from __future__ import annotations
import argparse,json
from collections import Counter
from pathlib import Path
SKIP={'.git','node_modules','.next','dist','build','coverage','.cache','.turbo','vendor','target','.venv','venv'}
MARKERS=['package.json','pnpm-lock.yaml','yarn.lock','package-lock.json','bun.lock','pyproject.toml','requirements.txt','go.mod','Cargo.toml','pom.xml','build.gradle','Dockerfile','compose.yml','docker-compose.yml','tsconfig.json']
def main():
 ap=argparse.ArgumentParser(description='Read-only repository inventory with bounded file counts and common project markers.')
 ap.add_argument('root',type=Path);ap.add_argument('--max-files',type=int,default=10000);ap.add_argument('--json',action='store_true');a=ap.parse_args();root=a.root.resolve()
 if not root.is_dir(): ap.error(f'not a directory: {root}')
 ext=Counter(); top=Counter(); files=[]
 for p in root.rglob('*'):
  if len(files)>=a.max_files: break
  if any(x in SKIP for x in p.parts): continue
  if p.is_file():
   files.append(p);ext[p.suffix.lower() or '<none>']+=1
   try: rel=p.relative_to(root); top[rel.parts[0]]+=1
   except Exception: pass
 markers=[m for m in MARKERS if (root/m).exists()]
 package_names=[]
 for pkg in list(root.glob('package.json'))+list(root.glob('*/package.json'))[:50]:
  try: package_names.append({'path':str(pkg.relative_to(root)),'name':json.loads(pkg.read_text()).get('name')})
  except Exception: pass
 data={'root':str(root),'files_scanned':len(files),'truncated':len(files)>=a.max_files,'markers':markers,'top_level_entries':sorted(x.name for x in root.iterdir())[:200],'top_extensions':ext.most_common(20),'files_by_top_level':top.most_common(30),'packages':package_names}
 print(json.dumps(data,indent=2))
if __name__=='__main__': main()
