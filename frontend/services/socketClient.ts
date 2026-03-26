import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;
let activeToken = "";

const getSocketBaseUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  return apiUrl.replace(/\/api\/?$/, "");
};

export const connectSocket = (token: string) => {
  if (typeof window === "undefined") {
    return null;
  }

  if (!token) {
    return null;
  }

  if (socket && activeToken === token) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  activeToken = token;
  socket = io(getSocketBaseUrl(), {
    transports: ["websocket"],
    auth: { token },
    withCredentials: true,
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  activeToken = "";
};
