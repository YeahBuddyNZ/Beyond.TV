# 0002: Updates never end at a dead end

Accepted, 23/10/2026.

## What happened

Android 8 and later ask, app by app, whether it may install apps ("install unknown apps"). Beyond TV handed a ready update to Android's installer without checking. On Kyle's Sony (Android TV 8) the installer answered with its own dialog, "For your security, your phone is not allowed to install unknown apps from this source": it says "phone", it doesn't say what to switch on, and pressing Cancel leaves the update stuck. Every TV that never gave that OK was in the same spot, and could never hear about the fix either.

## Decision

1. Before handing an update to the installer, Beyond TV checks `canRequestPackageInstalls()` (`Updater.canInstall`).
2. If the TV hasn't allowed it, Beyond TV says so itself, in plain words: a new version is ready, switch Beyond TV on on the next screen, then press Back. "Show me" opens that exact page (`ACTION_MANAGE_UNKNOWN_APP_SOURCES` for our package, the security settings if a TV has no such page). Back on the home screen, the update is offered again and goes in with one OK.
3. "Not now" waits as long as a declined update does. Settings › Updates says the TV needs the OK once, and pressing it shows the same steps.
4. Beyond TV never switches the permission on for them through the TV's ADB. It is a security setting and the person's say.

## Rules from here

- No path in the updater may end at a system dialog we haven't checked for first. If Android can say no, we ask the question ourselves before it does.
- Anything the updater needs is tried on an Android 8 TV (Kyle's Sony KDL-50W800C is the oldest we have) before it ships.
- A broken updater strands every TV on its version, so the update path is treated like the way back: changed carefully, with an ADR.
