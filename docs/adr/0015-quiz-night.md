# 0015. Quiz night

Date: 23/10/2026. Status: accepted.

## Context

Kyle asked for evening games for the family. Quiz night is the second, after the tidy-up race.

## Decision

A grown-up starts a quiz in Beyond Family. Every TV in the house shows ten questions, one at a time, each with four
answers. Everyone buzzes in from their own phone; the first tap counts. Right is two points and the first right answer
in gets one more. The TV only hears who has buzzed in, never what they picked, until a grown-up reveals the answer,
and it only ever hears first names and colours. The questions live in Beyond Family (`shared/quiz.ts`), so new ones
need no TV update. On Google TV it is `QuizActivity`; on LG and Samsung `quiz()` in `web/family.js`.

## Consequences

The TV keeps no quiz itself: one that restarts mid-quiz picks it up at the next question. Nothing about the quiz is
stored on the TV or sent anywhere but Beyond Family.
