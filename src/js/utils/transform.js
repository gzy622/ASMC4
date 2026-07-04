export function parseTransformAxis(transform, axis) {
  if (!transform || transform === "none") return 0;

  const fnMatch = transform.match(new RegExp(`translate${axis}\\(([^)]+)\\)`));
  if (fnMatch) {
    return parseFloat(fnMatch[1]) || 0;
  }

  if (transform.startsWith("matrix3d(")) {
    const values = transform.slice(9, -1).split(",").map(value => parseFloat(value.trim()));
    return axis === "Y" ? values[13] : values[12];
  }

  if (transform.startsWith("matrix(")) {
    const values = transform.slice(7, -1).split(",").map(value => parseFloat(value.trim()));
    return axis === "Y" ? values[5] : values[4];
  }

  return 0;
}
