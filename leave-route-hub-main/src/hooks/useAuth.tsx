import { createContext, useContext, useEffect, useState } from 'react';
import { AuthUser, getAuthUser, clearAuth } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: AuthUser | null;
  profile: AuthUser | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role: string, department?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing auth on mount
    const authUser = getAuthUser();
    if (authUser) {
      setUser(authUser);
      setProfile(authUser);
      // Redirect based on role
      if (authUser.role === 'student') {
        navigate('/student');
      } else if (authUser.role === 'advisor') {
        navigate('/advisor');
      } else if (authUser.role === 'hod') {
        navigate('/hod');
      }
    }
    setLoading(false);
  }, [navigate]);


  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: string,
    department?: string
  ) => {
    try {
      const response = await apiClient.signUp({
        email,
        password,
        full_name: fullName,
        role,
        department
      });
      
      const { user: userData, token } = response;
      
      // Store auth data
      const authUser: AuthUser = {
        id: userData._id,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        department: userData.department
      };

      // Update local storage and state
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(authUser));
      
      setUser(authUser);
      setProfile(authUser);
      
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await apiClient.signIn({ email, password });
      const { user: userData, token } = response;
      
      // Store auth data
      const authUser: AuthUser = {
        id: userData._id,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        department: userData.department
      };

      // Update local storage and state
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(authUser));
      
      setUser(authUser);
      setProfile(authUser);
      
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = async () => {
    clearAuth();
    setUser(null);
    setProfile(null);
    navigate('/');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
