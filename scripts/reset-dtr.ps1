<#
.SYNOPSIS
    Clears a user's attendance punches so clock-in / clock-out can be retested.

.DESCRIPTION
    Attendance spans two databases: the email lives in gpr-auth's `gpr_identity` DB, while the
    punches live in wos-hr's `workos` DB keyed by that identity's id. Postgres cannot join across
    databases, so this resolves the id first, then deletes over a second connection.

    Deletes attendance_breaks before attendance_records (FK order), inside one transaction.
    Prints what it will remove and asks before deleting unless -Force is passed.

    NOTE: kept ASCII-only on purpose. Windows PowerShell 5.1 reads .ps1 as ANSI unless the file
    has a UTF-8 BOM, so non-ASCII characters here would break parsing.

.PARAMETER Email
    Account to reset. Defaults to javiergenepaul@gmail.com.

.PARAMETER All
    Delete every punch for the user instead of just today's.

.PARAMETER Force
    Skip the confirmation prompt.

.EXAMPLE
    .\scripts\reset-dtr.ps1
    Clears today's punches for the default account, after confirming.

.EXAMPLE
    .\scripts\reset-dtr.ps1 -Email someone@example.com -All -Force
#>
[CmdletBinding()]
param(
    [string]$Email = "javiergenepaul@gmail.com",
    [switch]$All,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

# --- Connection settings (dev defaults from application-dev.yaml) --------------
$PgHost     = if ($env:PGHOST)     { $env:PGHOST }     else { "localhost" }
$PgPort     = if ($env:PGPORT)     { $env:PGPORT }     else { "5432" }
$PgUser     = if ($env:PGUSER)     { $env:PGUSER }     else { "postgres" }
$PgPassword = if ($env:PGPASSWORD) { $env:PGPASSWORD } else { "root" }
$IdentityDb = "gpr_identity"
$WorkosDb   = "workos"

# --- Locate psql (commonly installed but not on PATH) -------------------------
$psql = (Get-Command psql -ErrorAction SilentlyContinue).Source
if (-not $psql) {
    $psql = Get-ChildItem "C:\Program Files\PostgreSQL" -Directory -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending |
        ForEach-Object { Join-Path $_.FullName "bin\psql.exe" } |
        Where-Object { Test-Path $_ } |
        Select-Object -First 1
}
if (-not $psql) {
    Write-Error "psql not found. Add it to PATH or install the PostgreSQL client tools."
}

$env:PGPASSWORD = $PgPassword

function Invoke-Sql {
    param([string]$Database, [string]$Sql)
    # -A -t gives bare, unaligned output so results parse cleanly.
    $out = & $psql -h $PgHost -p $PgPort -U $PgUser -d $Database -v ON_ERROR_STOP=1 -A -t -c $Sql
    if ($LASTEXITCODE -ne 0) { Write-Error "Query failed against '$Database'." }
    return $out
}

# --- 1. Resolve the identity id from the email --------------------------------
$safeEmail = $Email.Replace("'", "''")
$userId = (Invoke-Sql $IdentityDb "SELECT id FROM users WHERE lower(email) = lower('$safeEmail');" |
    Select-Object -First 1)

if ([string]::IsNullOrWhiteSpace($userId)) {
    Write-Error "No identity found in '$IdentityDb' for $Email."
}
$userId = $userId.Trim()
Write-Host "Account : $Email  (user_id = $userId)" -ForegroundColor Cyan

# --- 2. Show what would be removed --------------------------------------------
# CURRENT_DATE matches AttendanceRecord.date, which is set from the clock-in date.
$scope = if ($All) { "" } else { " AND date = CURRENT_DATE" }
$scopeLabel = if ($All) { "ALL dates" } else { "today (" + (Get-Date -Format 'yyyy-MM-dd') + ")" }

$listSql = "SELECT id || ' | ' || date || ' | in=' || COALESCE(time_in::text,'-') || ' | out=' || COALESCE(time_out::text,'-') FROM attendance_records WHERE user_id = $userId$scope ORDER BY date, id;"
$rows = Invoke-Sql $WorkosDb $listSql

$found = @($rows | Where-Object { $_ -and $_.Trim() })
Write-Host "Scope   : $scopeLabel" -ForegroundColor Cyan

if ($found.Count -eq 0) {
    Write-Host "Nothing to delete - no attendance records in scope. You can already clock in." -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "Records to delete ($($found.Count)):" -ForegroundColor Yellow
$found | ForEach-Object { Write-Host "  $_" }

if (-not $Force) {
    Write-Host ""
    $answer = Read-Host "Delete these records and their breaks? (y/N)"
    if ($answer -notmatch '^[Yy]') {
        Write-Host "Aborted - nothing was deleted." -ForegroundColor Yellow
        exit 0
    }
}

# --- 3. Delete breaks first (FK), then the records, in one transaction ---------
$deleteSql = "BEGIN; DELETE FROM attendance_breaks WHERE attendance_record_id IN (SELECT id FROM attendance_records WHERE user_id = $userId$scope); WITH removed AS (DELETE FROM attendance_records WHERE user_id = $userId$scope RETURNING 1) SELECT count(*) FROM removed; COMMIT;"
$deleted = Invoke-Sql $WorkosDb $deleteSql

$count = @($deleted | Where-Object { $_ -match '^\s*\d+\s*$' }) | Select-Object -First 1
Write-Host ""
Write-Host "Deleted $($count.Trim()) attendance record(s) and their breaks." -ForegroundColor Green
Write-Host "Reload the dashboard - the clock should be back to 'not clocked in'." -ForegroundColor Green
