import axios from "axios";

const fallbackApiUrl = `${window.location.protocol}//${window.location.hostname || "localhost"}:5000/api`;
const apiBaseUrl = import.meta.env.VITE_API_URL || fallbackApiUrl;

const API = axios.create({
  baseURL: apiBaseUrl
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export default API;
