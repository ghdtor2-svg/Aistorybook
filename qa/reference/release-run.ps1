$ErrorActionPreference='Stop'
$qa=(Resolve-Path 'work/checkout-qa').Path
Set-Location work/site-release
if(Get-NetTCPConnection -LocalPort 3113 -State Listen -ErrorAction SilentlyContinue){throw 'Test port occupied'}
$env:NETLIFY='true'
$env:OPENAI_API_KEY=''
$server=Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList @('node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3113') -WorkingDirectory (Get-Location).Path -WindowStyle Hidden -RedirectStandardError "$qa\release.err" -RedirectStandardOutput "$qa\release.out" -PassThru
try{
 $ready=$false
 for($i=0;$i -lt 10;$i++){if($server.HasExited){throw 'Test server exited'};try{if((Invoke-WebRequest 'http://127.0.0.1:3113/' -TimeoutSec 3).StatusCode -eq 200){$ready=$true;break}}catch{Start-Sleep -Seconds 1}}
 if(!$ready){throw 'Test server unavailable'}
 node (Join-Path $qa 'release-check.cjs')
 exit $LASTEXITCODE
}finally{if(!$server.HasExited){Stop-Process -Id $server.Id}}
