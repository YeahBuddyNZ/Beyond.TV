# Beyond TV: notes for Claude

A home screen for Google TV and Android TV that replaces the stock one, plus a settings app that switches between
Beyond TV and the TV's original home screen. A plain Android app in Java, built without Gradle by `build.sh`.
LG TVs (webOS) and Samsung TVs (Tizen) get the same home screen as a web app: `web/`, packed by `webos/` and `tizen/`
(see below).
The website is in `docs/`: one static page (`docs/index.html`), no build step. A push to `main` that changes it
publishes it to GitHub Pages (`.github/workflows/pages.yml`).

This file loads into every session, so long rules are summarised here and kept word for word in `docs/history/` (index: `docs/history/INDEX.md`). Where a line says "Full rule", read it before changing that area. Keep this file under 20 KB; add long notes to `docs/history/`.

## Beyond TV: what's ours

Beyond TV is Beyond's (gobeyond.co.nz) free TV home screen, part of the Beyond Tools showcase. It is a fork of
Free My TV (MIT, history kept; licence in `LICENSE-free-my-tv.txt`); the project as a whole is GPL-3.0.

- **Writing:** New Zealand English in all copy, comments and commit messages. No em dashes anywhere. Dates DD/MM/YYYY.
- **Brand:** the same family as Beyond Family (YeahBuddyNZ/Beyond-Family). Paper `#F7F6F2`, ink `#22221F`, ink-soft
  `#55534B`, moss `#2F7D6D` (focus and the one primary action), ember `#E8A33D` (earned things only). The mark is
  Beyond's four dots (moss, ember, coral `#D85A30`, blue `#378ADD`) on an ink screen with a stand; `tools/make_art.py`
  draws every icon and banner from it. Sora (`app/assets/fonts/SoraVariable.ttf`) for display type, Inter for text.
- **Defaults are New Zealand:** region NZ, Auckland, NZD, Celsius, crypto off. NZ services (Neon, TVNZ+, ThreeNow,
  Sky Go) sit on the web shelf, matched by name.
