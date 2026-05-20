# Notification sounds

Drop a short `notification.mp3` (≤30 KB, ≤500 ms ping) in this directory to
enable the inbox ping. The notifications page client island plays it on
every realtime INSERT for the current user — but only when the user's
`notification_preferences.sound_enabled = true` (default).

If the file is missing, `<audio>.play()` rejects silently — the inbox
still works, it just doesn't ping. Recommended source: any royalty-free
"glass-tap" or "soft chime" sample. Bundled at `/sounds/notification.mp3`.
