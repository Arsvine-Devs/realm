# arsvine-realm local dev launcher.
#
# What it does:
#   1. (Self-elevate to Administrator if needed.)
#   2. Add `127.0.0.1  dev.arsvine.com` to the Windows hosts file
#      so the COS *.arsvine.com Referer whitelist accepts local pages.
#   3. If the current user has a Windows proxy enabled, temporarily append
#      `dev.arsvine.com` to the proxy bypass list so browsers do not send the
#      local alias through the proxy first.
#   4. Run `node server.js` directly with `PORT=80`,
#      streaming its output here. We bypass npm.cmd because Ctrl+C only
#      kills the cmd.exe wrapper, leaving node.exe orphaned on port 80.
#   5. On Ctrl+C / normal exit / script termination:
#      - Stop the dev server (graceful taskkill, then /F fallback,
#        then port-80 sweep as a last resort).
#      - Remove the hosts entry that this script added (won't remove an
#        entry that was already there before the script ran).
#      - Restore the proxy bypass entry if this script added it.
#      - Flush DNS cache.
#
# Usage:
#   Double-click this file (preferably via dev-host-setup.cmd), OR run:
#     .\scripts\dev-host-setup.ps1                 # default: hosts + dev server
#     .\scripts\dev-host-setup.ps1 -HostsOnly      # only add hosts, no server
#     .\scripts\dev-host-setup.ps1 -Remove         # remove hosts entry and exit
#
# Notes:
#   - Window close (X) bypasses finally; use -Remove to clean up afterwards.
#   - A daily backup of the hosts file is written next to it the first time
#     the script edits it on any given day.
#   - Cleanup includes a port-80 sweep so any orphan node.exe gets killed.

param(
    [switch]$Remove,
    [switch]$HostsOnly,
    [ValidateSet('Add', 'Remove')]
    [string]$ElevatedHostsAction,
    [string]$ElevatedHostsLogPath
)

$ErrorActionPreference = 'Stop'

$Hostname  = 'dev.arsvine.com'
$IP        = '127.0.0.1'
$DevPort   = 80
$LegacyDevPort = 3000
$HostsPath = "$env:windir\System32\drivers\etc\hosts"
$Marker    = "$IP`t$Hostname`t# arsvine-realm local dev"
$InternetSettingsPath = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings'

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$EntryRegex  = "^\s*\d{1,3}(\.\d{1,3}){3}\s+$([regex]::Escape($Hostname))(\s|$)"

# Initialise error-reporting state before any system interaction. This lets a
# top-level failure report its stage and clean up only changes owned by this run.
$script:CurrentStage = 'initialising launcher'
$script:WeAddedHostsEntry = $false
$script:WeAddedProxyBypass = $false
$script:DevServerMayBeRunning = $false
$script:CleanupRan = $false
$script:FailureReported = $false
$script:LocationPushed = $false

function Write-ElevatedDiagnostic {
    param([Parameter(Mandatory = $true)] [string]$Message)

    if ([string]::IsNullOrWhiteSpace($ElevatedHostsLogPath)) {
        return
    }

    try {
        [System.IO.File]::AppendAllText(
            $ElevatedHostsLogPath,
            $Message + [Environment]::NewLine,
            [System.Text.Encoding]::UTF8
        )
    } catch {
        # Diagnostic reporting must never mask the original launcher failure.
    }
}

function Write-LauncherFailure {
    param([Parameter(Mandatory = $true)] [System.Management.Automation.ErrorRecord]$ErrorRecord)

    $location = if ($ErrorRecord.InvocationInfo.ScriptLineNumber) {
        "$($ErrorRecord.InvocationInfo.PSCommandPath):$($ErrorRecord.InvocationInfo.ScriptLineNumber)"
    } else {
        $PSCommandPath
    }

    Write-ElevatedDiagnostic -Message (@(
            "Stage: $script:CurrentStage"
            "Error: $($ErrorRecord.Exception.Message)"
            "Location: $location"
            "Identity: $([Security.Principal.WindowsIdentity]::GetCurrent().Name)"
            "IsAdministrator: $isAdministrator"
        ) -join [Environment]::NewLine)

    Write-Host ''
    Write-Host 'Local dev launcher failed.' -ForegroundColor Red
    Write-Host "Stage: $script:CurrentStage" -ForegroundColor Yellow
    Write-Host "Error: $($ErrorRecord.Exception.Message)" -ForegroundColor Red
    Write-Host "Location: $location" -ForegroundColor DarkGray
    Write-Host 'The launcher will now restore any hosts/proxy changes made by this run.' -ForegroundColor DarkGray
}

