#!/usr/bin/env python3
"""Static, read-only container/Compose/GitHub workflow preflight."""
from __future__ import annotations
import argparse,json,re
from pathlib import Path
SENSITIVE=re.compile(r'(^|/)(\.env(?:\..*)?|id_rsa|id_ed25519|.*\.(?:pem|key|p12))$',re.I)
FILES=['Dockerfile','.dockerignore','compose.yml','compose.yaml','docker-compose.yml','docker-compose.yaml','package.json','pyproject.toml','go.mod','Cargo.toml']
def slurp(p):
 try:return p.read_text(encoding='utf-8',errors='ignore')
 except OSError:return ''
def main():
 ap=argparse.ArgumentParser(description='Static container deployment preflight. It never builds or runs containers.')
 ap.add_argument('root',type=Path);ap.add_argument('--json',action='store_true');a=ap.parse_args();root=a.root.resolve()
 if not root.is_dir():ap.error(f'not a directory: {root}')
 found=[f for f in FILES if (root/f).exists()]
 workflows=[]
 wfdir=root/'.github/workflows'
 if wfdir.is_dir():
  workflows=[str(p.relative_to(root)) for p in sorted(wfdir.glob('*.y*ml'))]
 docker=slurp(root/'Dockerfile');ignore=slurp(root/'.dockerignore')
 issues=[]
 if docker:
  if re.search(r'COPY\s+\.\s+\.',docker,re.I) and not ignore:issues.append('Dockerfile copies the full context but .dockerignore is missing')
  if re.search(r'\bUSER\s+root\b',docker,re.I):issues.append('Dockerfile explicitly selects root user; verify this is necessary')
 if ignore and not re.search(r'(?m)^\.env(?:\*|$|\.)',ignore):issues.append('.dockerignore does not visibly exclude .env files; inspect whether secrets can enter the context')
 suspicious=[]
 for p in root.iterdir():
  if p.is_file() and SENSITIVE.search(p.name): suspicious.append(p.name)
 data={'root':str(root),'found':found,'github_workflows':workflows,'static_issues':issues,'sensitive_root_filenames_detected':suspicious,'note':'Static scan only; it does not prove that an image builds, runs, or is deployable.'}
 print(json.dumps(data,indent=2))
if __name__=='__main__':main()
