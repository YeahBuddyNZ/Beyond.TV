# Beyond TV: notes for Claude

A home screen for Google TV and Android TV that replaces the stock one, plus a settings app that switches between
Beyond TV and the TV's original home screen. A plain Android app in Java, built without Gradle by `build.sh`.
LG TVs (webOS) and Samsung TVs (Tizen) get the same home screen as a web app: `web/`, packed by `webos/` and `tizen/`
(see below).
The website is in `docs/`: one static page (`docs/index.html`), no build step. A push to `main` that changes it
publishes it to GitHub Pages (`.github/workflows/pages.yml`).

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

On LG it's an app, installed through LG's Developer Mode, and it changes nothing else on the TV: LG's home screen
stays, and Beyond TV opens with a long press of a number key.

1. **Ask** for the TV's IP address and their city, if they didn't say. Tools: Python 3 and OpenSSH (`ssh`,
   `ssh-keygen`), already on macOS, Linux and Windows 10+.
2. **On the TV** (they do it): LG Content Store → *Developer Mode* → sign in with a free LG developer account
   (webostv.developer.lge.com) → *Dev Mode Status* on (the TV restarts) → *Key Server* on. It shows the IP and a
   passphrase.
3. **Settings:** the same `config.properties` as on Android (the first `python3 webos/build.py` creates it). The
   TMDB key rules above apply.
4. **Build:** `python3 webos/build.py` must end with `Built BeyondTV-webos.ipk`.
5. **Install:** the first time needs the TV's passphrase, typed by them: ask them to run
   `python3 webos/install.py <IP>` in their own terminal (yours can't answer its prompt, and the passphrase doesn't go
   in the chat). It keeps the unlocked key in `~/.ssh/beyondtv_webos_<IP>`, so later updates run from your terminal
   with the same command.
6. **Tell them:** while Beyond TV is open, holding a number key pins it to that key. Developer Mode lasts about 40
   days; *EXTEND* in that app renews it (if it runs out, the TV removes developer apps, and installing again brings it
   back). `--uninstall` removes Beyond TV.

## Installing it on a Samsung TV (Tizen)

On Samsung it's an app too (2017 and newer, Tizen 3+), installed through Samsung's Developer Mode; Samsung's home
screen stays. Two ways:

- **The release, no tools:** TizenBrew Installer (github.com/reisxd/TizenBrewInstaller) installs the latest GitHub
  release when they type `YeahBuddyNZ/Beyond.TV`, and on 2023+ TVs signs it with their Samsung account. That build
  has no TMDB key (no picks) and takes the city from the TV's time zone. Walk them through the README's steps.
- **Their own build** (their city, their TMDB key), below.

1. **Ask** for the TV's IP address and their city, if they didn't say.
2. **On the TV** (they do it): *Apps* → type `1 2 3 4 5` on the remote → *Developer mode* on, *Host PC IP* = this
   computer's IP → restart the TV.
3. **Tools:** Samsung's `tizen` command to sign (Tizen Studio's CLI, or Samsung's Claude Code plugin
   `tizen-sdk-skills` from github.com/Samsung/tizen-agent-skills, which installs it and makes Samsung certificates),
   and `python3 tizen/install.py` to install, which speaks SDB itself. `tizen` runs on Java; Samsung's `sdb`, its new
   `tz` and Tizen Studio's installer (with its own JDK) are Intel binaries on macOS. On Apple Silicon without Rosetta,
   take the CLI from Samsung's package repository (download.tizen.org/sdk/tizenstudio/official, `pkg_list_macos-64`;
   check each zip's SHA256 there): unzip the `data/` of `new-common-cli`, `certificate-generator`, `sdk-utils` and
   `sdk-utils-core` into `~/tizen-studio`, then write `~/tizen-studio/sdk.info` with three lines,
   `TIZEN_SDK_INSTALLED_PATH=<that folder>`, `TIZEN_SDK_DATA_PATH=<home>/tizen-studio-data` and `JDK_PATH=<a native
   JDK 17's .jdk folder>` (Homebrew: `/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk`). That `tizen` signs natively.