trap {
    Write-LauncherFailure -ErrorRecord $_
    if (Get-Command Invoke-DevHostCleanup -ErrorAction SilentlyContinue) {
        Invoke-DevHostCleanup
    }
    exit 1
}

# --- Privilege helpers ----------------------------------------------------

$currentPrincipal = New-Object Security.Principal.WindowsPrincipal(
    [Security.Principal.WindowsIdentity]::GetCurrent())
$isAdministrator = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

function Invoke-ElevatedHostsAction {
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet('Add', 'Remove')]
        [string]$Action
    )

    if ($isAdministrator) {
        return
    }

    $script:CurrentStage = "elevating hosts $Action action"
    Write-Host "Elevating to Administrator for hosts update..." -ForegroundColor Yellow
    $shell = if (Get-Command pwsh.exe -ErrorAction SilentlyContinue) { 'pwsh.exe' } else { 'powershell.exe' }
    $diagnosticPath = Join-Path ([System.IO.Path]::GetTempPath()) (
        "arsvine-realm-hosts-$([guid]::NewGuid().ToString('N')).log"
    )
    $argList = @(
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', "`"$PSCommandPath`"",
        '-ElevatedHostsAction', $Action,
        '-ElevatedHostsLogPath', "`"$diagnosticPath`""
    )

    try {
        $proc = Start-Process $shell -ArgumentList $argList -Verb RunAs -WindowStyle Hidden -PassThru -Wait
        if ($proc.ExitCode -ne 0) {
            if (Test-Path -LiteralPath $diagnosticPath) {
                $diagnostic = (Get-Content -LiteralPath $diagnosticPath -Raw).Trim()
                if ($diagnostic) {
                    Write-Host "Elevated process diagnostic:`n$diagnostic" -ForegroundColor DarkYellow
                }
            }
            throw "Elevated hosts action exited with code $($proc.ExitCode)."
        }
    } catch {
        Write-Host "Failed to update hosts with elevation: $_" -ForegroundColor Red
        Read-Host "Press Enter to close"
        exit 1
    } finally {
        Remove-Item -LiteralPath $diagnosticPath -Force -ErrorAction SilentlyContinue
    }
}

# --- Hosts helpers --------------------------------------------------------

function Test-HostsEntry {
    $lines = Get-Content $HostsPath
    return ($lines | Where-Object { $_ -match $EntryRegex }).Count -gt 0
}

function Backup-HostsOnce {
    $backupPath = "$HostsPath.bak.$(Get-Date -Format yyyyMMdd)"
    if (-not (Test-Path $backupPath)) {
        Copy-Item $HostsPath $backupPath
        Write-Host "Backup: $backupPath" -ForegroundColor DarkGray
    }
}

function Write-HostsLines {
    param(
        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string[]]$Lines
    )

    # Some Windows installations keep hosts read-only as a local hardening
    # measure. Preserve every original attribute, but make the file writable
    # for the short interval required by the edit.
    $originalAttributes = [System.IO.File]::GetAttributes($HostsPath)
    $wasReadOnly = ($originalAttributes -band [System.IO.FileAttributes]::ReadOnly) -ne 0

    try {
        if ($wasReadOnly) {
            $writableAttributes = [System.IO.FileAttributes](
                [int]$originalAttributes -bxor [int][System.IO.FileAttributes]::ReadOnly
            )
            [System.IO.File]::SetAttributes($HostsPath, $writableAttributes)
        }

        [System.IO.File]::WriteAllLines($HostsPath, $Lines, [System.Text.Encoding]::ASCII)
    }
    finally {
        if ($wasReadOnly) {
            [System.IO.File]::SetAttributes($HostsPath, $originalAttributes)
        }
    }
}

function Add-HostsEntry {
    $script:CurrentStage = 'adding hosts entry'
    if (Test-HostsEntry) { return $false }   # already present, we did NOT add
    Backup-HostsOnce
    $lines = Get-Content $HostsPath
    $newLines = @($lines) + $Marker
    Write-HostsLines -Lines $newLines
    $script:WeAddedHostsEntry = $true
    ipconfig /flushdns | Out-Null
    Write-Host "Added: $Marker" -ForegroundColor Green
    return $true                              # we added it -> we own removal
}