- **Roadmap** (README): profiles, Plex, one "What's on" across services, then Beyond Family (pairing, a phone remote
  in the Beyond Family app, kids' voice search, the house game on the TV). New features are built in `web/` first,
  where they can be previewed in a browser.
- Beyond Family deploys to production on every push to its `main`: only ever open PRs there.

The person you're helping may not be technical. Keep it short and friendly, say what you're about to do on their TV
before you do it, and let them do the taps on the TV.

## Installing it for someone

**Without building:** `install.sh` (Mac, Linux) and `install.ps1` (Windows) install the ready-made build from the
`tv` release (Auckland, no TMDB key) and find the TV by port 5555 on the local network; `docs/tv/` is the page the
TV's Downloader app opens (`yeahbuddynz.github.io/Beyond.TV/tv`). CI keeps `tv` holding the newest signed APK. Build
your own (below) when they want their city baked in or the picks.

1. **Ask** for the TV's IP address and their city, if they didn't say.
2. **Tools:** a JDK 17+, the Android SDK command-line tools (build-tools 34+, platform android-34) and adb. Check
   what's already there (`java -version`, `$ANDROID_HOME`, `adb version`) and install only what's missing.
   - macOS: `brew install --cask temurin android-commandlinetools android-platform-tools`, then
     `sdkmanager "build-tools;34.0.0" "platforms;android-34"`.
   - Linux: OpenJDK 17, Android's command-line tools and adb from the package manager, then the same `sdkmanager` line.
   - Windows: Git Bash (what Claude Code runs there; `build.sh` handles it) or WSL, then as on Linux.
3. **Settings:** run `./build.sh` once; it creates `config.properties`. Fill in `latitude` and `longitude` (decimal
   degrees) and `city` for their city, `tmdb_region` (two-letter country), `show_crypto`, `currency` and `temperature` to match.
4. **The TMDB key is theirs and secret.** Ask them to create one (free: themoviedb.org → Settings → API) and paste it
   after `tmdb_key=` in `config.properties` themselves. Don't ask for it in the chat, never print it, never commit
   it. If they paste it in the chat anyway, put it only in `config.properties`.
   Without a key everything works except the picks and the screensaver photos.
   The same goes for the optional `watchmode_key` (free, watchmode.com; makes picks open the title's page): theirs, secret, only in `config.properties`.
5. **Build:** `./build.sh` → `BeyondTV.apk`. Keep `beyondtv.keystore`: updates must be signed with the same key.
6. **Install:** `adb connect <IP>:5555`. The TV asks *Allow USB debugging?*: tell them to accept and tick *Always
   allow*. Then `adb install -r BeyondTV.apk`. On TCL, also `adb shell "appops set nz.gobeyond.tv AUTO_START allow || appops set nz.gobeyond.tv APP_AUTO_START allow"`
   (some firmware calls the operation `APP_AUTO_START`; this tries both):
   TCL's `TclAppBoot` blocks background jobs by default, so the switch (and the watchdog) never run. The log shows
   `forbid bind service ... ModeJob`. Some TCL firmware has neither (a 2024 MediaTek Google TV, Android 14, has no
   `TclAppBoot`): both names answer `Unknown operation string`, and nothing needs allowing.
   On a Mac, `adb connect` can fail with `No route to host` while the TV answers (`nc -z <IP> 5555` connects): macOS's
   Local Network privacy blocks the adb server that adb starts in the background. Start it from the same terminal
   instead (`adb kill-server; adb nodaemon server &`), or allow the terminal app under System Settings → Privacy &
   Security → Local Network.
7. **Tell them what the switch does** before they make it: the home screen and screensaver change, a short list of
   promo apps is turned off (never uninstalled), and *Original* brings it all back. On TCL, the remote's Netflix,
   YouTube and Prime buttons keep working through a small accessibility service that only reads those buttons
   (*Beyond™ TV* → *Remote Buttons* picks what each opens); *Original* turns it off.
8. **They switch on the TV:** *Beyond™ TV* → *Home Screen* → *Beyond™ TV*. The app uses the TV's own ADB on
   127.0.0.1 with its own key, so the TV asks once more to allow debugging. Don't switch modes from the computer.
   If the TV's Wi-Fi was saved during its first setup, the switch stops before changing anything and asks them to
   forget the network and connect again in Settings (Network & Internet); then the switch goes through. Saved
   networks out of range don't show in Settings: find the ones with `cname=com.google.android.tungsten.setupwraith`
   in `adb shell dumpsys wifi` (each block starts with its `ID:`), and with their OK remove them with
   `adb shell cmd wifi forget-network <id>`.
9. **Check:** `adb logcat -s BeyondTV` shows what the switch did.

## Installing it on an LG TV (webOS)

Moved to `docs/history/sections.md` (section "Installing it on an LG TV (webOS)"). Read it before working in this area.

## Installing it on a Samsung TV (Tizen)

Moved to `docs/history/sections.md` (section "Installing it on a Samsung TV (Tizen)"). Read it before working in this area.

## Installing it on an older Samsung TV (Orsay, 2011 to 2015)

Moved to `docs/history/sections.md` (section "Installing it on an older Samsung TV (Orsay, 2011 to 2015)"). Read it before working in this area.

## Releases

TizenBrew Installer takes the first `.wgt` of the latest GitHub release, so every release carries
`BeyondTV-tizen.wgt`: built with `--generic` (no config.properties: no key, the city from the time zone) and signed
with a Tizen certificate (`--sign`), which 2017-2022 TVs install as it is; on 2023+ TVs the installer signs it again
with the person's Samsung certificate. Sign every release with the same author certificate: older TVs refuse an
update signed by another. `python3 webos/build.py --generic` makes the LG `.ipk` that goes along.

Android updates itself (`Updater.java`): on main, with the `ANDROID_KEYSTORE` secret set, CI publishes each build as a
release tagged `android-<versionCode>` (100 + the run number, never marked latest). Every 30 minutes, and each time the TV starts or wakes (ADR 0011), the TV downloads the
newest, keeps it only if it is this app, newer and signed with the same key, and on the home screen hands it to
Android's installer, which asks for one OK press. The TV asks once to allow Beyond TV to install apps. Settings >
Updates checks now and shows what is ready. *Install updates by themselves* is off unless the person turns it on: then
the app installs through the TV's own ADB (`pm install`, only once its key is allowed, never asking from there), waits
until nobody is on the home screen, and says so afterwards. Never turn it on for them: the choice is the person's say.

A broken updater strands every TV on the version it has, since it never hears about the fix (22/10/2026: a header set
after connecting threw on every check, 1.09 to 1.59). So: TVs hear about updates two ways, the GitHub releases list
and `latest.json` next to the APK in the `tv` release (CI writes it), and either one is enough. The download code is
plain Java in `Http.java`, which CI runs against a local server and the real addresses (`tests/UpdaterHttpTest.java`)
before building. Keep anything the updater needs from the network in `Http.java`.

## Adapting it to another TV

Moved to `docs/history/sections.md` (section "Adapting it to another TV"). Read it before working in this area.

## The code

- Java 8 language level, minSdk 26 (Android 8, for Sony's 2015 Bravias), targetSdk 33. No Gradle, no libraries: only the Android SDK.
  Android 8 has no HOME role (the Home button asks, so `currentHome` falls back to the classic leanback launcher)
  and no numbered font weights (`Ui.font` falls back to bold or not). Android 9 has no RenderNode (`Recording` wraps it, with a Picture there) and no `cmd role`. On Android 9 to 11
  (`Ui.LEGACY`) the home screen skips the GPU layers, draws blurred shadows from cached bitmaps (`Shadows`) and
  rounds images with a shader instead of clipPath: their GPUs (a Mi Box 3's Mali-450) choked on those.
  Android 11 runs the screensaver as `ScreensaverAlone`, in the main process (its DreamActivity needs the dream in the
  app's default process, without a home activity); `res/values-v30/bools.xml` picks it, every other version keeps
  `Screensaver` in `:home`. Keep both in step.
  To check for newer APIs, compile against `platforms/android-28/android.jar`: only AGSL (`RuntimeShader`, guarded
  by a try/catch), `BitmapShader.setFilterMode` (guarded) and `Recording.Node` should come up.
- The home screen is drawn by hand on one Canvas (`HomeView`); the glass and the sky are AGSL shaders (`Shaders`,
  Android 13+, with a fallback for 9 to 12). Keep it at 60 fps: no allocations in `onDraw`, no work on the UI thread.
- Some TVs draw their UI at 1280×720 on a 1080p panel (TCL's 1 GB models: `ro.surface_flinger.max_graphics_width`
  and `_height`, `ro.config.low_ram`). There every pixel and every MB counts: `Backdrop` builds its images at the UI's
  size (and the picks use TMDB's w1280), and the shelf logos have a copy at the resting size and one at the focused
  size, so both draw pixel for pixel.
- `HomeMode` runs every switch as a background job (`ModeJob`) in the main process; the UI is in the `:home`
  process. `Watchdog` goes back to the stock home screen after 3 crashes in 5 minutes.
- Who's watching (`People`, `WhoActivity`, both in `:home`): Family first, then each person, kept in the "people"
  preferences. A kids' profile gets the kids' apps on the shelf, family-friendly picks (`Recs.Pick.gentle`), no HDMI
  inputs or TV settings, and the grown-up PIN in front of Settings and of switching up. A change bumps `Prefs.version`,
  so the home screen recreates. Same rules as `web/profiles.js`; keep them in step.
  A teen (`Person.teen`, always also `kid`, ADR 0019) is a kid of 13 or more: Beyond Family sends `teen` from the
  birthday, and the only difference is the shelf (`People.teenApp`: the kids' apps plus YouTube and music). Same in
  `web/profiles.js` (`Profiles.teen`, `teenApp`).
- On-screen text: `Ui.tr("pt", "en")`, with the Spanish, German and Russian in `Spanish.java`, `German.java` and
  `Russian.java` (keyed by the English); text built at runtime uses `Ui.tr(pt, en, es)`, and its German and Russian
  come from those files too (patterns for the parts built at runtime). Add them all. Comments in English, short, only where the why
  isn't obvious.
- Settings come from `config.properties` through the generated `out/gen/nz/gobeyond/tv/Config.java` (never edit that).
  What the person changes on the TV (`Prefs`: Home Settings, Shelf, Remote Buttons) wins over those first values.
- The remote's app buttons (`RemoteKeys`, `RemoteKeyService`) use each brand's key codes: they run only on TCL, Full rule, read before changing this area: `docs/history/rules.md`, "The remote's app buttons".
- The daily check-in (`Checkin.java`, `web/checkin.js`) posts to Beyond Family's `/api/tv/checkin`: a made-up id, the
  city to 0.1 degrees, make, model, versions, mode, open and crash counts, the last 20 errors. Never what anybody
  watches. Home Settings > Help fix problems turns it off and posts `/tv/checkin/forget`. Anything new it sends goes
  in the README's Privacy section and on the website in the same change. `Checkin.error(c, where, text)` is how a
  failure worth knowing about gets reported. `AppLog.w` lines also go with it as the TV's log (ADR 0034, `tv_logs`, read it with the Supabase MCP):
  a line that names an app, a show or a person goes through `AppLog.here`, which stays on the TV.
- After any change, `./build.sh` must end with `Built BeyondTV.apk`.
- LG and Samsung (`web/`): plain ES5 JavaScript and CSS without variables, grid or backdrop-filter, since older TVs Full rule, read before changing this area: `docs/history/rules.md`, "LG and Samsung".
- Beyond Family on Android (`Family.java`, `FamilyService.java`, `LinkActivity.java`, all in `:home`): the same Full rule, read before changing this area: `docs/history/rules.md`, "Beyond Family on Android".
- Seasonal art (`docs/art/`): Art mode shows our own pictures in a season (`seasons.json`: `from`/`to` as MM-DD on the
  TV's clock, may run over New Year) instead of the museum's; `Art.java` and `web/art.js` read it from GitHub Pages, so a
  new picture is a JPEG (2560 x 1440) and a line there, no app update. `tools/season_art.js` redraws the ones we drew.
  Only art we made or own: free downloads from other studios are usually personal use only (Small Lily Studio's are).
- Te reo word of the day: `web/kupu.js` and `Kupu.java` hold the same list and pick by the same local day, so every
  TV in a house shows the same kupu. Change one, change both. On Android it leads the quotes row (`HomeView.kupuFor`,
  measured once a day, never in the frame loop); *Te reo word of the day* in Home Settings turns it off.

## Always

- Many Android classes have a `web/` twin (profiles, party, karaoke, tidy, chime, kupu, pets and more): change one, change both. The twin list is in `docs/history/rules.md` under "LG and Samsung".
- A decision that changes what happens on somebody's TV gets an ADR in `docs/adr/` in the same PR (index in its README). Never rewrite an accepted one; write a new one that replaces it.
- Every feature someone can see goes on the website (`docs/index.html`: *What it does now*, or *On the way* while it
  is coming) and in the README's roadmap, in the same PR (Kyle's rule). Homes are free, always; business screens are
  the paid product.
- Never turn off an app that saved a Wi-Fi network: Android deletes its networks and Original can't bring them
  back (`wifiOwners` in `HomeMode`).
- Never commit `config.properties`, `*.keystore` or any key.
- Never uninstall or clear the data of system apps; only `pm disable-user --user 0`, through `HomeMode`, so
  *Original* can bring it back.
- Don't change the TV's picture, sound, network or account settings.
- Keep the way back working: the *Original* mode and the watchdog.

## Version control
- Version control follows `docs/VERSION-CONTROL.md` (Beyond standard): work on a branch, push `wip/*` for unfinished work at the end of every session, never commit keys or signing files, and run `git config core.hooksPath .githooks` once per clone. Apple platform design follows Apple's Human Interface Guidelines; web UI is ReUI only.

## UI standard
- Any screen or component change follows `docs/ui-standard.md` (the Beyond UI standard, 30 rules: layout and touch checks plus hierarchy, contrast, proximity, alignment, progressive disclosure, feedback, error recovery, user control and intuitive patterns). Look at the result at 375px and 1280px, light and dark, before calling it done. Master copy: beyond-agent-hq `docs/ui-standard.md`.
