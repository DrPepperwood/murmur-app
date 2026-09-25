// hooks/useAuth.js
//
// Replaces the `authed` boolean + fake handleAuth() in murmur.jsx with a
// real session. `user` is null while signed out; `profile` is the matching
// profiles row (name, handle, bio, avatar, verified, ...) once signed in.

import { useEffect, useState, useCallback } from "react";
import { onAuthChange, signUp, logIn, logOut, fetchProfile, updateProfile as apiUpdateProfile } from "../lib/api/auth";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true); // true until we know signed-in/out for sure

  useEffect(() => {
    const unsubscribe = onAuthChange(async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        try {
          setProfile(await fetchProfile(nextUser.id));
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleSignUp = useCallback(async ({ name, email, password }) => {
    await signUp({ name, email, password });
    // onAuthChange fires automatically once the session is established.
  }, []);

  const handleLogIn = useCallback(async ({ email, password }) => {
    await logIn({ email, password });
  }, []);

  const handleLogOut = useCallback(async () => {
    await logOut();
  }, []);

  const saveProfile = useCallback(
    async (updates) => {
      if (!user) return;
      const updated = await apiUpdateProfile(user.id, updates);
      setProfile(updated);
    },
    [user]
  );

  return {
    user,           // Supabase auth user (id, email) or null
    profile,        // profiles row for the current user, or null
    authLoading,    // true until the initial session check resolves
    authed: !!user,
    signUp: handleSignUp,
    logIn: handleLogIn,
    logOut: handleLogOut,
    saveProfile,
  };
}
