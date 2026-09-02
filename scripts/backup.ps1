[CmdletBinding()]
param(
    [string]$ProjectDirectory = (Split-Path -Parent $PSScriptRoot),
    [string]$BackupDirectory = "",
    [ValidateRange(1, 36500)]
    [int]$RetentionDays = 7
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-BackupLog {
    param([Parameter(Mandatory = $true)][string]$Message)
    Write-Host ("[{0}] {1}" -f [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"), $Message)
}

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [switch]$DiscardOutput
    )

    if ($DiscardOutput) {
        & $FilePath @Arguments | Out-Null
    }
    else {
        & $FilePath @Arguments
    }
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code ${LASTEXITCODE}: $FilePath $($Arguments -join ' ')"
    }
}

Get-Command docker -ErrorAction Stop | Out-Null
Get-Command tar.exe -ErrorAction Stop | Out-Null

$ProjectDirectory = [IO.Path]::GetFullPath($ProjectDirectory)
if ([string]::IsNullOrWhiteSpace($BackupDirectory)) {
    $BackupDirectory = Join-Path $ProjectDirectory "backups"
}
$BackupDirectory = [IO.Path]::GetFullPath($BackupDirectory)
$storageDirectory = Join-Path $ProjectDirectory "backend\storage"

if (-not (Test-Path -LiteralPath (Join-Path $ProjectDirectory "docker-compose.yml") -PathType Leaf)) {
    throw "docker-compose.yml was not found in $ProjectDirectory"
}
if (-not (Test-Path -LiteralPath $storageDirectory -PathType Container)) {
    throw "Storage directory was not found: $storageDirectory"
}

New-Item -ItemType Directory -Path $BackupDirectory -Force | Out-Null

$stamp = [DateTime]::UtcNow.ToString("yyyy-MM-dd_HH-mm-ss'Z'")
$lockFile = Join-Path $ProjectDirectory ".library-maintenance.lock"
$databaseFinal = Join-Path $BackupDirectory "database_${stamp}.dump"
$storageFinal = Join-Path $BackupDirectory "storage_${stamp}.tar.gz"
$databaseTemp = Join-Path $BackupDirectory ".database_${stamp}.${PID}.tmp"
$storageTemp = Join-Path $BackupDirectory ".storage_${stamp}.${PID}.tmp"
$remoteDump = "/tmp/library-backup-${stamp}-${PID}.dump"
$remoteScript = "/tmp/library-backup-${stamp}-${PID}.sh"
$composeArguments = @("compose", "--project-directory", $ProjectDirectory)

$lockAcquired = $false
$lockStream = $null
$lockToken = [Guid]::NewGuid().ToString("N")
$databasePublished = $false
$storagePublished = $false
$backupComplete = $false
$remoteMayExist = $false
$backendNeedsRestart = $false
$cleanupFailures = [Collections.Generic.List[string]]::new()

