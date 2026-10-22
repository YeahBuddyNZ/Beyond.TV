# 0003: The way back always works

Accepted, 23/10/2026 (written down after the fact).

## Decision

*Original* puts back the TV's own home screen, screensaver and every app Beyond TV turned off. The `Watchdog` does the same by itself after 3 crashes in 5 minutes. Apps are only ever turned off with `pm disable-user --user 0` through `HomeMode`, never uninstalled or cleared, so they can always come back.

## Why

A family can't fix a TV that won't show a home screen. Whatever else breaks, they must be one press (or zero) from the TV they had.

## What it rules out

Uninstalling or clearing system apps, changing picture, sound, network or account settings, and any change that makes *Original* or the watchdog stop working. A Settings crash doesn't count toward the watchdog (`Watchdog.settingsInFront`), so a bug there can't throw them out of Beyond TV.
