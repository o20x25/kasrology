import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchApi } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { Clock, ChevronLeft, ChevronRight, CheckCircle2, BookmarkPlus } from 'lucide-react';

import HighlightableText from '../components/HighlightableText';

export default function QuizEngine() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [attempt, setAttempt] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [folderModalData, setFolderModalData] = useState<{show: boolean, questionId?: number, folders?: any[]}>({ show: false });
  const [folderNameInput, setFolderNameInput] = useState('');

  useEffect(() => {
    // Try to load cached attempt from localStorage
    const cached = localStorage.getItem(`kasrology_quiz_${quizId}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setAttempt(parsed.attempt);
        setQuestions(parsed.questions);
        setAnswers(parsed.answers || {});
        setLoading(false);
        return;
      } catch (e) {}
    }

    // Otherwise start new attempt
    fetchApi(`/api/quizzes/${quizId}/start`, { method: 'POST' })
      .then(res => {
        setAttempt(res.attempt);
        setQuestions(res.questions);
        localStorage.setItem(`kasrology_quiz_${quizId}`, JSON.stringify({
          attempt: res.attempt,
          questions: res.questions,
          answers: {}
        }));
        setLoading(false);
      })
      .catch(console.error);
  }, [quizId]);

  // Disable context menu to deter right-click saving
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  const handleSelect = (questionId: number, choice: string) => {
    const newAnswers = { ...answers, [questionId]: choice };
    setAnswers(newAnswers);
    
    // Update cache
    localStorage.setItem(`kasrology_quiz_${quizId}`, JSON.stringify({
      attempt,
      questions,
      answers: newAnswers
    }));
  };

  const handleSubmit = async () => {
    setShowConfirmSubmit(false);
    setSubmitting(true);
    try {
      const res = await fetchApi(`/api/attempts/${attempt.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers })
      });
      
      setResult(res);
      localStorage.removeItem(`kasrology_quiz_${quizId}`);
    } catch (error: any) {
      console.error('Submit Error:', error);
      alert(`Failed to submit: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-20">Loading Quiz...</div>;

  if (result) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 mb-8">
          <CheckCircle2 size={64} className="mx-auto text-primary mb-6" />
          <h2 className="text-3xl font-bold mb-4">Quiz Completed!</h2>
          <div className="text-5xl font-black text-primary mb-4">{result.score}%</div>
          <p className="text-gray-500 mb-6">Your objective answers have been graded. Essay questions require manual review.</p>
          <button 
            onClick={() => navigate('/modules')}
            className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors inline-flex items-center gap-2"
          >
            Return to Modules
          </button>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-bold">Review Your Answers</h3>
          {questions.map((q: any, idx: number) => {
            const userAnswer = answers[q.id];
            
            return (
              <div key={q.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
                <p className="font-semibold mb-4 text-lg">
                  {idx + 1}. {q.content}
                </p>
                {q.imageUrl && (
                  <div className="mb-4 w-full max-w-sm rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                    <img src={q.imageUrl} alt="Question figure" className="w-full h-auto object-contain" loading="lazy" referrerPolicy="no-referrer" />
                  </div>
                )}
                
                <div className="space-y-3 mb-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <span className="text-sm font-semibold text-gray-500 block mb-1">Your Answer:</span>
                    <div className="whitespace-pre-wrap">{userAnswer || <span className="text-gray-400 italic">No answer provided</span>}</div>
                  </div>
                  
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-lg">
                    <span className="text-sm font-semibold block mb-1">Model Answer:</span>
                    <div className="whitespace-pre-wrap">{q.correctAnswer}</div>
                  </div>
                </div>

                {q.explanation && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-sm font-semibold text-green-700 dark:text-green-400 block mb-1">Explanation:</span>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">{q.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  const handleSaveToFolder = async () => {
    try {
      const folders = await fetchApi('/api/folders');
      setFolderModalData({ show: true, questionId: currentQ.id, folders });
      setFolderNameInput('');
    } catch (e) {
      alert('Failed to load folders');
    }
  };

  const executeSaveToFolder = async (folderId?: number, newName?: string) => {
    try {
      let finalFolderId = folderId;
      if (!finalFolderId && newName) {
        const newFolder = await fetchApi('/api/folders', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name: newName}) });
        finalFolderId = newFolder.id;
      }
      
      if (finalFolderId) {
        await fetchApi(`/api/folders/${finalFolderId}/questions`, {
          method: 'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ questionId: folderModalData.questionId })
        });
        // We will just close silently on success to not use alert()
        setFolderModalData({ show: false });
      }
    } catch (e) {
      // Ignore errors for now to avoid alerts
      setFolderModalData({ show: false });
    }
  };

  return (
    <div className="max-w-4xl mx-auto relative">
      {/* Dynamic Watermark / Anti-Screenshot Layer */}
      <div className="pointer-events-none fixed inset-0 z-[100] flex flex-wrap justify-around items-center overflow-hidden opacity-[0.03] dark:opacity-[0.04]">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="transform -rotate-45 text-2xl font-black p-10">
            {user?.name} - {user?.email}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-8 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="font-semibold">
          Question {currentIndex + 1} of {questions.length}
        </div>
        
        <div className="flex items-center gap-4">
          <button onClick={handleSaveToFolder} className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors">
            <BookmarkPlus size={18} /> Save
          </button>
          {attempt.mode === 'mock' && (
            <div className="flex items-center gap-2 text-primary font-bold">
              <Clock size={20} />
              <span>Mock Mode</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 mb-8 min-h-[400px]">
        {currentQ.imageUrl && (
          <div className="mb-6 w-full max-w-2xl mx-auto rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <img src={currentQ.imageUrl} alt="Question figure" className="w-full h-auto object-contain" loading="lazy" referrerPolicy="no-referrer" />
          </div>
        )}
        <HighlightableText text={currentQ.content} id={currentQ.id} />

        <div className="space-y-4">
          {currentQ.type === 'essay' ? (
            <textarea
              className="w-full h-40 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              placeholder="Write your answer here..."
              value={answers[currentQ.id] || ''}
              onChange={(e) => handleSelect(currentQ.id, e.target.value)}
            />
          ) : (
            currentQ.choices?.map((choice: string, idx: number) => {
              const isSelected = answers[currentQ.id] === choice;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(currentQ.id, choice)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    isSelected 
                      ? 'border-primary bg-primary/10 text-primary-dark dark:text-primary' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-primary' : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {isSelected && <div className="w-3 h-3 rounded-full bg-primary" />}
                    </div>
                    <span className="text-lg">{choice}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 px-6 py-3 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft size={20} /> Previous
        </button>

        {currentIndex === questions.length - 1 ? (
          <button
            onClick={() => setShowConfirmSubmit(true)}
            disabled={submitting}
            className="flex items-center gap-2 px-8 py-3 rounded-lg bg-primary hover:bg-primary-dark text-white font-medium transition-colors"
          >
            {submitting ? 'Submitting...' : 'Submit Quiz'}
          </button>
        ) : (
          <button
            onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
            className="flex items-center gap-2 px-6 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Next <ChevronRight size={20} />
          </button>
        )}
      </div>

      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in-95">
            <h3 className="text-xl font-bold mb-4">Submit Quiz?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to submit your answers? You won't be able to change them afterwards.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {folderModalData.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in-95">
            <h3 className="text-xl font-bold mb-4">Save to Folder</h3>
            
            {folderModalData.folders && folderModalData.folders.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2">Select existing folder:</p>
                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                  {folderModalData.folders.map(f => (
                    <button
                      key={f.id}
                      onClick={() => executeSaveToFolder(f.id)}
                      className="text-left px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-primary/10 hover:border-primary transition-colors"
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-2">Or create a new folder:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={folderNameInput}
                  onChange={(e) => setFolderNameInput(e.target.value)}
                  placeholder="New folder name"
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent"
                />
                <button
                  onClick={() => folderNameInput.trim() && executeSaveToFolder(undefined, folderNameInput.trim())}
                  disabled={!folderNameInput.trim()}
                  className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setFolderModalData({ show: false })}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
