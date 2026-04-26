// In production, VITE_API_URL points to the Render backend.
// In development, Vite proxies /api to localhost:8000 so we use "".
export const API_BASE = import.meta.env.VITE_API_URL || "";
