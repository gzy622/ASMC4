import { SUBJECT_OPTIONS } from "../constants.js";

export function fillSubjectSelect(el) {
  if (!el) return;
  el.innerHTML = SUBJECT_OPTIONS
    .map(o => `<option value="${o.value}">${o.label}</option>`)
    .join("");
}

export function fillDrawerSubjectFilter(el) {
  if (!el) return;
  const options = SUBJECT_OPTIONS
    .filter(o => o.value !== "")
    .map(o => `<option value="${o.value}">${o.label}</option>`)
    .join("");
  el.innerHTML = `<option value="">全部</option>${options}`;
}
