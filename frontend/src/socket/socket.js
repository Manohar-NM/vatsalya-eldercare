import { io } from "socket.io-client";

const fallbackSocketUrl = `${window.location.protocol}//${window.location.hostname || "localhost"}:5000`;
const socketUrl = import.meta.env.VITE_SOCKET_URL || fallbackSocketUrl;
const socket = io(socketUrl);

export default socket;
