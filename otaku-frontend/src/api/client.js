const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/**
 * Thin wrapper around fetch that points at the Otaku backend, attaches the
 * JWT from localStorage when present, and throws with the API's own error
 * message on non-2xx responses.
 */
async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };

  if (auth) {
    const token = localStorage.getItem("otaku_token");
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }

  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body, opts) => request(path, { method: "POST", body, ...opts }),
  put: (path, body) => request(path, { method: "PUT", body }),
  del: (path) => request(path, { method: "DELETE" }),
};
export const animeApi = {
    getAnime: async (params = {}) => {
        const query = new URLSearchParams(params);

        return api.get(`/anime?${query.toString()}`);
    },

    getAnimeById: async (id) => {
        return api.get(`/anime/${id}`);
    }
};