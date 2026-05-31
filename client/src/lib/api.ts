import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
  timeout: 10000, // 10 second timeout
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Log requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Making ${config.method?.toUpperCase()} request to:`, config.url);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized errors
      console.error('Unauthorized request:', error.response.data);
    } else if (error.code === 'NETWORK_ERROR' || error.code === 'ERR_NETWORK') {
      console.error('Network error - check if backend is running on http://localhost:8080');
    }
    return Promise.reject(error);
  }
);

// A password entry as stored/returned by the server: service_name is a
// plaintext label, every credential field is an opaque "v1:..." ciphertext
// envelope that only the browser (with the unlocked vault) can decrypt.
export interface PasswordEntry {
  id: string;
  user_id: string;
  service_name: string;
  encrypted_password: string;
  encrypted_username?: string;
  encrypted_url?: string;
  encrypted_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePasswordRequest {
  service_name: string;
  encrypted_password: string;
  encrypted_username?: string;
  encrypted_url?: string;
  encrypted_notes?: string;
}

export interface UpdatePasswordRequest {
  service_name?: string;
  encrypted_password?: string;
  encrypted_username?: string;
  encrypted_url?: string;
  encrypted_notes?: string;
}

// Zero-knowledge key material. The salt is non-secret; the wrapped vault key is
// itself encrypted under the master-password-derived key.
export interface VaultInfo {
  initialized: boolean;
  kdf_salt?: string;
  wrapped_vault_key?: string;
  master_password_hint?: string;
}

export interface SetupVaultRequest {
  kdf_salt: string;
  wrapped_vault_key: string;
  master_password_hint?: string;
}

export interface ApiResponse<T> {
  message: string;
  data?: T;
}

export interface ApiError {
  error: string;
  message?: string;
}

// Password API functions
export const passwordApi = {
  // Get all passwords
  getPasswords: async (token: string): Promise<PasswordEntry[]> => {
    const response = await apiClient.get<ApiResponse<PasswordEntry[]>>('/passwords', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data || [];
  },

  // Get single password
  getPassword: async (id: string, token: string): Promise<PasswordEntry> => {
    const response = await apiClient.get<ApiResponse<PasswordEntry>>(`/passwords/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data!;
  },

  // Create password
  createPassword: async (data: CreatePasswordRequest, token: string): Promise<PasswordEntry> => {
    const response = await apiClient.post<ApiResponse<PasswordEntry>>('/passwords', data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data!;
  },

  // Update password
  updatePassword: async (id: string, data: UpdatePasswordRequest, token: string): Promise<PasswordEntry> => {
    const response = await apiClient.put<ApiResponse<PasswordEntry>>(`/passwords/${id}`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data!;
  },

  // Delete password
  deletePassword: async (id: string, token: string): Promise<void> => {
    await apiClient.delete(`/passwords/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

};

// Vault key-material API (zero-knowledge)
export const vaultApi = {
  // Fetch the current user's salt + wrapped vault key
  getVault: async (token: string): Promise<VaultInfo> => {
    const response = await apiClient.get<ApiResponse<VaultInfo>>('/vault', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data!;
  },

  // Initialize the vault the first time a master password is set
  setupVault: async (data: SetupVaultRequest, token: string): Promise<void> => {
    await apiClient.post('/vault', data, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
};

// User API functions
export const userApi = {
  // Get user profile
  getProfile: async (token: string) => {
    const response = await apiClient.get('/user/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data;
  },
};