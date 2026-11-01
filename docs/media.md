# README walkthrough

The README animation is a recording of the real Noktiq toolbar, mounted in a staged React interior-studio website. The fictional studio exists solely to explain the product; it is not a new application feature or a coding agent. The recording includes dragging Nok, selecting two elements, reviewing the compact notes list and copying the real request. The static preview shows the notes list.

## Files

- [Animated preview](assets/noktiq-demo.gif): loops in the README as an ordinary image.
- [H.264 MP4](assets/noktiq-demo.mp4): full-resolution, silent walkthrough with English chapter captions.
- [Static preview](assets/noktiq-demo-poster.png): an alternative to animation.
- [Captured request](walkthrough-request.md): the actual clipboard content, with source paths relative to `scripts/readme-demo`.
- `scripts/readme-demo`: isolated recording fixture using the current built SDK. The existing React/Vue example applications remain separate from this fictional promotional website.

The toolbar, example website and recording captions are in English. The final panel displays an excerpt of the copied text. It does not simulate sending a request to an agent or an AI-generated code change.

## Regenerate

Run from the repository root after installing project dependencies. Chrome and a full FFmpeg build with H.264 and GIF encoding are required; Playwright's minimal FFmpeg binary cannot encode these outputs.

```sh
npm run build
npm run record:readme
```

If FFmpeg is not on PATH, set `NOKTIQ_FFMPEG` to its executable. For example in PowerShell:

```powershell
$env:NOKTIQ_FFMPEG = 'C:\tools\ffmpeg\bin\ffmpeg.exe'
npm run record:readme
```

The script also recognizes an isolated `imageio-ffmpeg` binary installed under `.local-validation/media-tools`. This is local production tooling; no media package is added to Noktiq's runtime dependencies.

Recording uses a fresh browser context on port 5330. It writes a sample request to the system clipboard. Existing demos on 5173/5174 are left in place. The fixture server and recording browser close at the end.

The script verifies two saved annotations, their exact JSX source locations, their pins, actual clipboard content, zero application-button activations and the absence of browser runtime errors before producing media. Raw video and verification metadata remain under `.local-validation/readme-media`; only finished assets and the captured request are documentation files.

The GIF is optimized to stay below 10 MB. The static preview and explanatory text remain available without animation. GIF/PNG/MP4 files are excluded from the npm archive, keeping the library package small.

## Demo interior image

[readme-interior.png](assets/readme-interior.png) was generated using the built-in imagegen tool for this recording. It depicts a fictional interior, not a photographed client project. The fixture references the image saved in this repository; it does not load remote images.

Generation prompt:

> Generate a single photorealistic editorial architectural interior photograph to use inside a tasteful interior design studio website in a real UI demo. Portrait 4:5 composition. Sun-washed Mediterranean modern living room with warm ivory limewash walls, one large sculptural curved arch opening, a deep olive green low lounge chair, a small travertine pedestal table holding a single ceramic branch vase, pale limestone floor, sheer linen curtain and dramatic soft afternoon sunlight casting geometric shadows. Restrained natural materials, tactile detail, quiet luxury architectural magazine photography, shot on a 35mm lens with natural exposure and gentle film grain. Cream, sand, warm wood and muted olive palette. Balanced spacious composition, no people, no text, no logos, no borders, no website UI. This must look like a real professionally photographed interior, not a 3D render or illustration.

## GitHub display

Use a regular Markdown image for the GIF and a link to the MP4. The README does not rely on JavaScript, iframe embeds or SVG animation. GitHub's [file attachment documentation](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files) lists GIF and MP4 and recommends H.264 for video compatibility. An uploaded GitHub video-player URL can be added after publication; these assets have not been uploaded to an external service.
