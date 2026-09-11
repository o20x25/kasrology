import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Unlock, CreditCard, Clock } from 'lucide-react';
import { fetchApi } from '../lib/api';
import SubscribeModal from '../components/SubscribeModal';

interface Module {
  id: number;
  title: string;
  description: string;
  imageUrl?: string;
  price: number;
  durationType?: string;
  durationDays?: number | null;
  isSubscribed: boolean;
}

export default function Modules() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);

  const loadModules = () => {
    fetchApi('/api/modules')
      .then(data => {
        setModules(data);
        setLoading(false);
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadModules();
  }, []);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Modules</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Access your enrolled clinical modules and question banks.</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-80 rounded-2xl bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 p-6 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map(mod => (
            <div key={mod.id} className="rounded-2xl overflow-hidden bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow flex flex-col justify-between">
              <div>
                {mod.imageUrl && (
                  <div className="h-48 w-full relative">
                    <img src={mod.imageUrl} alt={mod.title} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                    <div className="absolute bottom-2 left-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-black/60 text-white backdrop-blur-xs">
                        <Clock size={11} className="text-primary" />
                        {mod.durationType === 'fixed' ? `Fixed: ${mod.durationDays || 30} Days` : 'Open Access'}
                      </span>
                    </div>
                  </div>
                )}
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-semibold">{mod.title}</h2>
                    {mod.isSubscribed ? <Unlock className="text-primary" /> : <Lock className="text-gray-400" />}
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 mb-6 min-h-[48px] line-clamp-3">{mod.description || 'No description available.'}</p>
                </div>
              </div>

              <div className="p-6 pt-0">
                {mod.isSubscribed ? (
                  <Link to={`/modules/${mod.id}`} className="block w-full py-2.5 text-center rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium">
                    Enter Module
                  </Link>
                ) : (
                  <button 
                    onClick={() => setSelectedModule(mod)}
                    className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <CreditCard size={18} />
                    <span>Subscribe - {mod.price > 0 ? `${mod.price} EGP` : 'Free'}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <SubscribeModal
        module={selectedModule}
        isOpen={Boolean(selectedModule)}
        onClose={() => setSelectedModule(null)}
        onSuccess={() => {
          loadModules();
        }}
      />
    </div>
  );
}
