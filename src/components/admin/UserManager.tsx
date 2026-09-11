import { useState, useEffect } from 'react';
import { fetchApi } from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import { X, Loader2, AlertCircle, ShieldCheck, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function UserManager() {
  const currentUser = useAuthStore(state => state.user);
  const [users, setUsers] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Promote / Demote confirmation modal state
  const [actionModal, setActionModal] = useState<{
    type: 'promote' | 'demote';
    user: any;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // In-app alert notification banner
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Enroll Modal state
  const [enrollModalUser, setEnrollModalUser] = useState<any | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [enrollLoading, setEnrollLoading] = useState(false);

  const load = async () => {
    try {
      const [usersRes, hierarchyRes] = await Promise.all([
        fetchApi('/api/admin/users'),
        fetchApi('/api/admin/hierarchy')
      ]);
      setUsers(usersRes);
      setModules(hierarchyRes.modules || []);
    } catch (e: any) {
      console.error('[LOAD_USERS_ERROR]', e);
      setNotification({ type: 'error', message: e.message || 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const executeAction = async () => {
    if (!actionModal) return;
    const { type, user } = actionModal;
    const url = `/api/admin/users/${user.id}/${type}`;
    
    console.log(`[FRONTEND_${type.toUpperCase()}_REQUEST]`, {
      url,
      method: 'POST',
      body: null,
      targetUserId: user.id,
      targetUserEmail: user.email
    });

    setActionLoading(true);
    try {
      const response = await fetchApi(url, { method: 'POST' });
      console.log(`[FRONTEND_${type.toUpperCase()}_RESPONSE]`, response);
      
      setNotification({
        type: 'success',
        message: type === 'promote' 
          ? `User "${user.name}" (${user.email}) has been promoted to Admin successfully.`
          : `Admin "${user.name}" (${user.email}) has been demoted to Student successfully.`
      });
      setActionModal(null);
      await load();
    } catch (error: any) {
      console.error(`[FRONTEND_${type.toUpperCase()}_ERROR]`, error);
      setNotification({
        type: 'error',
        message: error.message || `Failed to ${type} user.`
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!selectedModuleId || !enrollModalUser) return;
    setEnrollLoading(true);
    const url = `/api/admin/users/${enrollModalUser.id}/enroll`;
    const body = { moduleId: parseInt(selectedModuleId) };

    console.log('[FRONTEND_ENROLL_REQUEST]', {
      url,
      method: 'POST',
      body,
      studentId: enrollModalUser.id
    });

    try {
      const res = await fetchApi(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      console.log('[FRONTEND_ENROLL_RESPONSE]', res);
      setNotification({
        type: 'success',
        message: `Student "${enrollModalUser.name}" enrolled successfully.`
      });
      setEnrollModalUser(null);
      setSelectedModuleId('');
      await load();
    } catch (e: any) {
      console.error('[FRONTEND_ENROLL_ERROR]', e);
      setNotification({
        type: 'error',
        message: e.message || 'Failed to enroll student.'
      });
    } finally {
      setEnrollLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading users...</div>;

  const admins = users.filter(u => u.role === 'admin');
  const students = users.filter(u => u.role !== 'admin');

  // Preview expiry logic
  const selectedModule = modules.find(m => m.id.toString() === selectedModuleId);
  let predictedExpiry: Date | null = null;
  if (selectedModule && selectedModule.durationType === 'fixed' && selectedModule.durationDays) {
    predictedExpiry = new Date();
    predictedExpiry.setDate(predictedExpiry.getDate() + selectedModule.durationDays);
  }

  const renderSubscriptions = (subs: any[]) => {
    if (!subs || subs.length === 0) {
      return <p className="text-xs text-gray-500 mt-2">No active subscriptions</p>;
    }
    
    return (
      <div className="mt-2 space-y-1">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Active Subscriptions:</p>
        <div className="flex flex-wrap gap-2">
          {subs.map(sub => {
            let isExpiringSoon = false;
            let expiryText = 'Open-ended';
            
            if (sub.expiryDate) {
              const expiry = new Date(sub.expiryDate);
              const now = new Date();
              const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              expiryText = `Ends: ${expiry.toLocaleDateString()}`;
              if (diffDays <= 7 && diffDays >= 0) {
                isExpiringSoon = true;
              }
            }

            return (
              <div key={sub.id} className="inline-flex items-center gap-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-xs">
                <span className="font-medium">{sub.moduleTitle}</span>
                <span className="text-gray-500">| {expiryText}</span>
                {isExpiringSoon && (
                  <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium ml-1">
                    <AlertCircle size={12} /> Expiring soon
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {notification && (
        <div className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-medium ${
          notification.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' 
            : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-75">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Admins Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
          <h2 className="text-xl font-bold">Admins ({admins.length})</h2>
        </div>
        <div className="p-4 divide-y divide-gray-100 dark:divide-gray-700">
          {admins.map(u => (
            <div key={u.id} className="py-4 flex justify-between items-center">
              <div>
                <p className="font-bold flex items-center gap-2">
                  {u.name}
                  <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                    Admin
                  </span>
                </p>
                <p className="text-sm text-gray-500">{u.email}</p>
              </div>
              {currentUser?.id !== u.id && u.email !== 'o.20x25@gmail.com' && (
                <button 
                  onClick={() => setActionModal({ type: 'demote', user: u })} 
                  className="px-4 py-2 text-sm bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 font-medium rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                >
                  Demote to Student
                </button>
              )}
            </div>
          ))}
          {admins.length === 0 && <p className="text-gray-500">No admins found.</p>}
        </div>
      </div>

      {/* Students Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
          <h2 className="text-xl font-bold">Students ({students.length})</h2>
        </div>
        <div className="p-4 divide-y divide-gray-100 dark:divide-gray-700">
          {students.map(u => (
            <div key={u.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <p className="font-bold flex items-center gap-2">
                  {u.name}
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                    Student
                  </span>
                </p>
                <p className="text-sm text-gray-500 mb-1">{u.email}</p>
                <div className="flex flex-wrap gap-2 text-xs mb-2">
                  {u.academicYear && (
                    <span className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-medium">
                      🎓 {u.academicYear}
                    </span>
                  )}
                  {u.phoneNumber && (
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-medium">
                      📱 {u.phoneNumber}
                    </span>
                  )}
                </div>
                {renderSubscriptions(u.subscriptions)}
              </div>
              <div className="flex gap-2 shrink-0">
                <button 
                  onClick={() => setEnrollModalUser(u)} 
                  className="px-4 py-2 text-sm bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                >
                  Manual Enroll
                </button>
                <button 
                  onClick={() => setActionModal({ type: 'promote', user: u })} 
                  className="px-4 py-2 text-sm bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition-colors"
                >
                  Promote to Admin
                </button>
              </div>
            </div>
          ))}
          {students.length === 0 && <p className="text-gray-500">No students found.</p>}
        </div>
      </div>

      {/* Action Modal for Promote / Demote */}
      {actionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold flex items-center gap-2">
                {actionModal.type === 'promote' ? (
                  <><ShieldCheck className="text-primary" size={22} /> Promote to Admin</>
                ) : (
                  <><ShieldAlert className="text-red-500" size={22} /> Demote to Student</>
                )}
              </h3>
              <button 
                onClick={() => setActionModal(null)} 
                disabled={actionLoading}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                {actionModal.type === 'promote' ? (
                  <>Are you sure you want to promote <strong className="text-gray-900 dark:text-white">{actionModal.user.name}</strong> (<em>{actionModal.user.email}</em>) to <strong>Admin</strong>? They will be granted full access to the administration dashboard and content management.</>
                ) : (
                  <>Are you sure you want to demote <strong className="text-gray-900 dark:text-white">{actionModal.user.name}</strong> (<em>{actionModal.user.email}</em>) to <strong>Student</strong>? They will lose access to administrative tools.</>
                )}
              </p>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  disabled={actionLoading}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={executeAction}
                  disabled={actionLoading}
                  className={`px-4 py-2 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 ${
                    actionModal.type === 'promote' 
                      ? 'bg-primary hover:bg-primary-dark' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {actionLoading && <Loader2 size={16} className="animate-spin" />}
                  {actionLoading 
                    ? (actionModal.type === 'promote' ? 'Promoting...' : 'Demoting...')
                    : (actionModal.type === 'promote' ? 'Confirm Promote' : 'Confirm Demote')
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Enroll Modal */}
      {enrollModalUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold">Manual Enroll - {enrollModalUser.name}</h3>
              <button onClick={() => { setEnrollModalUser(null); setSelectedModuleId(''); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select Module
                </label>
                <select
                  value={selectedModuleId}
                  onChange={(e) => setSelectedModuleId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-900"
                >
                  <option value="" disabled>Select a module...</option>
                  {modules.map(m => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>

              {selectedModule && (
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
                  <p><span className="font-medium text-gray-700 dark:text-gray-300">Duration Type:</span> {selectedModule.durationType === 'fixed' ? 'Fixed Duration' : 'Open-ended'}</p>
                  {selectedModule.durationType === 'fixed' && predictedExpiry && (
                    <p className="mt-1"><span className="font-medium text-gray-700 dark:text-gray-300">Predicted Expiry:</span> {predictedExpiry.toLocaleDateString()}</p>
                  )}
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => { setEnrollModalUser(null); setSelectedModuleId(''); }}
                  disabled={enrollLoading}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEnroll}
                  disabled={enrollLoading || !selectedModuleId}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {enrollLoading && <Loader2 size={16} className="animate-spin" />}
                  {enrollLoading ? 'Enrolling...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
