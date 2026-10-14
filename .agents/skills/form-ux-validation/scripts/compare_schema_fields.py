#!/usr/bin/env python3
from __future__ import annotations
import argparse,json
from pathlib import Path
def keys(p:Path):
 try:data=json.loads(p.read_text(encoding='utf-8'))
 except Exception as e:raise ValueError(f'{p}: invalid JSON: {e}')
 if isinstance(data,dict) and isinstance(data.get('properties'),dict):data=data['properties']
 if not isinstance(data,dict):raise ValueError(f'{p}: expected a JSON object or an object with a properties map')
 return set(map(str,data.keys()))
def main():
 ap=argparse.ArgumentParser(description='Compare top-level field names from two JSON objects/schema-like property maps. This does not compare validation semantics.')
 ap.add_argument('left',type=Path);ap.add_argument('right',type=Path);ap.add_argument('--json',action='store_true');a=ap.parse_args()
 try:l=keys(a.left);r=keys(a.right)
 except ValueError as e:ap.error(str(e))
 out={'only_left':sorted(l-r),'only_right':sorted(r-l),'shared':sorted(l&r),'same_field_set':l==r}
 print(json.dumps(out,indent=2));raise SystemExit(0 if l==r else 2)
if __name__=='__main__':main()
