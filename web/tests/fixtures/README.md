# Audio fixtures

These fixtures contain a generated 440 Hz sine tone, not user media.
`tone.m4a` is one second of mono AAC-LC at 44.1 kHz, encoded with macOS afconvert.
`tone-with-video.mp4` remuxes its AAC packets with MP4Box and adds one inert AVC
track, so tests can verify audio packet preservation and removal of video tracks.
The inert AVC payload is not intended for video decoding.

Playback of a real mixed video is checked separately during development; do not
commit Instagram downloads or signed media URLs as fixtures.
