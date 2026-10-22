#!/usr/bin/env bash
# Puts Beyond™ TV on a Google TV or Android TV from a Mac or Linux computer on the same Wi-Fi:
#
#   curl -fsSL https://raw.githubusercontent.com/YeahBuddyNZ/Beyond.TV/main/install.sh | bash
#
# It fetches Google's adb if it isn't already here (into ~/.beyondtv, nothing installed system wide), finds the TV,
# installs the newest Beyond™ TV and opens it. It changes nothing else: switching the home screen is done on the TV,
# by the person holding the remote. Give the TV's IP to skip the search: `bash install.sh 192.168.1.50`.
set -euo pipefail

APK_URL="${BEYONDTV_APK_URL:-https://github.com/YeahBuddyNZ/Beyond.TV/releases/download/tv/BeyondTV.apk}"
PKG="nz.gobeyond.tv"
HOME_DIR="${BEYONDTV_HOME:-$HOME/.beyondtv}"

if [ -t 1 ]; then B=$'\033[1m'; G=$'\033[38;5;30m'; Y=$'\033[38;5;179m'; R=$'\033[38;5;167m'; D=$'\033[2m'; N=$'\033[0m'
else B= G= Y= R= D= N=; fi
say()  { printf '%s\n' "$*"; }
step() { printf '\n%s%s%s\n' "$G$B" "$*" "$N"; }
tv()   { printf '  %s📺 On the TV:%s %s\n' "$Y$B" "$N" "$*"; }
oops() { printf '\n%s%s%s\n' "$R$B" "$*" "$N" >&2; exit 1; }
# Piped into bash, stdin is this script, so questions are read from the terminal.
ask()  { local a; printf '%s ' "$1" >/dev/tty; IFS= read -r a </dev/tty || a=; printf '%s' "$a"; }

say ""
say "${B}  ● ●   Beyond™ TV${N}"
say "${B}  ● ●   ${N}${D}Free your world.${N}"
say ""
say "This puts Beyond™ TV on your Google TV or Android TV (Android 8 or newer)."
say "It takes about five minutes and changes nothing else on the TV."
say ""
say "Before you start, on the TV:"
say "  1. Settings → System → About (on some TVs: Device Preferences → About)."
say "     Press ${B}Build${N} seven times, until it says you're a developer."
say "  2. Settings → System → Developer options → turn on ${B}USB debugging${N}."
say "  3. Settings → Network & Internet → your Wi-Fi shows the TV's ${B}IP address${N}."
say ""
ask "Press Enter when that's done."; say ""

# MARK: adb

step "1. Getting the tools"
ADB=""
if command -v adb >/dev/null 2>&1; then
  ADB="$(command -v adb)"
elif [ -x "$HOME_DIR/platform-tools/adb" ]; then
  ADB="$HOME_DIR/platform-tools/adb"
else
  case "$(uname -s)" in
    Darwin) os=darwin ;;
    Linux)  os=linux ;;
    *) oops "This script is for Mac and Linux. On Windows, use install.ps1 (see the README)." ;;
  esac
  say "Downloading Google's Android tools (about 7 MB) into $HOME_DIR"
  mkdir -p "$HOME_DIR"
  zip="$HOME_DIR/platform-tools.zip"
  curl -fL# -o "$zip" "https://dl.google.com/android/repository/platform-tools-latest-$os.zip"
  if command -v unzip >/dev/null 2>&1; then unzip -qo "$zip" -d "$HOME_DIR"
  elif command -v python3 >/dev/null 2>&1; then python3 -m zipfile -e "$zip" "$HOME_DIR" && chmod +x "$HOME_DIR/platform-tools/adb"
  else oops "Couldn't unpack the tools: install unzip and run this again."; fi
  rm -f "$zip"
  ADB="$HOME_DIR/platform-tools/adb"
fi
say "Using $ADB"

# MARK: Finding the TV

# Every address on this computer's network with port 5555 open: Android TVs listen there while debugging is on.
find_tvs() {
  local me base out i
  me="$( (ipconfig getifaddr en0 || ipconfig getifaddr en1) 2>/dev/null || true)"
  [ -n "$me" ] || me="$(ip -4 route get 1.1.1.1 2>/dev/null | sed -n 's/.* src \([0-9.]*\).*/\1/p' | head -1)"
  [ -n "$me" ] || me="$(hostname -I 2>/dev/null | awk '{print $1}')"
  case "$me" in *.*.*.*) ;; *) return 0 ;; esac
  base="${me%.*}"
  out="$(mktemp)"
  for i in $(seq 1 254); do
    [ "$base.$i" = "$me" ] && continue
    ( ( exec 3<>"/dev/tcp/$base.$i/5555" ) 2>/dev/null && echo "$base.$i" >>"$out" ) &
    ( sleep 2; kill $! 2>/dev/null ) >/dev/null 2>&1 &
  done 2>/dev/null
  sleep 3
  sort -t. -k4 -n "$out"; rm -f "$out"
}

