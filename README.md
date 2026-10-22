<div align="center">

<img src="docs/assets/icon-512.png" width="96" alt="">

# Beyond™ TV

## Free your world.

**One calm home screen for the whole whānau, on Google TV, LG and Samsung TVs.**

Your streaming apps on one shelf, what's worth watching tonight, and no ads.<br>
Free and open source, built in Aotearoa by [Beyond](https://gobeyond.co.nz). One button to undo.

[Install](#install) · [LG TVs](#lg-tvs-webos) · [Samsung TVs](#samsung-tvs-tizen) · [Any TV](#any-tv) · [Change the code](#change-the-code) · [Roadmap](#roadmap)

<img src="docs/assets/banner.png" width="640" alt="The Beyond™ TV logo: Beyond's four coloured dots beside the words Beyond™ TV">

</div>

## Screenshots

<table>
<tr><td><img src="docs/screenshots/whos-watching.jpg" alt="Who's watching: Mum, Dad, and two kids' profiles with a unicorn and a dinosaur"></td>
<td><img src="docs/screenshots/home-night.jpg" alt="The home screen at night: a big clock and the streaming apps on one shelf"></td></tr>
<tr><td><img src="docs/screenshots/kids-home.jpg" alt="A kid's home screen in the world they chose, with only their apps"></td>
<td><img src="docs/screenshots/plex.jpg" alt="Plex built in: Continue Watching with progress bars, and Recently Added"></td></tr>
<tr><td><img src="docs/screenshots/make-it-yours-buddy.jpg" alt="Make it yours, step 1: a kid picks a buddy to be them on the TV"></td>
<td><img src="docs/screenshots/make-it-yours-world.jpg" alt="Make it yours, step 3: choose your world, from Under the sea to Dino volcano"></td></tr>
<tr><td><img src="docs/screenshots/make-it-yours-party.jpg" alt="The party at the end: This TV is yours now, with dinosaurs and stars flying out"></td>
<td><img src="docs/screenshots/message-from-the-app.jpg" alt="A message from the Beyond Family app on the TV: 5 minutes to dinner"></td></tr>
</table>

## What you get

- **Make it yours.** Kids make it theirs on their own profile, with the remote, no grown-up needed: a buddy, a colour, a world that fills their home screen, and the things they love drifting through it.
- **No ads.** No sponsored rows, banners or autoplaying promos.
- **Your apps, front and centre.** Netflix, Neon, TVNZ+, Disney+, ThreeNow, Plex and the rest on one shelf, in the order you pick on the TV.
- **Trending, not sponsored.** Fresh picks every hour from what's trending and the latest releases, only from apps you already have.
- **Weather one press away.** Hour by hour, with sunrise and sunset.
- **Light by day, dark by night.** It follows your city's real sunset.
- **Beyond's look.** Paper and ink, Sora headings, and focus in Beyond's moss green, the same family as [Beyond Family](https://beyondfamily.app).
- **Safe.** No root. Nothing is uninstalled. One button brings back the factory home screen.

## Roadmap

1. Who's watching: a profile for each person, with kids' profiles locked down.
2. Plex built in: link with a code at plex.tv/link, then Continue Watching and Recently Added on the home screen.
3. All your services as one: one "What's on" across every service you have, opening each title in its own app.
4. Beyond Family: pair the TV with your household, a phone remote in the Beyond Family app, voice search for kids, and the family house game on the big screen.

## Install

About five minutes, for a Google TV or Android TV (Android 8 or newer, so Sony's 2015 Bravias too). Nothing is rooted or uninstalled.

**First, on the TV:** Settings → System → About, press *Build* (or *Android TV OS build*) seven times, then Settings → System → Developer options → turn on **USB debugging**. Beyond™ TV needs it to switch the home screen, and the computer installers use it too.

### On the TV, no computer

1. Install **Downloader** (by AFTVnews) from the Play Store on the TV.
2. Open it, type **`yeahbuddynz.github.io/Beyond.TV/tv`** and press *Go*.
3. Press **Download Beyond™ TV**, then *Install* and *Open*. If the TV asks, allow Downloader to install apps.

### From a computer, one line

On the same Wi-Fi as the TV. It downloads Google's adb if you don't have it (into a folder of its own), finds your TV, installs Beyond™ TV, opens it and tells you what to press.

- **Mac or Linux**, in Terminal:
  ```bash
  curl -fsSL https://raw.githubusercontent.com/YeahBuddyNZ/Beyond.TV/main/install.sh | bash
  ```
- **Windows**, in PowerShell:
  ```powershell
  irm https://raw.githubusercontent.com/YeahBuddyNZ/Beyond.TV/main/install.ps1 | iex
  ```

The TV asks *Allow USB debugging?*: tick *Always allow* and press OK.

### Then, on the TV

Open *Beyond™ TV* → *Home Screen* → *Beyond™ TV*, and allow debugging once more. Your city, the shelf and the profiles are in its settings. From then on it keeps itself up to date: when there's a new version the TV asks, and one OK installs it.

These installs are the ready-made build: Auckland until you pick your city on the TV, and no trending picks (those need your own [TMDB key](#the-tmdb-key), so build it yourself below).

### With an AI assistant

Open [Claude Code](https://claude.com/claude-code), Codex or Antigravity and say:
> Install Beyond™ TV (github.com/YeahBuddyNZ/Beyond.TV) on my TV at 192.168.1.50. I live in Auckland.

It builds your own copy with your city and your TMDB key, puts it on your TV, and asks before anything important.

### Build it yourself

1. **On the TV**, turn on USB debugging (above).
2. **Tools:** a JDK (17+), the Android SDK command-line tools (build-tools 34, platform android-34) and adb. On a Mac:
   ```bash
   brew install --cask temurin android-commandlinetools android-platform-tools
   sdkmanager "build-tools;34.0.0" "platforms;android-34"
   ```
   On Linux, get OpenJDK 17, Android's command-line tools and adb from your package manager, then run the same `sdkmanager` line. On Windows, use Git Bash (which Claude Code uses there) or WSL.
3. **Build:**
   ```bash
   ./build.sh
   ```
   The first run creates `config.properties`. Set your city and your [TMDB key](#the-tmdb-key) there, then run it again.
4. **Install:**
   ```bash
   adb connect 192.168.1.50:5555
   adb install -r BeyondTV.apk
   ```
   On TCL TVs, also let it run in the background (TCL blocks it by default, and the switch never starts):
   ```bash
   adb shell "appops set nz.gobeyond.tv AUTO_START allow || appops set nz.gobeyond.tv APP_AUTO_START allow"
   ```
5. **On the TV**, open *Beyond™ TV* → *Home Screen* → *Beyond™ TV*.

## LG TVs (webOS)

The same home screen as an LG app: the picks, the glass shelf with your apps, the drawer with inputs, weather and prices, day and night, Home Settings and the shelf editor. It installs through LG's own Developer Mode, with nothing rooted or changed on the TV. LG's home screen stays where it is, and Beyond™ TV is one press of a number key away.

You need an LG TV (webOS 3 or newer) and a computer on the same Wi-Fi, with Python 3.

1. **On the TV**, open the LG Content Store and install **Developer Mode**. Sign in with a free [LG developer account](https://webostv.developer.lge.com), turn on **Dev Mode Status** (the TV restarts), then turn on **Key Server**. Write down the IP address and the passphrase it shows.
2. **On your computer**, get the code and build. `config.properties` works as for Google TV (your city, your [TMDB key](#the-tmdb-key)):
   ```bash
   git clone https://github.com/YeahBuddyNZ/Beyond.TV && cd Beyond.TV
   python3 webos/build.py
   ```
3. **Install.** The first time, it asks for the TV's passphrase; updates don't:
   ```bash
   python3 webos/install.py 192.168.1.50
   ```
4. **On the TV**, while Beyond™ TV is open, hold a number key on the remote. From then on, that key opens it from anywhere.

With an AI assistant, say *"Install Beyond™ TV (github.com/YeahBuddyNZ/Beyond.TV) on my LG TV at 192.168.1.50. I live in Auckland."* It builds the app and hands you the install command, so you type the passphrase yourself.

Developer Mode lasts about 40 days: open the Developer Mode app now and then and press **EXTEND**. To remove Beyond™ TV, run `python3 webos/install.py 192.168.1.50 --uninstall`.

## Samsung TVs (Tizen)

The same home screen as a Samsung app, with everything the LG one has: the picks, the shelf, the drawer with the inputs, the weather and the prices, day and night, and its own settings. It installs through Samsung's own Developer Mode, with nothing rooted or changed on the TV, and Samsung's home screen stays where it is.

You need a Samsung TV from 2017 or newer (Tizen 3+) and a computer on the same Wi-Fi.

1. **On the TV**, open **Apps** and type `1 2 3 4 5` on the remote. Turn **Developer mode** on, type your computer's IP address in **Host PC IP**, and restart the TV.
2. **On your computer**, download [TizenBrew Installer](https://github.com/reisxd/TizenBrewInstaller/releases/latest), the community's installer for Samsung TVs, open it and connect to your TV.
3. **Install from GitHub:** type `YeahBuddyNZ/Beyond.TV`. On 2023 and newer TVs it asks you to sign in to your Samsung account once, to sign the app for your TV.
4. **Straight to it:** in the TV's settings, under Start Screen Options, turn on **Autorun Last App**: the TV turns on into Beyond™ TV.

This build takes your city from the TV's time zone. For your exact city and the trending picks, build it with your own `config.properties` and [TMDB key](#the-tmdb-key): open the folder in Claude Code and say *"Install Beyond™ TV on my Samsung TV at 192.168.1.50. I live in Auckland."* It sets up Samsung's tools, and on 2023 and newer TVs you sign in to your Samsung account in the browser to make the certificate. Your signed build installs with `python3 tizen/install.py 192.168.1.50`, which needs only Python: no Tizen Studio, and no Rosetta on Apple Silicon Macs.

## Settings

The first values come from `config.properties`, created by the first build (Google TV, LG and Samsung use the same file). Most of them can also be changed on the TV, in *Beyond™ TV* → *Home Settings*, and the TV's choice wins:

| Key | What it does | Default |
|---|---|---|
| `tmdb_key` | Your free TMDB key, for the picks | empty |
| `tmdb_region` | Your country (two letters): which titles are on which app | `NZ` |
| `watchmode_key` | Optional, free [Watchmode](https://api.watchmode.com/) key: a pick opens the title's page in its app | empty |
| `latitude`, `longitude` | Your city, for the weather and the sunset | Auckland |
| `city` | The name on the weather card | `Auckland` |
| `hide_animation` | Leave cartoons and anime out of the picks | `false` |
| `language` | `auto` (follows the TV), `en`, `es`, `pt`, `ru` or `de` | `auto` |
| `show_crypto` | Show Binance crypto prices on home and screensaver | `false` |
| `currency` | Crypto prices in `NZD`, `USD`, `EUR`… | `NZD` |
| `temperature` | `C`, `F` or `auto` | `C` |
| `disable_assistant` | Also turn off Google Assistant | `false` |

Changed something? Run `./build.sh` and install again. Keep `beyondtv.keystore`: updates are signed with it.

### The TMDB key

Free, and it takes two minutes: create an account at [themoviedb.org](https://www.themoviedb.org/signup), then open [Settings → API](https://www.themoviedb.org/settings/api) and request a developer key. Paste the *API Read Access Token* (or the *API Key*) after `tmdb_key=`. It's your key: `config.properties` stays out of git.

### Opening a title, not just its app (optional)

With a free [Watchmode](https://api.watchmode.com/) key (`watchmode_key=` in `config.properties`), a pick opens its own page in the streaming app instead of the app's home. The free plan (2,500 credits a month) is enough: each title costs two requests the first time and is remembered after that. It works where the app takes the title's web address (tested: Prime Video and JioHotstar); where it doesn't, the pick just opens the app, as without a key.

## Going back

On the TV: *Beyond™ TV* → *Home Screen* → *Original*. The factory home screen, screensaver and every app come back exactly as they were. If the new home screen ever crashes three times in five minutes, it switches back by itself.

To remove it for good, switch to *Original* first, then uninstall *Beyond™ TV* (Settings → Apps). Uninstalled it while it was on? Install it again and pick *Original*: the list of what it turned off is kept in the TV's settings, so everything comes back.

## What it changes

- It becomes the home screen and the screensaver.
- It turns off, without uninstalling:
  - the stock home screen and screensaver;
  - Google TV's recovery home, Play Games and YouTube Music;
  - on TCL TVs, the TCL Channel, messages, store demo, hotel menu, manuals, mirroring and logging apps;
  - on Philco TVs, AI PONT (promo channels and app downloads) and the manual;
  - on Multilaser TVs, Anoki's screen-content recognition (ACR), the store demo and the manual;
  - on KTC-made TVs (NextStar), Anoki's screen-content recognition (ACR), the store demo and the manual;
  - Google Assistant, only with `disable_assistant=true`.
- On TCL TVs, the remote's Netflix, YouTube and Prime buttons keep working through a small accessibility service that only reads those buttons. Pick what each one opens in *Beyond™ TV* → *Remote Buttons*; *Original* turns the service off. On Vestel-made TVs (F&U and other store brands) and Xiaomi (Formovie) projectors the same goes for the Netflix button, and on KTC-made TVs (NextStar) for the Tabii button. On Sony TVs, the BRAVIA CORE, Netflix, Disney+, Prime Video, YouTube and Crunchyroll buttons can each open the app you pick, or keep Sony's default.
- Picture, sound, inputs, remote pairing, Google services and the Play Store are on a protected list, checked before every change.
- Apps that saved a Wi-Fi network are never turned off, since Android would erase the network. If the TV's first setup saved yours, the switch asks you to forget the network and connect again in Settings first (saved networks out of range don't show there; Claude Code can remove them).

## Any TV

Beyond™ TV runs on Google TV and Android TV: TCL, Sony, Hisense, Philips, Xiaomi, Vestel-made TVs (F&U), KTC-made TVs (NextStar) and more, plus streamers like Chromecast with Google TV, the Google TV Streamer, onn 4K and NVIDIA Shield. And on [LG](#lg-tvs-webos) and [Samsung](#samsung-tvs-tizen) TVs, as an app.

**Any other TV:** plug a Google TV streamer into HDMI and free that one. Same steps, same home screen.

**A different brand or model:** ask Claude. Beyond™ TV is made to be adapted by AI. Open the folder in Claude Code and say *"set it up for my Sony"*: it reads your TV, finds its home screen and its promo apps, updates the lists below and walks you through a test. [CLAUDE.md](CLAUDE.md) tells it how.

| What | Where |
|---|---|
| Apps to turn off | `DEBLOAT` in [`HomeMode.java`](app/src/nz/gobeyond/tv/HomeMode.java) |
| Apps never to touch | `PROTECTED` in the same file |
| Apps on the shelf | `SHELF` in [`HomeApps.java`](app/src/nz/gobeyond/tv/HomeApps.java) |
| Your brand's live TV app | `LIVE_TV_APPS` in the same file |

## Change the code

It's your code, and Claude Code finds its way around it. Try:

- *"Add Crunchyroll to the shelf."*
- *"Show the prices in euros."*
- *"Add Spanish."*
- *"Switch to the night look an hour after sunset."*

## How it works

- **A plain Android app, no Gradle, no libraries.** [`build.sh`](build.sh) runs aapt2 → javac → d8 → zipalign → apksigner and makes a 2 MB APK.
- **It uses the TV's own ADB, from inside the TV.** The app connects to `127.0.0.1:5555` with its own key (that's the *Allow USB debugging?* prompt) and runs the same commands you would: `cmd package set-home-activity`, `settings put secure screensaver_components`, `pm disable-user`. Nothing listens to the network.
- **Drawn by hand on one Canvas**, with Android 13 shaders for the frosted glass and the sky (plain fills on Android 8 to 12, with lighter shadows and no GPU layers on 8 to 11 for their older GPUs).
- **A safety net.** A watchdog in a separate process brings back the stock home screen after three crashes in five minutes, and a boot check keeps your choice after TV updates.
- **On LG and Samsung, the same design in plain HTML, CSS and JavaScript** ([`web/`](web)), written for the Chromium of older TVs, with no frameworks. [`webos/build.py`](webos/build.py) packs it with `config.properties` into an `.ipk` without LG's tools, and [`webos/install.py`](webos/install.py) installs it through Developer Mode; on LG it lists and opens apps through the TV's own service bus (Luna), as LG's launcher does. [`tizen/build.py`](tizen/build.py) packs the same app into a Samsung `.wgt`, which uses Tizen's web APIs for the apps and the inputs. To preview it on a computer: `python3 webos/build.py --preview`, then open `out/webos/index.html` (a stand-in lists sample apps).
- **Data** from TMDB (trending titles, new releases and which app streams what in your country), Open-Meteo (forecast, sunrise and sunset), and optionally Binance (24-hour prices when `show_crypto=true`).

| File | What it is |
|---|---|
| [`HomeView.java`](app/src/nz/gobeyond/tv/HomeView.java) | The home screen |
| [`HomeMode.java`](app/src/nz/gobeyond/tv/HomeMode.java) | Switching between Beyond™ TV and Original |
| [`Adb.java`](app/src/nz/gobeyond/tv/Adb.java) | The TV's own ADB, from inside the TV |
| [`Recs.java`](app/src/nz/gobeyond/tv/Recs.java) | The picks (TMDB) |
| [`HomeData.java`](app/src/nz/gobeyond/tv/HomeData.java) | Weather and prices |
| [`HomeApps.java`](app/src/nz/gobeyond/tv/HomeApps.java) | The shelf, inputs and All Apps |
| [`DreamView.java`](app/src/nz/gobeyond/tv/DreamView.java) | The screensaver |
| [`SettingsActivity.java`](app/src/nz/gobeyond/tv/SettingsActivity.java) | The settings screen (the app's icon) |
| [`Prefs.java`](app/src/nz/gobeyond/tv/Prefs.java) | Settings changed on the TV |
| [`RemoteKeys.java`](app/src/nz/gobeyond/tv/RemoteKeys.java) | The TCL remote's app buttons |
| [`Watchdog.java`](app/src/nz/gobeyond/tv/Watchdog.java) | The safety net |
| [`web/home.js`](web/home.js) | The home screen on LG TVs |
| [`web/tv.js`](web/tv.js) | The TV's apps and inputs, on LG and Samsung |
| [`webos/build.py`](webos/build.py), [`webos/install.py`](webos/install.py) | The LG app package and its install |
| [`tizen/build.py`](tizen/build.py) | The Samsung app package |

The website is in [`docs/`](docs): plain HTML and CSS on GitHub Pages.

## Privacy

No accounts, no analytics, no tracking. The app talks to TMDB, Open-Meteo (with the coordinates you set, or your time zone's main city), and Binance only when `show_crypto=true`, and Watchmode only when you set a `watchmode_key`. Your settings stay on your computer and your TV.

## Credits

- Built with [Claude Code](https://claude.com/claude-code), on top of [Free My TV](https://github.com/simbasjungles/free-my-tv) (MIT) and its contributors.
- The LG version builds on what [@danielthejoker18](https://github.com/danielthejoker18) found in [FreeMyTvWebOS](https://github.com/danielthejoker18/FreeMyTvWebOS) (MIT): installing through Developer Mode and opening apps through the TV's service bus.
- On Samsung TVs it installs with [TizenBrew Installer](https://github.com/reisxd/TizenBrewInstaller) by [@reisxd](https://github.com/reisxd).
- This product uses the TMDB API but is not endorsed or certified by [TMDB](https://www.themoviedb.org/).
- Links to the titles in the streaming apps by [Watchmode](https://api.watchmode.com/).
- Weather data by [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0). Prices from the [Binance](https://www.binance.com/) public API.
- Icons: [Material Symbols](https://fonts.google.com/icons) (Apache 2.0). Fonts: [Inter](https://rsms.me/inter/) and [Sora](https://github.com/sora-xor/sora-font) (SIL OFL 1.1). Coin logos: [cryptocurrency-icons](https://github.com/spothq/cryptocurrency-icons) (CC0). Samsung app logos: [Simple Icons](https://simpleicons.org) (CC0).
- Not affiliated with Google, TCL, LG, Samsung or any streaming service. App names and logos belong to their owners.

## Licence

Beyond™ TV is GPL-3.0 ([LICENSE](LICENSE)). It began as a fork of [Free My TV](https://github.com/simbasjungles/free-my-tv)
and keeps its history; that code's MIT licence is kept in [LICENSE-free-my-tv.txt](LICENSE-free-my-tv.txt).
