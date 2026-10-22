# 0005: Never turn off an app that saved Wi-Fi

Accepted, 23/10/2026 (written down after the fact).

## Decision

Before the switch turns anything off, `HomeMode` checks which apps saved Wi-Fi networks (`wifiOwners`) and never turns those off. If the TV's Wi-Fi was saved by its first-time setup app, the switch stops before changing anything and asks them to forget the network and connect again in Settings.

## Why

When Android disables an app it deletes the networks that app saved, and *Original* can't bring them back. A TV with no Wi-Fi can't get the fix.

## What it rules out

Adding a setup or network app to the `DEBLOAT` list without this check, and removing saved networks without the person's OK.
