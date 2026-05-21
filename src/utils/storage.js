const KEY_INPUT = "rvb_userInput";
const KEY_ADVANCED = "rvb_advanced";
const KEY_CUSTOM = "rvb_customPresets";
const KEY_HIDDEN = "rvb_hiddenBuiltins";
const KEY_ACTIVE = "rvb_activePresetId";

const ALL_KEYS = [KEY_INPUT, KEY_ADVANCED, KEY_CUSTOM, KEY_HIDDEN, KEY_ACTIVE];

function safeGet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore (private mode, quota, etc.)
  }
}

function safeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function loadInput() {
  const v = safeGet(KEY_INPUT);
  return v && typeof v === "object" ? v : null;
}

export function saveInput(obj) {
  safeSet(KEY_INPUT, obj);
}

export function clearInput() {
  safeRemove(KEY_INPUT);
}

export function loadAdvanced() {
  const v = safeGet(KEY_ADVANCED);
  return typeof v === "boolean" ? v : null;
}

export function saveAdvanced(b) {
  safeSet(KEY_ADVANCED, !!b);
}

export function loadCustomPresets() {
  const v = safeGet(KEY_CUSTOM);
  return Array.isArray(v) ? v : null;
}

export function saveCustomPresets(arr) {
  safeSet(KEY_CUSTOM, arr);
}

export function loadHiddenBuiltins() {
  const v = safeGet(KEY_HIDDEN);
  return Array.isArray(v) ? v : null;
}

export function saveHiddenBuiltins(arr) {
  safeSet(KEY_HIDDEN, arr);
}

export function loadActivePresetId() {
  const v = safeGet(KEY_ACTIVE);
  return typeof v === "string" ? v : null;
}

export function saveActivePresetId(id) {
  if (id == null) safeRemove(KEY_ACTIVE);
  else safeSet(KEY_ACTIVE, id);
}

export function clearAll() {
  for (const k of ALL_KEYS) safeRemove(k);
}
