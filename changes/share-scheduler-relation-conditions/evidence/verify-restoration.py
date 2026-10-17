import pathlib, subprocess, json, hashlib, re, os, datetime
root=pathlib.Path('/workspace/vibe-check'); work=root/'tmp/scheduler-shared-condition-implementation'
base='c45e549971813d7a01a89c89e75975b0530f1eb4'; rows=[]
for variant in ['b1','b2']:
    evidence=root/f'changes/share-scheduler-relation-conditions/evidence/{variant}'
    patch=evidence/'candidate.patch'; identity=json.loads((evidence/'identity.json').read_text())
    assert hashlib.sha256(patch.read_bytes()).hexdigest()==identity['candidatePatchSha256']
    target=work/f'restore-check-{variant}'
    if target.exists(): raise RuntimeError(f'target already exists: {target}')
    target.mkdir()
    subprocess.run(['bash','-c',f"git archive {base} src | tar --exclude='*.test.ts' -x -C '{target}'"],cwd=root,check=True)
    for match in re.finditer(r'^--- a/(.+)$',patch.read_text(),re.M):
        path=match.group(1)
        assert '..' not in pathlib.PurePosixPath(path).parts and path.startswith(('src/','docs/'))
        destination=target/path
        if not destination.exists():
            destination.parent.mkdir(parents=True,exist_ok=True)
            destination.write_bytes(subprocess.check_output(['git','show',f'{base}:{path}'],cwd=root))
    subprocess.run(['patch','--batch','--forward','-p1','--dry-run','-i',str(patch)],cwd=target,check=True,stdout=subprocess.DEVNULL)
    subprocess.run(['patch','--batch','--forward','-p1','-i',str(patch)],cwd=target,check=True,stdout=subprocess.DEVNULL)
    inventory=subprocess.check_output(['bash','-c',"find src -type f ! -name '*.test.ts' -print0 | sort -z | xargs -0 sha256sum"],cwd=target)
    expected=(evidence/'source-B.sha256').read_bytes()
    assert inventory==expected,f'{variant} runtime source mismatch'
    created=[]
    for path in identity['newFiles']:
        content=(target/path).read_bytes()
        created.append({'path':path,'bytes':len(content),'sha256':hashlib.sha256(content).hexdigest()})
    assert len(created)==4
    # Only these newly generated, byte-verified test copies are removed, preventing Bun substring discovery pollution.
    tests=[]
    for path in sorted((target/'src').rglob('*.test.ts')):
        data=path.read_bytes(); sha=hashlib.sha256(data).hexdigest(); inode=path.lstat().st_ino
        assert path.is_file() and not path.is_symlink()
        tests.append({'path':str(path.relative_to(target)),'sha256':sha})
        assert path.lstat().st_ino==inode and hashlib.sha256(path.read_bytes()).hexdigest()==sha
        path.unlink()
    row={'variant':variant,'sourceCommit':base,'patchSha256':identity['candidatePatchSha256'],'runtimeTreeDigest':hashlib.sha256(inventory).hexdigest(),'runtimeFiles':len(inventory.splitlines()),'newFilesApplied':created,'generatedTestCopiesRemoved':tests,'passed':True}
    rows.append(row)
    print(f'{variant}: exact runtime tree restored; {len(created)} new files applied; {len(tests)} generated test copies removed')
result={'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'method':'Fresh non-Git scratch tree from Git c45 src excluding test modules; fill only patch-needed base files; dry-run then full patch -p1; compare complete same-scope per-file runtime inventory; apply all four new files; remove only generated test copies after hashing','rows':rows}
(root/'changes/share-scheduler-relation-conditions/evidence/restoration-verification.json').write_text(json.dumps(result,indent=2)+'\n')
