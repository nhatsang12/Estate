const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:5000/api";
const AUTH_STORAGE_KEY = "estate_manager_token";
const REFRESH_ENDPOINT = "/auth/refresh-token";

interface RequestOptions<TBody = unknown> extends Omit<RequestInit, "body"> {
  token?: string | null;
  body?: TBody;
}

interface ApiErrorPayload {
  status?: string;
  message?: string;
  error?: string;
}

export class ApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

function getStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(AUTH_STORAGE_KEY);
}

async function refreshAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${REFRESH_ENDPOINT}`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { token?: string } | null;
    const nextToken = payload?.token;
    if (nextToken) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, nextToken);
      return nextToken;
    }
  } catch {
    return null;
  }

  return null;
}

async function handleResponse<TResponse>(response: Response): Promise<TResponse> {
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? ((await response.json()) as ApiErrorPayload) : null;

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error ||
      "Something went wrong while processing your request.";
    throw new ApiError(message, response.status);
  }

  return (payload || ({} as TResponse)) as TResponse;
}

export async function requestJson<TResponse, TBody = unknown>(
  endpoint: string,
  options: RequestOptions<TBody> = {}
): Promise<TResponse> {
  const { token, body, headers, ...rest } = options;
  const isFormData = body instanceof FormData;
  const storedToken = getStoredToken();
  const resolvedToken = storedToken || token || null;

  const executeRequest = (authToken: string | null) =>
    fetch(`${API_BASE_URL}${endpoint}`, {
    ...rest,
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(headers || {}),
    },
    body:
      body === undefined
        ? undefined
        : isFormData
          ? (body as FormData)
          : JSON.stringify(body),
  });

  const response = await executeRequest(resolvedToken);

  if (response.status === 401) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      const retryResponse = await executeRequest(refreshedToken);
      return handleResponse<TResponse>(retryResponse);
    }
  }

  return handleResponse<TResponse>(response);
}

