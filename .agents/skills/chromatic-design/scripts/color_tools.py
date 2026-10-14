#!/usr/bin/env python3
"""Small read-only color utilities for Agent Skills."""
from __future__ import annotations
import argparse, json, re
from pathlib import Path
HEX_RE=re.compile(r'(?<![A-Za-z0-9_-])#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![0-9a-fA-F])')
VAR_RE=re.compile(r'var\(--[A-Za-z0-9_-]+\)')
EXT={'.css','.scss','.sass','.less','.html','.htm','.js','.jsx','.ts','.tsx','.vue','.svelte'}
SKIP={'node_modules','.git','.next','dist','build','coverage','.cache','.turbo'}
def rgb(value:str):
 s=value.strip().lstrip('#')
 if len(s) in (3,4): s=''.join(ch*2 for ch in s)
 if len(s) not in (6,8): raise ValueError('expected #RGB, #RGBA, #RRGGBB or #RRGGBBAA')
 if len(s)==8 and s[-2:].lower()!='ff': raise ValueError('contrast command requires opaque colors')
 return tuple(int(s[i:i+2],16)/255 for i in (0,2,4))
def lin(c): return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def lum(c):
 r,g,b=rgb(c); return .2126*lin(r)+.7152*lin(g)+.0722*lin(b)
def contrast(a,b):
 x,y=sorted((lum(a),lum(b)),reverse=True); return (x+.05)/(y+.05)
def files(root:Path,max_files:int):
 count=0
 for p in root.rglob('*'):
  if count>=max_files: break
  if not p.is_file() or p.suffix.lower() not in EXT or any(x in SKIP for x in p.parts): continue
  count+=1; yield p
def scan(root,max_files):
 literals=[]; variables=[]
 for p in files(root,max_files):
  try: text=p.read_text(encoding='utf-8',errors='ignore')
  except OSError: continue
  hs=sorted(set(HEX_RE.findall(text))); vs=sorted(set(VAR_RE.findall(text)))
  if hs: literals.append({'file':str(p.relative_to(root)),'hex':hs})
  if vs: variables.append({'file':str(p.relative_to(root)),'css_variables':vs})
 return {'root':str(root),'files_with_hex_literals':literals,'files_with_css_variables':variables}
def main():
 ap=argparse.ArgumentParser(description='Calculate contrast or scan a project for color literals and CSS variables.')
 sub=ap.add_subparsers(dest='cmd',required=True)
 c=sub.add_parser('contrast',help='Calculate WCAG contrast ratio for two opaque sRGB hex colors'); c.add_argument('foreground');c.add_argument('background');c.add_argument('--json',action='store_true')
 s=sub.add_parser('scan',help='Read-only scan for color usage');s.add_argument('root',type=Path);s.add_argument('--max-files',type=int,default=5000);s.add_argument('--json',action='store_true')
 a=ap.parse_args()
 if a.cmd=='contrast':
  try: ratio=contrast(a.foreground,a.background)
  except ValueError as e: ap.error(str(e))
  data={'foreground':a.foreground,'background':a.background,'contrast_ratio':round(ratio,3),'aa_normal_text':ratio>=4.5,'aa_large_text':ratio>=3}
  print(json.dumps(data,indent=2) if a.json else f"{ratio:.3f}:1")
 else:
  root=a.root.resolve()
  if not root.is_dir(): ap.error(f'not a directory: {root}')
  data=scan(root,a.max_files); print(json.dumps(data,indent=2) if a.json else json.dumps(data,indent=2))
if __name__=='__main__': main()
