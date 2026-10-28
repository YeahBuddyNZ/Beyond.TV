# 0028. Older Samsung TVs (Orsay, 2011 to 2015)

Date: 28/10/2026. Status: accepted.

## Context

Kyle has a 2014 Samsung UA40H6300. It runs Orsay, Samsung's Smart TV before Tizen: no Android, no Tizen, and
TizenBrew Installer can't reach it. Orsay still runs web apps (a zip with an Orsay `config.xml`, on a 2013-era WebKit),
and it takes them from a computer on the same Wi-Fi through User App Sync, signed in as the `develop` user.

## Decision

The same `web/` home screen, packed for Orsay by `orsay/build.py` (`BeyondTV-orsay.zip`, with the Common API scripts
added to the page) and handed to the TV by `orsay/serve.py`, a tiny web server on port 80 that answers only
`widgetlist.xml` and the zip.

- `web/tv.js` knows Orsay by its Common API or its user agent, says it's ready, and turns Orsay's remote codes into
  the ones the home screen already uses (`TV.code`).
- Orsay can't list or open other apps, and has no inputs API we can rely on. So the shelf is one **Smart Hub** tile,
  and Back and Settings go back to Smart Hub. Everything Beyond TV draws itself (picks, weather, games, the sky, notes,
  Beyond Family) works as it does on LG and Samsung.
- The daily check-in reports it as `tizen` with the OS `Orsay 2014`, because Beyond Family's check-in knows three
  platforms and this needs no change there.
- Nothing on the TV is changed: Smart Hub stays the home screen, and the app is removed from Smart Hub like any other.

## Consequences

- Not yet run on a real Orsay TV. The first install on Kyle's H6300 is the test.
- A 2014 TV may not trust today's certificates, so anything over https (Beyond Family, weather, picks) may fail there
  while the home screen itself still works. If it does, that is the next thing to look at.
- A user app on Orsay can be removed by a Smart Hub reset or a firmware update; installing again brings it back.
