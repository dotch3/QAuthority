const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1"

const LOGIN_PATH = "/login"

class ApiClient {
  private baseUrl: string
  private isRefreshing = false
  private refreshSubscribers: Array<(token: string) => void> = []

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private getToken(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem("access_token")
  }

  private onTokenRefreshed(token: string) {
    this.refreshSubscribers.forEach(callback => callback(token))
    this.refreshSubscribers = []
  }

  private subscribeTokenRefresh(callback: (token: string) => void) {
    this.refreshSubscribers.push(callback)
  }

  private redirectToLogin() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token")
      localStorage.removeItem("refresh_token")
      window.location.href = LOGIN_PATH
    }
  }

  private async request<T>(
    method: string,
    path: string,
    options?: RequestInit & { skipAuth?: boolean; noRedirect?: boolean }
  ): Promise<T> {
    const skipAuth = options?.skipAuth ?? false
    const noRedirect = options?.noRedirect ?? false
    const fetchOptions = options ?? {}
    const token = this.getToken()

    const headers: Record<string, string> = {}

    // Only set Content-Type for requests that have a body
    if (fetchOptions.body) {
      headers["Content-Type"] = "application/json"
    }

    if (fetchOptions.headers) {
      Object.assign(headers, fetchOptions.headers as Record<string, string>)
    }

    if (token && !skipAuth) {
      headers["Authorization"] = `Bearer ${token}`
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...fetchOptions,
      method,
      headers,
    })

    if (response.status === 401 && !skipAuth) {
      if (this.isRefreshing) {
        return new Promise((resolve, reject) => {
          this.subscribeTokenRefresh(async (newToken) => {
            headers["Authorization"] = `Bearer ${newToken}`
            try {
              const retryResponse = await fetch(`${this.baseUrl}${path}`, {
                ...fetchOptions,
                method,
                headers,
              })

              if (!retryResponse.ok) {
                const error = await retryResponse.json().catch(() => ({}))
                reject(new Error(error.error ?? error.message ?? `HTTP ${retryResponse.status}`))
                return
              }

              if (retryResponse.status === 204 || retryResponse.headers.get("content-length") === "0") {
                resolve(undefined as T)
                return
              }
              resolve(retryResponse.json())
            } catch (err) {
              reject(err)
            }
          })
        })
      }

      this.isRefreshing = true
      let refreshed = await this.tryRefreshToken()
      
      if (!refreshed) {
        refreshed = await this.tryRefreshToken()
      }

      this.isRefreshing = false

      if (refreshed) {
        const newToken = localStorage.getItem("access_token")
        this.onTokenRefreshed(newToken!)
        headers["Authorization"] = `Bearer ${newToken}`
        
        const retryResponse = await fetch(`${this.baseUrl}${path}`, {
          ...fetchOptions,
          method,
          headers,
        })

        if (!retryResponse.ok) {
          const error = await retryResponse.json().catch(() => ({}))
          throw new Error(error.error ?? error.message ?? `HTTP ${retryResponse.status}`)
        }

        if (retryResponse.status === 204 || retryResponse.headers.get("content-length") === "0") {
          return undefined as T
        }
        return retryResponse.json()
      }

      if (noRedirect) {
        throw new Error("Session expired")
      }

      this.redirectToLogin()
      throw new Error("Session expired. Please login again.")
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error ?? error.message ?? `HTTP ${response.status}`)
    }

    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return undefined as T
    }

    return response.json()
  }

  private async tryRefreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem("refresh_token")
    if (!refreshToken) return false

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      })

      if (!response.ok) return false

      const data = await response.json()
      localStorage.setItem("access_token", data.accessToken)
      if (data.refreshToken) {
        localStorage.setItem("refresh_token", data.refreshToken)
      }
      return true
    } catch {
      return false
    }
  }

  async get<T>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>("GET", path, options)
  }

  async post<T>(
    path: string,
    body?: unknown,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>("POST", path, {
      ...options,
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async patch<T>(path: string, body: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>("PATCH", path, {
      ...options,
      body: JSON.stringify(body),
    })
  }

  async put<T>(path: string, body: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>("PUT", path, {
      ...options,
      body: JSON.stringify(body),
    })
  }

  async delete<T>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>("DELETE", path, options)
  }

  async login(email: string, password: string): Promise<{
    accessToken: string
    refreshToken: string
    user: unknown
  }> {
    return this.request("POST", "/auth/login", {
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    })
  }

  async register(data: {
    email: string
    password: string
    name: string
  }): Promise<{
    accessToken: string
    refreshToken: string
    user: unknown
  }> {
    return this.request("POST", "/auth/register", {
      body: JSON.stringify(data),
      skipAuth: true,
    })
  }

  async logout(refreshToken?: string): Promise<void> {
    try {
      await this.request("POST", "/auth/logout", {
        body: JSON.stringify({ refreshToken }),
        skipAuth: true,
      })
    } finally {
      localStorage.removeItem("access_token")
      localStorage.removeItem("refresh_token")
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }
    }
  }

  async forgotPassword(email: string): Promise<{ success: boolean }> {
    return this.request("POST", "/auth/forgot-password", {
      body: JSON.stringify({ email }),
      skipAuth: true,
    })
  }

  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean }> {
    return this.request("POST", "/auth/reset-password", {
      body: JSON.stringify({ token, newPassword }),
      skipAuth: true,
    })
  }

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean }> {
    return this.post("/auth/change-password", { currentPassword, newPassword })
  }

  oauth(provider: "github" | "google" | "microsoft"): void {
    window.location.href = `${this.baseUrl}/auth/oauth/${provider}`
  }
}

export const api = new ApiClient(API_BASE)

export const groupsApi = {
  list: () => api.get('/groups'),
  get: (id: string) => api.get(`/groups/${id}`),
  create: (data: { name: string; description?: string }) => api.post('/groups', data),
  update: (id: string, data: { name?: string; description?: string }) =>
    api.patch(`/groups/${id}`, data),
  delete: (id: string) => api.delete(`/groups/${id}`),
  addMember: (groupId: string, userId: string) =>
    api.post(`/groups/${groupId}/members`, { userId }),
  removeMember: (groupId: string, userId: string) =>
    api.delete(`/groups/${groupId}/members/${userId}`),
  setPermissions: (groupId: string, permissions: any[]) =>
    api.put(`/groups/${groupId}/permissions`, { permissions }),
}
