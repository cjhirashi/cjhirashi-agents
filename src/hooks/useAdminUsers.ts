/**
 * useAdminUsers Hook
 *
 * Custom hook for managing admin users:
 * - Fetch users with pagination
 * - Create, update, delete users
 * - Update user limits
 * - Search and filter
 */

import { useState, useEffect, useCallback } from 'react';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'INVITED_AGENT' | 'INVITED_STORAGE' | 'SUBSCRIBER' | 'USER';
export type SubscriptionTier = 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE' | 'CUSTOM' | 'UNLIMITED';

export interface User {
  id: string;
  email: string | null;
  name: string | null;
  role: UserRole;
  subscriptionTier: SubscriptionTier;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  agentPermissions: Array<{
    id: string;
    agent: {
      id: string;
      name: string;
      description: string | null;
    };
  }>;
}

export interface CreateUserData {
  email: string;
  name: string;
  password: string;
  role: UserRole;
  subscriptionTier: SubscriptionTier;
}

export interface UpdateUserData {
  name?: string;
  role?: UserRole;
  subscriptionTier?: SubscriptionTier;
  isActive?: boolean;
}

interface UseAdminUsersOptions {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
}

interface UseAdminUsersReturn {
  users: User[];
  totalUsers: number;
  page: number;
  limit: number;
  totalPages: number;
  isLoading: boolean;
  error: Error | null;
  createUser: (data: CreateUserData) => Promise<User>;
  updateUser: (userId: string, data: UpdateUserData) => Promise<User>;
  deleteUser: (userId: string) => Promise<void>;
  updateLimits: (userId: string, tier: SubscriptionTier, customLimits?: Record<string, unknown>) => Promise<void>;
  refreshUsers: () => Promise<void>;
  setPage: (page: number) => void;
  setSearch: (search: string) => void;
  setRoleFilter: (role: UserRole | undefined) => void;
}

export function useAdminUsers(options: UseAdminUsersOptions = {}): UseAdminUsersReturn {
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(options.page || 1);
  const [limit] = useState(options.limit || 10);
  const [search, setSearch] = useState(options.search || '');
  const [roleFilter, setRoleFilter] = useState<UserRole | undefined>(options.role);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build query params
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (search) params.append('search', search);
      if (roleFilter) params.append('role', roleFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch users');
      }

      const data = await res.json();

      // Backend actual NO tiene pagination implementada, devuelve { users: User[] }
      // Implementamos pagination del lado del cliente por ahora
      const allUsers = data.users || [];

      // Filter by search (client-side)
      let filteredUsers = allUsers;
      if (search) {
        const searchLower = search.toLowerCase();
        filteredUsers = allUsers.filter((user: User) => {
          return (
            user.email?.toLowerCase().includes(searchLower) ||
            user.name?.toLowerCase().includes(searchLower)
          );
        });
      }

      // Filter by role (client-side)
      if (roleFilter) {
        filteredUsers = filteredUsers.filter((user: User) => user.role === roleFilter);
      }

      // Pagination (client-side)
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

      setUsers(paginatedUsers);
      setTotalUsers(filteredUsers.length);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setUsers([]);
      setTotalUsers(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const refreshUsers = useCallback(async () => {
    await fetchUsers();
  }, [fetchUsers]);

  const createUser = useCallback(async (data: CreateUserData): Promise<User> => {
    const res = await fetch('/api/admin/users/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to create user');
    }

    const result = await res.json();
    await refreshUsers();
    return result.user;
  }, [refreshUsers]);

  const updateUser = useCallback(async (userId: string, data: UpdateUserData): Promise<User> => {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...data }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to update user');
    }

    const result = await res.json();
    await refreshUsers();
    return result.user;
  }, [refreshUsers]);

  const deleteUser = useCallback(async (userId: string): Promise<void> => {
    const res = await fetch(`/api/admin/users?userId=${userId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to delete user');
    }

    await refreshUsers();
  }, [refreshUsers]);

  const updateLimits = useCallback(async (
    userId: string,
    tier: SubscriptionTier,
    customLimits?: Record<string, unknown>
  ): Promise<void> => {
    const res = await fetch(`/api/admin/users/${userId}/limits`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriptionTier: tier,
        customLimits,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to update limits');
    }

    await refreshUsers();
  }, [refreshUsers]);

  const totalPages = Math.ceil(totalUsers / limit);

  return {
    users,
    totalUsers,
    page,
    limit,
    totalPages,
    isLoading,
    error,
    createUser,
    updateUser,
    deleteUser,
    updateLimits,
    refreshUsers,
    setPage,
    setSearch,
    setRoleFilter,
  };
}
