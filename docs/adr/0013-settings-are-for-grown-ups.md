# 0013. Settings are for grown-ups

Date: 23/10/2026. Status: accepted.

## Context

Kyle: "Don't let kids get to settings." A kid's profile already lost the HDMI inputs and the TV's own settings, but
Beyond TV's settings were still a button on the home screen, an item in the bottom drawer and an app in All Apps.
With a grown-up PIN set they asked for it; with no PIN set, a kid walked straight in.

## Decision

While a kid is watching, no settings show at all: not the top button, not the drawer, not All Apps. Anything that still
opens them as a kid (the TV's own launcher, a shortcut) asks for the grown-up PIN first, and with no PIN set it opens
Who's watching, so the way in is switching to a grown-up. Grown-ups are never asked.

The remote's own Settings button belongs to the TV and opens the TV's settings; Beyond TV can't stop it. A grown-up PIN
is what keeps a kid from simply switching to a grown-up's profile.

## Consequences

A grown-up changes a setting from their own profile (or Family). On Android the PIN unlocks settings for one opening
(`SettingsActivity.unlock`), so a kid can't come back later through a shortcut. Same on LG and Samsung (`web/home.js`).
