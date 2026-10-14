#!/usr/bin/env python3
from __future__ import annotations
import argparse,json,re
from pathlib import Path
PATTERNS={'toast':r'\btoast\s*[.(]','notification':r'\bnotification\s*[.(]','snackbar':r'\bsnackbar\b|\benqueueSnackbar\b','flash':r'\bflash(?:Message)?\b','alert':r'\balert\s*\('}
SKIP={'.git','node_modules','.next','dist','build','coverage','.cache'}
def main():
 ap=argparse.ArgumentParser(description='Read-only scan for common notification/toast usage in source files.')
 ap.add_argument('root',type=Path);ap.add_argument('--max-files',type=int,default=5000);ap.add_argument('--json',action='store_true');a=ap.parse_args();root=a.root.resolve()
 if not root.is_dir():ap.error(f'not a directory: {root}')
 rows=[];count=0
 for p in root.rglob('*'):
  if count>=a.max_files:break
  if not p.is_file() or p.suffix.lower() not in {'.js','.jsx','.ts','.tsx','.vue','.svelte'} or any(x in SKIP for x in p.parts):continue
  count+=1;text=p.read_text(encoding='utf-8',errors='ignore')
  hits=[k for k,pat in PATTERNS.items() if re.search(pat,text,re.I)]
  if hits:rows.append({'file':str(p.relative_to(root)),'signals':hits})
 print(json.dumps({'root':str(root),'files_scanned':count,'matches':rows},indent=2))
if __name__=='__main__':main()
