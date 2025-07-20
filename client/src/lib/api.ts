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

// Types for API responses (same as before)
export interface PasswordEntry {
  id: string;
  user_id: string;
  service_name: string;
  service_url?: string;
  username?: string;
  password: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePasswordRequest {
  service_name: string;
  service_url?: string;
  username?: string;
  password: string;
  notes?: string;
}

export interface UpdatePasswordRequest {
  service_name?: string;
  service_url?: string;
  username?: string;
  password?: string;
  notes?: string;
}

export interface GeneratePasswordRequest {
  length: number;
  include_upper: boolean;
  include_lower: boolean;
  include_numbers: boolean;
  include_symbols: boolean;
  exclude_similar: boolean;
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

  // Generate password
  generatePassword: async (options: GeneratePasswordRequest, token: string): Promise<string> => {
    const response = await apiClient.post<ApiResponse<{ password: string }>>('/generate-password', options, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data!.password;
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