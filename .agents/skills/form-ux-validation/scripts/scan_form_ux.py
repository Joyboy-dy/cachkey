#!/usr/bin/env python3
from __future__ import annotations
import argparse,json,re
from pathlib import Path
SKIP={'.git','node_modules','.next','dist','build','coverage','.cache'}
SIGNALS={
 'form_markup':r'<form\b|useForm\s*\(|FormGroup|FormControl',
 'submit':r'onSubmit|handleSubmit|type=["\']submit["\']|requestSubmit\s*\(',
 'dirty':r'isDirty|dirtyFields|\bdirty\b|unsaved|changedSince',
 'navigation_guard':r'beforeunload|useBlocker|routeChangeStart|unsaved|confirm\s*\(',
 'errors':r'formState\.errors|setError\s*\(|aria-invalid|aria-describedby|validationError|fieldErrors',
 'pending':r'isSubmitting|isPending|loading|submitting'
}
def main():
 ap=argparse.ArgumentParser(description='Read-only triage scan for form UX signals. Static matches require manual confirmation.')
 ap.add_argument('root',type=Path);ap.add_argument('--max-files',type=int,default=5000);ap.add_argument('--json',action='store_true');a=ap.parse_args();root=a.root.resolve()
 if not root.is_dir():ap.error(f'not a directory: {root}')
 rows=[];count=0
 for p in root.rglob('*'):
  if count>=a.max_files:break
  if not p.is_file() or p.suffix.lower() not in {'.html','.js','.jsx','.ts','.tsx','.vue','.svelte'} or any(x in SKIP for x in p.parts):continue
  count+=1;text=p.read_text(encoding='utf-8',errors='ignore')
  hits=[k for k,pat in SIGNALS.items() if re.search(pat,text,re.I)]
  if hits:rows.append({'file':str(p.relative_to(root)),'signals':hits})
 print(json.dumps({'root':str(root),'files_scanned':count,'matches':rows,'note':'Static signal scan only; inspect matched code and runtime behavior.'},indent=2))
if __name__=='__main__':main()
