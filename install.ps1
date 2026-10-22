# Puts Beyond(TM) TV on a Google TV or Android TV from a Windows computer on the same Wi-Fi. In PowerShell:
#
#   irm https://raw.githubusercontent.com/YeahBuddyNZ/Beyond.TV/main/install.ps1 | iex
#
# It fetches Google's adb if it isn't already here (into %LOCALAPPDATA%\BeyondTV, nothing installed system wide),
# finds the TV, installs the newest Beyond TV and opens it. It changes nothing else: switching the home screen is done
# on the TV, by the person holding the remote. Set $env:BEYONDTV_IP first to skip the search.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # Invoke-WebRequest is many times slower with its progress bar
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$ApkUrl = if ($env:BEYONDTV_APK_URL) { $env:BEYONDTV_APK_URL } else { 'https://github.com/YeahBuddyNZ/Beyond.TV/releases/download/tv/BeyondTV.apk' }
$Pkg = 'nz.gobeyond.tv'
$Home_ = Join-Path $env:LOCALAPPDATA 'BeyondTV'
$Brand = "Beyond$([char]0x2122) TV"

function Step($t) { Write-Host ''; Write-Host $t -ForegroundColor DarkCyan }
function Tv($t)   { Write-Host '  On the TV: ' -ForegroundColor Yellow -NoNewline; Write-Host $t }
function Oops($t) { Write-Host ''; Write-Host $t -ForegroundColor Red; throw 'Stopped.' }