step "2. Finding your TV"
IP="${1:-}"
if [ -z "$IP" ]; then
  say "Looking on your Wi-Fi…"
  found="$(find_tvs || true)"
  count="$(printf '%s' "$found" | grep -c . || true)"
  if [ "$count" = "1" ]; then
    a="$(ask "Found one at ${B}$found${N}. Is that your TV? [Y/n]")"
    case "$a" in n*|N*) ;; *) IP="$found" ;; esac
  elif [ "$count" -gt 1 ]; then
    say "These could be your TV:"; printf '%s\n' "$found" | sed 's/^/  /'
  fi
  while [ -z "$IP" ]; do IP="$(ask "Type the TV's IP address (like 192.168.1.50):")"; done
fi
IP="${IP%:5555}"
T="$IP:5555"

say "Connecting to $T"
"$ADB" start-server >/dev/null 2>&1 || true
state=""
told=no
for _ in $(seq 1 90); do
  "$ADB" connect "$T" >/dev/null 2>&1 || true
  state="$("$ADB" -s "$T" get-state 2>/dev/null || true)"
  [ "$state" = "device" ] && break
  if [ "$told" = no ]; then
    tv "a box asks ${B}Allow USB debugging?${N} Tick ${B}Always allow from this computer${N}, then OK."
    say "  ${D}(No box? Check USB debugging is on and the TV is on the same Wi-Fi. Waiting up to 3 minutes.)${N}"
    told=yes
  fi
  sleep 2
done
if [ "$state" != "device" ]; then
  "$ADB" disconnect "$T" >/dev/null 2>&1 || true
  oops "Couldn't reach the TV at $IP. Check the address, that USB debugging is on, and that both are on the same Wi-Fi, then run this again."
fi

prop() { "$ADB" -s "$T" shell getprop "$1" 2>/dev/null | tr -d '\r'; }
brand="$(prop ro.product.brand)"; model="$(prop ro.product.model)"; sdk="$(prop ro.build.version.sdk)"
say "Found ${B}$brand $model${N} (Android $(prop ro.build.version.release))"
if [ -n "$sdk" ] && [ "$sdk" -lt 26 ]; then
  oops "This TV runs Android older than 8, which Beyond™ TV can't run on. A Google TV streamer on HDMI can."
fi

# MARK: Installing

step "3. Installing Beyond™ TV"
apk="$(mktemp -d)/BeyondTV.apk"
curl -fL# -o "$apk" "$APK_URL" || oops "Couldn't download Beyond™ TV. Check the internet connection and try again."
result="$("$ADB" -s "$T" install -r "$apk" 2>&1 || true)"
if ! printf '%s' "$result" | grep -q Success; then
  if printf '%s' "$result" | grep -q "UPDATE_INCOMPATIBLE\|signatures do not match"; then
    say "There's an older Beyond™ TV on this TV, signed differently, so it has to come off first."
    tv "if Beyond™ TV is your home screen now, open ${B}Beyond™ TV → Home Screen → Original${N} first."
    a="$(ask "Remove the old copy and install the new one? [y/N]")"
    case "$a" in y*|Y*) ;; *) oops "Nothing changed. Run this again when you're ready." ;; esac
    "$ADB" -s "$T" uninstall "$PKG" >/dev/null 2>&1 || true
    result="$("$ADB" -s "$T" install "$apk" 2>&1 || true)"
  fi
fi
printf '%s' "$result" | grep -q Success || oops "The TV didn't take it: $(printf '%s' "$result" | tail -1)"
rm -f "$apk"
say "Installed."

# TCL blocks background jobs unless allowed, and the switch is one. Other TVs don't need it.
case "$(printf '%s' "$brand" | tr '[:upper:]' '[:lower:]')" in
  *tcl*) "$ADB" -s "$T" shell "appops set $PKG AUTO_START allow || appops set $PKG APP_AUTO_START allow" >/dev/null 2>&1 || true ;;
esac

"$ADB" -s "$T" shell monkey -p "$PKG" -c android.intent.category.LEANBACK_LAUNCHER 1 >/dev/null 2>&1 \
  || "$ADB" -s "$T" shell monkey -p "$PKG" 1 >/dev/null 2>&1 || true
"$ADB" disconnect "$T" >/dev/null 2>&1 || true

# MARK: Over to the TV

step "4. Over to you"
say "Beyond™ TV is open on the TV. To make it your home screen:"
tv "${B}Home Screen → Beyond™ TV${N}. The TV asks to allow debugging once more: tick ${B}Always allow${N}, then OK."
say ""
say "What that does: your home screen and screensaver change, and a short list of the TV's promo apps"
say "is switched off (never uninstalled). ${B}Home Screen → Original${N} brings it all back, any time."
say ""
say "Your city, the shelf and the profiles are in Beyond™ TV's settings on the TV."
say "From now on it keeps itself up to date: when there's a new version, the TV asks, and one OK installs it."
say ""
say "${G}${B}Enjoy. Free your world.${N}"
