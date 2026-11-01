export function pageMotion(host: Element) {
  let paused = false;
  const animations = new Set<Animation>();
  const videos = new Set<HTMLVideoElement>();
  function refresh(roots: Array<Document | ShadowRoot>) {
    if (!paused) return;
    for (const root of roots) {
      if (root === host.shadowRoot) continue;
      for (const animation of root.getAnimations()) {
        const target = (animation.effect as KeyframeEffect | null)?.target;
        if (target && (target === host || target.getRootNode() === host.shadowRoot)) continue;
        if (animation.playState === 'running') { animations.add(animation); animation.pause(); }
      }
      for (const video of root.querySelectorAll('video')) if (!video.paused && !video.ended) { videos.add(video); video.pause(); }
    }
  }
  function resume() {
    for (const animation of animations) if (animation.playState === 'paused') animation.play();
    for (const video of videos) if (video.isConnected && video.paused) void video.play().catch(() => {});
    animations.clear(); videos.clear(); paused = false;
  }
  return { get paused() { return paused; }, refresh, toggle(roots: Array<Document | ShadowRoot>) { if (paused) resume(); else { paused = true; refresh(roots); } }, dispose: resume };
}
