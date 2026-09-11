import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchApi } from '../lib/api';
import { FolderHeart, AlertTriangle, BookOpen, RefreshCw, TrendingUp, Award, Flame, Star, Zap, ShieldCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { motion } from 'motion/react';

export default function Progress() {
  const navigate = useNavigate();
  const [mistakes, setMistakes] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [retaking, setRetaking] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchApi('/api/mistakes').then(setMistakes),
      fetchApi('/api/folders').then(setFolders),
      fetchApi('/api/progress/stats').then(setStats)
    ]).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleRetakeMistakes = async (questionIds?: number[]) => {
    try {
      setRetaking(true);
      const res = await fetchApi('/api/mistakes/retake', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds })
      });
      // Clear cache for this new quiz so it doesn't load a stale state
      localStorage.removeItem(`kasrology_quiz_${res.quizId}`);
      navigate(`/quiz/${res.quizId}`);
    } catch (e) {
      alert('Failed to start quiz');
      setRetaking(false);
    }
  };

  // Process stats for charts
  const moduleData = Object.values(stats.reduce((acc: any, curr: any) => {
    if (!acc[curr.moduleTitle]) {
      acc[curr.moduleTitle] = { name: curr.moduleTitle, totalScore: 0, count: 0 };
    }
    acc[curr.moduleTitle].totalScore += curr.score;
    acc[curr.moduleTitle].count += 1;
    return acc;
  }, {})).map((m: any) => ({
    name: m.name,
    averageScore: Math.round(m.totalScore / m.count)
  }));

  const trendData = Object.values(stats.reduce((acc: any, curr: any) => {
    const date = new Date(curr.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    if (!acc[date]) {
      acc[date] = { date, totalScore: 0, count: 0 };
    }
    acc[date].totalScore += curr.score;
    acc[date].count += 1;
    return acc;
  }, {})).map((d: any) => ({
    date: d.date,
    averageScore: Math.round(d.totalScore / d.count)
  }));

  const overallAverage = stats.length > 0 
    ? Math.round(stats.reduce((acc, curr) => acc + curr.score, 0) / stats.length)
    : 0;

  // Streak Calculation
  const calculateStreak = () => {
    if (stats.length === 0) return 0;
    
    // Get unique dates (normalized to start of day)
    const activeDates = Array.from(new Set(stats.map(s => {
      const d = new Date(s.submittedAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }))).sort((a: number, b: number) => b - a);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let streak = 0;
    let checkDate = today.getTime();
    
    // If the latest activity is neither today nor yesterday, streak is broken (0)
    if (activeDates.length > 0 && activeDates[0] !== today.getTime() && activeDates[0] !== yesterday.getTime()) {
      return 0;
    }
    
    // If latest is yesterday, start checking from yesterday
    if (activeDates.length > 0 && activeDates[0] === yesterday.getTime()) {
      checkDate = yesterday.getTime();
    }

    for (const date of activeDates) {
      if (date === checkDate) {
        streak++;
        // move check date back 1 day
        checkDate -= 86400000;
      } else {
        break;
      }
    }
    return streak;
  };

  const currentStreak = calculateStreak();

  // Badges logic
  const badges = [
    {
      id: 'first_quiz',
      title: 'First Step',
      description: 'Completed your first quiz.',
      icon: <Star size={24} />,
      unlocked: stats.length > 0,
      color: 'text-yellow-500',
      bg: 'bg-yellow-50 dark:bg-yellow-500/10'
    },
    {
      id: 'top_scorer',
      title: 'Top Scorer',
      description: 'Achieved 100% on a regular quiz.',
      icon: <Zap size={24} />,
      unlocked: stats.some(s => s.score === 100 && s.mode !== 'study'),
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-500/10'
    },
    {
      id: 'mistake_crusher',
      title: 'Mistake Crusher',
      description: 'Perfect score on a mistake review.',
      icon: <ShieldCheck size={24} />,
      unlocked: stats.some(s => s.score === 100 && s.mode === 'study'),
      color: 'text-green-500',
      bg: 'bg-green-50 dark:bg-green-500/10'
    },
    {
      id: 'consistent_scholar',
      title: 'Consistent Scholar',
      description: 'Maintained a 3-day study streak.',
      icon: <Flame size={24} />,
      unlocked: currentStreak >= 3,
      color: 'text-orange-500',
      bg: 'bg-orange-50 dark:bg-orange-500/10'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  if (loading) return <div className="text-center py-20">Loading progress...</div>;

  return (
    <motion.div 
      className="max-w-4xl mx-auto space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.h1 variants={itemVariants} className="text-3xl font-bold mb-8">My Progress</motion.h1>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Streak Card */}
        <div className="bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl p-6 text-white shadow-md flex flex-col justify-center items-center text-center">
          <Flame size={48} className="mb-3 opacity-90" />
          <h2 className="text-4xl font-extrabold mb-1">{currentStreak}</h2>
          <p className="font-medium text-orange-100 uppercase tracking-wide text-sm">Day Streak</p>
        </div>

        {/* Badges List */}
        <div className="md:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Award className="text-primary" />
            Achievements
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {badges.map(badge => (
              <div 
                key={badge.id} 
                className={`flex gap-3 p-3 rounded-xl border transition-all ${badge.unlocked ? `border-transparent ${badge.bg}` : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60 grayscale'}`}
              >
                <div className={`shrink-0 flex items-center justify-center w-12 h-12 rounded-full ${badge.unlocked ? 'bg-white dark:bg-gray-800 shadow-sm ' + badge.color : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                  {badge.icon}
                </div>
                <div>
                  <h3 className={`font-bold text-sm ${badge.unlocked ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>{badge.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{badge.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {stats.length > 0 && (
        <motion.div variants={itemVariants} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <TrendingUp className="text-primary" />
            Performance Trends
          </h2>
          
          <div className="mb-8 p-5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
            <div className="flex justify-between items-end mb-3">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold mb-1">Overall Average Score</p>
                <h3 className="text-4xl font-bold text-gray-900 dark:text-white">{overallAverage}%</h3>
              </div>
            </div>
            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden shadow-inner">
              <motion.div 
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${overallAverage}%` }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Timeline Line Chart */}
            <div className="h-72">
              <h3 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wider text-center">Score Timeline</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`${value}%`, 'Score']}
                  />
                  <Line type="monotone" dataKey="averageScore" stroke="#0ea5e9" strokeWidth={3} dot={{ fill: '#0ea5e9', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Module Bar Chart */}
            <div className="h-72">
              <h3 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wider text-center">Average by Module</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={moduleData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} 
                    tickFormatter={(val) => val.length > 10 ? val.substring(0, 10) + '...' : val} 
                  />
                  <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`${value}%`, 'Average']}
                  />
                  <Bar dataKey="averageScore" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      )}
      
      <motion.div variants={itemVariants} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <AlertTriangle className="text-orange-500" />
              Smart Review
            </h2>
            <p className="text-sm text-gray-500 mt-1">Targeted revision for your {mistakes.length} mistakes</p>
          </div>
          {mistakes.length > 0 && (
            <button
              onClick={() => handleRetakeMistakes()}
              disabled={retaking}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} className={retaking ? "animate-spin" : ""} /> 
              Retake All Mistakes
            </button>
          )}
        </div>
        
        {mistakes.length === 0 ? (
          <p className="text-gray-500">You haven't made any mistakes yet! Great job.</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(mistakes.reduce((acc: any, m: any) => {
              if (!acc[m.moduleTitle]) acc[m.moduleTitle] = {};
              if (!acc[m.moduleTitle][m.subjectTitle]) acc[m.moduleTitle][m.subjectTitle] = {};
              if (!acc[m.moduleTitle][m.subjectTitle][m.chapterTitle]) acc[m.moduleTitle][m.subjectTitle][m.chapterTitle] = [];
              acc[m.moduleTitle][m.subjectTitle][m.chapterTitle].push(m);
              return acc;
            }, {})).map(([modName, subjects]: [string, any]) => (
              <div key={modName} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">{modName}</h3>
                  <button
                    onClick={() => {
                      const ids = Object.values(subjects).flatMap((s: any) => Object.values(s).flatMap((c: any) => c.map((m: any) => m.question.id)));
                      handleRetakeMistakes(ids);
                    }}
                    disabled={retaking}
                    className="text-sm px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg font-medium transition-colors"
                  >
                    Retake Module
                  </button>
                </div>
                
                <div className="p-4 space-y-6">
                  {Object.entries(subjects).map(([subName, chapters]: [string, any]) => (
                    <div key={subName}>
                      <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <BookOpen size={16} className="text-gray-400" />
                        {subName}
                      </h4>
                      
                      <div className="space-y-4 pl-6 border-l-2 border-gray-100 dark:border-gray-700">
                        {Object.entries(chapters).map(([chapName, chMistakes]: [string, any]) => (
                          <div key={chapName} className="space-y-3">
                            <div className="flex justify-between items-center">
                              <h5 className="font-medium text-sm text-primary uppercase tracking-wider">{chapName}</h5>
                              <button
                                onClick={() => handleRetakeMistakes(chMistakes.map((m: any) => m.question.id))}
                                disabled={retaking}
                                className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300 font-medium transition-colors"
                              >
                                Retake Chapter
                              </button>
                            </div>
                            
                            <ul className="space-y-3">
                              {chMistakes.map((m: any) => (
                                <li key={m.mistakeId} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700/50">
                                  <p className="font-medium text-gray-800 dark:text-gray-200 mb-2">{m.question.content}</p>
                                  <p className="text-sm text-primary font-semibold">Correct Answer: {m.question.correctAnswer}</p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <motion.div variants={itemVariants} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <FolderHeart className="text-primary" />
          My Folders ({folders.length})
        </h2>
        {folders.length === 0 ? (
          <p className="text-gray-500">You haven't created any folders yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {folders.map((f:any) => (
              <Link 
                key={f.id} 
                to={`/folders/${f.id}`}
                className="p-6 bg-primary/5 rounded-xl border border-primary/20 hover:border-primary/50 transition-colors group block"
              >
                <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">{f.name}</h3>
                <p className="text-sm text-gray-500">Folder ID: {f.id}</p>
              </Link>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

