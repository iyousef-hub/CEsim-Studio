# Builds the Microsoft Store package (.msix) of CEsim Studio from the packed app folder.
# The Store signs the package itself, so it is left unsigned here.
# The three identity values come from Partner Center > the app > Product identity:
#   MSIX_NAME              Package/Identity/Name
#   MSIX_PUBLISHER         Package/Identity/Publisher            (starts with CN=)
#   MSIX_PUBLISHER_DISPLAY Package/Properties/PublisherDisplayName
param([string]$Ver = $env:VER)
$ErrorActionPreference = 'Stop'
# defaults: the identity Partner Center gave CEsim Studio (Store ID 9PP2T74GQXZZ)
$name = if ($env:MSIX_NAME) { $env:MSIX_NAME } else { 'YousefA.Alghamdi.CEsimStudio' }
$pub = if ($env:MSIX_PUBLISHER) { $env:MSIX_PUBLISHER } else { 'CN=21027604-DABE-4066-BAD0-D124E28C13FF' }
$disp = if ($env:MSIX_PUBLISHER_DISPLAY) { $env:MSIX_PUBLISHER_DISPLAY } else { 'Yousef A.Alghamdi' }
if (-not $name -or -not $pub -or -not $disp) {
  Write-Host 'Store package skipped: set the repository variables MSIX_NAME, MSIX_PUBLISHER and MSIX_PUBLISHER_DISPLAY from Partner Center.'
  exit 0
}
$src = 'out\CEsim Studio-win32-x64'
$stage = 'out\msix'
if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
Copy-Item -Recurse $src $stage
Copy-Item -Recurse 'build\windows\store\Assets' "$stage\Assets"
# plain names too, so every logo resolves even without the resource index
foreach ($f in 'StoreLogo', 'Square44x44Logo', 'Square150x150Logo', 'Wide310x150Logo') { Copy-Item "$stage\Assets\$f.scale-100.png" "$stage\Assets\$f.png" }
$v = ($Ver -split '\.')[0..2] -join '.'
$m = Get-Content -Raw 'build\windows\store\AppxManifest.xml'
$m = $m.Replace('{{NAME}}', $name).Replace('{{PUBLISHER}}', [Security.SecurityElement]::Escape($pub)).Replace('{{PUBLISHER_DISPLAY}}', [Security.SecurityElement]::Escape($disp)).Replace('{{VERSION}}', "$v.0")
Set-Content -Path "$stage\AppxManifest.xml" -Value $m -Encoding UTF8
$kit = Get-ChildItem 'C:\Program Files (x86)\Windows Kits\10\bin' -Directory | Where-Object { Test-Path "$($_.FullName)\x64\makeappx.exe" } | Sort-Object Name | Select-Object -Last 1
if (-not $kit) { throw 'Windows SDK (makeappx.exe) not found' }
$bin = "$($kit.FullName)\x64"
Push-Location $stage
& "$bin\makepri.exe" createconfig /cf priconfig.xml /dq en-US /pv 10.0.0 /o | Out-Null
& "$bin\makepri.exe" new /pr . /cf priconfig.xml /of resources.pri /o | Out-Null
Remove-Item priconfig.xml
Pop-Location
New-Item -ItemType Directory -Force dist-store | Out-Null
$out = "dist-store\CEsim-Studio-$Ver-Store.msix"
& "$bin\makeappx.exe" pack /d $stage /p $out /o
if ($LASTEXITCODE -ne 0) { throw "makeappx failed ($LASTEXITCODE)" }
Write-Host "Store package: $out"