# One try round the lot, so a stop reads as a sentence rather than a red stack, and the window stays open under iex.
try {

Write-Host ''
Write-Host "  $Brand" -ForegroundColor White
Write-Host '  Free your world.' -ForegroundColor DarkGray
Write-Host ''
Write-Host "This puts $Brand on your Google TV or Android TV (Android 8 or newer)."
Write-Host 'It takes about five minutes and changes nothing else on the TV.'
Write-Host ''
Write-Host 'Before you start, on the TV:'
Write-Host '  1. Settings > System > About (on some TVs: Device Preferences > About).'
Write-Host "     Press Build seven times, until it says you're a developer."
Write-Host '  2. Settings > System > Developer options > turn on USB debugging.'
Write-Host "  3. Settings > Network & Internet > your Wi-Fi shows the TV's IP address."
Write-Host ''
[void](Read-Host "Press Enter when that's done")

# adb
Step '1. Getting the tools'
$Adb = (Get-Command adb -ErrorAction SilentlyContinue).Source
if (-not $Adb) { $Adb = Join-Path $Home_ 'platform-tools\adb.exe' }
if (-not (Test-Path $Adb)) {
    Write-Host "Downloading Google's Android tools (about 7 MB) into $Home_"
    New-Item -ItemType Directory -Force -Path $Home_ | Out-Null
    $zip = Join-Path $Home_ 'platform-tools.zip'
    Invoke-WebRequest -UseBasicParsing -Uri 'https://dl.google.com/android/repository/platform-tools-latest-windows.zip' -OutFile $zip
    Expand-Archive -Force -Path $zip -DestinationPath $Home_
    Remove-Item $zip
}
Write-Host "Using $Adb"
# Native stderr would be an error under Stop in Windows PowerShell 5.1, so adb runs with Continue.
function A { $ErrorActionPreference = 'Continue'; & $Adb @args 2>&1 | Out-String }

# Every address on this computer's network with port 5555 open: Android TVs listen there while debugging is on.
function Find-Tvs {
    $route = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Sort-Object RouteMetric | Select-Object -First 1
    if (-not $route) { return @() }
    $me = (Get-NetIPAddress -InterfaceIndex $route.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue | Select-Object -First 1).IPAddress
    if (-not $me) { return @() }
    $base = $me.Substring(0, $me.LastIndexOf('.'))
    $tries = foreach ($i in 1..254) {
        $ip = "$base.$i"
        if ($ip -eq $me) { continue }
        $c = New-Object Net.Sockets.TcpClient
        [pscustomobject]@{ Ip = $ip; Client = $c; Task = $c.ConnectAsync($ip, 5555) }
    }
    Start-Sleep -Milliseconds 2000
    $found = $tries | Where-Object { $_.Task.Status -eq 'RanToCompletion' } | ForEach-Object { $_.Ip }
    $tries | ForEach-Object { $_.Client.Dispose() }
    return @($found)
}

Step '2. Finding your TV'
$Ip = $env:BEYONDTV_IP
if (-not $Ip) {
    Write-Host 'Looking on your Wi-Fi...'
    $found = Find-Tvs
    if ($found.Count -eq 1) {
        $a = Read-Host "Found one at $($found[0]). Is that your TV? [Y/n]"
        if ($a -notmatch '^[nN]') { $Ip = $found[0] }
    } elseif ($found.Count -gt 1) {
        Write-Host 'These could be your TV:'; $found | ForEach-Object { Write-Host "  $_" }
    }
    while (-not $Ip) { $Ip = (Read-Host "Type the TV's IP address (like 192.168.1.50)").Trim() }
}
$Ip = $Ip -replace ':5555$', ''
$T = "${Ip}:5555"

Write-Host "Connecting to $T"
[void](A start-server)
$state = ''; $told = $false
for ($n = 0; $n -lt 90; $n++) {
    [void](A connect $T)
    $state = (A -s $T get-state).Trim()
    if ($state -eq 'device') { break }
    if (-not $told) {
        Tv 'a box asks "Allow USB debugging?". Tick "Always allow from this computer", then OK.'
        Write-Host "  (No box? Check USB debugging is on and the TV is on the same Wi-Fi. Waiting up to 3 minutes.)" -ForegroundColor DarkGray
        $told = $true
    }
    Start-Sleep -Seconds 2
}
if ($state -ne 'device') {
    [void](A disconnect $T)
    Oops "Couldn't reach the TV at $Ip. Check the address, that USB debugging is on, and that both are on the same Wi-Fi, then run this again."
}

function Prop($p) { (A -s $T shell getprop $p).Trim() }
$brandName = Prop ro.product.brand
$sdk = Prop ro.build.version.sdk
Write-Host "Found $brandName $(Prop ro.product.model) (Android $(Prop ro.build.version.release))"
if ($sdk -match '^\d+$' -and [int]$sdk -lt 26) {
    Oops "This TV runs Android older than 8, which $Brand can't run on. A Google TV streamer on HDMI can."
}

# Installing
Step "3. Installing $Brand"
$apk = Join-Path $env:TEMP 'BeyondTV.apk'
try { Invoke-WebRequest -UseBasicParsing -Uri $ApkUrl -OutFile $apk }
catch { Oops "Couldn't download $Brand. Check the internet connection and try again." }
$result = A -s $T install -r $apk
if ($result -notmatch 'Success' -and $result -match 'UPDATE_INCOMPATIBLE|signatures do not match') {
    Write-Host "There's an older $Brand on this TV, signed differently, so it has to come off first."
    Tv "if $Brand is your home screen now, open $Brand > Home Screen > Original first."
    $a = Read-Host 'Remove the old copy and install the new one? [y/N]'
    if ($a -notmatch '^[yY]') { Oops "Nothing changed. Run this again when you're ready." }
    [void](A -s $T uninstall $Pkg)
    $result = A -s $T install $apk
}
if ($result -notmatch 'Success') { Oops "The TV didn't take it: $(($result -split "`n" | Where-Object { $_ } | Select-Object -Last 1))" }
Remove-Item $apk -ErrorAction SilentlyContinue
Write-Host 'Installed.'

# TCL blocks background jobs unless allowed, and the switch is one. Other TVs don't need it.
if ($brandName -match 'tcl') {
    [void](A -s $T shell "appops set $Pkg AUTO_START allow || appops set $Pkg APP_AUTO_START allow")
}
[void](A -s $T shell monkey -p $Pkg -c android.intent.category.LEANBACK_LAUNCHER 1)
[void](A disconnect $T)

# Over to the TV
Step '4. Over to you'
Write-Host "$Brand is open on the TV. To make it your home screen:"
Tv "Home Screen > $Brand. The TV asks to allow debugging once more: tick Always allow, then OK."
Write-Host ''
Write-Host 'What that does: your home screen and screensaver change, and a short list of the TV''s promo apps'
Write-Host 'is switched off (never uninstalled). Home Screen > Original brings it all back, any time.'
Write-Host ''
Write-Host "Your city, the shelf and the profiles are in $Brand's settings on the TV."
Write-Host 'From now on it keeps itself up to date: when there''s a new version, the TV asks, and one OK installs it.'
Write-Host ''
Write-Host 'Enjoy. Free your world.' -ForegroundColor DarkCyan
} catch {
    if ($_.Exception.Message -ne 'Stopped.') { Write-Host "Something went wrong: $($_.Exception.Message)" -ForegroundColor Red }
}
