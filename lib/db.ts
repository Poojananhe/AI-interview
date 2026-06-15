import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Initialize Supabase if credentials are provided
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  created_at: string;
}

export interface RegisteredUser extends UserProfile {
  password?: string;
}

export interface InterviewSession {
  id: string;
  user_id?: string;
  domain: string;
  difficulty: string;
  section?: number;
  overall_score?: number;
  status: 'in-progress' | 'completed';
  created_at: string;
}

export interface SessionAnswer {
  id: string;
  session_id: string;
  question_text: string;
  question_type: string; // 'Technical' | 'Behavioral' | 'Situational' etc.
  user_answer: string;
  communication_score: number;
  technical_score: number;
  tone_score: number;
  overall_score: number;
  strength: string;
  improvement: string;
  example_answer: string;
  created_at: string;
}

// Client-side LocalStorage DB Mock
class LocalStorageDB {
  private isClient = typeof window !== 'undefined';

  private get<T>(key: string, defaultValue: T): T {
    if (!this.isClient) return defaultValue;
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  }

  private set<T>(key: string, value: T): void {
    if (!this.isClient) return;
    localStorage.setItem(key, JSON.stringify(value));
  }

  // Auth
  getCurrentUser(): UserProfile | null {
    return this.get<UserProfile | null>('weintern_user', null);
  }

  setCurrentUser(user: UserProfile | null): void {
    this.set('weintern_user', user);
  }

  getRegisteredUsers(): RegisteredUser[] {
    return this.get<RegisteredUser[]>('weintern_registered_users', []);
  }

  saveRegisteredUser(user: RegisteredUser): void {
    const users = this.getRegisteredUsers();
    users.push(user);
    this.set('weintern_registered_users', users);
  }

