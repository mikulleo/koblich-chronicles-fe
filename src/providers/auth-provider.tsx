'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import apiClient from '@/lib/api/client'

interface User {
  id: string
  name?: string
  email: string
  roles: string[]
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, country: string) => Promise<void>
  logout: () => Promise<void>
  deleteAccount: () => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (token: string, password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem('payload-token')
      if (!token) {
        setLoading(false)
        return
      }
      try {
        const { data } = await apiClient.get('/users/me')
        if (data?.user) {
          setUser(data.user)
        } else {
          localStorage.removeItem('payload-token')
        }
      } catch {
        localStorage.removeItem('payload-token')
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await apiClient.post('/users/login', { email, password })
    if (data?.token) {
      localStorage.setItem('payload-token', data.token)
    }
    if (data?.user) {
      setUser(data.user)
    }
  }, [])

  const register = useCallback(async (name: string, email: string, password: string, country: string) => {
    // Create the user account
    await apiClient.post('/users', { name, email, password, country })
    // Then log them in
    await login(email, password)
  }, [login])

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/users/logout')
    } catch {
      // Logout even if the API call fails
    }
    localStorage.removeItem('payload-token')
    setUser(null)
  }, [])

  const deleteAccount = useCallback(async () => {
    if (!user) return
    await apiClient.delete(`/users/${user.id}`)
    localStorage.removeItem('payload-token')
    setUser(null)
  }, [user])

  const forgotPassword = useCallback(async (email: string) => {
    await apiClient.post('/users/forgot-password', { email })
  }, [])

  const resetPassword = useCallback(async (token: string, password: string) => {
    await apiClient.post('/users/reset-password', { token, password })
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, deleteAccount, forgotPassword, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
