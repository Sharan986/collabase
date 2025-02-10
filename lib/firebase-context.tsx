"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db } from './firebase';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';

interface UserProfile {
  email: string;
  displayName: string;
  photoURL: string | null;
  profileCompleted: boolean;
  intent?: 'join' | 'create';
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  year?: string;
  course?: string;
  primarySkills?: string[];
  secondarySkills?: string[];
  role?: string;
  timeAvailability?: 'full-time' | 'partial';
  goal?: 'win' | 'learn' | 'build';
  externalLinks?: {
    github?: string;
    linkedin?: string;
    portfolio?: string;
    resumeUrl?: string;
  };
  currentTeam?: string | null;
  createdAt: number;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const ALLOWED_EMAIL_DOMAIN = '@arkajainuniversity.ac.in';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUserProfile = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data() as UserProfile);
      }
    } catch (error: any) {
      // Silently handle permission errors during profile fetch
      // This happens when Firestore rules haven't been updated yet
      if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
        // Don't log or show error - user needs to update Firestore rules
        return;
      }
      console.error('Error fetching user profile:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        await fetchUserProfile(user.uid);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Real-time listener for user profile changes (e.g., removal from team)
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const newProfile = snapshot.data() as UserProfile;
        const oldTeam = userProfile?.currentTeam;
        const newTeam = newProfile.currentTeam;

        // Detect removal from team
        if (oldTeam && !newTeam && pathname === '/dashboard') {
          toast.error('You were removed from your team');
          setTimeout(() => router.push('/matchmaking'), 2000);
        }

        setUserProfile(newProfile);
      }
    });

    return () => unsubscribe();
  }, [user, userProfile?.currentTeam, pathname, router]);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user.email;

      // Validate college email
      if (!email?.endsWith(ALLOWED_EMAIL_DOMAIN)) {
        // Delete the user from Firebase Auth before signing out
        await result.user.delete();
        toast.error(`Please sign in with your college email (${ALLOWED_EMAIL_DOMAIN})`, {
          duration: 5000,
        });
        return;
      }

      // Create or update user profile
      const userRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        // New user
        const newProfile: UserProfile = {
          email: result.user.email!,
          displayName: result.user.displayName || 'Anonymous',
          photoURL: result.user.photoURL,
          profileCompleted: false,
          currentTeam: null,
          createdAt: Date.now(),
        };
        await setDoc(userRef, newProfile);
        setUserProfile(newProfile);
        toast.success('Welcome to Collabase!');
        router.push('/onboarding');
      } else {
        const profile = userDoc.data() as UserProfile;
        setUserProfile(profile);
        toast.success('Signed in successfully!');
        // Redirect based on profile completion
        if (!profile.profileCompleted) {
          router.push('/onboarding');
        } else {
          router.push('/matchmaking');
        }
      }
    } catch (error: any) {
      // Silently ignore cancelled popup requests (user opened multiple popups)
      if (error.code === 'auth/cancelled-popup-request') {
        return;
      }
      
      // Silently ignore popup closed by user
      if (error.code === 'auth/popup-closed-by-user') {
        return;
      }
      
      // Handle specific Firebase auth errors with toasts
      if (error.code === 'auth/popup-blocked') {
        toast.error('Pop-up blocked. Please allow pop-ups for this site.', {
          duration: 5000,
        });
      } else if (error.code && error.code.startsWith('auth/')) {
        // Generic auth error, likely user cancelled
        return;
      } else if (error.message && !error.code) {
        toast.error(error.message);
      }
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUserProfile(null);
      toast.success('Signed out successfully');
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.uid);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signInWithGoogle, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