function Remove-HostsEntry {
    $script:CurrentStage = 'removing hosts entry'
    if (-not (Test-HostsEntry)) {
        Write-Host "No entry for $Hostname found." -ForegroundColor DarkGray
        return
    }
    Backup-HostsOnce
    $lines = Get-Content $HostsPath
    $newLines = $lines | Where-Object { $_ -notmatch $EntryRegex }
    Write-HostsLines -Lines $newLines
    ipconfig /flushdns | Out-Null
    Write-Host "Removed $Hostname from hosts." -ForegroundColor Green
}

# --- Proxy helpers --------------------------------------------------------

function Refresh-InternetSettings {
    if (-not ('WinInetProxySettings' -as [type])) {
        Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class WinInetProxySettings {
    [DllImport("wininet.dll", SetLastError = true)]
    public static extern bool InternetSetOption(IntPtr hInternet, int dwOption, IntPtr lpBuffer, int dwBufferLength);
}
"@
    }

    # INTERNET_OPTION_SETTINGS_CHANGED = 39
    # INTERNET_OPTION_REFRESH = 37
    [WinInetProxySettings]::InternetSetOption([IntPtr]::Zero, 39, [IntPtr]::Zero, 0) | Out-Null
    [WinInetProxySettings]::InternetSetOption([IntPtr]::Zero, 37, [IntPtr]::Zero, 0) | Out-Null
}

function Get-ProxyOverrideTokens {
    try {
        $raw = (Get-ItemProperty -Path $InternetSettingsPath -Name ProxyOverride -ErrorAction SilentlyContinue).ProxyOverride
    } catch {
        $raw = $null
    }

    if ([string]::IsNullOrWhiteSpace($raw)) {
        return @()
    }

    return @(
        $raw -split ';' |
        ForEach-Object { $_.Trim() } |
        Where-Object { $_ }
    )
}

function Test-ProxyBypassEntry {
    $tokens = Get-ProxyOverrideTokens
    return ($tokens | Where-Object { $_.Equals($Hostname, [System.StringComparison]::OrdinalIgnoreCase) }).Count -gt 0
}

function Add-ProxyBypassEntry {
    $script:CurrentStage = 'adding proxy bypass entry'
    try {
        $settings = Get-ItemProperty -Path $InternetSettingsPath -ErrorAction Stop
    } catch {
        Write-Host "Could not read Internet Settings; skipping proxy bypass update." -ForegroundColor DarkYellow
        return $false
    }

    if (-not $settings.ProxyEnable -or [string]::IsNullOrWhiteSpace($settings.ProxyServer)) {
        return $false
    }

    if (Test-ProxyBypassEntry) {
        Write-Host "Proxy bypass for $Hostname already present. Will NOT remove it on exit." -ForegroundColor Yellow
        return $false
    }

    $tokens = Get-ProxyOverrideTokens
    $newValue = @($tokens + $Hostname) -join ';'
    Set-ItemProperty -Path $InternetSettingsPath -Name ProxyOverride -Value $newValue
    $script:WeAddedProxyBypass = $true
    Refresh-InternetSettings
    Write-Host "Added $Hostname to ProxyOverride." -ForegroundColor Green
    return $true
}

function Remove-ProxyBypassEntry {
    $script:CurrentStage = 'removing proxy bypass entry'
    $tokens = Get-ProxyOverrideTokens
    if (-not $tokens.Count) {
        return
    }

    $remaining = @($tokens | Where-Object { -not $_.Equals($Hostname, [System.StringComparison]::OrdinalIgnoreCase) })
    if ($remaining.Count -eq $tokens.Count) {
        Write-Host "No proxy bypass entry for $Hostname found." -ForegroundColor DarkGray
        return
    }

    $newValue = $remaining -join ';'
    Set-ItemProperty -Path $InternetSettingsPath -Name ProxyOverride -Value $newValue
    Refresh-InternetSettings
    Write-Host "Removed $Hostname from ProxyOverride." -ForegroundColor Green
}

# --- Port helpers ---------------------------------------------------------

function Get-PortListenerPid {
    param([int]$Port)
    $line = netstat -ano | Select-String -Pattern "^\s+TCP\s+\S+:$Port\s+\S+\s+LISTENING\s+(\d+)\s*$" | Select-Object -First 1
    if ($line -and $line.Matches[0].Groups[1].Value) {
        return [int]$line.Matches[0].Groups[1].Value
    }
    return $null
}

