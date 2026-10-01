# Living-portrait assets

Use the repository's existing Ancarion portrait as the source of truth. Do not use the generic Justiciar images from the exploratory chat unless separately requested.

## First useful asset

One 4–6 second performance: starts neutral, lowers gaze toward a dossier, notices the visitor, raises gaze/head gently, holds, and returns to the SAME neutral pose. For a loop, opening and ending pose, lighting and exposure must match. This performance has not been generated yet.

If producing it with LivePortrait, use a real driving video (your own performance or appropriately licensed reference) with neutral first frame and restrained movement. The model can drive expressions/head motion; do not promise convincing new hand/body actions from a single portrait. Full-body gestures require a more suitable video workflow or animation rig.

## Optional manifest

```js
const clips = {
  idle: '/assets/ancarion/idle.mp4',
  listening: '/assets/ancarion/listening.mp4',
  denied: '/assets/ancarion/denied.mp4',
  accepted: '/assets/ancarion/accepted.mp4'
};
```

Only set paths once files actually exist. Idle loops; reaction clips play once. The UI has a configurable acceptedHoldMs before opening (default 1600ms with an acceptance clip). Set this to the intended reaction length. Clip timing is illustrative, not audio-synchronized.

## Image/frame contract

- Set portraitIncludesFrame=true if the source includes the frame. Every clip must then also include that exact stationary frame.
- Otherwise all media are painting-only and CSS supplies the frame.
- Poster and every clip must use identical resolution, crop, composition and framing.
- Avoid camera moves/zooms, auto-exposure shifts, morphing robes and unrelated background motion.
- For stable scenery, composite the animated character over one fixed background plate in the video-production workflow. Preserve natural head/shoulder motion; don't try to simulate a performance by crossfading isolated mouths.
- Keep painted texture temporally stable. Subtle brushwork treatment; no sparkle overlays or fluorescent eyes.
- Preserve the original image untouched. New derivatives get new filenames.
- Supply a matching neutral poster frame to avoid a jump when a clip starts or fails.
- A clip switch in this starter falls back through the poster; it does not synthesize seamless transitions. If visible jumps remain, add properly matched transition footage or a tested double-buffered player in the host.

## Optional encoding

FFmpeg is only needed on the machine preparing videos, never in the website. For a portrait-only 2:3 source:

```sh
ffmpeg -i source.mp4 -an -vf "scale=480:720:force_original_aspect_ratio=decrease,pad=480:720:(ow-iw)/2:(oh-ih)/2,fps=24" -c:v libx264 -crf 22 -pix_fmt yuv420p -movflags +faststart idle.mp4
```

Change output dimensions to the actual source ratio; don't add bars to mismatched clips as a substitute for matching composition. Review output manually for frame edges and facial artifacts. Keep clips short and avoid preloading every reaction on initial page load.

## Honest limitation

This package provides playback and interaction, not AI motion generation. It includes no `.moc3` Live2D rig and no generated video. LivePortrait, Live2D and plain sprite animation are different technologies; name the one actually used.
