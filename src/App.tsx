import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import { auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

import Navbar from './components/Navbar';
import BackgroundDoodles from './components/BackgroundDoodles';
import Home from './pages/Home';
import Login from './pages/Login';
import Modules from './pages/Modules';

const ModuleDetails = lazy(() => import('./pages/ModuleDetails'));
const QuizEngine = lazy(() => import('./pages/QuizEngine'));
const Progress = lazy(() => import('./pages/Progress'));
const FolderDetails = lazy(() => import('./pages/FolderDetails'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const CompleteProfile = lazy(() => import('./pages/CompleteProfile'));
const StudentProfile = lazy(() => import('./pages/StudentProfile'));

export default function App() {
  const { user, sessionToken, syncUser, logout } = useAuthStore();
  const [authInitialized, setAuthInitialized] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const storedUser = useAuthStore.getState().user;
        const storedSession = useAuthStore.getState().sessionToken;
        if (!storedUser || !storedSession || storedUser.uid !== firebaseUser.uid) {
          await syncUser(firebaseUser);
        }
      } else {
        logout();
      }
      setAuthInitialized(true);
    });
    return () => unsubscribe();
  }, [syncUser, logout]);

  if (!authInitialized) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen transition-colors duration-300 relative">
        <BackgroundDoodles />
        <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />
        <main className="max-w-7xl mx-auto px-4 py-8 relative z-10">
          <Suspense fallback={
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          }>
            <Routes>
              <Route path="/" element={user && !user.profileCompleted ? <Navigate to="/complete-profile" /> : <Home />} />
              <Route path="/login" element={!user ? <Login /> : <Navigate to={user.profileCompleted ? "/modules" : "/complete-profile"} />} />
              <Route path="/complete-profile" element={user ? (!user.profileCompleted ? <CompleteProfile /> : <Navigate to="/modules" />) : <Navigate to="/login" />} />
              <Route path="/profile" element={user ? (user.profileCompleted ? <StudentProfile /> : <Navigate to="/complete-profile" />) : <Navigate to="/login" />} />
              <Route path="/modules" element={user ? (user.profileCompleted ? <Modules /> : <Navigate to="/complete-profile" />) : <Navigate to="/login" />} />
              <Route path="/modules/:id" element={user ? (user.profileCompleted ? <ModuleDetails /> : <Navigate to="/complete-profile" />) : <Navigate to="/login" />} />
              <Route path="/quiz/:quizId" element={user ? (user.profileCompleted ? <QuizEngine /> : <Navigate to="/complete-profile" />) : <Navigate to="/login" />} />
              <Route path="/progress" element={user ? (user.profileCompleted ? <Progress /> : <Navigate to="/complete-profile" />) : <Navigate to="/login" />} />
              <Route path="/folders/:id" element={user ? (user.profileCompleted ? <FolderDetails /> : <Navigate to="/complete-profile" />) : <Navigate to="/login" />} />
              <Route path="/admin" element={user ? (user.role === 'admin' ? (user.profileCompleted ? <AdminDashboard /> : <Navigate to="/complete-profile" />) : <Navigate to="/modules" />) : <Navigate to="/login" />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  );
}