function Stop-PortListener {
    param([int]$Port)
    $orphanPid = Get-PortListenerPid -Port $Port
    if ($orphanPid) {
        Write-Host "Port $Port still held by PID $orphanPid; force-killing..." -ForegroundColor DarkYellow
        & taskkill /F /T /PID $orphanPid 2>$null | Out-Null
    }
}

function Get-ProcessNameByPid {
    param([int]$ProcessId)
    try {
        return (Get-Process -Id $ProcessId -ErrorAction Stop).ProcessName
    } catch {
        return $null
    }
}

function Invoke-DevHostCleanup {
    if ($script:CleanupRan) {
        return
    }

    $script:CleanupRan = $true
    $cleanupFailures = [System.Collections.Generic.List[string]]::new()

    Write-Host ''
    Write-Host 'Cleaning up local development settings...' -ForegroundColor DarkGray

    if ($script:DevServerMayBeRunning) {
        try {
            Stop-PortListener -Port $DevPort
        } catch {
            $cleanupFailures.Add("port ${DevPort}: $($_.Exception.Message)")
        }
    }

    if ($script:WeAddedHostsEntry) {
        try {
            if ($isAdministrator) { Remove-HostsEntry } else { Invoke-ElevatedHostsAction -Action 'Remove' }
        } catch {
            $cleanupFailures.Add("hosts entry: $($_.Exception.Message)")
        }
    } else {
        Write-Host 'Hosts entry was pre-existing; leaving it in place.' -ForegroundColor DarkGray
    }

    if ($script:WeAddedProxyBypass) {
        try {
            Remove-ProxyBypassEntry
        } catch {
            $cleanupFailures.Add("proxy bypass: $($_.Exception.Message)")
        }
    }

    if ($cleanupFailures.Count) {
        Write-Host "Cleanup warnings: $($cleanupFailures -join '; ')" -ForegroundColor DarkYellow
    }
}

# --- Subcommand: -Remove (manual cleanup) ---------------------------------

if ($ElevatedHostsAction) {
    $script:CurrentStage = "running elevated hosts $ElevatedHostsAction action"
    Write-ElevatedDiagnostic -Message (@(
            "Action: $ElevatedHostsAction"
            "Identity: $([Security.Principal.WindowsIdentity]::GetCurrent().Name)"
            "IsAdministrator: $isAdministrator"
            "HostsPath: $HostsPath"
            "HostsAttributes: $([System.IO.File]::GetAttributes($HostsPath))"
        ) -join [Environment]::NewLine)
    if (-not $isAdministrator) {
        Write-Host "Elevated hosts action requires Administrator context." -ForegroundColor Red
        exit 1
    }

    if ($ElevatedHostsAction -eq 'Add') {
        Add-HostsEntry | Out-Null
        exit 0
    }

    if ($ElevatedHostsAction -eq 'Remove') {
        Remove-HostsEntry
        exit 0
    }
}

if ($Remove) {
    $script:CurrentStage = 'removing local development settings'
    if ($isAdministrator) {
        Remove-HostsEntry
    } else {
        Invoke-ElevatedHostsAction -Action 'Remove'
    }
    Remove-ProxyBypassEntry
    Read-Host "Press Enter to close"
    exit 0
}

# --- Add hosts entry ------------------------------------------------------

if ($isAdministrator) {
    $script:CurrentStage = 'adding hosts entry'
    $weAdded = Add-HostsEntry
    if (-not $weAdded) {
        Write-Host "Entry for $Hostname already present. Will NOT remove it on exit." -ForegroundColor Yellow
    }
} else {
    $hostsEntryAlreadyPresent = Test-HostsEntry
    if ($hostsEntryAlreadyPresent) {
        $weAdded = $false
        Write-Host "Entry for $Hostname already present. Will NOT remove it on exit." -ForegroundColor Yellow
    } else {
        Invoke-ElevatedHostsAction -Action 'Add'
        $weAdded = $true
    }
}
$script:WeAddedHostsEntry = $weAdded

$weAddedProxyBypass = Add-ProxyBypassEntry
$script:WeAddedProxyBypass = $weAddedProxyBypass

# --- Subcommand: -HostsOnly (no dev server) -------------------------------

