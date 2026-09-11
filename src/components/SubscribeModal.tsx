import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Upload, Loader2, CreditCard, ShieldCheck, Tag } from 'lucide-react';
import { fetchApi } from '../lib/api';

interface PaymentMethod {
  id: number;
  methodType: string;
  displayName: string;
  accountDetails: string;
  instructions: string | null;
}

interface SubscribeModalProps {
  module: {
    id: number;
    title: string;
    price: number;
    durationType?: string;
    durationDays?: number | null;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SubscribeModal({ module, isOpen, onClose, onSuccess }: SubscribeModalProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
  const [walletNumber, setWalletNumber] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Discount code states
  const [discountCodeInput, setDiscountCodeInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; discountType: string; discountValue: number } | null>(null);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoadingMethods(true);
      setDiscountCodeInput('');
      setAppliedDiscount(null);
      setDiscountError(null);
      fetchApi('/api/payment-methods')
        .then((data) => {
          setPaymentMethods(data);
          if (data.length > 0) {
            setSelectedMethodId(data[0].id);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch payment methods', err);
        })
        .finally(() => setLoadingMethods(false));
    }
  }, [isOpen]);

  if (!isOpen || !module) return null;

  const selectedMethod = paymentMethods.find(m => m.id === selectedMethodId) || paymentMethods[0];

  const handleValidateDiscount = async () => {
    if (!discountCodeInput.trim()) return;
    setDiscountLoading(true);
    setDiscountError(null);
    try {
      const res = await fetchApi('/api/discount/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: discountCodeInput, moduleId: module.id })
      });
      setAppliedDiscount(res);
      setDiscountCodeInput('');
    } catch (err: any) {
      setDiscountError(err.message || 'Invalid or expired discount code');
    } finally {
      setDiscountLoading(false);
    }
  };

  const discountAmount = appliedDiscount
    ? (appliedDiscount.discountType === 'percentage'
        ? (module.price * appliedDiscount.discountValue) / 100
        : appliedDiscount.discountValue)
    : 0;
  const finalPrice = Math.max(0, module.price - discountAmount);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setError('Image file size must be under 8MB');
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotUrl(reader.result as string);
      setUploading(false);
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read file');
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletNumber.trim()) {
      setError('Please enter your sender wallet number or account / username');
      return;
    }
    if (!screenshotUrl) {
      setError('Please upload the payment confirmation screenshot');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetchApi(`/api/modules/${module.id}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletNumber,
          screenshotUrl,
          paymentMethodId: selectedMethodId,
          discountCode: appliedDiscount?.code || null
        })
      });
      if (res.whatsappUrl) {
        setWhatsappUrl(res.whatsappUrl);
        window.open(res.whatsappUrl, '_blank');
      }
      setSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to submit payment request');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setWalletNumber('');
    setScreenshotUrl('');
    setSuccess(false);
    setError(null);
    setAppliedDiscount(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in-up">
      <div 
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#1A2327] border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        id="subscribe-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-primary">
              <CreditCard size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Module Subscription
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {module.title}
              </p>
            </div>
          </div>
          <button
            onClick={resetAndClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          {success ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle size={36} />
              </div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Payment Request Submitted!
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto mb-6 leading-relaxed">
                Your subscription request for <span className="font-semibold text-primary">{module.title}</span> is now pending admin verification. You will gain access once verified.
              </p>
              {whatsappUrl && (
                <div className="mb-4">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 shadow-md mb-3"
                  >
                    💬 إرسال تفاصيل الإيصال عبر واتساب للأدمن
                  </a>
                </div>
              )}
              <button
                onClick={resetAndClose}
                className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-medium text-sm transition-colors shadow-sm"
              >
                Close & Continue
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Pricing & Duration Banner */}
              <div className="p-4 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/50 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-teal-800 dark:text-teal-300">
                    Subscription Fee
                  </div>
                  <div className="text-xl font-bold text-teal-950 dark:text-teal-100 flex items-center gap-2">
                    {appliedDiscount ? (
                      <>
                        <span className="line-through text-gray-400 text-base">{module.price} EGP</span>
                        <span className="text-emerald-600 dark:text-emerald-400">{finalPrice} EGP</span>
                      </>
                    ) : (
                      <span>{module.price > 0 ? `${module.price} EGP` : 'Free'}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium text-teal-800 dark:text-teal-300">
                    Access Duration
                  </div>
                  <div className="text-sm font-semibold text-teal-900 dark:text-teal-200">
                    {module.durationType === 'fixed' ? `${module.durationDays || 30} Days` : 'Lifetime Access'}
                  </div>
                </div>
              </div>

              {/* Discount Code Section */}
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-2">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Tag size={14} className="text-primary" />
                  Have a discount code?
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={discountCodeInput}
                    onChange={e => setDiscountCodeInput(e.target.value.toUpperCase())}
                    placeholder="Enter coupon code"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 font-mono text-xs uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleValidateDiscount}
                    disabled={discountLoading || !discountCodeInput.trim()}
                    className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
                  >
                    {discountLoading ? 'Checking...' : 'Apply'}
                  </button>
                </div>
                {appliedDiscount && (
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-between pt-1">
                    <span>✓ Code "{appliedDiscount.code}" applied ({appliedDiscount.discountType === 'percentage' ? `${appliedDiscount.discountValue}% off` : `${appliedDiscount.discountValue} EGP off`})</span>
                    <button type="button" onClick={() => setAppliedDiscount(null)} className="text-red-500 hover:underline">Remove</button>
                  </div>
                )}
                {discountError && (
                  <div className="text-xs text-red-500 font-medium">{discountError}</div>
                )}
              </div>

              {/* Payment Methods */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Payment Method
                </label>
                {loadingMethods ? (
                  <div className="text-sm text-gray-500 py-2">Loading payment methods...</div>
                ) : paymentMethods.length === 0 ? (
                  <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
                    Default: Vodafone Cash (Admin hasn't configured custom methods yet).
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {paymentMethods.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMethodId(m.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${selectedMethodId === m.id ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-1 ring-primary' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                      >
                        <div className="font-semibold text-sm">{m.displayName}</div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5 truncate">{m.accountDetails}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Instructions Banner */}
              {selectedMethod && (
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-xs space-y-1.5">
                  <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                    <span>Instructions for {selectedMethod.displayName}:</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                    Please transfer <span className="font-bold text-primary">{finalPrice} EGP</span> to wallet/account number: <span className="font-mono font-bold">{selectedMethod.accountDetails}</span>
                  </p>
                  {selectedMethod.instructions && (
                    <p className="text-gray-500 dark:text-gray-400 italic">
                      {selectedMethod.instructions}
                    </p>
                  )}
                </div>
              )}

              {/* Sender Wallet / Account Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Your Sender Phone / Wallet / Account Number *
                </label>
                <input
                  type="text"
                  required
                  value={walletNumber}
                  onChange={e => setWalletNumber(e.target.value)}
                  placeholder="e.g. 01012345678"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Screenshot Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Upload Payment Confirmation Screenshot *
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl cursor-pointer hover:border-primary transition-colors bg-gray-50/50 dark:bg-gray-800/50">
                    <Upload size={24} className="text-gray-400 mb-1" />
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                      {screenshotUrl ? 'Screenshot attached (Click to change)' : 'Click to upload receipt image'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
                {uploading && <div className="text-xs text-primary mt-1">Processing image...</div>}
                {screenshotUrl && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600 font-medium">
                    <span>✓ Receipt uploaded successfully</span>
                    <a href={screenshotUrl} target="_blank" rel="noreferrer" className="underline">Preview</a>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || uploading}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-sm transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                Submit Subscription Request
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
