# 0006: Art fills the screen

Accepted, 23/10/2026.

## Decision

Art mode fills the whole screen with the painting, cropped at the edges, with nothing written on it. To keep the crop small, only paintings about the screen's shape (5:4 to 12:5, from the museum's own thumbnail size) are picked; others are used only when a search finds fewer than 8 wide ones. Home Settings › Kind of art picks what the museum is searched for: Mixed (a different theme each day, and our own seasonal art at Halloween and Christmas), landscapes, the sea, gardens and flowers, mountains, impressionism or still life. The ids are the same on web (`web/art.js`) and Google TV (`Art.java`).

## Why

Kyle on his Sony: the framed painting on a dark wall left wide black bars. A Frame-style TV looks like a painting when the picture is the whole screen. Choosing a kind lets a home keep the art it likes.

## What it replaces

The dark wall with a thin frame (22/10/2026). Seasonal art now only shows on Mixed, so somebody who picked the sea gets the sea.

## What it rules out

Stretching a painting to fit, or showing captions on the art. Art we don't own (other studios' "free" Frame art is usually personal use only).
