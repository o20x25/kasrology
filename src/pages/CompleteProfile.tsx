import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { fetchApi } from '../lib/api';
import { UserCheck, ShieldCheck, Phone, GraduationCap, AlertCircle, Loader2 } from 'lucide-react';

const ACADEMIC_YEARS = [
  'First Year',
  'Second Year',
  'Third Year',
  'Fourth Year',
  'Fifth Year',
  'Sixth Year'
];

export default function CompleteProfile() {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [academicYear, setAcademicYear] = useState(user?.academicYear || ACADEMIC_YEARS[0]);
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !academicYear || !phoneNumber.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetchApi('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          academicYear,
          phoneNumber: phoneNumber.trim()
        })
      });

      if (res.success && res.user) {
        setUser(res.user);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-white dark:bg-[#1A2327] border border-gray-200 dark:border-gray-700 rounded-3xl shadow-2xl p-8 sm:p-10 relative overflow-hidden">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-primary shadow-inner">
            <UserCheck size={32} />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Complete Your Student Profile
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Please provide your academic and contact details to access KASROLOGY modules.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-600 text-sm flex items-center gap-3">
            <AlertCircle size={20} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                First Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ahmed"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Last Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Mohamed"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Email (Google Account)
            </label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900/60 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed font-mono"
            />
            <p className="text-[11px] text-gray-400 mt-1">Linked securely with Google authentication</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
              <GraduationCap size={16} className="text-primary" />
              Academic Year *
            </label>
            <select
              required
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary"
            >
              {ACADEMIC_YEARS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
              <Phone size={16} className="text-primary" />
              Phone Number / WhatsApp *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 01012345678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-sm font-mono text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary"
            />
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5 leading-relaxed">
              💡 يفضّل يكتب رقم عليه واتساب وتليجرام شغالين (عشان التواصل بخصوص الاشتراكات لاحقًا).
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-sm transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {loading ? 'Saving Profile...' : 'Save & Continue to KASROLOGY'}
          </button>
        </form>
      </div>
    </div>
  );
}
