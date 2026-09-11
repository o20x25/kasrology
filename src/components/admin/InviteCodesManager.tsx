import React, { useEffect, useState } from 'react';
import { fetchApi } from '../../lib/api';
import { Tag, Plus, Trash2, CheckCircle, XCircle, Percent, DollarSign, AlertCircle } from 'lucide-react';

export default function InviteCodesManager() {
  const [codes, setCodes] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: 15,
    moduleId: '',
    usageLimit: '',
    isActive: true
  });
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [codesRes, modulesRes] = await Promise.all([
        fetchApi('/api/admin/invite-codes'),
        fetchApi('/api/modules')
      ]);
      setCodes(codesRes);
      setModules(modulesRes);
    } catch (err: any) {
      console.error('Failed to load invite codes', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      setError('Code string is required');
      return;
    }
    setError(null);

    try {
      await fetchApi('/api/admin/invite-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          moduleId: formData.moduleId ? parseInt(formData.moduleId) : null,
          usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
          discountValue: parseFloat(formData.discountValue.toString())
        })
      });
      setSuccessMsg('Discount code created successfully');
      setShowModal(false);
      setFormData({
        code: '',
        discountType: 'percentage',
        discountValue: 15,
        moduleId: '',
        usageLimit: '',
        isActive: true
      });
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create discount code');
    }
  };

  const toggleActive = async (id: number, currentActive: boolean) => {
    try {
      await fetchApi(`/api/admin/invite-codes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive })
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this discount code?')) return;
    try {
      await fetchApi(`/api/admin/invite-codes/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete code');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Tag size={22} className="text-primary" />
            Discount & Invite Codes Management
          </h2>
          <p className="text-sm text-gray-500">Create and manage coupon codes for student subscriptions.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-medium text-sm transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus size={18} />
          Create New Code
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-sm font-semibold">✕</button>
        </div>
      )}

      {/* Modal for Creating Code */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1A2327] border border-gray-200 dark:border-gray-700 shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold">Create Discount Code</h3>
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Coupon Code (e.g., KASRO20)</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent font-mono"
                  placeholder="CODE123"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Discount Type</label>
                  <select
                    value={formData.discountType}
                    onChange={e => setFormData({ ...formData, discountType: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (EGP)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Discount Value</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.discountValue}
                    onChange={e => setFormData({ ...formData, discountValue: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Target Module (Optional)</label>
                <select
                  value={formData.moduleId}
                  onChange={e => setFormData({ ...formData, moduleId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent"
                >
                  <option value="">All Modules (Global)</option>
                  {modules.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Usage Limit (Optional)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 50 (leave blank for unlimited)"
                  value={formData.usageLimit}
                  onChange={e => setFormData({ ...formData, usageLimit: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark"
                >
                  Create Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Codes Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading invite codes...</div>
        ) : codes.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Tag size={40} className="mx-auto mb-3 text-gray-400 opacity-50" />
            <p className="font-medium text-lg">No discount codes created yet.</p>
            <p className="text-sm text-gray-400 mt-1">Create your first coupon code to offer discounts to students.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-sm">
                <tr>
                  <th className="p-4 font-medium">Code</th>
                  <th className="p-4 font-medium">Discount</th>
                  <th className="p-4 font-medium">Applies To</th>
                  <th className="p-4 font-medium">Usage</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {codes.map(c => {
                  const targetModule = modules.find((m: any) => m.id === c.moduleId);
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                      <td className="p-4 font-mono font-bold text-primary">
                        {c.code}
                      </td>
                      <td className="p-4 font-semibold">
                        {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `${c.discountValue} EGP OFF`}
                      </td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                        {targetModule ? targetModule.title : <span className="italic text-teal-600 dark:text-teal-400">All Modules</span>}
                      </td>
                      <td className="p-4 text-sm">
                        <span className="font-medium">{c.usedCount || 0}</span>
                        {c.usageLimit ? ` / ${c.usageLimit}` : ' (Unlimited)'}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${c.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                          {c.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-4 flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleActive(c.id, c.isActive)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${c.isActive ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'}`}
                        >
                          {c.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 transition-colors"
                          title="Delete Code"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
