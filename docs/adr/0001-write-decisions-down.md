# 0001: Write decisions down

Accepted, 23/10/2026.

## Why

On 23/10/2026 an update reached Kyle's Sony and stopped at Android's own "your phone is not allowed to install unknown apps from this source". Nothing in the code had decided what happens when the TV hasn't allowed us to install; it had been assumed. Decisions that live only in a chat or a pull request get lost, and the next change undoes them.

## Decision

Anything that changes what happens on somebody's TV is written down here, in the same pull request as the change: the choice, the reason, and what it rules out. CLAUDE.md points here.

## What it rules out

Merging a change to the switch, the updater, the way back or anything a family sees without saying why it works that way.
