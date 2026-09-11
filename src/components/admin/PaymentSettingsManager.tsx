import React, { useEffect, useState } from 'react';
import { fetchApi } from '../../lib/api';
import { CreditCard, Plus, Edit, Trash2, Check, X, Shield, Wallet, Building, AlertCircle } from 'lucide-react';

interface PaymentMethod {
  id: number;
  methodType: string;
  displayName: string;
  accountDetails: string;
  instructions: string | null;
  isActive: boolean;
}

export default function PaymentSettingsManager() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal state for Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);

  // Form state
  const [methodType, setMethodType] = useState('vodafone_cash');
  const [displayName, setDisplayName] = useState('');
  const [accountDetails, setAccountDetails] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchMethods = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/api/admin/payment-methods');
      setMethods(res);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch payment methods');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMethods();
  }, []);

  const openCreateModal = () => {
    setEditingMethod(null);
    setMethodType('vodafone_cash');
    setDisplayName('فودافون كاش');
    setAccountDetails('');
    setInstructions('');
    setIsActive(true);
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (m: PaymentMethod) => {
    setEditingMethod(m);
    setMethodType(m.methodType);
    setDisplayName(m.displayName);
    setAccountDetails(m.accountDetails);
    setInstructions(m.instructions || '');
    setIsActive(m.isActive);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !accountDetails.trim()) {
      setError('Display name and account details are required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        methodType,
        displayName: displayName.trim(),
        accountDetails: accountDetails.trim(),
        instructions: instructions.trim() || null,
        isActive
      };

      if (editingMethod) {
        await fetchApi(`/api/admin/payment-methods/${editingMethod.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        setSuccessMsg('Payment method updated successfully');
      } else {
        await fetchApi('/api/admin/payment-methods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        setSuccessMsg('Payment method created successfully');
      }

      setIsModalOpen(false);
      fetchMethods();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save payment method');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this payment method? If it has historical requests, it will be automatically set to inactive.')) {
      return;
    }

    try {
      const res = await fetchApi(`/api/admin/payment-methods/${id}`, {
        method: 'DELETE'
      });
      if (res.deactivated) {
        setSuccessMsg(res.message || 'Payment method deactivated due to existing requests');
      } else {
        setSuccessMsg('Payment method deleted successfully');
      }
      fetchMethods();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to delete payment method');
    }
  };

  const toggleActiveStatus = async (m: PaymentMethod) => {
    try {
      await fetchApi(`/api/admin/payment-methods/${m.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !m.isActive })
      });
      fetchMethods();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'vodafone_cash':
      case 'wallet':
        return <Wallet className="text-rose-500" size={20} />;
      case 'instapay':
        return <CreditCard className="text-purple-500" size={20} />;
      case 'bank_transfer':
        return <Building className="text-blue-500" size={20} />;
      default:
        return <Shield className="text-teal-500" size={20} />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard className="text-primary" size={24} />
            Payment Settings & Methods
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage available payment methods (Vodafone Cash, InstaPay, Bank Accounts) displayed to students.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-medium text-sm transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus size={18} />
          Add Payment Method
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2">
          <Check size={18} />
          {successMsg}
        </div>
      )}

      {error && !isModalOpen && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading payment methods...</div>
        ) : methods.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-3">
            <CreditCard size={36} className="mx-auto text-gray-400 opacity-50" />
            <p>No payment methods configured yet.</p>
            <button
              onClick={openCreateModal}
              className="text-primary font-medium text-sm hover:underline"
            >
              Add your first payment method
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  <th className="p-4">Method & Type</th>
                  <th className="p-4">Account Details</th>
                  <th className="p-4">Instructions</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                {methods.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-700/60">
                          {getTypeIcon(m.methodType)}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 dark:text-white">{m.displayName}</div>
                          <div className="text-xs text-gray-500 font-mono uppercase bg-gray-100 dark:bg-gray-700/50 px-2 py-0.5 rounded inline-block mt-0.5">
                            {m.methodType.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-gray-800 dark:text-gray-200 font-semibold">
                      {m.accountDetails}
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-400 text-xs max-w-xs truncate">
                      {m.instructions || <span className="text-gray-400 italic">None</span>}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleActiveStatus(m)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                          m.isActive
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 hover:bg-emerald-200'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200'
                        }`}
                        title="Click to toggle active status"
                      >
                        <span className={`w-2 h-2 rounded-full ${m.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                        {m.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(m)}
                        className="p-2 rounded-lg text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="Edit Method"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="p-2 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete Method"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in-up">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1A2327] border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingMethod ? 'Edit Payment Method' : 'Add Payment Method'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-600 text-xs">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Method Type *
                </label>
                <select
                  value={methodType}
                  onChange={(e) => setMethodType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-hidden"
                >
                  <option value="vodafone_cash">Vodafone Cash</option>
                  <option value="instapay">InstaPay</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Display Name (e.g., "فودافون كاش", "إنستاباي") *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Vodafone Cash"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Account Details (Wallet number, InstaPay username, or Bank Account) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 01012345678 or username@instapay"
                  value={accountDetails}
                  onChange={(e) => setAccountDetails(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-mono text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Instructions for Student (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g., Please write your full name in the transfer notes."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                />
                <label htmlFor="isActiveToggle" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  Active (Available for students to select)
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
                >
                  {submitting ? 'Saving...' : (editingMethod ? 'Update Method' : 'Create Method')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
