#!/usr/bin/env python3
from __future__ import annotations
import argparse,json,re
from pathlib import Path
SKIP={'.git','node_modules','.next','dist','build','coverage','.cache'}
CHECKS={
 'img_without_alt_candidate':re.compile(r'<img\b(?![^>]*\balt\s*=)[^>]*>',re.I|re.S),
 'click_handler_on_div_candidate':re.compile(r'<div\b[^>]*\bonClick\s*=',re.I),
 'positive_tabindex_candidate':re.compile(r'tabIndex\s*=\s*["\'{]?\s*[1-9]\d*|tabindex\s*=\s*["\']?[1-9]\d*',re.I),
 'autofocus_candidate':re.compile(r'\bautoFocus\b|\bautofocus\b',re.I),
 'outline_none_candidate':re.compile(r'outline\s*:\s*(?:0|none)|outline-none\b',re.I)
}
def main():
 ap=argparse.ArgumentParser(description='Static accessibility triage. Matches are candidates, not confirmed accessibility failures.')
 ap.add_argument('root',type=Path);ap.add_argument('--max-files',type=int,default=7000);ap.add_argument('--json',action='store_true');a=ap.parse_args();root=a.root.resolve()
 if not root.is_dir():ap.error(f'not a directory: {root}')
 rows=[];n=0
 for p in root.rglob('*'):
  if n>=a.max_files:break
  if not p.is_file() or p.suffix.lower() not in {'.html','.js','.jsx','.ts','.tsx','.vue','.svelte','.css','.scss'} or any(x in SKIP for x in p.parts):continue
  n+=1;t=p.read_text(encoding='utf-8',errors='ignore');hits={k:len(pat.findall(t)) for k,pat in CHECKS.items()};hits={k:v for k,v in hits.items() if v}
  if hits:rows.append({'file':str(p.relative_to(root)),'candidates':hits})
 print(json.dumps({'files_scanned':n,'matches':rows,'warning':'Static regex triage only. Inspect semantics and rendered behavior before reporting a defect.'},indent=2))
if __name__=='__main__':main()
