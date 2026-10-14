#!/usr/bin/env python3
from __future__ import annotations
import argparse,json,re
from pathlib import Path
SKIP={'.git','node_modules','.next','dist','build','coverage','.cache'}
def main():
 ap=argparse.ArgumentParser(description='Read-only frontend repository triage: framework/package signals, large source files, tests and type/style configs.')
 ap.add_argument('root',type=Path);ap.add_argument('--max-files',type=int,default=8000);ap.add_argument('--large-lines',type=int,default=500);ap.add_argument('--json',action='store_true');a=ap.parse_args();root=a.root.resolve()
 if not root.is_dir():ap.error(f'not a directory: {root}')
 pkg={};
 try:pkg=json.loads((root/'package.json').read_text())
 except Exception:pass
 deps={**pkg.get('dependencies',{}),**pkg.get('devDependencies',{})} if isinstance(pkg,dict) else {}
 frameworks=[x for x in ('next','react','vue','@angular/core','svelte','solid-js','astro') if x in deps]
 state=[x for x in ('zustand','redux','@reduxjs/toolkit','jotai','pinia','@tanstack/react-query','swr') if x in deps]
 rows=[];tests=[];n=0
 for p in root.rglob('*'):
  if n>=a.max_files:break
  if not p.is_file() or p.suffix.lower() not in {'.js','.jsx','.ts','.tsx','.vue','.svelte'} or any(x in SKIP for x in p.parts):continue
  n+=1
  try:lines=sum(1 for _ in p.open(encoding='utf-8',errors='ignore'))
  except OSError:continue
  rel=str(p.relative_to(root))
  if lines>=a.large_lines:rows.append({'file':rel,'lines':lines})
  if re.search(r'(?:\.test\.|\.spec\.|/__tests__/)',rel):tests.append(rel)
 print(json.dumps({'framework_signals':frameworks,'state_data_signals':state,'files_scanned':n,'large_source_files':sorted(rows,key=lambda x:-x['lines'])[:100],'test_files_count':len(tests),'configs':[x for x in ('tsconfig.json','eslint.config.js','eslint.config.mjs','vite.config.ts','next.config.js','next.config.mjs','vitest.config.ts','jest.config.js') if (root/x).exists()]},indent=2))
if __name__=='__main__':main()
