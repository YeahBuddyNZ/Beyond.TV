# 0004: Installing by itself is their choice

Accepted, 23/10/2026 (written down after the fact).

## Decision

Updates are downloaded by themselves and checked (this app, newer, our signing key). Installing asks for one OK on the home screen. *Install updates by themselves* is off unless the person turns it on; then it installs through the TV's own ADB only with a key the TV already allowed, and only while nobody is on the home screen.

## Why

Installing software on someone's TV without asking is their call to hand over, not ours to take.

## What it rules out

Turning it on for anybody, asking for the ADB key from the updater, or installing while somebody is using the home screen.