if ($HostsOnly) {
    Write-Host ""
    Write-Host ('Hosts entry active. Open another shell and run "$env:PORT={0}; pnpm dev" yourself.' -f $DevPort) -ForegroundColor Cyan
    Write-Host "Press Enter here to remove the hosts entry and exit." -ForegroundColor Yellow
    Read-Host
    if ($weAdded) {
        if ($isAdministrator) { Remove-HostsEntry } else { Invoke-ElevatedHostsAction -Action 'Remove' }
    }
    if ($weAddedProxyBypass) { Remove-ProxyBypassEntry }
    exit 0
}

# --- Default: also launch the dev server ---------------------------------

# Sanity: if a previous crashed run left an orphan node.exe on the current
# or legacy dev port, clean it up automatically. A lingering server on the
# legacy default port (3000) still blocks Next.js from starting another dev
# instance in the same project directory, even if this script now uses port 80.
$portsToCheck = @($DevPort)
if ($LegacyDevPort -ne $DevPort) {
    $portsToCheck += $LegacyDevPort
}

foreach ($portToCheck in $portsToCheck) {
    $script:CurrentStage = "checking port $portToCheck"
    $preExisting = Get-PortListenerPid -Port $portToCheck
    if (-not $preExisting) {
        continue
    }

    $preExistingName = Get-ProcessNameByPid -ProcessId $preExisting
    if ($preExistingName -and $preExistingName.Equals('node', [System.StringComparison]::OrdinalIgnoreCase)) {
        $portLabel = if ($portToCheck -eq $DevPort) { "port $portToCheck" } else { "legacy dev port $portToCheck" }
        Write-Host ""
        Write-Host "$($portLabel.Substring(0,1).ToUpper() + $portLabel.Substring(1)) is held by an old node process (PID $preExisting). Cleaning it up..." -ForegroundColor DarkYellow
        & taskkill /F /T /PID $preExisting 2>$null | Out-Null
        Start-Sleep -Milliseconds 800
        Stop-PortListener -Port $portToCheck
        $stillHeld = Get-PortListenerPid -Port $portToCheck
        if ($stillHeld) {
            Write-Host "Port $portToCheck is still in use after cleanup (PID $stillHeld)." -ForegroundColor Red
            Invoke-DevHostCleanup
            Read-Host "Press Enter to close"
            exit 1
        }
    } elseif ($portToCheck -eq $DevPort) {
        $ownerLabel = if ($preExistingName) { "PID $preExisting, $preExistingName" } else { "PID $preExisting" }
        Write-Host ""
        Write-Host "Port $DevPort is already in use ($ownerLabel)." -ForegroundColor Red
        Write-Host "Refusing to kill a non-node process automatically." -ForegroundColor Yellow
        Invoke-DevHostCleanup
        Read-Host "Press Enter to close"
        exit 1
    }
}

Write-Host ""
Write-Host "Starting dev server (node server.js) in $ProjectRoot" -ForegroundColor Cyan
if ($DevPort -eq 80) {
    Write-Host "Open: http://${Hostname}" -ForegroundColor Cyan
} else {
    Write-Host "Open: http://${Hostname}:${DevPort}" -ForegroundColor Cyan
}
Write-Host "Note: first compile can take 10-30s. Wait for `"> Ready on http://localhost:${DevPort}`"." -ForegroundColor DarkGray
Write-Host "Press Ctrl+C to stop the server and clean up the local alias." -ForegroundColor Yellow
Write-Host ""

try {
    $script:CurrentStage = 'starting dev server'
    Push-Location $ProjectRoot
    $script:LocationPushed = $true
    # IMPORTANT: invoke node.exe directly. This keeps live stdout visible in
    # the current console while still avoiding the extra cmd.exe wrapper that
    # can orphan node.exe on Ctrl+C.
    $previousPort = $env:PORT
    $env:PORT = [string]$DevPort
    $script:DevServerMayBeRunning = $true
    & node.exe server.js
    $serverExitCode = $LASTEXITCODE
    if ($serverExitCode -ne 0) {
        throw "Dev server exited with code $serverExitCode."
    }
}
catch {
    $script:FailureReported = $true
    Write-LauncherFailure -ErrorRecord $_
    exit 1
}
finally {
    if ($script:LocationPushed) {
        Pop-Location
    }
    if ($null -ne $previousPort) {
        $env:PORT = $previousPort
    } else {
        Remove-Item Env:PORT -ErrorAction SilentlyContinue
    }
    Invoke-DevHostCleanup
    if (-not $script:FailureReported) {
        Write-Host ""
        Write-Host "Done. Press Enter to close." -ForegroundColor Green
        Read-Host
    }
}
