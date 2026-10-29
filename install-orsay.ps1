# Puts Beyond(TM) TV on an older Samsung TV (2011 to 2015, Orsay) from a Windows computer on the same Wi-Fi. In PowerShell:
#
#   irm https://raw.githubusercontent.com/YeahBuddyNZ/Beyond.TV/main/install-orsay.ps1 | iex
#
# It downloads the ready-made app (Auckland's settings, the city from the TV's clock) into %LOCALAPPDATA%\BeyondTV and
# hands it to the TV when the TV asks, with nothing to build and nothing installed. ADR 0028. Changes nothing on the
# TV: the person holding the remote does the taps.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # Invoke-WebRequest is many times slower with its progress bar
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$ZipUrl = if ($env:BEYONDTV_ORSAY_URL) { $env:BEYONDTV_ORSAY_URL } else { 'https://github.com/YeahBuddyNZ/Beyond.TV/releases/download/tv/BeyondTV-orsay.zip' }
$Home_ = if ($env:BEYONDTV_HOME) { $env:BEYONDTV_HOME } else { Join-Path $env:LOCALAPPDATA 'BeyondTV' }
$Zip = Join-Path $Home_ 'BeyondTV-orsay.zip'

function Step($t) { Write-Host ''; Write-Host $t -ForegroundColor Cyan }
function Tv($t) { Write-Host '  On the TV: ' -ForegroundColor Yellow -NoNewline; Write-Host $t }
function Oops($t) { Write-Host ''; Write-Host $t -ForegroundColor Red; throw $t }

Write-Host ''
Write-Host '  Beyond(TM) TV for older Samsung TVs (2011 to 2015)'
Write-Host ''

Step '1. Getting Beyond TV'
New-Item -ItemType Directory -Force -Path $Home_ | Out-Null
try { Invoke-WebRequest -UseBasicParsing -Uri $ZipUrl -OutFile $Zip } catch { Oops "Couldn't download Beyond TV. Check the internet and run this again." }
$Body = [IO.File]::ReadAllBytes($Zip)
Write-Host "Got it ($([math]::Round($Body.Length / 1KB)) KB)."

# This computer's address on the home network: the one on the route out.
$Ip = $env:BEYONDTV_MY_IP
if (-not $Ip) {
    $route = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Sort-Object RouteMetric | Select-Object -First 1
    if ($route) { $Ip = (Get-NetIPAddress -InterfaceIndex $route.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue | Select-Object -First 1).IPAddress }
}
if (-not $Ip) { Oops "Couldn't work out this computer's address. Is it on the Wi-Fi?" }

$Xml = "<?xml version=`"1.0`" encoding=`"UTF-8`"?>`n<rsp stat=`"ok`">`n<list>`n<widget id=`"BeyondTV`">`n<title>Beyond TV</title>`n" +
       "<compression size=`"$($Body.Length)`" type=`"zip`"/>`n<description>A fast, ad-free home screen.</description>`n" +
       "<download>http://$Ip/Widget/BeyondTV.zip</download>`n</widget>`n</list>`n</rsp>`n"
$XmlBytes = [Text.Encoding]::UTF8.GetBytes($Xml)

# A plain TCP listener: port 80 needs no admin this way, where Windows' HttpListener would.
$Listener = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Any, 80)
try { $Listener.Start() } catch { Oops "Couldn't start. Close anything using port 80 (another web server) and run this again." }

Step '2. On the TV'
Write-Host 'If Windows asks whether to allow PowerShell on the network, choose Allow (private networks).'
Tv 'press Smart Hub, then the red A button (or Samsung Account in the menu).'
Tv 'sign in as develop. If it asks for a password: sso1029dev!'
Tv "hold OK on any app, choose IP Setting and type $Ip"
Tv 'hold OK again and choose Start User App Sync.'
Write-Host ''
Write-Host 'Waiting for the TV. When Beyond TV shows up in Smart Hub, press Ctrl+C here.'

try {
    while ($true) {
        $c = $Listener.AcceptTcpClient()
        try {
            $s = $c.GetStream()
            $r = New-Object IO.StreamReader($s, [Text.Encoding]::ASCII, $false, 1024, $true)
            $line = $r.ReadLine()
            while ($true) { $h = $r.ReadLine(); if ($null -eq $h -or $h -eq '') { break } }
            $path = if ($line -match '^GET (\S+)') { $Matches[1] } else { '' }
            $type = $null; $out = $null
            if ($path -eq '/widgetlist.xml') { $type = 'text/xml'; $out = $XmlBytes; Write-Host '  The TV is asking...' }
            elseif ($path -eq '/Widget/BeyondTV.zip') { $type = 'application/zip'; $out = $Body; Write-Host '  Sent Beyond TV to the TV.' }
            $head = if ($out) { "HTTP/1.0 200 OK`r`nContent-Type: $type`r`nContent-Length: $($out.Length)`r`nConnection: close`r`n`r`n" }
                    else { "HTTP/1.0 404 Not Found`r`nContent-Length: 0`r`nConnection: close`r`n`r`n" }
            $hb = [Text.Encoding]::ASCII.GetBytes($head)
            $s.Write($hb, 0, $hb.Length)
            if ($out) { $s.Write($out, 0, $out.Length) }
            $s.Flush()
        } catch { } finally { $c.Close() }
    }
} finally { $Listener.Stop() }
