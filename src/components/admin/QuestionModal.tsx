import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { fetchApi } from '../../lib/api';

interface QuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId: number;
  initialData?: any;
  onSuccess: () => void;
}

export default function QuestionModal({ isOpen, onClose, chapterId, initialData, onSuccess }: QuestionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [type, setType] = useState('mcq');
  const [content, setContent] = useState('');
  const [explanation, setExplanation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  // MCQ State
  const [choices, setChoices] = useState(['', '', '', '']);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState(0);

  // TF State
  const [tfAnswer, setTfAnswer] = useState('True');

  // Essay State
  const [modelAnswer, setModelAnswer] = useState('');

  useEffect(() => {
    if (initialData) {
      setType(initialData.type || 'mcq');
      setContent(initialData.content || '');
      setExplanation(initialData.explanation || '');
      setImageUrl(initialData.imageUrl || '');
      setImageFile(null);

      if (initialData.type === 'mcq') {
        const c = initialData.choices || ['', '', '', ''];
        setChoices(c);
        const idx = c.indexOf(initialData.correctAnswer);
        setCorrectAnswerIndex(idx >= 0 ? idx : 0);
      } else if (initialData.type === 'true_false') {
        setTfAnswer(initialData.correctAnswer || 'True');
      } else if (initialData.type === 'essay') {
        setModelAnswer(initialData.correctAnswer || '');
      }
    } else {
      setType('mcq');
      setContent('');
      setExplanation('');
      setImageUrl('');
      setImageFile(null);
      setChoices(['', '', '', '']);
      setCorrectAnswerIndex(0);
      setTfAnswer('True');
      setModelAnswer('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let finalImageUrl = imageUrl;
      if (imageFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(imageFile);
        });
        finalImageUrl = await base64Promise;
      }

      let payload: any = {
        chapterId,
        type,
        content,
        explanation,
        imageUrl: finalImageUrl
      };

      if (type === 'mcq') {
        payload.choices = choices;
        payload.correctAnswer = choices[correctAnswerIndex];
      } else if (type === 'true_false') {
        payload.choices = ['True', 'False'];
        payload.correctAnswer = tfAnswer;
      } else if (type === 'essay') {
        payload.choices = [];
        payload.correctAnswer = modelAnswer;
      }

      if (initialData?.id) {
        await fetchApi(`/api/admin/questions/${initialData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        await fetchApi('/api/admin/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to save question');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChoiceChange = (idx: number, val: string) => {
    const newChoices = [...choices];
    newChoices[idx] = val;
    setChoices(newChoices);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden my-8">
        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold">{initialData ? 'Edit Question' : 'Add Question'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Question Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-900"
              >
                <option value="mcq">Multiple Choice (MCQ)</option>
                <option value="true_false">True / False</option>
                <option value="essay">Essay</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Question Content *
            </label>
            <textarea
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 h-24 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-900"
              placeholder="Enter the question text here..."
            />
          </div>

          {type === 'mcq' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Choices & Correct Answer *
              </label>
              {choices.map((choice, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="correctAnswer"
                    checked={correctAnswerIndex === idx}
                    onChange={() => setCorrectAnswerIndex(idx)}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <input
                    required
                    value={choice}
                    onChange={(e) => handleChoiceChange(idx, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-900"
                    placeholder={`Choice ${idx + 1}`}
                  />
                </div>
              ))}
            </div>
          )}

          {type === 'true_false' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Correct Answer *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tfAnswer"
                    checked={tfAnswer === 'True'}
                    onChange={() => setTfAnswer('True')}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <span>True</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tfAnswer"
                    checked={tfAnswer === 'False'}
                    onChange={() => setTfAnswer('False')}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <span>False</span>
                </label>
              </div>
            </div>
          )}

          {type === 'essay' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Model Answer *
              </label>
              <textarea
                required
                value={modelAnswer}
                onChange={(e) => setModelAnswer(e.target.value)}
                className="w-full px-3 py-2 h-24 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-900"
                placeholder="Enter the model answer for review..."
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Explanation (Optional)
            </label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="w-full px-3 py-2 h-20 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-900"
              placeholder="Explain why the answer is correct (shown to students after submission)."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Question Image (Optional)
            </label>
            {imageUrl && !imageFile && (
              <p className="text-xs mb-2 text-gray-500 truncate max-w-sm">Current image: {imageUrl}</p>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              {isSubmitting ? 'Saving...' : 'Save Question'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
