import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/types/roles";
import { fetchUserRoles, upsertUserRole, signInWithPassword, signUpWithEmail, signOutUser } from "@/services/authService";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUserRole: (role: AppRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const ROLE_PRIORITY: AppRole[] = ["admin", "doctor", "support", "patient"];

  const fetchRole = async (userId: string) => {
    const data = await fetchUserRoles(userId);
    if (data.length > 0) {
      const roles = data.map((d) => d.role as AppRole);
      const best = ROLE_PRIORITY.find((r) => roles.includes(r)) ?? roles[0];
      setRole(best);
    } else {
      setRole(null);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchRole(session.user.id), 0);
        } else {
          setRole(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithPassword(email, password);
  };

  const signUp = async (email: string, password: string, fullName: string, phone?: string) => {
    await signUpWithEmail(email, password, fullName, phone);
  };

  const signOut = async () => {
    await signOutUser();
    setRole(null);
  };

  const setUserRole = async (newRole: AppRole) => {
    if (!user) throw new Error("Not authenticated");
    await upsertUserRole(user.id, newRole);
    setRole(newRole);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signIn, signUp, signOut, setUserRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}