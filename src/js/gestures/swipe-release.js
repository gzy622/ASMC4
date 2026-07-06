import { DRAG_CLOSE_THRESHOLD, FLING_VELOCITY_THRESHOLD, MIN_FLING_DISTANCE } from "./constants.js";

/**
 * Decide whether a swipe release should commit (open/close).
 * @param {object} params
 * @param {number} params.distance - Distance moved toward commit direction (non-negative)
 * @param {number} params.velocity - px/ms along gesture axis
 * @param {number} params.direction - +1 commit toward positive axis, -1 toward negative
 * @param {number} [params.distanceThreshold]
 */
export function evaluateSwipeRelease({
  distance,
  velocity,
  direction,
  distanceThreshold = DRAG_CLOSE_THRESHOLD,
}) {
  if (velocity * direction <= -FLING_VELOCITY_THRESHOLD) return false;
  return (
    distance >= distanceThreshold
    || (distance >= MIN_FLING_DISTANCE && velocity * direction >= FLING_VELOCITY_THRESHOLD)
  );
}