4. **Certificate, once:** 2023+ TVs (Tizen 7+) need a Samsung certificate, made with their Samsung account for this TV
   (its DUID): the plugin's Samsung profile opens the browser for them to sign in, or Tizen Studio's Certificate
   Manager does it. 2017-2022 TVs take a Tizen certificate (`tizen certificate`, then `tizen security-profiles add`
   and `tizen cli-config "profiles.path=<home>/tizen-studio-data/profile/profiles.xml"`; on macOS the passwords go to
   the login Keychain). Certificate passwords are theirs: they type them in their own terminal, never in the chat.
5. **Settings:** the same `config.properties`; the TMDB key rules above apply.
6. **Build and sign:** `python3 tizen/build.py --sign <profile>` must end with `Built BeyondTV-tizen.wgt (...,
   signed with "<profile>")`.
7. **Install:** `python3 tizen/install.py <IP>`: it pushes the app over SDB (port 26101), installs it with the TV's
   `0 vd_appinstall` and opens it with `0 was_execute` (tested on a 2017 Tizen 3.0 TV); `--uninstall` removes it.
   With Samsung's tools instead: `sdb connect <IP>`, `tizen install -n BeyondTV-tizen.wgt -t <serial from sdb
   devices>` and `tizen run -p BeyondTVnz.BeyondTV -t <serial>`. Updates need the same certificate: the TV refuses
   one signed by another (uninstall first). A retail TV's sdbd only takes files (`filesync_support:push`): nothing
   can be pulled from it. To look inside the running app, `0 debug BeyondTVnz.BeyondTV 300` over SDB opens it with
   a Web Inspector port (Runtime.evaluate works on Tizen 3; screenshots don't).
8. **Tell them:** *Autorun Last App* in the TV's settings (under Start Screen Options; where it is changes by year)
   makes the TV turn on into Beyond TV.

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

Read first, change after. Read-only commands that tell you what the TV has:

```bash
adb shell getprop ro.product.brand; adb shell getprop ro.product.model; adb shell getprop ro.build.version.release
adb shell cmd package query-activities --brief -a android.intent.action.MAIN -c android.intent.category.HOME
adb shell cmd role get-role-holders android.app.role.HOME
adb shell settings get secure screensaver_components; adb shell settings get secure screensaver_default_component
adb shell pm list packages -s     # system apps (-3 for the ones they installed)
```

Then, in the code:

- `HomeMode.DEBLOAT`: add the brand's promo, demo, store-mode and telemetry apps, one comment per line. Only those.
- `HomeMode.PROTECTED`: add the brand's system pieces: picture, sound, inputs and HDMI-CEC, the tuner and live TV,
  remote and Bluetooth pairing, setup, updates, system UI. When in doubt, protect it.
- `HomeApps.SHELF`, `LIVE_TV_APPS` and `HIDDEN`: the shelf apps, the brand's live TV app, apps to hide from All Apps.
- Build, install, have them switch on the TV, read `adb logcat -s BeyondTV`, then have them switch back to
  *Original* once and confirm everything returned.

LG and Samsung: the web app above. Other TVs that don't run Google TV or Android TV: the way is a Google TV streamer on
HDMI (Chromecast with Google TV, Google TV Streamer, onn 4K, NVIDIA Shield). Set Beyond TV up on the streamer.

**Uninstalled while in Beyond TV mode?** The apps it turned off stay off. Bring them back with
`adb shell pm enable <package>` (the `DEBLOAT` list and the stock home screen), then
`adb shell cmd package set-home-activity <stock home activity>` and
`adb shell settings put secure screensaver_components <stock screensaver>`.

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
- On-screen text: `Ui.tr("pt", "en")`, with the Spanish, German and Russian in `Spanish.java`, `German.java` and
  `Russian.java` (keyed by the English); text built at runtime uses `Ui.tr(pt, en, es)`, and its German and Russian
  come from those files too (patterns for the parts built at runtime). Add them all. Comments in English, short, only where the why
  isn't obvious.
- Settings come from `config.properties` through the generated `out/gen/nz/gobeyond/tv/Config.java` (never edit that).
  What the person changes on the TV (`Prefs`: Home Settings, Shelf, Remote Buttons) wins over those first values.
- The remote's app buttons (`RemoteKeys`, `RemoteKeyService`) use each brand's key codes: they run only on TCL,
  Vestel, KTC (NextStar) and Sony TVs and Formovie projectors, the service is on only in Beyond TV mode, and *Original* takes it out of the enabled accessibility
  services. The system waits for the service on every key, so it lives alone in the `:keys` process: what it reads is
  in `remote-keys.txt` (`Prefs.keyApp`), never in SharedPreferences, and `onKeyEvent` does no heavy work.
  Vestel (F&U and other store brands; MediaTek, Android TV 14 tested) maps its Netflix button to `KEYCODE_STEM_1`, a
  global key (`dumpsys window policy` lists them) that the key filter sees first; its YouTube, Prime Video and Google
  Play buttons stay with the system. The stock lists needed no Vestel entries.
  KTC (NextStar; MediaTek, Google TV 14 tested) maps its Tabii button to `KEYCODE_BUTTON_8`, also a global key, which
  KTC's own hot-key receiver would open Tabii with; its Netflix, YouTube and Prime Video buttons stay with the system.
  Sony (BRAVIA VH22, Android TV 12 tested) sends `KEYCODE_BUTTON_9` for its BRAVIA CORE, Disney+, Prime Video,
  YouTube and Crunchyroll buttons and `KEYCODE_BUTTON_4` for Netflix, global keys for `com.sony.dtv.sonyvendorservice`;
  only the scan code tells them apart, so `Prefs` keys them as `SONY_KEY` + scan code. "Sony default" (empty) leaves
  the key to the TV. Sony ships its own Apple TV build, `com.apple.atve.sony.appletv`.
  Xiaomi projectors made by Formovie (Fengmi; L1, MediaTek, Google TV 14 tested) send the same `KEYCODE_STEM_1` for
  Netflix (`RemoteKeys.STEM_NETFLIX`); their YouTube button goes to MediaTek's `GlobalKeyReceiver` and stays with the system.
- The daily check-in (`Checkin.java`, `web/checkin.js`) posts to Beyond Family's `/api/tv/checkin`: a made-up id, the
  city to 0.1 degrees, make, model, versions, mode, open and crash counts, the last 20 errors. Never what anybody
  watches. Home Settings > Help fix problems turns it off and posts `/tv/checkin/forget`. Anything new it sends goes
  in the README's Privacy section and on the website in the same change. `Checkin.error(c, where, text)` is how a
  failure worth knowing about gets reported.
- After any change, `./build.sh` must end with `Built BeyondTV.apk`.
- LG and Samsung (`web/`): plain ES5 JavaScript and CSS without variables, grid or backdrop-filter, since older TVs
  (webOS 3 and 4, Tizen 3) run a Chromium from 2015 to 2017; only transform and opacity animate. `web/tv.js` is the
  TV's side: on LG, Luna (`listLaunchPoints`, `launch`, the inputs; where webOS 6 and newer deny `listLaunchPoints`
  to Developer Mode apps, the list comes from the TV's remote control API on `ws://127.0.0.1:3000` once the TV has
  allowed it (it asks once; a "no" isn't asked again), and until then from `getAppLoadStatus` over a list of known
  app ids, which shows their names without icons); on Samsung, `tizen.application` (`getAppsInfo`,
  `launch`), the `VIDEOSOURCE` property and `tizen.tvwindow.setSource` for the inputs, then Samsung's viewer
  (`org.tizen.tv-viewer`) to show them. Samsung's own data is unreliable: on Tizen 3 no app's `iconPath` loads (on
  Tizen 4 and 5, YouTube's and Prime Video's are a placeholder), so logos are bundled in `web/icons/` and keyed by app
  id in `SAMSUNG_ICONS` (SVGs need a width and height for old WebKit); some names are empty or long
  (`SAMSUNG_TITLES`); and Tizen 3 answers no "settings" app control, so TV Settings opens `org.tizen.menu`.
  `web/home.js` follows `HomeView`'s layout and behavior, so a design change on
  Android belongs there too. Text: `tr(pt, en, es)`, with the German and Russian in `web/strings.js` (keyed by the English). Built without a city (`--generic`), `web/zones.js`
  (`tools/make_zones.py`, from the tz database) turns the TV's time zone into the city, the currency and the region.
  `web/profiles.js` is Who's watching: Family comes first (`together`, never in the list or Beyond Family's members),
  with family-friendly picks (`Profiles.gentle()`) and its own shelf; a kid needs the PIN to switch to it.
  `web/bedtime.js` is Bedtime breathing: a night light that slows from six breaths a minute and fades to dark (moon button at night, or a `bedtime` command from Beyond Family).
  `web/party.js` is Party mode (ADR 0016): a disco or a birthday from a `party` command (`party-end` stops it), music made on the TV, and with Beyond Home the room's Party moment every chord and Party over at the end. On Google TV it's `PartyActivity.java` and `PartyMusic.java`: the same tune, change one, change both. The Party button at the top of the home screen asks disco or whose birthday (`Party.choose`, `PartyPickActivity.java`; ADR 0017).
  `web/tidy.js` is the tidy-up race (`home.tidy` from `/tv/sync`: `{at, minutes, wake}`, or a `tidy` command): a countdown and the kids' faces, OK on yours when done. On Google TV it's `Tidy.java` (the nightly alarm, which wakes the TV through its own ADB; settings kept in `files/tidy.json`) and `TidyActivity.java`. ADR 0012.
  `web/chime.js` and `Chime.java` are the start chime, the same four notes (ADR 0012; change one, change both, and `tools/make_chime.py`). Played when the TV comes on and at the race's start and end, only while Home Settings › Sounds is on.
  `web/kidpicks.js` is Picks for kids: for a kid watching, the cards are a hand-picked list of each service's own shows matched to `likes` (a grown-up's, from Beyond Family or the profile editor behind the PIN) and `loves` (the kid's own), or one "What do you like to watch?" card; now and then, back from an app, it suggests one. No TMDB needed. Its like ids match Beyond Family's `TV_LIKES`. `KidPicks.java` holds the same lists for Google TV (likes from `Family.likes`): change one, change both.
  `web/homehub.js` is Your home: it finds the family's Beyond Home box (`/tv/hi` on port 8098: the address it found
  last, `homeassistant.local`, `homeassistant`, or `homeHub` in the config), pairs by a code typed in the Beyond Home
  app (Settings, TVs), then reads `/tv/snapshot` (every 4 seconds while the tab shows, every minute otherwise) and asks
  `/tv/act` for named things only (`{room, do: moment|volume_up|volume_down|mute|power|toggle}`). The box builds every
  call (YeahBuddyNZ/Beyond-Home, `server/tvs.mjs`). No box, no tab; kids never get it. ADR 0010.
  On Google TV it's `HomeHub.java` (also finds the box by Home Assistant's `_home-assistant._tcp` announcement),
  `RoomActivity.java` and the `home` tab in `HomeView` (first three rooms). Plain http to the home network goes through
  `LocalHttp.java` (the cameras use it too), never the system's http stack, so cleartext stays off.
  `web/pets.js` asks a kid who just picked their face whether the household's pets got fed (`pets` in `/tv/sync`, each with `due` worked out by Beyond Family); "Yes" posts `/tv/pets/fed` with the kid's member id, "Not yet" asks again after 30 minutes.
  `web/outside.js` is the fine day nudge: once a day on a mild, dry day, coming back from an app suggests going outside, and the next key press 10+ minutes later offers to count it as green time (`POST /tv/green`).
  The dinner question lives in `web/family.js` (`dinner`): `question` opens it, `question-answered` fills in faces (never the words), `question-reveal` shows the answers, `question-end` closes it.
  `web/myworld.js` is Make it yours: a kid restyles their own profile (buddy, colour, world, loves) with no PIN;
  it never touches the name, shelf, PIN or kid flag, and a Beyond Family refresh keeps what they picked.
  `MyWorldActivity.java` is the same on Google TV (same buddies, colours and worlds: change one, change both); `HomeView`
  draws the watcher's world instead of the sky, with the dark look, and `Family.pushLook` sends it to Beyond Family.
  `tools/webapp.py` is what both builds share. Preview: `python3 webos/build.py --preview` (or `tizen/build.py`), then
  open `out/webos/index.html` in a browser (a stand-in lists sample apps).
