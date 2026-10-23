# 0014. The home screen starts the screensaver, and te reo is a language

Date: 23/10/2026. Status: accepted.

## Context

Kyle asked for the screensaver after 3 minutes of nobody pressing anything, with the time chosen in settings, and for
the *Te reo Māori* switch to become part of *Language*. Until now the system decided when the screensaver started
(often 10 or 15 minutes), and the app never changed that.

## Decision

The home screen counts the minutes itself and opens the screensaver (`SaverActivity` on Google TV, the web app's own
on LG and Samsung) after *Screensaver after* minutes: 1, 3, 5, 10, 15 or 30, 3 by default. Only while the home screen
shows; inside another app the TV's own timings still apply. We still don't change the TV's screensaver or standby
settings, so *Original* has nothing to put back.

Language gains *English and te reo Māori* (English with the word of the day and "Kia ora"), next to plain *English*.
*Automatic* keeps te reo on as before; any other language turns it off. This replaces the separate switch from 0008.

The settings row "Home Settings" is now "Beyond™ TV Settings", and the shelf is the "App Dock".
