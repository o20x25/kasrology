import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchApi } from '../lib/api';
import { FileText, PlayCircle } from 'lucide-react';

export default function ModuleDetails() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi(`/api/modules/${id}`)
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(console.error);
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>Not found</div>;

  const getSubjectChapters = (subjectId: number) => {
    return data.chapters.filter((c: any) => c.subjectId === subjectId);
  };

  const getChapterQuizzes = (chapterId: number) => {
    return data.quizzes.filter((q: any) => q.chapterId === chapterId);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {data.module.imageUrl && (
        <div className="w-full h-64 md:h-80 rounded-2xl overflow-hidden mb-8 border border-gray-200 dark:border-gray-700 shadow-sm">
          <img src={data.module.imageUrl} alt={data.module.title} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
        </div>
      )}
      
      <h1 className="text-3xl font-bold mb-2">{data.module.title}</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">{data.module.description}</p>

      <div className="space-y-8">
        {data.subjects.map((subject: any) => (
          <div key={subject.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-800/80 p-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-bold">{subject.title}</h2>
            </div>
            
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {getSubjectChapters(subject.id).map((chapter: any) => (
                <div key={chapter.id} className="p-4 pl-8">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={18} className="text-primary" />
                    <h3 className="font-semibold text-lg">{chapter.title}</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-6">
                    {getChapterQuizzes(chapter.id).map((quiz: any) => (
                      <Link 
                        key={quiz.id}
                        to={`/quiz/${quiz.id}`}
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-primary dark:hover:border-primary hover:bg-primary/5 transition-colors group"
                      >
                        <div>
                          <p className="font-medium capitalize">{quiz.mode} Mode</p>
                          <p className="text-xs text-gray-500">{quiz.questionsPerAttempt} questions</p>
                        </div>
                        <PlayCircle className="text-gray-300 group-hover:text-primary transition-colors" />
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
