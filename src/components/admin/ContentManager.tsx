import { useState, useEffect } from 'react';
import { fetchApi } from '../../lib/api';
import { 
  ChevronRight, 
  Trash2, 
  Upload, 
  Plus, 
  Edit2, 
  X, 
  Loader2, 
  AlertTriangle, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react';
import QuestionModal from './QuestionModal';
import BulkImportModal from './BulkImportModal';
import ModuleModal from './ModuleModal';

export default function ContentManager() {
  const [hierarchy, setHierarchy] = useState<any>({ modules: [], subjects: [], chapters: [] });
  const [questions, setQuestions] = useState<any[]>([]);
  
  const [selModule, setSelModule] = useState<any>(null);
  const [selSubject, setSelSubject] = useState<any>(null);
  const [selChapter, setSelChapter] = useState<any>(null);
  
  // Custom Modal State for hierarchy
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    fields: { name: string; label: string; defaultValue?: string; required?: boolean; type?: string }[];
    onSubmit: (values: Record<string, string>) => void | Promise<void>;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // In-app Notifications
  const [toastNotification, setToastNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Delete Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState<{
    type: 'modules' | 'subjects' | 'chapters' | 'questions';
    id: number;
    title: string;
    warningDetails: string;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Modals State
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [questionModalData, setQuestionModalData] = useState<any>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [moduleModalData, setModuleModalData] = useState<any>(null);

  const loadHierarchy = async () => {
    const res = await fetchApi('/api/admin/hierarchy');
    setHierarchy(res);
  };

  const loadQuestions = async (chapterId: number) => {
    const qs = await fetchApi(`/api/admin/chapters/${chapterId}/questions`);
    setQuestions(qs);
  };

  useEffect(() => { loadHierarchy(); }, []);

  // CRUD Actions
  const addModule = () => {
    setModuleModalData(null);
    setModuleModalOpen(true);
  };

  const editModule = (m: any) => {
    setModuleModalData(m);
    setModuleModalOpen(true);
  };

  const addSubject = () => {
    if (!selModule) return;
    setModalConfig({
      title: 'Add Subject',
      fields: [{ name: 'title', label: 'Subject Title', required: true }],
      onSubmit: async (values) => {
        try {
          await fetchApi('/api/admin/subjects', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ title: values.title, moduleId: selModule.id }) });
          loadHierarchy();
          setModalConfig(null);
          setToastNotification({ type: 'success', message: 'Subject created successfully' });
        } catch (e: any) { 
          setToastNotification({ type: 'error', message: e.message || 'Failed to add subject' }); 
        }
      }
    });
  };

  const editSubject = (s: any) => {
    setModalConfig({
      title: 'Edit Subject',
      fields: [{ name: 'title', label: 'Subject Title', defaultValue: s.title, required: true }],
      onSubmit: async (values) => {
        try {
          await fetchApi(`/api/admin/subjects/${s.id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ title: values.title }) });
          loadHierarchy();
          if (selSubject?.id === s.id) setSelSubject({ ...selSubject, title: values.title });
          setModalConfig(null);
          setToastNotification({ type: 'success', message: 'Subject updated successfully' });
        } catch (e: any) { 
          setToastNotification({ type: 'error', message: e.message || 'Failed to update subject' }); 
        }
      }
    });
  };

  const addChapter = () => {
    if (!selSubject) return;
    setModalConfig({
      title: 'Add Chapter',
      fields: [{ name: 'title', label: 'Chapter Title', required: true }],
      onSubmit: async (values) => {
        try {
          await fetchApi('/api/admin/chapters', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ title: values.title, subjectId: selSubject.id }) });
          loadHierarchy();
          setModalConfig(null);
          setToastNotification({ type: 'success', message: 'Chapter created successfully' });
        } catch (e: any) { 
          setToastNotification({ type: 'error', message: e.message || 'Failed to add chapter' }); 
        }
      }
    });
  };

  const editChapter = (c: any) => {
    setModalConfig({
      title: 'Edit Chapter',
      fields: [{ name: 'title', label: 'Chapter Title', defaultValue: c.title, required: true }],
      onSubmit: async (values) => {
        try {
          await fetchApi(`/api/admin/chapters/${c.id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ title: values.title }) });
          loadHierarchy();
          if (selChapter?.id === c.id) setSelChapter({ ...selChapter, title: values.title });
          setModalConfig(null);
          setToastNotification({ type: 'success', message: 'Chapter updated successfully' });
        } catch (e: any) { 
          setToastNotification({ type: 'error', message: e.message || 'Failed to update chapter' }); 
        }
      }
    });
  };

  const requestDelete = async (type: 'modules' | 'subjects' | 'chapters' | 'questions', item: any) => {
    const title = item.title || (type === 'modules' ? `Module #${item.id}` : type === 'subjects' ? `Subject #${item.id}` : type === 'chapters' ? `Chapter #${item.id}` : `Question #${item.id}`);

    setDeleteModal({
      type,
      id: item.id,
      title,
      warningDetails: 'جاري حساب العناصر المرتبطة للحذف...'
    });

    try {
      const preview = await fetchApi(`/api/admin/deletion-preview/${type}/${item.id}`);
      let warning = '';
      if (type === 'modules') {
        warning = `⚠️ هيتم حذف ${preview.subjects} مواد، ${preview.chapters} فصل، ${preview.questions} سؤال، و ${preview.subscriptions} اشتراكات نشطة (بالإضافة لطلبات الدفع). متأكد؟`;
      } else if (type === 'subjects') {
        warning = `⚠️ هيتم حذف ${preview.chapters} فصل، و ${preview.questions} سؤال مرتبط. متأكد؟`;
      } else if (type === 'chapters') {
        warning = `⚠️ هيتم حذف ${preview.questions} سؤال مرتبط بهذا الفصل. متأكد؟`;
      } else {
        warning = `هل أنت متأكد من حذف هذا السؤال بشكل دائم؟`;
      }
      setDeleteModal({
        type,
        id: item.id,
        title,
        warningDetails: warning
      });
    } catch (e) {
      setDeleteModal({
        type,
        id: item.id,
        title,
        warningDetails: `هل أنت متأكد من رغبتك في حذف ${title}؟`
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    const { type, id, title } = deleteModal;
    const url = `/api/admin/${type}/${id}`;

    console.log('[DELETE_REQUEST]', {
      method: 'DELETE',
      url,
      type,
      id,
      title
    });

    setDeleteLoading(true);
    try {
      const res = await fetchApi(url, { method: 'DELETE' });
      console.log('[DELETE_RESPONSE]', res);

      setToastNotification({
        type: 'success',
        message: `${title} was deleted successfully.`
      });

      if (type === 'questions') {
        if (selChapter) loadQuestions(selChapter.id);
      } else {
        await loadHierarchy();
        if (type === 'modules' && selModule?.id === id) {
          setSelModule(null);
          setSelSubject(null);
          setSelChapter(null);
        }
        if (type === 'subjects' && selSubject?.id === id) {
          setSelSubject(null);
          setSelChapter(null);
        }
        if (type === 'chapters' && selChapter?.id === id) {
          setSelChapter(null);
        }
      }
      setDeleteModal(null);
    } catch (e: any) {
      console.error('[DELETE_ERROR]', e);
      setToastNotification({
        type: 'error',
        message: e.message || `Failed to delete ${title}`
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastNotification && (
        <div className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm shadow-sm transition-all ${
          toastNotification.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' 
            : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
        }`}>
          <div className="flex items-center gap-2">
            {toastNotification.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span className="font-medium">{toastNotification.message}</span>
          </div>
          <button 
            onClick={() => setToastNotification(null)}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* Sidebar: Navigation */}
        <div className="w-full md:w-1/3 border-r border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 p-4 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">Modules</h3>
            <button onClick={addModule} className="p-1 text-primary hover:bg-primary/10 rounded"><Plus size={18}/></button>
          </div>
          
          <div className="space-y-2">
            {hierarchy.modules.map((m: any) => (
              <div key={m.id}>
                <div 
                  className={`flex justify-between items-center p-2 rounded cursor-pointer ${selModule?.id === m.id ? 'bg-primary text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  onClick={() => { setSelModule(m); setSelSubject(null); setSelChapter(null); }}
                >
                  <span>{m.title}</span>
                  <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); editModule(m); }} title="Edit Module"><Edit2 size={14}/></button>
                    <button onClick={(e) => { e.stopPropagation(); requestDelete('modules', m); }} className="hover:text-red-400" title="Delete Module"><Trash2 size={14}/></button>
                    <ChevronRight size={16}/>
                  </div>
                </div>
                
                {/* Subjects */}
                {selModule?.id === m.id && (
                  <div className="ml-4 mt-2 border-l-2 border-gray-200 dark:border-gray-600 pl-2">
                    <div className="flex justify-between items-center mb-2 text-sm text-gray-500">
                      <span>Subjects</span>
                      <button onClick={addSubject} className="p-1 hover:text-primary"><Plus size={14}/></button>
                    </div>
                    {hierarchy.subjects.filter((s:any) => s.moduleId === m.id).map((s:any) => (
                      <div key={s.id}>
                        <div 
                          className={`flex justify-between items-center p-2 rounded text-sm cursor-pointer ${selSubject?.id === s.id ? 'bg-gray-200 dark:bg-gray-600 font-medium' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                          onClick={() => { setSelSubject(s); setSelChapter(null); }}
                        >
                          <span>{s.title}</span>
                          <div className="flex gap-2 text-gray-400">
                            <button onClick={(e) => { e.stopPropagation(); editSubject(s); }} className="hover:text-primary" title="Edit Subject"><Edit2 size={12}/></button>
                            <button onClick={(e) => { e.stopPropagation(); requestDelete('subjects', s); }} className="hover:text-red-500" title="Delete Subject"><Trash2 size={12}/></button>
                          </div>
                        </div>

                        {/* Chapters */}
                        {selSubject?.id === s.id && (
                          <div className="ml-4 mt-1 border-l-2 border-gray-200 dark:border-gray-600 pl-2">
                            <div className="flex justify-between items-center mb-1 text-xs text-gray-500">
                              <span>Chapters</span>
                              <button onClick={addChapter} className="p-1 hover:text-primary"><Plus size={12}/></button>
                            </div>
                            {hierarchy.chapters.filter((c:any) => c.subjectId === s.id).map((c:any) => (
                              <div 
                                key={c.id} 
                                className={`flex justify-between items-center p-1.5 rounded text-xs cursor-pointer ${selChapter?.id === c.id ? 'text-primary font-bold bg-primary/10' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                onClick={() => { setSelChapter(c); loadQuestions(c.id); }}
                              >
                                <span>{c.title}</span>
                                <div className="flex gap-2 opacity-60">
                                  <button onClick={(e) => { e.stopPropagation(); editChapter(c); }} className="hover:text-primary" title="Edit Chapter"><Edit2 size={12}/></button>
                                  <button onClick={(e) => { e.stopPropagation(); requestDelete('chapters', c); }} className="hover:text-red-500" title="Delete Chapter"><Trash2 size={12}/></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content: Questions */}
        <div className="w-full md:w-2/3 p-6">
          {!selChapter ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              Select a chapter to manage questions
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">{selChapter.title} - Questions</h2>
                <div className="flex gap-2">
                  <button onClick={() => setBulkModalOpen(true)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm font-medium flex items-center gap-2">
                    <Upload size={16} /> Bulk Import
                  </button>
                  <button onClick={() => { setQuestionModalData(null); setQuestionModalOpen(true); }} className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium flex items-center gap-2">
                    <Plus size={16} /> Add Question
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {questions.length === 0 ? <p className="text-gray-500">No questions in this chapter.</p> : null}
                {questions.map((q: any, idx: number) => (
                  <div key={q.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between">
                      <p className="font-medium text-lg">{idx + 1}. {q.content}</p>
                      <div className="flex gap-2">
                        <button onClick={() => { setQuestionModalData(q); setQuestionModalOpen(true); }} className="text-gray-400 hover:text-primary p-2 hover:bg-primary/10 rounded-lg transition-colors"><Edit2 size={18}/></button>
                        <button onClick={() => requestDelete('questions', q)} className="text-red-500 p-2 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete Question"><Trash2 size={18}/></button>
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p><span className="font-semibold capitalize text-primary">Type:</span> {q.type === 'true_false' ? 'True / False' : q.type === 'mcq' ? 'MCQ' : 'Essay'}</p>
                      <p><span className="font-semibold text-green-600 dark:text-green-400">Answer:</span> {q.correctAnswer}</p>
                      {q.type === 'mcq' && q.choices && <p><span className="font-semibold">Choices:</span> {q.choices.join(' | ')}</p>}
                      {q.explanation && <p className="text-gray-500 italic mt-1"><span className="font-semibold not-italic text-gray-600 dark:text-gray-300">Explanation:</span> {q.explanation}</p>}
                      {q.imageUrl && <p className="mt-1 text-blue-500 truncate max-w-sm"><span className="font-semibold text-gray-600 dark:text-gray-400">Image:</span> {q.imageUrl}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <QuestionModal 
        isOpen={questionModalOpen} 
        onClose={() => setQuestionModalOpen(false)} 
        chapterId={selChapter?.id} 
        initialData={questionModalData} 
        onSuccess={() => loadQuestions(selChapter?.id)} 
      />

      <BulkImportModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        chapterId={selChapter?.id}
        onSuccess={(count) => {
          setToastNotification({ type: 'success', message: `Imported ${count} questions successfully!` });
          loadQuestions(selChapter?.id);
        }}
      />

      <ModuleModal
        isOpen={moduleModalOpen}
        onClose={() => setModuleModalOpen(false)}
        initialData={moduleModalData}
        onSuccess={() => {
          loadHierarchy();
          if (moduleModalData && selModule?.id === moduleModalData.id) {
            setSelModule(null); // Force refresh of selected module or something, better just clear it
          }
        }}
      />

      {modalConfig && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold">{modalConfig.title}</h3>
              <button onClick={() => setModalConfig(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsUploading(true);
              try {
                const formData = new FormData(e.currentTarget);
                const values: Record<string, string> = {};
                for (const f of modalConfig.fields) {
                  if (f.type === 'file') {
                    const file = formData.get(f.name) as File;
                    if (file && file.size > 0) {
                      const reader = new FileReader();
                      const base64Promise = new Promise<string>((resolve, reject) => {
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                      });
                      values[f.name] = await base64Promise;
                    } else {
                      values[f.name] = f.defaultValue || ''; // keep old value if no new file
                    }
                  } else {
                    values[f.name] = formData.get(f.name) as string;
                  }
                }
                await modalConfig.onSubmit(values);
              } catch (error: any) {
                setToastNotification({ type: 'error', message: error.message || 'Operation failed' });
              } finally {
                setIsUploading(false);
              }
            }} className="p-4">
              
              <div className="space-y-4">
                {modalConfig.fields.map(f => (
                  <div key={f.name}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {f.label}
                    </label>
                    {f.type === 'file' ? (
                      <div>
                        {f.defaultValue && <p className="text-xs mb-2 text-gray-500 truncate max-w-sm">Current: {f.defaultValue}</p>}
                        <input 
                          type="file"
                          name={f.name}
                          accept="image/*"
                          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        />
                      </div>
                    ) : (
                      <input 
                        name={f.name} 
                        defaultValue={f.defaultValue} 
                        required={f.required} 
                        type={f.type || 'text'}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-900"
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setModalConfig(null)} disabled={isUploading} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={isUploading} className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50">
                  {isUploading && <Loader2 size={16} className="animate-spin" />}
                  {isUploading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Replaces window.confirm) */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 relative">
            <button 
              onClick={() => !deleteLoading && setDeleteModal(null)} 
              disabled={deleteLoading}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
            >
              <X size={20} />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0 text-red-600 dark:text-red-400">
                <AlertTriangle size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  Confirm Permanent Deletion
                </h3>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-1">
                  {deleteModal.title}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                  {deleteModal.warningDetails}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-medium">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 rounded-xl transition-colors flex items-center gap-2 shadow-sm shadow-red-600/20 disabled:opacity-50"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
