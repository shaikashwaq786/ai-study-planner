const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
}

export interface Subject {
  id: number;
  name: string;
  owner_id: number;
}

export interface Topic {
  id: number;
  name: string;
  subject_id: number;
  difficulty: number;
  priority: number;
  completed: boolean;
}

export interface Exam {
  id: number;
  title: string;
  date: string;
  event_type?: string; // 'exam', 'assignment', 'quiz', 'project'
  subject_id: number;
  owner_id: number;
  notes?: string;
}


export interface StudySession {
  id: number;
  start_time: string;
  end_time?: string;
  duration_minutes: number;
  subject_name?: string;
  topic_name?: string;
  notes?: string;
  user_id: number;
}

export interface PlanItem {
  subject: string;
  topic: string;
  scheduled_start: string;
  scheduled_end: string;
  duration_hours: number;
  priority_score: number;
  reason: string;
  study_strategy: string;
  pomodoros: number;
}

export interface PlanResponse {
  plan: PlanItem[];
  total_hours: number;
  study_style: string;
  ai_summary: string;
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('studyplanner_token');
    }
    return null;
  }

  public setToken(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('studyplanner_token', token);
    }
  }

  public clearToken() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('studyplanner_token');
    }
  }

  private async fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'An error occurred' }));
      throw new Error(err.detail || `HTTP Error ${res.status}`);
    }
    return res.json();
  }

  // Auth API
  async register(username: string, email: string, password: string) {
    return this.fetchWithAuth('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
  }

  async login(username: string, password: string) {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(err.detail || 'Login failed');
    }

    const data = await res.json();
    this.setToken(data.access_token);
    return data;
  }

  async getMe(): Promise<User> {
    return this.fetchWithAuth('/auth/me');
  }

  // Subjects API
  async getSubjects(): Promise<Subject[]> {
    return this.fetchWithAuth('/subjects/');
  }

  async analyzeSyllabus(file: File): Promise<{ subject: Subject; topics: Topic[] }> {
    const token = this.getToken();
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/subjects/analyze-syllabus`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to analyze syllabus' }));
      throw new Error(err.detail || 'Failed to analyze syllabus');
    }
    return res.json();
  }

  async createSubject(name: string): Promise<Subject> {
    return this.fetchWithAuth('/subjects/', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async deleteSubject(id: number) {
    return this.fetchWithAuth(`/subjects/${id}`, {
      method: 'DELETE',
    });
  }

  // Topics API
  async getTopics(): Promise<Topic[]> {
    return this.fetchWithAuth('/topics/');
  }

  async createTopic(data: { name: string; subject_id: number; difficulty: number; priority: number }): Promise<Topic> {
    return this.fetchWithAuth('/topics/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTopic(id: number, updates: Partial<Topic>): Promise<Topic> {
    return this.fetchWithAuth(`/topics/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteTopic(id: number) {
    return this.fetchWithAuth(`/topics/${id}`, {
      method: 'DELETE',
    });
  }

  // Exams / Academic Calendar API
  async getExams(): Promise<Exam[]> {
    return this.fetchWithAuth('/exams/');
  }

  async createExam(data: { title: string; date: string; event_type?: string; subject_id: number; notes?: string }): Promise<Exam> {
    return this.fetchWithAuth('/exams/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteExam(id: number) {
    return this.fetchWithAuth(`/exams/${id}`, {
      method: 'DELETE',
    });
  }

  // Sessions API
  async getSessions(): Promise<StudySession[]> {
    return this.fetchWithAuth('/sessions/');
  }

  async createSession(data: {
    start_time: string;
    end_time?: string;
    duration_minutes: number;
    subject_name?: string;
    topic_name?: string;
    notes?: string;
  }): Promise<StudySession> {
    return this.fetchWithAuth('/sessions/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // AI Plan Generator API
  async generatePlan(
    availableHours: number,
    studyStyle: string,
    subjectIds?: number[],
    topicIds?: number[],
    autoMode?: boolean,
    isQuickPlanner?: boolean,
    customInstructions?: string
  ): Promise<PlanResponse> {
    return this.fetchWithAuth('/plan/', {
      method: 'POST',
      body: JSON.stringify({
        available_hours: availableHours,
        study_style: studyStyle,
        subject_ids: subjectIds,
        topic_ids: topicIds,
        auto_mode: autoMode,
        is_quick_planner: isQuickPlanner,
        custom_instructions: customInstructions,
      }),
    });
  }
}

export const api = new ApiClient();



