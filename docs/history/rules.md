# Long rules, word for word

Moved from CLAUDE.md on 06/11/2026. Index: docs/history/INDEX.md.

## The remote's app buttons

(From CLAUDE.md section "The code".)

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

## LG and Samsung

(From CLAUDE.md section "The code".)

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
  `web/sky.js` is Tonight's sky (ADR 0023): a star chart for the TV's location and the moon (phase, rise and set, next full and new), worked out on the TV from the clock; stars from `web/skydata.js`, made with `app/assets/sky.json` by `tools/make_sky.py` from d3-celestial (BSD). On Google TV it's `SkyActivity.java`: the same maths, change one, change both. `web/skylook.js` is Look around (ADR 0036): the same sky as a window you turn with the arrows (a stereographic projection, `Sky.core` gives it the sun, moon and star positions so there is one set of sums), naming what is in the middle of the screen. Press down on the sky to open it. On Google TV it runs in `TableActivity`'s WebView (start `sky`, `BeyondTable.place()` gives it the latitude and longitude); sky.js and skydata.js are copied into the APK's assets for it. It is web only: there is no Java twin.
  `web/bedtime.js` is Bedtime breathing: a night light that slows from six breaths a minute and fades to dark (moon button at night, or a `bedtime` command from Beyond Family).
  `web/party.js` is Party mode (ADR 0016): a disco or a birthday from a `party` command (`party-end` stops it), music made on the TV, and with Beyond Home the room's Party moment every chord and Party over at the end. On Google TV it's `PartyActivity.java` and `PartyMusic.java`: the same tune, change one, change both. The Party button at the top of the home screen asks disco or whose birthday (`Party.choose`, `PartyPickActivity.java`; ADR 0017).
  `web/karaoke.js` is Karaoke night (ADR 0020, 0022): a `karaoke` command (one turn: singer, colour, song, `videoId` or null, `query`, `next`) or `karaoke-set` (a playlist: `playlist` and `turns`) plays each song in our own player (YouTube's embed; on Google TV a WebView in `KaraokeActivity.java`), and the player's end moves to the next turn by itself (`Family.nextTurn` for tonight's queue). No video: `Family.findVideo` asks Beyond Family (`/tv/karaoke/find`), else the YouTube app. Playlists are built on the TV (`Karaoke.choose`, `KaraokePickActivity.java`) and saved with `Family.savePlaylist` (`/tv/karaoke/playlists`). Never store or show lyrics.
  `web/games.js` is Games (ADR 0021): the gamepad button on the home screen, where every game starts from the remote (karaoke, party, quiz night, dinner question, tidy race, bedtime). On Google TV it's `GamesActivity.java`. Karaoke picks the singer and the song on the TV (`Karaoke.choose`, `KaraokePickActivity.java`; same `STARTERS` list, change one, change both), and a typed song goes to Beyond Family (`/tv/karaoke/songs`). Quiz night and the dinner question are started and moved on with `Family.game` (`POST /tv/quiz`, `/tv/question`: start, reveal, next, end). A new game goes in both. Who's watching fits everyone on one screen (`WhoActivity.fit` and `perRow`, `pick` in `web/profiles.js`): smaller faces, then rows, never a scroll.
  `web/notes.js` is Notes on the TV and `web/ask.js` is Ask Beyond (ADR 0025): notes ride on `/tv/sync` (`home.notes`,
  ink as points on a 1000 by 750 grid, Beyond Family's `shared/tvNotes.ts`), sit under Tonight at home and never cover
  an app; the orb asks `/tv/ask` with the app names (`BeyondTV.watchApps`), and an `ask` command is a phone's question.
  Google TV runs both in `AskActivity`'s WebView (`web/ask.html`, `web/ask-host.js`, copied by `build.sh`); its
  bridge only calls `/tv/ask` and `/tv/notes/:id/heart|down`, and the TMDB key stays in Java.
  `web/table.js` is Board and card games (ADR 0024): who's playing, the game, the robots, the debrief, and each person's robot level per game (kept on the TV only: `files/table.json` through `BeyondTable` on Google TV, localStorage `bt.table` on LG and Samsung; never sent). `web/ludo.js`, `web/chess.js` (ADR 0033; rules checked by move counts, robot is alpha-beta with a time limit) and `web/snap.js` (Sheep, Penguin, Volcano and Snap) are the games, with their sounds in `web/sfx.js` (Web Audio, made on the TV; ADR 0031), each with its rules apart from the screen (`Ludo.rules`, `Snap.rules`), tested by `node tests/table-games.test.js`. `web/arcade.js` is the Arcade (ADR 0035): Eel, Paddle, Sky Guard and Dot Chase on one canvas, steered by turning (one press per push, never a held key); `node tests/arcade.test.js`. `web/laughs.js` is Silly games (ADR 0032): Who's most likely to…?, Would you rather? and Spin for a dare, for a room with one remote; its lines are in all five languages in the file, the grown-ups' extras only when no kid plays, and Google TV opens it in the same WebView (`TableActivity.open(c, "silly")`). Google TV runs these same files in `TableActivity.java`'s WebView: `build.sh` copies them (and `sfx.js`) with `web/table.html` and `web/table-host.js` (People, the language, the store and the remote's keys) into the APK's assets, so a game is written once. Our own names and art only, never another game's trade mark; the dice are fair and robots never see what a person can't.
  `web/tidy.js` is the tidy-up race (`home.tidy` from `/tv/sync`: `{at, minutes, wake}`, or a `tidy` command): Who's tidying? first when there's more than one face (ADR 0030), then a clock counting up from 0:00 (ADR 0029) and those faces, OK on yours when done, with your time. On Google TV it's `Tidy.java` (the nightly alarm, which wakes the TV through its own ADB; settings kept in `files/tidy.json`) and `TidyActivity.java`. ADR 0012.
  `web/chime.js` and `Chime.java` are the start chime, the same four notes (ADR 0012; change one, change both, and `tools/make_chime.py`). Played when the TV comes on and at the race's start and end, only while Home Settings › Sounds is on.
  `web/kidpicks.js` is Picks for kids: for a kid watching, the cards are a hand-picked list of each service's own shows matched to `likes` (a grown-up's, from Beyond Family or the profile editor behind the PIN) and `loves` (the kid's own), or one "What do you like to watch?" card; now and then, back from an app, it suggests one. No TMDB needed. Its like ids match Beyond Family's `TV_LIKES`. `KidPicks.java` holds the same lists for Google TV (likes from `Family.likes`): change one, change both.
  `web/music.js` is the family's own music (ADR 0027): Beyond Music (`/api/hello` on port 8097, `{app: "beyond-music"}`)
  found at the address it had last, `beyond-music.local` or the Beyond Home box joins the shelf as Music and opens its
  own TV screens in an iframe; Back at its first screen comes as a `postMessage`. On Google TV it's `Music.java`
  (asks `beyond-music.local` itself, `Mdns.java`), a Music button in the corner, and `MusicActivity`'s WebView, which
  reaches the server only through `MusicRelay` on 127.0.0.1 (the one cleartext address in
  `res/xml/network_security_config.xml`). Tested by `tests/MusicTest.java`.
  `web/homehub.js` is Your home: it finds the family's Beyond Home box (`/tv/hi` on port 8098: the address it found
  last, `homeassistant.local`, `homeassistant`, or `homeHub` in the config), pairs by a code typed in the Beyond Home
  app (Settings, TVs), then reads `/tv/snapshot` (every 4 seconds while the tab shows, every minute otherwise) and asks
  `/tv/act` for named things only (`{room, do: moment|volume_up|volume_down|mute|power|toggle}`). The box builds every
  call (YeahBuddyNZ/Beyond-Home, `server/tvs.mjs`). No box, no tab; kids never get it. ADR 0010.
  On Google TV it's `HomeHub.java` (also finds the box by Home Assistant's `_home-assistant._tcp` announcement),
  `RoomActivity.java` and the `home` tab in `HomeView` (first three rooms). Plain http to the home network goes through
  `LocalHttp.java` (the cameras use it too), never the system's http stack, so cleartext stays off.
  `web/pets.js` asks a kid who just picked their face whether the household's pets got fed (`pets` in `/tv/sync`, each with `due` worked out by Beyond Family); "Yes" posts `/tv/pets/fed` with the kid's member id, "Not yet" asks again after 30 minutes. On Google TV it's `PetsActivity.java` (from `WhoActivity.choose`, after Make it yours; pets in `Family.petsDue`): change one, change both.
  `web/outside.js` is the fine day nudge: once a day on a mild, dry day, coming back from an app suggests going outside, and the next key press 10+ minutes later offers to count it as green time (`POST /tv/green`).
  The dinner question lives in `web/family.js` (`dinner`): `question` opens it, `question-answered` fills in faces (never the words), `question-reveal` shows the answers, `question-end` closes it.
  `web/myworld.js` is Make it yours: a kid restyles their own profile (buddy, colour, world, loves) with no PIN;
  it never touches the name, shelf, PIN or kid flag, and a Beyond Family refresh keeps what they picked.
  `MyWorldActivity.java` is the same on Google TV (same buddies, colours and worlds: change one, change both); `HomeView`
  draws the watcher's world instead of the sky, with the dark look, and `Family.pushLook` sends it to Beyond Family.
  Orsay (Samsung 2011 to 2015, ADR 0028) is the same `web/`, packed by `orsay/build.py`: `TV.orsay`, the remote's codes through `TV.code`, one Smart Hub tile, check-in as `tizen` with OS `Orsay <year>`; tested by `node tests/orsay.test.js`.
  `tools/webapp.py` is what both builds share. Preview: `python3 webos/build.py --preview` (or `tizen/build.py`), then
  open `out/webos/index.html` in a browser (a stand-in lists sample apps).

## Beyond Family on Android

(From CLAUDE.md section "The code".)

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

