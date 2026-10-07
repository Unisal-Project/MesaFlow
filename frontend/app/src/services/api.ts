// Use VITE_API_URL when the API is hosted separately from the frontend.
export const API_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3333/api/v1`;
