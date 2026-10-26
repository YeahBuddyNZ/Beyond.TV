# 0026. Turn the TV on from a phone, and put the music on

Date: 26/10/2026. Status: accepted.

## Context

Kyle wants to turn Beyond TV on from his phone and start the music playing, without finding the remote. Beyond
Family's TV remote could press keys and open apps, but only once the TV was already on.

## Decision

A `wake` command from Beyond Family (`{kind: "wake", app?}`), sent by the Turn on and Play music buttons on the TV
page's remote. On Google TV, `FamilyService` runs it through the TV's own ADB the way the tidy-up race already wakes
the TV (`Tidy.Receiver`, ADR 0012): the wake key, then the power key on TVs that only know that one, and only when
the screen is dark, so a TV that's already on is never switched off. With an `app` it then opens that app, the same
as `launch` (Spotify, YouTube Music, or any app by name).

- It needs the TV's ADB key allowed, the same as the remote's keys. It never asks for the key from there.
- It only reaches a TV that is still on the network while it sleeps. Most Google TVs and Android TVs keep the
  connection for a while in standby; Sony's needs *Remote start* on (Settings, Network). A TV that is unplugged, or
  in a deep sleep with its Wi-Fi off, can't hear it, and the phone says the command waits two minutes then drops.
- LG and Samsung: a web app can't switch the TV on, so there `wake` only opens the app when the TV is already on.
  Switching those on is Beyond Home's job (Wake-on-LAN and HDMI-CEC from the Home Assistant box), later.
- Beyond Music isn't built yet. When it is, it's one more app name on the same button.

## Consequences

Nothing new is stored or sent anywhere. Anyone in the household can turn the TV on, the same as anyone can use the
remote; earn your screen still keeps a kid's apps closed until their jobs are done.