try {
    if (Test-Path -LiteralPath $lockFile -PathType Container) {
        throw "A legacy maintenance lock directory exists at $lockFile. Verify that no backup or restore process is active before removing it once."
    }

    try {
        # FileShare.None is a kernel-managed lock. The handle is released even
        # if PowerShell exits unexpectedly, so a stale owner can be recovered
        # without deleting a lock held by another process.
        $lockStream = [IO.File]::Open(
            $lockFile,
            [IO.FileMode]::OpenOrCreate,
            [IO.FileAccess]::ReadWrite,
            [IO.FileShare]::None
        )
    }
    catch [IO.IOException] {
        throw "Another backup or restore operation is running ($lockFile is locked)."
    }

    $lockReader = [IO.StreamReader]::new(
        $lockStream,
        [Text.UTF8Encoding]::new($false),
        $true,
        1024,
        $true
    )
    try {
        $previousOwner = $lockReader.ReadToEnd()
    }
    finally {
        $lockReader.Dispose()
    }
    if (-not [string]::IsNullOrWhiteSpace($previousOwner)) {
        Write-BackupLog "Recovered stale backup lock metadata left by an interrupted run"
    }

    $lockStream.SetLength(0)
    $lockStream.Position = 0
    $lockWriter = [IO.StreamWriter]::new(
        $lockStream,
        [Text.UTF8Encoding]::new($false),
        1024,
        $true
    )
    try {
        $lockWriter.NewLine = "`n"
        $lockWriter.WriteLine("protocol=kernel-lock-v1")
        $lockWriter.WriteLine("pid=$PID")
        $lockWriter.WriteLine("host=$([Environment]::MachineName)")
        $lockWriter.WriteLine("token=$lockToken")
        $lockWriter.Flush()
    }
    finally {
        $lockWriter.Dispose()
    }
    $lockStream.Flush($true)
    $lockAcquired = $true

    if ((Test-Path -LiteralPath $databaseFinal) -or (Test-Path -LiteralPath $storageFinal)) {
        throw "Backup files for $stamp already exist."
    }

    Invoke-CheckedCommand -FilePath "docker" -Arguments ($composeArguments + @("config", "--quiet"))

    $runningServices = @(& docker @composeArguments ps --status running --services)
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to inspect Docker Compose services."
    }
    if ($runningServices -notcontains "db") {
        throw "Docker Compose service 'db' is not running."
    }

    # Stop the only application writer before taking either snapshot. This
    # keeps database rows and storage files aligned across pg_dump and tar.
    if ($runningServices -contains "backend") {
        $backendNeedsRestart = $true
        Write-BackupLog "Stopping backend for a consistent database + storage snapshot"
        Invoke-CheckedCommand -FilePath "docker" -Arguments ($composeArguments + @("stop", "backend"))
    }

    Write-BackupLog "Creating and validating PostgreSQL custom-format dump"
    $dumpCommand = @'
