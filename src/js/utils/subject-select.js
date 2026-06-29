import { SUBJECT_OPTIONS } from "../constants.js";

export function fillSubjectSelect(el) {
  if (!el) return;
  el.innerHTML = SUBJECT_OPTIONS
    .map(o => `<option value="${o.value}">${o.label}</option>`)
    .join("");
}
