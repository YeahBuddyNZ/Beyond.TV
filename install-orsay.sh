#!/usr/bin/env bash
# Puts Beyond™ TV on an older Samsung TV (2011 to 2015, Orsay) from a Mac or Linux computer on the same Wi-Fi:
#
#   curl -fsSL https://raw.githubusercontent.com/YeahBuddyNZ/Beyond.TV/main/install-orsay.sh | bash
#
# It downloads the ready-made app (Auckland's settings, the city from the TV's clock) into ~/.beyondtv and hands it
# to the TV when the TV asks, with nothing to build and nothing installed. Perl does the serving: it comes with macOS
# and Linux, where Python may not. ADR 0028. Changes nothing on the TV: the person holding the remote does the taps.
set -euo pipefail

# Piped into bash, the script arrives on stdin as it runs, so all of it is one function, read whole before it runs.
main() {

ZIP_URL="${BEYONDTV_ORSAY_URL:-https://github.com/YeahBuddyNZ/Beyond.TV/releases/download/tv/BeyondTV-orsay.zip}"
HOME_DIR="${BEYONDTV_HOME:-$HOME/.beyondtv}"
ZIP="$HOME_DIR/BeyondTV-orsay.zip"

if [ -t 1 ]; then B=$'\033[1m'; G=$'\033[38;5;30m'; Y=$'\033[38;5;179m'; R=$'\033[38;5;167m'; D=$'\033[2m'; N=$'\033[0m'
else B= G= Y= R= D= N=; fi
say()  { printf '%s\n' "$*"; }
step() { printf '\n%s%s%s\n' "$G$B" "$*" "$N"; }
tv()   { printf '  %s📺 On the TV:%s %s\n' "$Y$B" "$N" "$*"; }
oops() { printf '\n%s%s%s\n' "$R$B" "$*" "$N" >&2; exit 1; }

say ""
say "${B}  ● ●   Beyond™ TV${N}"
say "${B}  ● ●   ${N}${D}for older Samsung TVs (2011 to 2015)${N}"
say ""

command -v perl >/dev/null || oops "This needs Perl, which comes with macOS and almost every Linux. Install it and run this again."

step "1. Getting Beyond™ TV"
mkdir -p "$HOME_DIR"
curl -fsSL -o "$ZIP.part" "$ZIP_URL" || oops "Couldn't download Beyond™ TV. Check the internet and run this again."
mv "$ZIP.part" "$ZIP"
say "Got it ($(( $(wc -c < "$ZIP") / 1024 )) KB)."

# This computer's address on the home network: the route out tells us which one.
IP="${BEYONDTV_MY_IP:-}"
if [ -z "$IP" ]; then
  IP=$(perl -MIO::Socket::INET -e '$s=IO::Socket::INET->new(PeerAddr=>"192.0.2.1",PeerPort=>9,Proto=>"udp") or exit; print $s->sockhost' 2>/dev/null || true)
fi
[ -n "$IP" ] && [ "$IP" != "0.0.0.0" ] || oops "Couldn't work out this computer's address. Is it on the Wi-Fi?"

# Port 80 is the only one the TV asks. macOS lets anyone use it; Linux wants sudo.
SUDO=
if [ "$(uname)" != "Darwin" ] && [ "$(id -u)" != 0 ]; then SUDO=sudo; say "Linux asks for your password to use port 80."; fi

step "2. On the TV"
tv "press Smart Hub, then the red ${B}A${N} button (or Samsung Account in the menu)."
tv "sign in as ${B}develop${N}. If it asks for a password: ${B}sso1029dev!${N}"
tv "hold ${B}OK${N} on any app, choose ${B}IP Setting${N} and type ${B}$IP${N}"
tv "hold ${B}OK${N} again and choose ${B}Start User App Sync${N}."
say ""
say "Waiting for the TV. When Beyond™ TV shows up in Smart Hub, press Ctrl+C here."

$SUDO perl -MIO::Socket::INET -e '
  my ($zip, $ip) = @ARGV;
  my $body = do { open(my $f, "<:raw", $zip) or die "no zip\n"; local $/; <$f> };
  my $xml = qq{<?xml version="1.0" encoding="UTF-8"?>\n<rsp stat="ok">\n<list>\n<widget id="BeyondTV">\n<title>Beyond TV</title>\n}
          . qq{<compression size="} . length($body) . qq{" type="zip"/>\n<description>A fast, ad-free home screen.</description>\n}
          . qq{<download>http://$ip/Widget/BeyondTV.zip</download>\n</widget>\n</list>\n</rsp>\n};
  my $srv = IO::Socket::INET->new(LocalPort => 80, Listen => 5, ReuseAddr => 1, Proto => "tcp")
    or die "Port 80 is busy or not allowed: $!\n";
  $| = 1;
  while (my $c = $srv->accept) {
    my $line = <$c> // ""; while (my $h = <$c>) { last if $h =~ /^\r?\n$/ }
    my ($path) = $line =~ m{^GET (\S+)};
    my ($type, $out) = !defined $path ? () :
      $path eq "/widgetlist.xml" ? ("text/xml", $xml) :
      $path eq "/Widget/BeyondTV.zip" ? ("application/zip", $body) : ();
    if (defined $out) {
      print $c "HTTP/1.0 200 OK\r\nContent-Type: $type\r\nContent-Length: " . length($out) . "\r\nConnection: close\r\n\r\n$out";
      print $path eq "/widgetlist.xml" ? "  The TV is asking...\n" : "  Sent Beyond TV to the TV.\n";
    } else {
      print $c "HTTP/1.0 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
    }
    close $c;
  }' "$ZIP" "$IP" || oops "Couldn't start. Close anything using port 80 (another web server) and run this again."

}
main "$@"
