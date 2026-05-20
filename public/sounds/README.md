# Notification sounds

`notification.wav` (~11 KB, 250 ms two-tone "ding") is bundled and played
by the notifications page client island on every realtime INSERT for the
current user — but only when the user's
`notification_preferences.sound_enabled = true` (default).

## How the bundled file was generated

A 250 ms WAV at 22050 Hz mono, two-tone (A5 + E6) with exponential decay,
generated inline via Node — see the W6 commit for the exact script. The
result is uncompressed PCM so every browser plays it natively without
codec dependencies.

To replace with a different ping:
1. Drop your own short `.wav`, `.mp3`, `.ogg`, or `.m4a` here.
2. Update the `src=` in
   [`app/[locale]/dashboard/notifications/notifications-client.tsx`](../../app/[locale]/dashboard/notifications/notifications-client.tsx)
   if you change the filename.

If the file is missing or fails to load, `<audio>.play()` rejects silently
— the inbox still works, it just doesn't ping.
