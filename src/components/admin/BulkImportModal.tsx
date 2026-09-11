import React, { useState } from 'react';
import { X, Loader2, Download, UploadCloud } from 'lucide-react';
import { fetchApi } from '../../lib/api';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterId: number;
  onSuccess: (count: number) => void;
}

export default function BulkImportModal({ isOpen, onClose, chapterId, onSuccess }: BulkImportModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jsonInput, setJsonInput] = useState('');

  if (!isOpen) return null;

  const handleImport = async () => {
    if (!jsonInput.trim()) return;
    setIsSubmitting(true);
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) {
        throw new Error('Input must be a JSON array of questions.');
      }

      const res = await fetchApi(`/api/admin/chapters/${chapterId}/questions/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: parsed })
      });

      onSuccess(res.count);
      onClose();
      setJsonInput('');
    } catch (e: any) {
      alert(e.message || 'Invalid JSON format.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        // Verify JSON parses
        JSON.parse(content);
        setJsonInput(content);
      } catch (err) {
        alert('File does not contain valid JSON.');
      }
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const template = [
      {
        "type": "mcq",
        "content": "Which planet is known as the Red Planet?",
        "choices": ["Earth", "Mars", "Jupiter", "Venus"],
        "correctAnswer": "Mars",
        "explanation": "Mars appears red due to iron oxide on its surface."
      },
      {
        "type": "true_false",
        "content": "The Great Wall of China is visible from space with the naked eye.",
        "choices": ["True", "False"],
        "correctAnswer": "False",
        "explanation": "This is a common myth."
      },
      {
        "type": "essay",
        "content": "Discuss the impact of climate change on coastal cities.",
        "correctAnswer": "Model answer: Climate change leads to rising sea levels...",
        "explanation": "Ensure the student mentions sea levels and extreme weather."
      }
    ];

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions_template.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold">Bulk Import Questions</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-4 rounded-lg flex items-start gap-4">
            <div className="flex-1 text-sm">
              <p className="font-semibold mb-1">How to bulk import:</p>
              <ul className="list-disc list-inside space-y-1 mb-3">
                <li>Prepare a JSON file containing an array of question objects.</li>
                <li>Ensure fields match the schema exactly (type, content, choices, correctAnswer, explanation).</li>
              </ul>
              <button 
                onClick={downloadTemplate}
                className="flex items-center gap-2 text-primary font-medium hover:underline"
              >
                <Download size={16} /> Download JSON Template
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload JSON File
            </label>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className="w-8 h-8 mb-2 text-gray-500" />
                <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                <p className="text-xs text-gray-500">JSON files only</p>
              </div>
              <input type="file" accept=".json,application/json" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Or paste JSON directly:
            </label>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              className="w-full px-3 py-2 h-40 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-900 font-mono text-sm"
              placeholder='[{"type": "mcq", "content": "..."}]'
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
              onClick={handleImport}
              disabled={isSubmitting || !jsonInput.trim()}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              {isSubmitting ? 'Importing...' : 'Import Questions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
