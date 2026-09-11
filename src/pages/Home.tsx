import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { fetchApi } from '../lib/api';
import SubscribeModal from '../components/SubscribeModal';
import { 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  Unlock, 
  Lock, 
  CreditCard,
  GraduationCap
} from 'lucide-react';

interface Module {
  id: number;
  title: string;
  description: string;
  imageUrl?: string;
  price: number;
  durationType?: string;
  durationDays?: number | null;
  isSubscribed?: boolean;
}

export default function Home() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModuleForSub, setSelectedModuleForSub] = useState<Module | null>(null);

  const loadModules = () => {
    // Calling fetchApi with requireAuth = false to allow public guest access
    fetchApi('/api/modules', {}, false)
      .then((data: Module[]) => {
        setModules(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load modules:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadModules();
  }, [user]);

  const scrollToModules = () => {
    const el = document.getElementById('modules-grid');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCardAction = (mod: Module) => {
    if (!user) {
      // Unauthenticated visitor -> go to login
      navigate('/login');
      return;
    }

    if (mod.isSubscribed) {
      navigate(`/modules/${mod.id}`);
    } else {
      setSelectedModuleForSub(mod);
    }
  };

  return (
    <div className="space-y-16 sm:space-y-24 pb-16" id="home-page-container">
      {/* Hero Section */}
      <section 
        className="relative pt-6 sm:pt-12 pb-12 sm:pb-16 text-center max-w-4xl mx-auto px-4 overflow-hidden"
        id="home-hero-section"
      >
        {/* Subtle background ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-96 h-72 sm:h-96 bg-primary/10 dark:bg-primary/15 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Hero Content */}
        <div className="relative z-10">

        {/* Logo Container with Theme Switching & Subtle Float */}
        <div className="flex justify-center mb-8 animate-fade-in-up" id="home-logo-wrapper">
          <div className="p-3 rounded-3xl bg-white/70 dark:bg-gray-800/60 backdrop-blur-xs border border-gray-200/70 dark:border-gray-700/60 shadow-lg shadow-teal-900/5">
            <img 
              src="/assets/logo-dark.png" 
              alt="KASROLOGY" 
              className="hidden dark:block h-16 sm:h-20 md:h-24 w-auto max-h-24 object-contain transition-transform duration-300 hover:scale-105"
              referrerPolicy="no-referrer"
              id="home-hero-logo-dark"
            />
            <img 
              src="/assets/logo-light.png" 
              alt="KASROLOGY" 
              className="block dark:hidden h-16 sm:h-20 md:h-24 w-auto max-h-24 object-contain transition-transform duration-300 hover:scale-105"
              referrerPolicy="no-referrer"
              id="home-hero-logo-light"
            />
          </div>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/80 text-teal-800 dark:text-teal-300 text-xs sm:text-sm font-semibold mb-6 animate-fade-in-up delay-100">
          <Sparkles size={16} className="text-primary animate-pulse" />
          <span>The Next-Gen Medical Question Bank</span>
        </div>

        {/* Welcome Text (Headline & 2-3 sentence description) */}
        <h1 
          className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6 leading-tight animate-fade-in-up delay-200"
          id="home-hero-heading"
        >
          Master Your Medical Exams with <span className="text-primary">KASROLOGY</span>
        </h1>
        
        <p 
          className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed font-normal animate-fade-in-up delay-300"
          id="home-hero-description"
        >
          KASROLOGY is the premier medical education platform crafted specifically for Kasr Al-Ainy university medical students. 
          We empower you to conquer exams through rigorous, high-yield clinical question banks, realistic mock tests, and smart mistake tracking designed to maximize your academic score.
        </p>

        {/* CTA Buttons */}
        <div 
          className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-400"
          id="home-hero-actions"
        >
          {user ? (
            <Link
              to="/modules"
              id="cta-my-modules-btn"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-teal-700/20 hover:shadow-teal-700/30 hover:-translate-y-0.5"
            >
              <span>Go to My Modules</span>
              <ArrowRight size={18} />
            </Link>
          ) : (
            <Link
              to="/login"
              id="cta-get-started-btn"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-teal-700/20 hover:shadow-teal-700/30 hover:-translate-y-0.5"
            >
              <span>Get Started</span>
              <ArrowRight size={18} />
            </Link>
          )}

          <button
            onClick={scrollToModules}
            id="cta-browse-modules-btn"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1A2327] hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2 hover:-translate-y-0.5"
          >
            <BookOpen size={18} className="text-primary" />
            <span>Browse Modules</span>
          </button>
        </div>

        {/* Micro-Features Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 pt-8 border-t border-gray-200/80 dark:border-gray-800/80 text-left">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/40 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800">
            <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-primary flex items-center justify-center shrink-0">
              <GraduationCap size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900 dark:text-white">Curated Medical MCQs</div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">High-yield Kasr Al-Ainy topics</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/40 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800">
            <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-primary flex items-center justify-center shrink-0">
              <Clock size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900 dark:text-white">Study & Mock Modes</div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">Timed exams & instant explanations</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/40 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800">
            <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-primary flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900 dark:text-white">Secure Device Access</div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">Anti-screenshot & progress tracking</div>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* Available Modules Section */}
      <section id="modules-grid" className="scroll-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4 border-b border-gray-200/80 dark:border-gray-800/80 pb-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
              Course Catalog
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Available Modules
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Select any module below to start practicing or subscribe for complete question access.
            </p>
          </div>

          {user && (
            <Link 
              to="/modules" 
              className="text-xs sm:text-sm font-semibold text-primary hover:text-primary-dark transition-colors flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>View full student workspace</span>
              <ArrowRight size={15} />
            </Link>
          )}
        </div>

        {/* Modules Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div 
                key={n} 
                className="h-80 rounded-2xl bg-white dark:bg-[#1A2327] border border-gray-100 dark:border-gray-800 p-6 animate-pulse flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                  <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded-sm w-3/4" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-sm w-full" />
                </div>
                <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-xl w-full mt-4" />
              </div>
            ))}
          </div>
        ) : modules.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-2xl bg-white dark:bg-[#1A2327] border border-gray-200 dark:border-gray-800">
            <BookOpen size={48} className="mx-auto text-gray-400 mb-3" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              No Modules Available Currently
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              Please check back soon as our medical academic team is preparing new courses.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {modules.map((mod) => (
              <div 
                key={mod.id} 
                id={`module-card-${mod.id}`}
                className="group rounded-2xl overflow-hidden bg-white dark:bg-[#1A2327] border border-gray-200/80 dark:border-gray-800 hover:border-teal-500/50 dark:hover:border-teal-500/50 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Cover Image */}
                  <div className="relative h-48 sm:h-52 w-full bg-gray-100 dark:bg-gray-800/80 overflow-hidden">
                    {mod.imageUrl ? (
                      <img 
                        src={mod.imageUrl} 
                        alt={mod.title} 
                        loading="lazy" 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-4">
                        <BookOpen size={40} className="stroke-1 mb-2 text-primary/60" />
                        <span className="text-xs uppercase tracking-wider font-medium">Medical Module</span>
                      </div>
                    )}

                    {/* Subscription Status Badge */}
                    <div className="absolute top-3 right-3">
                      {mod.isSubscribed ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500 text-white shadow-md">
                          <CheckCircle2 size={13} />
                          Enrolled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-black/60 text-white backdrop-blur-xs shadow-md">
                          <Lock size={12} />
                          {mod.price > 0 ? `${mod.price} EGP` : 'Free'}
                        </span>
                      )}
                    </div>

                    {/* Duration Badge */}
                    <div className="absolute bottom-3 left-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-white/90 dark:bg-gray-900/90 text-gray-800 dark:text-gray-200 backdrop-blur-xs shadow-xs">
                        <Clock size={12} className="text-primary" />
                        {mod.durationType === 'fixed'
                          ? `Fixed: ${mod.durationDays || 30} Days`
                          : 'Open Access'}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-snug group-hover:text-primary transition-colors">
                        {mod.title}
                      </h3>
                      {mod.isSubscribed ? (
                        <Unlock size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <Lock size={18} className="text-gray-400 dark:text-gray-500 shrink-0 mt-0.5" />
                      )}
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4 leading-relaxed min-h-[60px]">
                      {mod.description || 'Comprehensive clinical modules containing high-yield medical question pools, quizzes, and mock exams.'}
                    </p>
                  </div>
                </div>

                {/* Card Footer with Price & Button */}
                <div className="px-6 pb-6 pt-2 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                      Access Fee
                    </div>
                    <div className="text-base font-bold text-gray-900 dark:text-white">
                      {mod.price > 0 ? `${mod.price} EGP` : 'Free'}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div>
                    {mod.isSubscribed ? (
                      <button
                        onClick={() => handleCardAction(mod)}
                        id={`enter-module-btn-${mod.id}`}
                        className="px-5 py-2 rounded-xl bg-teal-50 dark:bg-teal-950/70 hover:bg-teal-100 dark:hover:bg-teal-900/80 text-primary dark:text-teal-300 font-semibold text-sm transition-colors flex items-center gap-1.5"
                      >
                        <span>Enter Module</span>
                        <ArrowRight size={15} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCardAction(mod)}
                        id={`subscribe-module-btn-${mod.id}`}
                        className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-sm transition-colors flex items-center gap-1.5 shadow-sm hover:shadow-md"
                      >
                        <CreditCard size={15} />
                        <span>Subscribe</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Subscription Modal for logged-in users */}
      <SubscribeModal 
        module={selectedModuleForSub}
        isOpen={Boolean(selectedModuleForSub)}
        onClose={() => setSelectedModuleForSub(null)}
        onSuccess={() => {
          loadModules();
        }}
      />
    </div>
  );
}