umask 077
pg_dump --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --format=custom --no-owner --no-privileges > "$1"
test -s "$1"
pg_restore --list "$1" >/dev/null
'@
    # Windows PowerShell 5.1 writes CRLF when piping text to a native process.
    # Encode a normalized LF-only script so Linux sh receives identical bytes.
    $dumpPayload = [Convert]::ToBase64String(
        [Text.Encoding]::UTF8.GetBytes(($dumpCommand -replace "`r`n?", "`n"))
    )
    $remoteMayExist = $true
    & docker @composeArguments exec -T db sh -cu `
        'umask 077; printf %s $1 | base64 -d >$2 && sh -seu -- $3 <$2' `
        sh $dumpPayload $remoteScript $remoteDump
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to create or validate the PostgreSQL dump (exit code ${LASTEXITCODE})."
    }
    Invoke-CheckedCommand -FilePath "docker" -Arguments ($composeArguments + @("cp", "db:${remoteDump}", $databaseTemp))

    if (-not (Test-Path -LiteralPath $databaseTemp -PathType Leaf) -or (Get-Item -LiteralPath $databaseTemp).Length -eq 0) {
        throw "Database dump is empty."
    }

    Write-BackupLog "Archiving backend/storage"
    Invoke-CheckedCommand -FilePath "tar.exe" -Arguments @("-czf", $storageTemp, "-C", (Join-Path $ProjectDirectory "backend"), "storage")
    if (-not (Test-Path -LiteralPath $storageTemp -PathType Leaf) -or (Get-Item -LiteralPath $storageTemp).Length -eq 0) {
        throw "Storage archive is empty."
    }
    Invoke-CheckedCommand -FilePath "tar.exe" -Arguments @("-tzf", $storageTemp) -DiscardOutput

    # Publish final names only after both artifacts have passed validation.
    Move-Item -LiteralPath $storageTemp -Destination $storageFinal
    $storagePublished = $true
    Move-Item -LiteralPath $databaseTemp -Destination $databaseFinal
    $databasePublished = $true
    $backupComplete = $true

    Write-BackupLog "Backup completed: $databaseFinal"
    Write-BackupLog "Backup completed: $storageFinal"

    $cutoff = [DateTime]::UtcNow.AddDays(-$RetentionDays)
    Write-BackupLog "Removing completed backup pairs older than $RetentionDays days"
    $oldDatabaseBackups = @(Get-ChildItem -LiteralPath $BackupDirectory -File -Filter "database_*.dump" |
        Where-Object { $_.LastWriteTimeUtc -lt $cutoff })
    foreach ($oldDatabase in $oldDatabaseBackups) {
        $pairStamp = $oldDatabase.BaseName.Substring("database_".Length)
        $oldStoragePath = Join-Path $BackupDirectory "storage_${pairStamp}.tar.gz"
        if (-not (Test-Path -LiteralPath $oldStoragePath -PathType Leaf)) {
            Write-Warning "Keeping orphan database backup without storage pair: $($oldDatabase.FullName)"
            continue
        }
        $oldStorage = Get-Item -LiteralPath $oldStoragePath
        if ($oldStorage.LastWriteTimeUtc -ge $cutoff) {
            continue
        }
        Write-BackupLog "Removing completed backup pair $pairStamp"
        Remove-Item -LiteralPath $oldDatabase.FullName, $oldStorage.FullName -Force
    }
}
finally {
    if ($remoteMayExist) {
        & docker @composeArguments exec -T db rm -f -- $remoteDump $remoteScript 2>$null
        if ($LASTEXITCODE -ne 0) {
            $cleanupFailures.Add("Unable to remove temporary files from the db container.") | Out-Null
        }
    }

    foreach ($temporaryPath in @($databaseTemp, $storageTemp)) {
        if (Test-Path -LiteralPath $temporaryPath -PathType Leaf) {
            try {
                Remove-Item -LiteralPath $temporaryPath -Force
            }
            catch {
                $cleanupFailures.Add("Unable to remove temporary file ${temporaryPath}: $($_.Exception.Message)") | Out-Null
            }
        }
    }

    if (-not $backupComplete) {
        if ($databasePublished -and (Test-Path -LiteralPath $databaseFinal -PathType Leaf)) {
            try {
                Remove-Item -LiteralPath $databaseFinal -Force
            }
            catch {
                $cleanupFailures.Add("Unable to remove incomplete backup ${databaseFinal}: $($_.Exception.Message)") | Out-Null
            }
        }
        if ($storagePublished -and (Test-Path -LiteralPath $storageFinal -PathType Leaf)) {
            try {
                Remove-Item -LiteralPath $storageFinal -Force
            }
            catch {
                $cleanupFailures.Add("Unable to remove incomplete backup ${storageFinal}: $($_.Exception.Message)") | Out-Null
            }
        }
    }

    # Restore service state before releasing the backup lock. Otherwise a
    # second backup could start while backend is stopped and overlap this start.
    if ($backendNeedsRestart) {
        Write-BackupLog "Restoring backend service after backup"
        & docker @composeArguments start --wait --wait-timeout 60 backend
        if ($LASTEXITCODE -ne 0) {
            $cleanupFailures.Add("Backend could not be restarted and become healthy. Start it manually.") | Out-Null
        }
    }

    if ($null -ne $lockStream) {
        try {
            if ($lockAcquired) {
                # Keep the file path stable and clear only its metadata while
                # this process still owns the exclusive handle. Deleting the
                # file after unlock could split contenders across two files.
                $lockStream.SetLength(0)
                $lockStream.Flush($true)
            }
        }
        catch {
            $cleanupFailures.Add("Unable to clear maintenance lock metadata: $($_.Exception.Message)") | Out-Null
        }
        finally {
            try {
                $lockStream.Dispose()
            }
            catch {
                $cleanupFailures.Add("Unable to release the maintenance lock: $($_.Exception.Message)") | Out-Null
            }
        }
    }

    foreach ($cleanupFailure in $cleanupFailures) {
        Write-Warning $cleanupFailure
    }
}

if ($cleanupFailures.Count -ne 0) {
    throw "Backup artifacts were created, but cleanup or service recovery failed. Review the warnings above."
}

Write-BackupLog "Done"
