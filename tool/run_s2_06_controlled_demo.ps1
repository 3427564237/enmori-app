[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$PrivateConfig,
    [Parameter(Mandatory)][string]$Adb,
    [Parameter(Mandatory)][string]$Serial,
    [Parameter(Mandatory)][string]$OutputDirectory,
    [string]$ExpectedAvd = 'enmori-validation-api36',
    [switch]$FlutterChild
)

$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $repo
if ($FlutterChild) {
    & fvm flutter test integration_test/s2_06_controlled_demo_test.dart -d $Serial --no-pub --reporter expanded "--dart-define-from-file=$PrivateConfig" --dart-define=ENMORI_S2_06_EXECUTE=true
    exit $LASTEXITCODE
}

$configPath = (Resolve-Path -LiteralPath $PrivateConfig).Path
$outPath = [IO.Path]::GetFullPath($OutputDirectory)
if ($outPath.StartsWith($repo + [IO.Path]::DirectorySeparatorChar,
        [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Keep raw execution artifacts outside the checkout.'
}
$avd = ((& $Adb -s $Serial emu avd name) -join ' ').Trim()
if ($LASTEXITCODE -ne 0 -or $avd -notmatch [regex]::Escape($ExpectedAvd)) {
    throw 'The explicitly selected dedicated AVD was not found.'
}
$wifiOriginal = ((& $Adb -s $Serial shell settings get global wifi_on) -join '').Trim()
$dataOriginal = ((& $Adb -s $Serial shell settings get global mobile_data) -join '').Trim()
if ($wifiOriginal -notin @('0', '1') -or $dataOriginal -notin @('0', '1')) {
    throw 'Cannot unambiguously record original radio settings.'
}
New-Item -ItemType Directory -Path $outPath -Force | Out-Null
$metadata = [ordered]@{
    startedUtc = [DateTime]::UtcNow.ToString('o')
    appBase = 'cdd0b9dad5705e4ac9887efe2cd86d3c07b7f4b4'
    testHead = ((git rev-parse HEAD) -join '').Trim()
    avd = $ExpectedAvd
    api = ((& $Adb -s $Serial shell getprop ro.build.version.sdk) -join '').Trim()
    wifiOriginal = $wifiOriginal
    mobileDataOriginal = $dataOriginal
    radiosInterrupted = $false
    radiosRestored = $false
    evidenceExported = $false
}
# The test initializes its own markers after installation. flutter test can
# uninstall the package after a run, so no installed package is required here.
$coordinationDirectory = ''

function Export-GateEvidence {
    $raw = (& $Adb -s $Serial shell run-as com.enmori.app cat "$coordinationDirectory/s2-06-result.json") -join [Environment]::NewLine
    if ($LASTEXITCODE -ne 0) { throw 'Gate evidence is unavailable.' }
    $parsed = $raw | ConvertFrom-Json
    if ($parsed.rows.PSObject.Properties.Count -ne 8 -or $null -eq $parsed.assertions) {
        throw 'Gate evidence schema is incomplete.'
    }
    $raw | Set-Content -LiteralPath (Join-Path $outPath 'gate-result-sanitized.json')
    $parsed.rows | ConvertTo-Json -Compress | Write-Output
    $metadata.evidenceExported = $true
}

function Set-RadioStates([string]$Wifi, [string]$Data) {
    $wifiAction = if ($Wifi -eq '1') { 'enable' } else { 'disable' }
    $dataAction = if ($Data -eq '1') { 'enable' } else { 'disable' }
    & $Adb -s $Serial shell svc wifi $wifiAction
    if ($LASTEXITCODE -ne 0) { throw 'AVD Wi-Fi command failed.' }
    & $Adb -s $Serial shell svc data $dataAction
    if ($LASTEXITCODE -ne 0) { throw 'AVD mobile-data command failed.' }
    $until = (Get-Date).AddSeconds(15)
    do {
        Start-Sleep -Milliseconds 500
        $actualWifi = ((& $Adb -s $Serial shell settings get global wifi_on) -join '').Trim()
        $actualData = ((& $Adb -s $Serial shell settings get global mobile_data) -join '').Trim()
        if ($actualWifi -eq $Wifi -and $actualData -eq $Data) { return }
    } while ((Get-Date) -lt $until)
    throw 'AVD radio state verification failed.'
}

$child = $null
$lastPhase = ''
try {
    # Standard flutter test in a child process; this is not Flutter Driver.
    $arguments = @('-NoProfile', '-File', ('"' + $PSCommandPath + '"'),
        '-FlutterChild', '-PrivateConfig', ('"' + $configPath + '"'),
        '-Adb', ('"' + $Adb + '"'), '-Serial', $Serial,
        '-OutputDirectory', ('"' + $outPath + '"'))
    $startOptions = @{
        FilePath = (Get-Process -Id $PID).Path
        ArgumentList = $arguments
        WindowStyle = 'Hidden'
        PassThru = $true
        RedirectStandardOutput = (Join-Path $outPath 'flutter-stdout-private.log')
        RedirectStandardError = (Join-Path $outPath 'flutter-stderr-private.log')
    }
    $child = Start-Process @startOptions
    $until = (Get-Date).AddMinutes(25)
    while (-not $child.HasExited -and (Get-Date) -lt $until) {
        # Directory.systemTemp is code_cache on this API 36 runtime. Discover
        # either supported app-private location instead of assuming cache.
        $phase = ''
        foreach ($candidate in @('code_cache', 'cache')) {
            $observed = ((& $Adb -s $Serial shell run-as com.enmori.app cat "$candidate/s2-06-phase" 2>$null) -join '').Trim()
            if ($observed -in @('running', 'disable_radios', 'restore_radios', 'finished')) {
                $phase = $observed
                $coordinationDirectory = $candidate
                break
            }
        }
        if ($phase -in @('running', 'disable_radios', 'restore_radios', 'finished') -and
            $phase -ne $lastPhase) {
            Write-Output ('S2_06_HOST phase=' + $phase)
            $lastPhase = $phase
            if ($phase -eq 'disable_radios') {
                # Cleanup flag is set before either radio changes.
                $metadata.radiosInterrupted = $true
                Set-RadioStates '0' '0'
                & $Adb -s $Serial shell run-as com.enmori.app touch "$coordinationDirectory/s2-06-radios_off"
                if ($LASTEXITCODE -ne 0) { throw 'Offline acknowledgment failed.' }
            } elseif ($phase -eq 'restore_radios') {
                Set-RadioStates $wifiOriginal $dataOriginal
                $metadata.radiosRestored = $true
                & $Adb -s $Serial shell run-as com.enmori.app touch "$coordinationDirectory/s2-06-radios_restored"
                if ($LASTEXITCODE -ne 0) { throw 'Restoration acknowledgment failed.' }
            } elseif ($phase -eq 'finished') {
                Export-GateEvidence
                & $Adb -s $Serial shell run-as com.enmori.app touch "$coordinationDirectory/s2-06-evidence_saved"
                if ($LASTEXITCODE -ne 0) { throw 'Evidence acknowledgment failed.' }
            }
        }
        Start-Sleep -Seconds 1
        $child.Refresh()
    }
    if (-not $child.HasExited) { throw 'Bounded S2-06 runner exceeded its time limit.' }
    $child.WaitForExit()
    $metadata.flutterExitCode = $child.ExitCode
} finally {
    if ($metadata.radiosInterrupted) {
        Set-RadioStates $wifiOriginal $dataOriginal
        $metadata.radiosRestored = $true
    }
    if ($null -ne $child -and -not $child.HasExited) {
        # Stops only this runner's child and its process tree.
        & taskkill.exe /PID $child.Id /T /F | Out-Null
    }
    $metadata.endedUtc = [DateTime]::UtcNow.ToString('o')
    $metadata | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $outPath 'host-result-sanitized.json')
    $apk = Join-Path $repo 'build/app/outputs/flutter-apk/app-debug.apk'
    if (Test-Path -LiteralPath $apk) {
        (Get-FileHash -LiteralPath $apk -Algorithm SHA256).Hash |
            Set-Content -LiteralPath (Join-Path $outPath 'test-apk-sha256.txt')
    }
}
if ($metadata.flutterExitCode -ne 0 -or -not $metadata.evidenceExported) { exit 1 }
