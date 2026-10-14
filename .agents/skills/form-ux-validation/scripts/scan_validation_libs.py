#!/usr/bin/env python3
from __future__ import annotations
import argparse,json,re
from pathlib import Path
LIBS=['zod','yup','joi','valibot','ajv','superstruct','vest','class-validator','pydantic','marshmallow','cerberus']
SKIP={'.git','node_modules','.next','dist','build','coverage','.cache','.venv','venv'}
def main():
 ap=argparse.ArgumentParser(description='Read-only detection of common validation libraries and schema-related imports/usages.')
 ap.add_argument('root',type=Path);ap.add_argument('--max-files',type=int,default=4000);ap.add_argument('--json',action='store_true');a=ap.parse_args();root=a.root.resolve()
 if not root.is_dir():ap.error(f'not a directory: {root}')
 pkg={}
 for name in ('package.json','pyproject.toml','requirements.txt'):
  p=root/name
  if p.exists():pkg[name]=p.read_text(encoding='utf-8',errors='ignore')[:200000]
 dependency_hits={lib:[name for name,text in pkg.items() if re.search(r'(?i)(?<![\w-])'+re.escape(lib)+r'(?![\w-])',text)] for lib in LIBS}
 dependency_hits={k:v for k,v in dependency_hits.items() if v}
 usage=[];count=0
 exts={'.js','.jsx','.ts','.tsx','.py','.vue','.svelte'}
 for p in root.rglob('*'):
  if count>=a.max_files:break
  if not p.is_file() or p.suffix.lower() not in exts or any(x in SKIP for x in p.parts):continue
  count+=1;text=p.read_text(encoding='utf-8',errors='ignore')
  hits=[lib for lib in LIBS if re.search(r'(?i)(?<![\w-])'+re.escape(lib)+r'(?![\w-])',text)]
  if hits:usage.append({'file':str(p.relative_to(root)),'libraries':sorted(set(hits))})
 print(json.dumps({'root':str(root),'dependency_hits':dependency_hits,'usage_files':usage,'files_scanned':count},indent=2))
if __name__=='__main__':main()