  updateRegisteredUser(email: string, updates: Partial<RegisteredUser>): void {
    const users = this.getRegisteredUsers();
    const idx = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...updates };
      this.set('weintern_registered_users', users);
    }
  }

  // Sessions
  getSessions(): InterviewSession[] {
    const sessions = this.get<InterviewSession[]>('weintern_sessions', []);
    return sessions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getSession(id: string): InterviewSession | undefined {
    return this.getSessions().find(s => s.id === id);
  }

  createSession(domain: string, difficulty: string, section: number = 1): InterviewSession {
    const user = this.getCurrentUser();
    const newSession: InterviewSession = {
      id: crypto.randomUUID(),
      user_id: user?.id,
      domain,
      difficulty,
      section,
      status: 'in-progress',
      created_at: new Date().toISOString()
    };
    const sessions = this.getSessions();
    sessions.push(newSession);
    this.set('weintern_sessions', sessions);
    return newSession;
  }

  updateSession(id: string, updates: Partial<InterviewSession>): InterviewSession | null {
    const sessions = this.getSessions();
    const idx = sessions.findIndex(s => s.id === id);
    if (idx === -1) return null;
    sessions[idx] = { ...sessions[idx], ...updates };
    this.set('weintern_sessions', sessions);
    return sessions[idx];
  }

  // Answers
  getAnswers(sessionId: string): SessionAnswer[] {
    const answers = this.get<SessionAnswer[]>('weintern_answers', []);
    return answers.filter(a => a.session_id === sessionId);
  }

  saveAnswer(answer: Omit<SessionAnswer, 'id' | 'created_at'>): SessionAnswer {
    const newAnswer: SessionAnswer = {
      ...answer,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    const answers = this.get<SessionAnswer[]>('weintern_answers', []);
    answers.push(newAnswer);
    this.set('weintern_answers', answers);
    return newAnswer;
  }

  updateUserProfile(updates: Partial<UserProfile>): UserProfile | null {
    const user = this.getCurrentUser();
    if (!user) return null;
    const updated = { ...user, ...updates };
    this.setCurrentUser(updated);
    return updated;
  }
}

const localDB = new LocalStorageDB();

export const dbService = {
  isSupabaseEnabled: () => !!supabase,

  // Auth Methods
  async getCurrentUser(): Promise<UserProfile | null> {
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      // Fetch profile data from users table
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
        
      return profile || {
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata.full_name || 'Guest User',
        avatar_url: user.user_metadata.avatar_url,
        created_at: user.created_at
      };
    }
    return localDB.getCurrentUser();
  },

  async loginWithEmail(email: string, password?: string): Promise<UserProfile> {
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password: password || 'password123' 
      });
      if (error) throw error;
      
      // Fetch profile data from users table
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();
        
      return profile || {
        id: data.user.id,
        email: data.user.email || '',
        full_name: data.user.user_metadata.full_name || 'User',
        avatar_url: data.user.user_metadata.avatar_url,
        created_at: data.user.created_at
      };
    } else {
      // Local storage auth simulation
      const users = localDB.getRegisteredUsers();
      const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (!existingUser) {
        throw new Error('No account found with this email. Please sign up first.');
      }
      
      if (password && existingUser.password !== password) {
        throw new Error('Invalid email or password.');
      }
      
      const profile: UserProfile = {
        id: existingUser.id,
        email: existingUser.email,
        full_name: existingUser.full_name,
        avatar_url: existingUser.avatar_url,
        created_at: existingUser.created_at
      };
      localDB.setCurrentUser(profile);
      return profile;
    }
  },

  async signUpWithEmail(email: string, password?: string, fullName?: string): Promise<UserProfile> {
    const finalName = fullName || email.split('@')[0].toUpperCase();
    const finalPassword = password || 'password123';

    if (supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: finalPassword,
        options: {
          data: {
            full_name: finalName
          }
        }
      });
      if (error) throw error;
      if (!data.user) throw new Error('Sign up failed');

      // Create record in users table
      const profile: UserProfile = {
        id: data.user.id,
        email: data.user.email || '',
        full_name: finalName,
        created_at: data.user.created_at
      };

      await supabase.from('users').insert([{
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name
      }]);

      return profile;
    } else {
      const users = localDB.getRegisteredUsers();
      const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (existingUser) {
        throw new Error('Email address already registered. Please login instead.');
      }

      const newUser = {
        id: 'user_local_' + Math.random().toString(36).substring(2, 9),
        email: email.trim(),
        password: finalPassword,
        full_name: finalName,
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(finalName)}`,
        created_at: new Date().toISOString()
      };
      
      localDB.saveRegisteredUser(newUser);
      
      const profile: UserProfile = {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        avatar_url: newUser.avatar_url,
        created_at: newUser.created_at
      };
      localDB.setCurrentUser(profile);
      return profile;
    }
  },

  async logout(): Promise<void> {
    if (supabase) {
      await supabase.auth.signOut();
    } else {
      localDB.setCurrentUser(null);
    }
  },

  async resetPassword(email: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/login/reset-password',
      });
      if (error) throw error;
    } else {
      // Local Storage simulation
      const users = localDB.getRegisteredUsers();
      const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!existingUser) {
        throw new Error('No registered account found with this email.');
      }
      // Set reset email in local storage for simulation
      if (typeof window !== 'undefined') {
        localStorage.setItem('weintern_reset_email', existingUser.email);
      }
    }
  },

  async updatePassword(password: string): Promise<void> {
    if (supabase) {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    } else {
      // Local Storage simulation
      const currentUser = await this.getCurrentUser();
      let resetEmail = '';
      if (typeof window !== 'undefined') {
        resetEmail = localStorage.getItem('weintern_reset_email') || '';
      }

      const targetEmail = currentUser?.email || resetEmail;

      if (!targetEmail) {
        throw new Error('No active reset session or logged-in user.');
      }

      localDB.updateRegisteredUser(targetEmail, { password });

      // Update current session profile if they are logged-in and active
      if (currentUser && currentUser.email.toLowerCase() === targetEmail.toLowerCase()) {
        window.dispatchEvent(new Event('user-profile-updated'));
      }
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('weintern_reset_email');
      }
    }
  },

  // Sessions Methods
  async getSessions(): Promise<InterviewSession[]> {
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sessions:', error);
        return [];
      }
      return data || [];
    }
    return localDB.getSessions();
  },

  async getSession(id: string): Promise<InterviewSession | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching session:', error);
        return null;
      }
      return data;
    }
    return localDB.getSession(id) || null;
  },

  async createSession(domain: string, difficulty: string, section: number = 1): Promise<InterviewSession> {
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      const newSession = {
        id: crypto.randomUUID(),
        user_id: user?.id || null,
        domain,
        difficulty,
        section,
        status: 'in-progress',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('sessions')
        .insert([newSession])
        .select()
        .single();

      if (error) throw error;
      return data;
    }
    return localDB.createSession(domain, difficulty, section);
  },

  async completeSession(id: string, overallScore: number): Promise<InterviewSession | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from('sessions')
        .update({ status: 'completed', overall_score: overallScore })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }
    return localDB.updateSession(id, { status: 'completed', overall_score: overallScore });
  },

  // Answers Methods
  async getAnswers(sessionId: string): Promise<SessionAnswer[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from('session_answers')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching answers:', error);
        return [];
      }
      return data || [];
    }
    return localDB.getAnswers(sessionId);
  },

  async saveAnswer(answer: Omit<SessionAnswer, 'id' | 'created_at'>): Promise<SessionAnswer> {
    if (supabase) {
      const newAnswer = {
        id: crypto.randomUUID(),
        ...answer,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('session_answers')
        .insert([newAnswer])
        .select()
        .single();

      if (error) throw error;
      return data;
    }
    return localDB.saveAnswer(answer);
  },

  async updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile | null> {
    let updatedProfile: UserProfile | null = null;
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { error } = await supabase
        .from('users')
        .update({
          full_name: updates.full_name,
          avatar_url: updates.avatar_url
        })
        .eq('id', user.id)
        .select()
        .single();
        
      if (error) {
        // Fallback to update user metadata directly if users table is not writable
        await supabase.auth.updateUser({
          data: {
            full_name: updates.full_name,
            avatar_url: updates.avatar_url
          }
        });
      }
      updatedProfile = {
        id: user.id,
        email: user.email || '',
        full_name: updates.full_name || '',
        avatar_url: updates.avatar_url,
        created_at: user.created_at
      };
    } else {
      updatedProfile = localDB.updateUserProfile(updates);
    }
    
    if (updatedProfile && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('user-profile-updated'));
    }
    return updatedProfile;
  }
};
