import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { authApi, type AuthUser } from "@/services/api"

interface AuthState {
  user: AuthUser | null
  token: string | null
}

interface AuthContextValue extends AuthState {
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, orgName: string) => Promise<void>
  logout: () => void
  updateUser: (patch: Partial<AuthUser>) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadState(): AuthState {
  try {
    return {
      token: localStorage.getItem("auth_token"),
      user: JSON.parse(localStorage.getItem("auth_user") ?? "null"),
    }
  } catch {
    return { token: null, user: null }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(loadState)

  const saveAuth = useCallback((token: string, user: AuthUser) => {
    localStorage.setItem("auth_token", token)
    localStorage.setItem("auth_user", JSON.stringify(user))
    setState({ token, user })
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    saveAuth(res.access_token, res.user)
  }, [saveAuth])

  const register = useCallback(async (name: string, email: string, password: string, orgName: string) => {
    const res = await authApi.register(name, email, password, orgName)
    saveAuth(res.access_token, res.user)
  }, [saveAuth])

  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setState((prev) => {
      if (!prev.user) return prev
      const updated = { ...prev.user, ...patch }
      localStorage.setItem("auth_user", JSON.stringify(updated))
      return { ...prev, user: updated }
    })
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token")
    localStorage.removeItem("auth_user")
    setState({ token: null, user: null })
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, isAuthenticated: !!state.token, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
