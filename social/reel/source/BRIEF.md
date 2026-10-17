---
workflow: product-launch-video
flow: automation
storyboard: no
message: "Focus Trail makes the first changed keyboard-focus checkpoint reviewable."
destination: Instagram Reel
aspect: "9:16"
language: English
audience: "Developers and maintainers"
length: "20 seconds"
angle: "Real UI → working keyboard flow → lost return focus → the report"
music: none
narration: "English AI voiceover · Kokoro af_heart"
---
# Focus Trail keyboard bug Reel

## User request
"make a short Instagram reel showing the new Focus Trail UI and how the keyboard demo catches a focus bug"

## Intent
Show the existing product as it actually works, with real browser keypress footage and a saved report from the same controlled lost-return fixture. The website's own cobalt, lilac, peach and mint design supplies the visual identity.

## User-stated
Short Instagram Reel; show the new Focus Trail UI; show the keyboard demo catching a focus bug.

## Production decisions
Autonomous finished-video delivery, about20 seconds, 1080×1920 at30fps, clear English captions, English AI narration and no music. These are execution defaults, not newly confirmed personal preferences. The request to make the finished Reel authorizes rendering. No publishing to an Instagram account.

## Required proof
Real Tab → Enter → Tab → Escape. Good fixture returns to opener; lost-return fixture ends on BODY. Actual focus is independently asserted during capture. A real saved report identifies zero-based index7 / human Step8 return-opener as the first difference. The report is historical, so do not imply its retained sample is a freshly verified endpoint. Identify the failure as a controlled demo.

## Assets
Existing website http://127.0.0.1:49371/, repository outputs/focus-trail, prior portrait artwork, and new raw browser captures. Capture source logic stays unchanged. Prefer real page captures over a rebuilt UI.

## Review and delivery
Inspect representative source frames, validate seekability and captions, render locally, inspect decoded MP4 frames, verify1080×1920 dimensions,20s duration and frame rate. Deliver MP4 plus poster, captions and editable source. Keep the important content above the bottom17% and leave generous right-side clearance for Reel controls.

Production decision: eight quiet local keypress effects, synchronized to the actual key events. Local neural narration; no music.

User follow-up: add AI voice and publish the Reel, cover, editable source and verification evidence to the public GitHub repository, with a clean README gallery.
