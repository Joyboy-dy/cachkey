#!/usr/bin/env python3
from __future__ import annotations
import argparse,json,re
from pathlib import Path
SKIP={'.git','node_modules','.next','dist','build','coverage','.cache'}
PATS={'hex_color':re.compile(r'#[0-9a-fA-F]{3,8}\b'),'inline_style':re.compile(r'\bstyle\s*=|style=\{'),'important':re.compile(r'!important'),'large_z_index':re.compile(r'z-(?:\[)?(?:[1-9]\d{2,})(?:\])?')}
def main():
 ap=argparse.ArgumentParser(description='Read-only scan for visual consistency candidates. Matches are not automatically defects.')
 ap.add_argument('root',type=Path);ap.add_argument('--max-files',type=int,default=5000);ap.add_argument('--json',action='store_true');a=ap.parse_args();root=a.root.resolve()
 if not root.is_dir():ap.error(f'not a directory: {root}')
 rows=[];n=0
 for p in root.rglob('*'):
  if n>=a.max_files:break
  if not p.is_file() or p.suffix.lower() not in {'.css','.scss','.js','.jsx','.ts','.tsx','.vue','.svelte','.html'} or any(x in SKIP for x in p.parts):continue
  n+=1;t=p.read_text(encoding='utf-8',errors='ignore'); hits={k:len(v.findall(t)) for k,v in PATS.items()};hits={k:v for k,v in hits.items() if v}
  if hits:rows.append({'file':str(p.relative_to(root)),'signals':hits})
 print(json.dumps({'files_scanned':n,'matches':rows,'note':'Investigate repeated/raw styling in context; do not bulk-replace from this scan.'},indent=2))
if __name__=='__main__':main()
