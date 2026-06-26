const MIN_RELEASE_DURATION_MS = 140;
const MAX_RELEASE_DURATION_MS = 360;
const BASE_RELEASE_DURATION_MS = 260;
const VELOCITY_DISTANCE_RATIO = 0.45;
const RELEASE_EASING = "cubic-bezier(.18, .9, .2, 1)";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function releaseDuration(distancePx, velocityPxPerMs) {
  const velocity = Math.abs(velocityPxPerMs);
  if (velocity <= 0.01) return BASE_RELEASE_DURATION_MS;
  return clamp(
    Math.round(distancePx / velocity * VELOCITY_DISTANCE_RATIO),
    MIN_RELEASE_DURATION_MS,
    MAX_RELEASE_DURATION_MS
  );
}

export function animateRelease(el, axis, fromPx, toPx, velocityPxPerMs = 0, secondaryTarget = null) {
  if (!el.animate) {
    el.style.transform = axis === "x" ? `translateX(${toPx}px)` : `translateY(${toPx}px)`;
    if (secondaryTarget) {
      secondaryTarget.el.style[secondaryTarget.prop] = secondaryTarget.toValue;
    }
    return Promise.resolve();
  }

  const distance = Math.abs(toPx - fromPx);
  const duration = releaseDuration(distance, velocityPxPerMs);
  const property = axis === "x" ? "translateX" : "translateY";

  const animations = [];

  animations.push(el.animate([
    { transform: `${property}(${fromPx}px)` },
    { transform: `${property}(${toPx}px)` },
  ], {
    duration,
    easing: RELEASE_EASING,
    fill: "forwards",
  }));

  if (secondaryTarget) {
    const fromFrame = {};
    const toFrame = {};
    fromFrame[secondaryTarget.prop] = secondaryTarget.fromValue;
    toFrame[secondaryTarget.prop] = secondaryTarget.toValue;
    animations.push(secondaryTarget.el.animate([fromFrame, toFrame], {
      duration,
      easing: RELEASE_EASING,
      fill: "forwards",
    }));
  }

  return Promise.all(animations.map(a => a.finished.catch(() => undefined)))
    .then(() => {
      el.style.transform = `${property}(${toPx}px)`;
      if (secondaryTarget) {
        secondaryTarget.el.style[secondaryTarget.prop] = secondaryTarget.toValue;
      }
      animations.forEach(a => a.cancel());
    });
}
