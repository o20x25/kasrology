import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchApi } from '../lib/api';
import { BookOpen, RefreshCw, ChevronLeft } from 'lucide-react';

export default function FolderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [folder, setFolder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [retaking, setRetaking] = useState(false);

  useEffect(() => {
    fetchApi(`/api/folders/${id}`)
      .then(setFolder)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleRetakeFolder = async () => {
    try {
      setRetaking(true);
      const res = await fetchApi(`/api/folders/${id}/retake`, { method: 'POST' });
      localStorage.removeItem(`kasrology_quiz_${res.quizId}`);
      navigate(`/quiz/${res.quizId}`);
    } catch (e: any) {
      alert(e.message || 'Failed to start quiz');
      setRetaking(false);
    }
  };

  if (loading) return <div className="text-center py-20">Loading folder...</div>;
  if (!folder) return <div className="text-center py-20">Folder not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Link to="/progress" className="inline-flex items-center text-primary hover:underline font-medium">
        <ChevronLeft size={20} className="mr-1" /> Back to Progress
      </Link>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              {folder.name}
            </h2>
            <p className="text-gray-500 mt-1">{folder.questions.length} saved questions</p>
          </div>
          
          {folder.questions.length > 0 && (
            <button
              onClick={handleRetakeFolder}
              disabled={retaking}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} className={retaking ? "animate-spin" : ""} /> 
              Quiz on this Folder
            </button>
          )}
        </div>
        
        {folder.questions.length === 0 ? (
          <p className="text-gray-500">This folder is empty. Start saving questions to it!</p>
        ) : (
          <ul className="space-y-4">
            {folder.questions.map((q:any) => (
              <li key={q.questionId} className="p-5 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3 uppercase tracking-wider font-semibold">
                  <BookOpen size={14} />
                  <span>{q.moduleTitle}</span>
                  <span>&bull;</span>
                  <span>{q.subjectTitle}</span>
                  <span>&bull;</span>
                  <span className="text-primary">{q.chapterTitle}</span>
                </div>
                <p className="font-medium text-lg mb-2">{q.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
