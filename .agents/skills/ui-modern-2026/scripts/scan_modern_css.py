#!/usr/bin/env python3
from __future__ import annotations
import argparse,json,re
from pathlib import Path
PAT={'container_queries':r'@container\b|container-type\s*:','has_selector':r':has\(','subgrid':r'\bsubgrid\b','supports':r'@supports\b','oklch':r'\boklch\(','color_mix':r'\bcolor-mix\(','view_transition':r'view-transition|startViewTransition','popover':r'\bpopover\b|showPopover\s*\('}
SKIP={'.git','node_modules','.next','dist','build','coverage','.cache'}
def main():
 ap=argparse.ArgumentParser(description='Read-only scan for selected modern CSS/UI platform feature signals.')
 ap.add_argument('root',type=Path);ap.add_argument('--max-files',type=int,default=6000);ap.add_argument('--json',action='store_true');a=ap.parse_args();root=a.root.resolve()
 if not root.is_dir():ap.error(f'not a directory: {root}')
 hits={k:[] for k in PAT};n=0
 for p in root.rglob('*'):
  if n>=a.max_files:break
  if not p.is_file() or p.suffix.lower() not in {'.css','.scss','.html','.js','.jsx','.ts','.tsx','.vue','.svelte'} or any(x in SKIP for x in p.parts):continue
  n+=1;t=p.read_text(encoding='utf-8',errors='ignore')
  for k,pat in PAT.items():
   if re.search(pat,t,re.I):hits[k].append(str(p.relative_to(root)))
 print(json.dumps({'files_scanned':n,'features':{k:v for k,v in hits.items() if v},'note':'Presence does not establish browser compatibility or correct fallback.'},indent=2))
if __name__=='__main__':main()
