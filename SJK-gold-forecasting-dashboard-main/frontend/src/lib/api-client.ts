import axios from "axios";

export const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 seconds timeout
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle retries and 401 token expiry
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Retry configuration (2 retries for network errors or 5xx status codes)
    if (config && !config._retryCount) {
      config._retryCount = 0;
    }

    const isNetworkOr5xx = !error.response || (error.response.status >= 500 && error.response.status <= 599);

    if (config && config._retryCount < 2 && isNetworkOr5xx) {
      config._retryCount += 1;
      console.warn(`Retrying request to ${config.url} (Attempt ${config._retryCount}/2)...`);
      await new Promise((resolve) => setTimeout(resolve, 1000 * config._retryCount));
      return apiClient(config);
    }

    if (error.response) {
      console.error(`API Error [${error.response.status}] at ${config?.url}:`, error.response.data?.detail || error.message);
      if (error.response.status === 401) {
        if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
          localStorage.removeItem("token");
          localStorage.removeItem("user_email");
          localStorage.removeItem("user_name");
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
        }
      }
    } else if (error.code === "ECONNABORTED") {
      console.error(`API Timeout (10s) at ${config?.url}`);
    } else {
      console.error(`API Network Failure at ${config?.url}:`, error.message);
    }

    return Promise.reject(error);
  }
);

