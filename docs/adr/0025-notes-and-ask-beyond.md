# 0025. Notes on the TV and Ask Beyond

Date: 26/10/2026. Status: accepted.

## Context

Kyle shared a reel of a TV with an assistant on it: a phone page to draw a note in colour and send it to the TV, where
it sits in the corner like a note on the fridge, and an assistant shown as a glowing orb that "thinks" and then comes
back with something to watch for "rom-coms for date night". He asked us to go big on both.

Beyond TV already puts messages from Beyond Family on the screen (ADR 0018), full screen until somebody presses OK.
That is right for "dinner's ready", and wrong for "love you, back at 6", which should wait quietly for whoever walks
past. And the TV had no way to answer a question.

## Decision

**Notes.** Anyone in the household (kids too) draws a note with a finger in Beyond Family (TV › Remote › Leave a
note), types a few words, or both, picks how long it stays up (4 hours, today, a day or 3 days) and sends it to every
TV or one. The ink travels as lines of points on a 1000 by 750 grid in seven bright inks, never as a picture, so the
TV draws it sharp at any size. At most six notes are up at once; a seventh takes the oldest down.

- Notes ride on `/tv/sync` (`home.notes`), so a TV that was off has them when it comes on. A `note` command only marks
  the moment one arrives.
- They never cover what's on. On LG and Samsung the newest sits on the home screen under Tonight at home, popping in
  (with the chime when Sounds is on) and a note button appears at the top. On Google TV the note button appears at
  the top of the home screen and, when the home screen is in front, a new note opens big for a moment.
- Big, a note has *Send a heart* (its writer gets a push: "❤️ On the TV") and *Take it down* (gone from every TV).
- The writer or a grown-up can take it down from the phone too.

**Ask Beyond.** On a TV linked to Beyond Family the four dots become *Ask Beyond*, for everyone, kids included. An orb
of coloured specks (Beyond's four colours) breathes while it waits and swirls while it thinks. Starters (Rom-coms for
date night, Something funny under 90 minutes, Something Kiwi, Surprise me...) or typed words go to Beyond Family's
`/tv/ask` with the names of the apps on this TV, and come back as a short reply and up to four cards with a picture
(from TMDB when there's a key). OK on a card opens its app; a pick for an app this TV doesn't have isn't offered.
A question asked from a phone (Beyond Family, TV › Remote › Ask Beyond) is sent to the TV as an `ask` command and
asked by the TV, with its own apps, so the answer comes up on the big screen.

- A kid watching gets a kid's answer (G and PG, their own shelf only); Family gets something for everyone.
- The question goes to Beyond Family and on to Claude to be answered, and isn't kept by Beyond. Rate limited to 30
  an hour per TV. Unlinked TVs keep *Talk to Beyond* (feedback).
- No microphone or camera on the TV. Speaking a question happens on the phone.

Google TV runs the same `web/ask.js` and `web/notes.js` in `AskActivity`'s WebView (`web/ask.html`,
`web/ask-host.js`), the way the board games run (ADR 0024), so there is one orb and one notes wall to change.

## Consequences

- Beyond Family keeps a `tv_notes` table (household, optional TV, writer, first name, colour, words, ink, until), and
  sweeps notes a day after they come down.
- The TV's privacy line grows: a note is a first name, a colour, words and ink; a question is answered and not kept.
- Talking to the assistant out loud, from the TV's own remote, waits for a TV that has a microphone we can use.
