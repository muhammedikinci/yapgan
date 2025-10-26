const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface Tag {
  id: string;
  name: string;
  created_at: string;
}

export interface Note {
  id: string;
  title: string;
  content_md: string;
  source_url?: string;
  tags?: string[];  // Note tags are strings
  is_public: boolean;
  public_slug?: string;
  view_count: number;
  shared_at?: string;
  created_at: string;
  updated_at: string;
}

export interface NotesResponse {
  notes: Note[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface SearchResult {
  note_id: string;
  title: string;
  score: number;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
}

export interface VectorPoint {
  note_id: string;
  title: string;
  vector: number[];
  tags?: string[];
  created_at: string;
}

export interface VectorSpaceResponse {
  points: VectorPoint[];
  total: number;
}

// ============================================================
// Version History Interfaces
// ============================================================

export interface NoteVersion {
  id: string;
  note_id: string;
  version_number: number;
  title: string;
  content_md: string;
  source_url?: string;
  tags: string[];
  change_summary?: string | null;  // Nullable
  chars_added: number;
  chars_removed: number;
  created_by: string;
  created_at: string;
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  line_num: number;
}

export interface VersionDiff {
  old_version: NoteVersion;
  new_version: NoteVersion;
  title_changed: boolean;
  content_diff: DiffLine[];
  tags_added: string[] | null;
  tags_removed: string[] | null;
}

export interface ListVersionsResponse {
  versions: NoteVersion[];
  total: number;
  current_version: number;
}

export interface RestoreVersionRequest {
  version_id: string;
}

export interface VectorSpaceResponse {
  points: VectorPoint[];
  total: number;
}

export interface LinkedNote {
  id: string;
  title: string;
}

export interface BacklinksResponse {
  backlinks: LinkedNote[];
  outlinks: LinkedNote[];
}

export interface GraphNode {
  id: string;
  title: string;
  group: number;
}

export interface GraphLink {
  source: string;
  target: string;
}

export interface GraphResponse {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface ShareNoteRequest {
  is_public: boolean;
}

export interface ShareNoteResponse {
  is_public: boolean;
  public_slug?: string;
  public_url?: string;
}

export interface PublicNoteResponse {
  id: string;
  title: string;
  content_md: string;
  source_url?: string;
  tags?: string[];
  view_count: number;
  shared_at?: string;
  created_at: string;
}

// Chat interfaces (Single-note conversations)
export interface Conversation {
  id: string;
  user_id: string;
  note_id: string;  // Each conversation is tied to a specific note
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ConversationResponse {
  conversation: Conversation;
  messages: ChatMessage[];
}

export interface ListConversationsResponse {
  conversations: Conversation[];
  total: number;
}

export interface CreateConversationRequest {
  note_id: string;  // Required: the note to chat about
  title?: string;
}

export interface SendMessageRequest {
  message: string;
}

export interface SendMessageResponse {
  response: string;
}

class ApiService {
  private token: string | null = null;
  private onUnauthorized?: () => void;

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  setUnauthorizedCallback(callback: () => void) {
    this.onUnauthorized = callback;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    console.log('API Request:', endpoint, options.method || 'GET');

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    console.log('API Response:', endpoint, response.status, response.statusText);

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken();
        if (this.onUnauthorized) {
          this.onUnauthorized();
        }
        throw new Error('Unauthorized');
      }
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      console.error('API Error:', endpoint, error);
      throw new Error(error.error || error.message || 'Request failed');
    }

    const data = await response.json();
    console.log('API Data:', endpoint, data);
    return data;
  }

  // Auth
  async login(email: string, password: string) {
    const response = await this.request<{ access_token: string; user: any }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
    this.setToken(response.access_token);
    return response;
  }

  async register(email: string, password: string) {
    const response = await this.request<{ access_token: string; user: any }>(
      '/api/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
    this.setToken(response.access_token);
    return response;
  }

  // Notes
  async getNotes(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    tags?: string[];
  }): Promise<NotesResponse> {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.tags) {
      params.tags.forEach(tag => searchParams.append('tags', tag));
    }

    const query = searchParams.toString();
    return this.request<NotesResponse>(`/api/notes${query ? `?${query}` : ''}`);
  }

  async getNote(id: string): Promise<Note> {
    return this.request<Note>(`/api/notes/${id}`);
  }

  async createNote(data: {
    title: string;
    content_md: string;
    source_url?: string;
    tags?: string[];
  }): Promise<Note> {
    return this.request<Note>('/api/notes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateNote(
    id: string,
    data: Partial<{
      title: string;
      content_md: string;
      source_url: string;
      tags: string[];
    }>
  ): Promise<Note> {
    return this.request<Note>(`/api/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteNote(id: string): Promise<void> {
    await this.request<void>(`/api/notes/${id}`, {
      method: 'DELETE',
    });
  }

  // Tags
  async getTags(): Promise<{ tags: Tag[] }> {
    return this.request<{ tags: Tag[] }>('/api/tags');
  }

  async deleteTag(id: string): Promise<{ message: string; notes_deleted: number }> {
    return this.request<{ message: string; notes_deleted: number }>(`/api/tags/${id}`, {
      method: 'DELETE',
    });
  }

  // Stats
  async getStats(): Promise<{ notes_count: number; tags_count: number }> {
    return this.request<{ notes_count: number; tags_count: number }>('/api/stats');
  }

  // Search
  async search(query: string, limit?: number): Promise<SearchResponse> {
    return this.request<SearchResponse>('/api/search', {
      method: 'POST',
      body: JSON.stringify({ query, limit: limit || 10 }),
    });
  }

  // Vector Space
  async getVectorSpace(limit?: number): Promise<VectorSpaceResponse> {
    const params = limit ? `?limit=${limit}` : '';
    return this.request<VectorSpaceResponse>(`/api/vector-space${params}`);
  }

  // Note Links & Graph
  async getBacklinks(noteId: string): Promise<BacklinksResponse> {
    return this.request<BacklinksResponse>(`/api/notes/${noteId}/backlinks`);
  }

  async getGraph(): Promise<GraphResponse> {
    return this.request<GraphResponse>('/api/graph');
  }

  // Public Sharing
  async shareNote(noteId: string, isPublic: boolean): Promise<ShareNoteResponse> {
    return this.request<ShareNoteResponse>(`/api/notes/${noteId}/share`, {
      method: 'POST',
      body: JSON.stringify({ is_public: isPublic }),
    });
  }

  async getPublicNote(slug: string): Promise<PublicNoteResponse> {
    // Public endpoint - no auth required
    const response = await fetch(`${API_BASE_URL}/public/${slug}`);
    if (!response.ok) {
      throw new Error('Note not found or not public');
    }
    return response.json();
  }

  // Chat methods (Single-note conversations)
  async createConversation(noteId: string, title?: string): Promise<Conversation> {
    return this.request<Conversation>('/api/chat/conversations', {
      method: 'POST',
      body: JSON.stringify({ 
        note_id: noteId, 
        title: title || 'Chat about note' 
      }),
    });
  }

  async listConversations(page: number = 1, perPage: number = 20): Promise<ListConversationsResponse> {
    return this.request<ListConversationsResponse>(`/api/chat/conversations?page=${page}&per_page=${perPage}`);
  }

  async getConversation(conversationId: string): Promise<ConversationResponse> {
    return this.request<ConversationResponse>(`/api/chat/conversations/${conversationId}`);
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await this.request(`/api/chat/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  }

  async sendMessage(conversationId: string, message: string): Promise<SendMessageResponse> {
    return this.request<SendMessageResponse>(`/api/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  // Send message with SSE streaming
  async sendMessageStream(
    conversationId: string,
    message: string,
    onChunk: (chunk: string) => void,
    onComplete: (noteIds: string[]) => void,
    onError: (error: string) => void
  ): Promise<void> {
    const token = this.getToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(`${API_BASE_URL}/api/chat/conversations/${conversationId}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;

          const dataStr = line.substring(6); // Remove 'data: ' prefix
          try {
            const data = JSON.parse(dataStr);

            if (data.error) {
              onError(data.error);
              return;
            }

            if (data.done) {
              onComplete(data.note_ids || []);
              return;
            }

            if (data.content) {
              onChunk(data.content);
            }
          } catch (e) {
            // Skip invalid JSON
            console.warn('Failed to parse SSE data:', e);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // ============================================================
  // Version History Methods
  // ============================================================

  async listVersions(noteId: string): Promise<ListVersionsResponse> {
    return this.request<ListVersionsResponse>(`/api/notes/${noteId}/versions`);
  }

  async getVersionDiff(noteId: string, v1: number, v2: number): Promise<VersionDiff> {
    return this.request<VersionDiff>(`/api/notes/${noteId}/versions/${v1}/diff/${v2}`);
  }

  async restoreVersion(noteId: string, versionId: string): Promise<Note> {
    return this.request<Note>(`/api/notes/${noteId}/restore`, {
      method: 'POST',
      body: JSON.stringify({ version_id: versionId }),
    });
  }
}

export const apiService = new ApiService();
