'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient, ApiError } from '@/lib/api/client';
import { saveSession } from '@/lib/auth/session';
import OtpInput from '@/components/auth/OtpInput';

interface VerifyResponse {
  accessToken: string;
  profile: {
    id:        string;
    role:      'doctor' | 'patient' | 'admin';
    full_name: string;
    phone:     string;
  };
}

const RESEND_DELAY = 60;

export default function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';
  const devCode = searchParams.get('dev') || ''; // Mode test : code pré-rempli

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(RESEND_DELAY);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    if (!phone) router.replace('/login');
  }, [phone, router]);

  const handleVerify = useCallback(async (code: string) => {
    setError(null);
    setLoading(true);

    try {
      const data = await apiClient.post<VerifyResponse>(
        '/auth/verify-otp',
        { phone, token: code },
        { skipAuth: true },
      );

      saveSession({
        token:    data.accessToken ?? '',
        userId:   data.profile.id,
        role:     data.profile.role,
        fullName: data.profile.full_name,
      });

      router.replace(
        data.profile.role === 'doctor' || data.profile.role === 'admin'
          ? '/dashboard'
          : '/questionnaire',
      );
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Code invalide. Veuillez r\u00e9essayer.';
      setError(message);
      setLoading(false);
    }
  }, [phone, router]);

  const handleResend = async () => {
    setResending(true);
    setError(null);
    try {
      await apiClient.post('/auth/send-otp', { phone }, { skipAuth: true });
      setResendTimer(RESEND_DELAY);
    } catch {
      setError('Impossible de renvoyer le code.');
    } finally {
      setResending(false);
    }
  };

  if (!phone) return null;

  const maskedPhone = phone.replace(/(\+\d{3})\d{4}(\d{3})/, '$1****$2');

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-1">
        V&eacute;rification
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Entrez le code &agrave; 6 chiffres envoy&eacute; au{' '}
        <span className="font-medium text-gray-700">{maskedPhone}</span>
      </p>

      {devCode && (
        <div className="mb-4 px-3 py-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">🧪 Mode test</p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
            Code à utiliser : <strong className="font-mono text-base">{devCode}</strong>
          </p>
        </div>
      )}

      <div className="mb-6">
        <OtpInput onComplete={handleVerify} disabled={loading} initialValue={devCode} />
      </div>

      {loading && (
        <div className="flex justify-center mb-4">
          <div className="w-5 h-5 border-2 border-[#E91E8C] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="text-center space-y-3">
        {resendTimer > 0 ? (
          <p className="text-xs text-gray-400">
            Renvoyer dans {resendTimer}s
          </p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-sm font-medium text-[#E91E8C] hover:text-[#C9177A] transition-colors disabled:opacity-50"
          >
            {resending ? 'Envoi...' : 'Renvoyer le code'}
          </button>
        )}

        <button
          type="button"
          onClick={() => router.back()}
          className="block w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Changer de num&eacute;ro
        </button>
      </div>
    </div>
  );
}
