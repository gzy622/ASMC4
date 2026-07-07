const MIN_RELEASE_DURATION_MS = 150;
const MAX_RELEASE_DURATION_MS = 380;
const BASE_RELEASE_DURATION_MS = 280;
const BASE_DISTANCE_DURATION_MS = 210;
const DISTANCE_DURATION_FACTOR = 0.45;
const NATIVE_FAST_SWIPE_VELOCITY = 1.8;
const EDGE_SOFTEN_PX = 12;
const RUBBER_BAND_FACTOR = 0.55;

const activeAnimations = new WeakMap();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const RELEASE_EASING = "cubic-bezier(.22, .61, .36, 1)";

function rubberBand(overflowPx, rangePx) {
  const sign = Math.sign(overflowPx) || 1;
  const distance = Math.abs(overflowPx);
  const dimension = Math.max(1, rangePx);
  return sign * (distance * dimension * RUBBER_BAND_FACTOR)
    / (dimension + distance * RUBBER_BAND_FACTOR);
}

function softenNearMin(value, min, edgePx) {
  const distance = value - min;
  if (distance <= 0 || distance >= edgePx) return value;
  const t = distance / edgePx;
  return min + edgePx * Math.pow(t, 1.08);
}

function softenNearMax(value, max, edgePx) {
  const distance = max - value;
  if (distance <= 0 || distance >= edgePx) return value;
  const t = distance / edgePx;
  return max - edgePx * Math.pow(t, 1.08);
}

function releaseDuration(distancePx, fromPx, toPx, velocityPxPerMs) {
  const direction = Math.sign(toPx - fromPx) || 1;
  const alignedVelocity = velocityPxPerMs * direction;
  const distanceDuration = clamp(
    BASE_DISTANCE_DURATION_MS + distancePx * DISTANCE_DURATION_FACTOR,
    BASE_RELEASE_DURATION_MS,
    MAX_RELEASE_DURATION_MS
  );
  if (alignedVelocity <= 0.01) return distanceDuration;

  const speed = clamp(alignedVelocity / NATIVE_FAST_SWIPE_VELOCITY, 0, 1);
  const speedEase = 1 - Math.pow(1 - speed, 2);
  return Math.round(
    distanceDuration + (MIN_RELEASE_DURATION_MS - distanceDuration) * speedEase
  );
}

export function cancelMotionAnimation(el) {
  const active = activeAnimations.get(el);
  if (!active) return;
  active.cancel();
}

export function mapInteractiveDelta(rawPx, minPx, maxPx) {
  const range = Math.max(1, maxPx - minPx);
  if (rawPx < minPx) return minPx + rubberBand(rawPx - minPx, range);
  if (rawPx > maxPx) return maxPx + rubberBand(rawPx - maxPx, range);
  const edgePx = Math.min(EDGE_SOFTEN_PX, range / 3);
  return softenNearMax(softenNearMin(rawPx, minPx, edgePx), maxPx, edgePx);
}

export function animateMotionRelease(
  el,
  axis,
  fromPx,
  toPx,
  velocityPxPerMs = 0,
  secondaryTarget = null,
  formatTransform = null,
  durationScale = 1,
) {
  cancelMotionAnimation(el);

  const property = axis === "x" ? "translateX" : "translateY";
  const toTransform = formatTransform ? formatTransform(toPx) : `${property}(${toPx}px)`;
  const fromTransform = formatTransform ? formatTransform(fromPx) : `${property}(${fromPx}px)`;
  const distance = Math.abs(toPx - fromPx);

  if (distance < 0.5) {
    el.style.transform = toTransform;
    if (secondaryTarget) {
      secondaryTarget.el.style[secondaryTarget.prop] = secondaryTarget.toValue;
    }
    return {
      finished: Promise.resolve(),
      cancel() {},
    };
  }

  const duration = Math.round(releaseDuration(distance, fromPx, toPx, velocityPxPerMs) * durationScale);
  let cancelled = false;

  el.style.transition = "none";
  el.style.willChange = "transform";
  el.style.transform = fromTransform;

  if (!el.animate) {
    el.style.transform = toTransform;
    if (secondaryTarget) {
      secondaryTarget.el.style[secondaryTarget.prop] = secondaryTarget.toValue;
    }
    return {
      finished: Promise.resolve(),
      cancel() {},
    };
  }

  const animations = [
    el.animate([
      { transform: fromTransform },
      { transform: toTransform },
    ], {
      duration,
      easing: RELEASE_EASING,
      fill: "forwards",
    }),
  ];

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

  const finished = Promise.all(animations.map(animation => animation.finished.catch(() => undefined)))
    .then(() => {
      if (cancelled) return;
      animations.forEach((animation) => {
        if (typeof animation.commitStyles === "function") {
          animation.commitStyles();
        }
        animation.cancel(); // release fill:forwards so CSS transform can take over
      });
      el.style.transform = toTransform;
      if (secondaryTarget) {
        secondaryTarget.el.style[secondaryTarget.prop] = secondaryTarget.toValue;
      }
      activeAnimations.delete(el);
    });

  const controller = {
    finished,
    cancel() {
      if (cancelled) return;
      cancelled = true;
      animations.forEach(animation => animation.cancel());
      activeAnimations.delete(el);
    },
  };

  activeAnimations.set(el, controller);
  return controller;
}
