import { useEffect, useState } from 'react';
import { fetchApi } from '../lib/api';
import { Check, X, Clock, CreditCard, Tag } from 'lucide-react';
import UserManager from '../components/admin/UserManager';
import ContentManager from '../components/admin/ContentManager';
import PaymentSettingsManager from '../components/admin/PaymentSettingsManager';
import InviteCodesManager from '../components/admin/InviteCodesManager';

export default function AdminDashboard() {
  const [tab, setTab] = useState<'payments' | 'users' | 'content' | 'payment_settings' | 'invite_codes'>('content');
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    try {
      const res = await fetchApi('/api/admin/payments');
      setPayments(res);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch payments', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'payments') fetchPayments();
  }, [tab]);

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    try {
      await fetchApi(`/api/admin/payments/${id}/${action}`, { method: 'POST' });
      setPayments(prev => prev.filter(p => p.id !== id));
    } catch (error: any) {
      console.error(`Failed to ${action} payment:`, error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      <div className="flex flex-wrap gap-3 mb-6">
        <button 
          onClick={() => setTab('content')} 
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${tab === 'content' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}
        >
          Content Management
        </button>
        <button 
          onClick={() => setTab('users')} 
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${tab === 'users' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}
        >
          Users & Roles
        </button>
        <button 
          onClick={() => setTab('payments')} 
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${tab === 'payments' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}
        >
          Payments
        </button>
        <button 
          onClick={() => setTab('payment_settings')} 
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${tab === 'payment_settings' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}
        >
          <CreditCard size={16} />
          Payment Settings
        </button>
        <button 
          onClick={() => setTab('invite_codes')} 
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${tab === 'invite_codes' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}
        >
          <Tag size={16} />
          Discount Codes
        </button>
      </div>

      {tab === 'content' && <ContentManager />}
      
      {tab === 'users' && <UserManager />}

      {tab === 'payment_settings' && <PaymentSettingsManager />}

      {tab === 'invite_codes' && <InviteCodesManager />}

      {tab === 'payments' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Clock size={20} className="text-primary" />
              Pending Payment Requests
            </h2>
          </div>
          
          {loading ? (
             <div className="p-8 text-center text-gray-500">Loading payments...</div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No pending payment requests.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-sm">
                  <tr>
                    <th className="p-4 font-medium">Student</th>
                    <th className="p-4 font-medium">Module</th>
                    <th className="p-4 font-medium">Payment Method & Details</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {payments.map(payment => (
                    <tr key={payment.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                      <td className="p-4">
                        <div className="font-medium">{payment.student?.name}</div>
                        <div className="text-sm text-gray-500">{payment.student?.email}</div>
                      </td>
                      <td className="p-4 font-medium">
                        {payment.module?.title}
                        {payment.discountCode && (
                          <div className="text-xs text-teal-600 dark:text-teal-400 font-mono mt-0.5">
                            Coupon Used: {payment.discountCode}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 mb-1">
                          {payment.paymentMethod?.displayName || 'Vodafone Cash / Standard'}
                        </div>
                        <div className="text-sm font-mono font-medium text-gray-800 dark:text-gray-200">
                          Sender: {payment.walletNumber}
                        </div>
                        {payment.paymentMethod?.accountDetails && (
                          <div className="text-xs text-gray-500">
                            Target Account: {payment.paymentMethod.accountDetails}
                          </div>
                        )}
                        {payment.screenshotUrl && (
                          <div className="mt-1">
                            <a href={payment.screenshotUrl} target="_blank" rel="noreferrer" className="text-primary text-xs font-medium hover:underline inline-flex items-center gap-1">
                              View Receipt Screenshot →
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="p-4 flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleAction(payment.id, 'approve')}
                          className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 transition-colors"
                          title="Approve & Subscribe"
                        >
                          <Check size={18} />
                        </button>
                        <button 
                          onClick={() => handleAction(payment.id, 'reject')}
                          className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 transition-colors"
                          title="Reject"
                        >
                          <X size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
