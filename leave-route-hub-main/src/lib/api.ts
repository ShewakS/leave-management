import { getAuthToken } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = getAuthToken();
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth methods
  async signUp(userData: { email: string; password: string; full_name: string; role?: string; department?: string }) {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async signIn(credentials: { email: string; password: string }) {
    return this.request('/auth/signin', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  // Leave Applications
  async getLeaveApplications(filters?: { status?: string; student_id?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.student_id) params.append('student_id', filters.student_id);
    
    const query = params.toString();
    return this.request(`/leave-applications${query ? `?${query}` : ''}`);
  }

  async createLeaveApplication(data: {
    leave_type: string;
    start_date: string;
    end_date: string;
    reason: string;
  }) {
    return this.request('/leave-applications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLeaveApplication(id: string, data: any) {
    return this.request(`/leave-applications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async reviewLeaveApplication(id: string, data: {
    approved: boolean;
    comment: string;
    reviewer_type: 'advisor' | 'hod';
  }) {
    return this.request(`/leave-applications/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Academic Calendar
  async getAcademicEvents() {
    return this.request('/academic-calendar');
  }

  async createAcademicEvent(data: {
    title: string;
    description?: string;
    event_date: string;
    event_type: string;
  }) {
    return this.request('/academic-calendar', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Users (for advisors/HODs to view profiles)
  async getUsers(filters?: { role?: string }) {
    const params = new URLSearchParams();
    if (filters?.role) params.append('role', filters.role);
    
    const query = params.toString();
    return this.request(`/users${query ? `?${query}` : ''}`);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;