- Beyond Family on Android (`Family.java`, `FamilyService.java`, `LinkActivity.java`, all in `:home`): the same
  server and protocol as `web/family.js` (`/tv/hello`, `/tv/code`, `/tv/sync` long poll, `/tv/bye`), state in
  `files/family.json` (the boot receiver in the main process reads it). Settings › Beyond Family shows the code or the
  household. Linked, `FamilyService` (a foreground service, so it keeps listening while another app has the screen)
  turns the household's people into `People` (ids `bf-<member id>`) and runs commands: `key` and `launch` go through
  the TV's own ADB (never asking for the key from there), falling back to our own screens; `say` opens `SayActivity`, full screen over any app until OK (ADR 0018; the TV's ADB allows it
  over apps on Android 10+, else a toast); `profile` switches who's watching; `bedtime` opens `BedtimeActivity`; the
  Pinned tiles (`home.widgets` from `/tv/sync`, ADR 0009): a *Pinned* tab first, drawn by `pinnedCards` in `web/home.js`
  (six) and `HomeView.pinnedCards` (three); camera pictures through `Cameras.java` (home network only, its own socket for
  http) and `CameraActivity` full screen.
  `question*` commands drive `DinnerActivity`; the noticeboard (`Family.board`) and earn your screen
  (`Family.jobs`, `JobsActivity`) read the sync. `KidPicks` fills a kid's cards. Together and reactions are still LG and Samsung
  only: port them from `web/` into the same `Family.run`.
  Your face on any TV: each person's look (`profile` in `/tv/sync`: emoji, colour, world, loves, shelf by app name
  `t:netflix`) lives in Beyond Family. On the web a change marks the person `pending` and `Family.pushProfile` sends it
  (`POST /tv/people/:member`); until Beyond Family has it, the TV's copy wins. `visitors` in `/tv/sync` are people
  signed in from another home (Who's watching › Sign in with Beyond Family, `POST /tv/visit/code`); a TV that isn't
  linked keeps its own people and adds them, and keeps listening while it has any. Android takes the face (drawn
  in place of the initial) and colour, sends a colour change, and has the same sign in and sign out.
- Seasonal art (`docs/art/`): Art mode shows our own pictures in a season (`seasons.json`: `from`/`to` as MM-DD on the
  TV's clock, may run over New Year) instead of the museum's; `Art.java` and `web/art.js` read it from GitHub Pages, so a
  new picture is a JPEG (2560 x 1440) and a line there, no app update. `tools/season_art.js` redraws the ones we drew.
  Only art we made or own: free downloads from other studios are usually personal use only (Small Lily Studio's are).
- Te reo word of the day: `web/kupu.js` and `Kupu.java` hold the same list and pick by the same local day, so every
  TV in a house shows the same kupu. Change one, change both. On Android it leads the quotes row (`HomeView.kupuFor`,
  measured once a day, never in the frame loop); *Te reo word of the day* in Home Settings turns it off.

## Always

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
