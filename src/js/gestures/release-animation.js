const MIN_RELEASE_DURATION_MS = 140;
const MAX_RELEASE_DURATION_MS = 360;
const BASE_RELEASE_DURATION_MS = 260;
const RELEASE_EASING = "cubic-bezier(.2, .25, .15, 1)";
const RELEASE_INITIAL_SLOPE = 1.25;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function releaseDuration(distancePx, fromPx, toPx, velocityPxPerMs) {
  const direction = Math.sign(toPx - fromPx) || 1;
  const alignedVelocity = velocityPxPerMs * direction;
  if (alignedVelocity <= 0.01) return BASE_RELEASE_DURATION_MS;
  return clamp(
    Math.round(RELEASE_INITIAL_SLOPE * distancePx / alignedVelocity),
    MIN_RELEASE_DURATION_MS,
    MAX_RELEASE_DURATION_MS
  );
}

export function animateRelease(el, axis, fromPx, toPx, velocityPxPerMs = 0, secondaryTarget = null) {
  const property = axis === "x" ? "translateX" : "translateY";

  if (!el.animate) {
    el.style.transform = `${property}(${toPx}px)`;
    if (secondaryTarget) {
      secondaryTarget.el.style[secondaryTarget.prop] = secondaryTarget.toValue;
    }
    return {
      finished: Promise.resolve(),
      cancel() {},
    };
  }

  const distance = Math.abs(toPx - fromPx);
  const duration = releaseDuration(distance, fromPx, toPx, velocityPxPerMs);
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

  let cancelled = false;

  const finished = Promise.all(animations.map(a => a.finished.catch(() => undefined)))
    .then(() => {
      if (cancelled) return;
      el.style.transform = `${property}(${toPx}px)`;
      if (secondaryTarget) {
        secondaryTarget.el.style[secondaryTarget.prop] = secondaryTarget.toValue;
      }
      animations.forEach(a => a.cancel());
    });

  return {
    finished,
    cancel() {
      if (cancelled) return;
      cancelled = true;
      animations.forEach(a => a.cancel());
    },
  };
}
