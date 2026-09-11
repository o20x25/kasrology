import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { Sun, Moon, LogOut, BookOpen, BarChart, ShieldAlert, User } from 'lucide-react';

export default function Navbar({ darkMode, setDarkMode }: { darkMode: boolean, setDarkMode: (d: boolean) => void }) {
  const { user, logout } = useAuthStore();

  return (
    <nav className="border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-[#1A2327]/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 py-1 group" id="navbar-brand-link">
          {/* Theme-aware logo with automatic switching */}
          <img 
            src="/assets/logo-dark.png" 
            alt="KASROLOGY" 
            className="hidden dark:block h-9 sm:h-10 w-auto max-h-10 object-contain"
            referrerPolicy="no-referrer"
            id="navbar-logo-dark"
          />
          <img 
            src="/assets/logo-light.png" 
            alt="KASROLOGY" 
            className="block dark:hidden h-9 sm:h-10 w-auto max-h-10 object-contain"
            referrerPolicy="no-referrer"
            id="navbar-logo-light"
          />
        </Link>
        
        <div className="flex items-center gap-4 sm:gap-6">
          <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">
            Home
          </Link>
          {user && (
            <>
              {user.role === 'admin' && (
                <Link to="/admin" className="flex items-center gap-1.5 hover:text-primary transition-colors text-orange-500 font-medium text-sm">
                  <ShieldAlert size={18} />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}
              <Link to="/modules" className="flex items-center gap-1.5 hover:text-primary transition-colors text-sm">
                <BookOpen size={18} />
                <span className="hidden sm:inline">Modules</span>
              </Link>
              <Link to="/progress" className="flex items-center gap-1.5 hover:text-primary transition-colors text-sm">
                <BarChart size={18} />
                <span className="hidden sm:inline">Progress</span>
              </Link>
              <Link to="/profile" className="flex items-center gap-1.5 hover:text-primary transition-colors text-sm">
                <User size={18} />
                <span className="hidden sm:inline">My Profile</span>
              </Link>
            </>
          )}
          
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Toggle Theme"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          {user ? (
            <button 
              onClick={logout}
              title="Sign Out"
              className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-red-500"
            >
              <LogOut size={20} />
            </button>
          ) : (
            <Link
              to="/login"
              id="navbar-signin-btn"
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm font-semibold transition-colors shadow-xs"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
