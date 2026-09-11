import { useAuthStore } from '../store/auth';

export default function Login() {
  const { login, loading, error } = useAuthStore();

  return (
    <div className="max-w-md mx-auto mt-20 p-8 rounded-2xl bg-white dark:bg-gray-800/50 shadow-xl border border-gray-100 dark:border-gray-700">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-6" id="login-logo-container">
          <img 
            src="/assets/logo-dark.png" 
            alt="KASROLOGY" 
            className="hidden dark:block h-14 sm:h-16 w-auto max-w-[280px] object-contain"
            referrerPolicy="no-referrer"
            id="login-logo-dark"
          />
          <img 
            src="/assets/logo-light.png" 
            alt="KASROLOGY" 
            className="block dark:hidden h-14 sm:h-16 w-auto max-w-[280px] object-contain"
            referrerPolicy="no-referrer"
            id="login-logo-light"
          />
        </div>
        <h1 className="text-2xl font-bold mb-2">Welcome to KASROLOGY</h1>
        <p className="text-gray-500 dark:text-gray-400">Your ultimate medical question bank.</p>
      </div>
      
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={login}
        disabled={loading}
        className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary-dark text-white font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? 'Signing in...' : 'Sign in with Google'}
      </button>
    </div>
  );
}
