import argparse
import hashlib
import json
import shutil
import subprocess
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()

parser = argparse.ArgumentParser()
parser.add_argument('--output', required=True)
parser.add_argument('--version', default='4.1.3-gate1-revalidation')
args = parser.parse_args()

listed = subprocess.check_output(
    ['git','ls-files','--cached','--others','--exclude-standard','-z'], cwd=ROOT
).decode('utf-8').split('\0')
files = sorted(path for path in listed if path and path != 'version.json')
output = Path(args.output).resolve()
output.parent.mkdir(parents=True, exist_ok=True)

with tempfile.TemporaryDirectory(prefix='system-esg-release-') as tmp:
    stage = Path(tmp)
    for relative in files:
        source = ROOT / relative
        if not source.is_file():
            continue
        destination = stage / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, destination)

    hashes = {relative:(sha256(stage / relative)) for relative in files if (stage / relative).is_file()}
    manifest = {
        'version':args.version,
        'built_at':datetime.now(timezone.utc).isoformat(),
        'gate':'Gate 1 revalidation',
        'deployment_status':'local-only',
        'hash_scope':'Every packaged file except version.json; hashes use the exact ZIP entry bytes.',
        'files':hashes
    }
    manifest_bytes = (json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode('utf-8')
    (ROOT/'version.json').write_bytes(manifest_bytes)
    (stage/'version.json').write_bytes(manifest_bytes)

    if output.exists(): output.unlink()
    with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
        for path in sorted(p for p in stage.rglob('*') if p.is_file()):
            archive.write(path,path.relative_to(stage).as_posix())

with zipfile.ZipFile(output) as archive:
    packaged_manifest = json.loads(archive.read('version.json'))
    for relative, expected in packaged_manifest['files'].items():
        actual = hashlib.sha256(archive.read(relative)).hexdigest()
        if actual != expected:
            raise SystemExit(f'hash mismatch: {relative}: {actual} != {expected}')

print(f'PASS  {len(packaged_manifest["files"])} packaged file hashes match version.json')
print(output)
