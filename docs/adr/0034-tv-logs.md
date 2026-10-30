# 0034. The TV's own log goes with its check-in

Date: 30/10/2026. Status: accepted.

## Context

Kyle asked to be able to check on his TV from here. The daily check-in (ADR 0001's sweep and `Checkin.java`) carries
counts and the last 20 errors, which say that something went wrong but not what the TV was doing. Reading the log
meant a computer on the same network running `adb logcat`.

## Decision

On Google TV, while Help fix problems is on, every `AppLog.w` line is also kept in `files/checkin/log.txt` (every
process, the newest 24 to 48 KB) and the last 300 lines go to Beyond Family (`POST /api/tv/checkin/log`, table
`tv_logs`): with the check-in, at most every 3 hours when the home screen comes up, and with each line of feedback.
Beyond keeps only the latest copy, against the made-up id, and it goes when the install is forgotten.

- Lines that say which app was opened (the remote's buttons, the shelf, Ask Beyond, Beyond Family's launch, TV
  banners) use `AppLog.here`, which stays in logcat on the TV.
- Before sending, IPv4 addresses, the query part of links and anything 32 characters long and key-shaped are taken
  out (`Checkin.scrub`).
- Switching Help fix problems off deletes the file on the TV and, with the install, the copy at Beyond.

LG and Samsung keep the check-in as it is for now.

## Consequences

A problem on a TV can be read from the Supabase table while it is still fresh, without a cable. A new `AppLog.w`
line must not name an app, a show or a person: use `AppLog.here` for those.
