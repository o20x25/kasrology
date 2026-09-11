import React, { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { User, GraduationCap, Phone, Mail, CheckCircle, Clock, XCircle, ShieldCheck, Loader2, BookOpen, CreditCard } from 'lucide-react';

const ACADEMIC_YEARS = [
  'First Year',
  'Second Year',
  'Third Year',
  'Fourth Year',
  'Fifth Year',
  'Sixth Year'
];

export default function StudentProfile() {
  const { user, setUser } = useAuthStore();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [academicYear, setAcademicYear] = useState(ACADEMIC_YEARS[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || user.name?.split(' ')[0] || '');
      setLastName(user.lastName || user.name?.split(' ').slice(1).join(' ') || '');
      setAcademicYear(user.academicYear || ACADEMIC_YEARS[0]);
      setPhoneNumber(user.phoneNumber || '');
    }

    fetchApi('/api/user/profile-details')
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          setFirstName(data.user.firstName || '');
          setLastName(data.user.lastName || '');
          setAcademicYear(data.user.academicYear || ACADEMIC_YEARS[0]);
          setPhoneNumber(data.user.phoneNumber || '');
        }
        setSubscriptions(data.subscriptions || []);
        setPaymentRequests(data.paymentRequests || []);
      })
      .catch((err) => {
        console.error('Failed to fetch profile details', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !academicYear || !phoneNumber.trim()) {
      setMessage({ type: 'error', text: 'All fields are required.' });
      return;
    }

    setSaving(true);
    setMessage(null);

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
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-[#1A2327] border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-primary text-xl font-bold">
            {firstName?.[0] || 'U'}
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">
              {user?.name || 'My Profile'}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {user?.email} • <span className="capitalize text-primary font-semibold">{user?.role || 'student'}</span>
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 text-xs font-semibold">
          <GraduationCap size={16} />
          {user?.academicYear || 'Academic Year'}
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-700 dark:text-emerald-300' 
            : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-600'
        }`}>
          <span>{message.text}</span>
        </div>
      )}

      {/* Grid: Edit Profile Form & Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Info Form */}
        <div className="lg:col-span-1 bg-white dark:bg-[#1A2327] border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <User size={18} className="text-primary" />
            Personal Information
          </h3>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                First Name *
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Email (Google Account)
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900/60 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Academic Year *
              </label>
              <select
                required
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary"
              >
                {ACADEMIC_YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Phone Number / WhatsApp *
              </label>
              <input
                type="text"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-mono text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary"
              />
              <p className="text-[10px] text-gray-400 mt-1">يفضّل رقم عليه واتساب وتليجرام شغالين</p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-sm transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              Save Changes
            </button>
          </form>
        </div>

        {/* Right Column: Subscriptions & Payment Requests */}
        <div className="lg:col-span-2 space-y-6">
          {/* My Subscriptions */}
          <div className="bg-white dark:bg-[#1A2327] border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BookOpen size={18} className="text-primary" />
              My Subscriptions ({subscriptions.length})
            </h3>

            {subscriptions.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500">You are not subscribed to any modules yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {subscriptions.map((sub) => {
                  const expiryText = sub.expiryDate 
                    ? `Expires: ${new Date(sub.expiryDate).toLocaleDateString()}` 
                    : 'Open-ended (Lifetime)';
                  return (
                    <div key={sub.id} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                          {sub.module?.title || `Module #${sub.moduleId}`}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {expiryText}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                        Active
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* My Payment Requests */}
          <div className="bg-white dark:bg-[#1A2327] border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <CreditCard size={18} className="text-primary" />
              My Payment Requests ({paymentRequests.length})
            </h3>

            {paymentRequests.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500">No payment requests submitted yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentRequests.map((req) => {
                  const statusColors = {
                    pending: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200',
                    approved: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200',
                    rejected: 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200',
                  }[req.status as string] || 'bg-gray-100 text-gray-700';

                  return (
                    <div key={req.id} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                            {req.module?.title || `Module #${req.moduleId}`}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusColors}`}>
                            {req.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Method: <span className="font-semibold text-gray-700 dark:text-gray-300">{req.paymentMethod?.displayName || 'Payment Method'}</span> • Wallet: <span className="font-mono">{req.walletNumber}</span>
                        </p>
                      </div>
                      <div className="text-right text-[11px] text-gray-400">
                        {new Date(req.createdAt).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
