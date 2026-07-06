const STORAGE_KEY = "raq-device";

export function deviceHeaders(): HeadersInit {
  const key = window.localStorage.getItem(STORAGE_KEY);
  return key ? { "X-RAQ-Device": key } : {};
}

export function rememberDevice(response: Response) {
  const key = response.headers.get("X-RAQ-Device");
  if (key) window.localStorage.setItem(STORAGE_KEY, key);
}
