'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const signInWithGoogle = async () => {
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-5">
      <div className="max-w-md w-full">
        <div className="mb-12">
          <h1 className="display-font text-6xl font-extrabold tracking-tight text-stone-900 mb-2">
            intake.
          </h1>
          <p className="text-xs uppercase tracking-widest text-stone-500">
            set. track. achieve.
          </p>
        </div>

        <div className="mb-8">
          <p className="text-sm text-stone-600 leading-relaxed mb-2">
            Honest calorie and macro tracking with photo recognition.
          </p>
          <p className="text-xs text-stone-500 leading-relaxed">
            Sign in to sync your data across devices. Your data is yours — no ads, no selling.
          </p>
        </div>

        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full bg-stone-900 text-stone-50 py-4 text-xs uppercase tracking-widest font-semibold hover:bg-stone-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-3 rounded-sm"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Signing in...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </>
          )}
        </button>

        {error && (
          <div className="mt-4 p-3 border-l-2 border-red-600 bg-red-50 text-sm text-red-900 rounded-sm">
            {error}
          </div>
        )}

        <p className="mt-8 text-xs text-stone-400 text-center">
          By continuing, you agree to keep tracking honest.
        </p>
      </div>
    </div>
  );
}
