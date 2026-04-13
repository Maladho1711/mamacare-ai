'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, ApiError } from '@/lib/api/client';
import { saveSession } from '@/lib/auth/session';
import Button from '@/components/ui/Button';

interface DevLoginResponse {
  accessToken: string;
  profile: {
    id: string;
    role: 'doctor' | 'patient';
    full_name: string;
    phone: string;
  };
}

type Role = 'doctor' | 'patient';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDevMode, setShowDevMode] = useState(
    process.env.NODE_ENV === 'development'
  );
  const [loadingRole, setLoadingRole] = useState<Role | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setError(null);
    setLoading(true);
    const fullPhone = phone.startsWith('+') ? phone : `+224${phone}`;
    try {
      await apiClient.post('/auth/send-otp', { phone: fullPhone }, { skipAuth: true });
      router.push(`/verify?phone=${encodeURIComponent(fullPhone)}`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Impossible d\u0027envoyer le SMS.";
      setError(message);
      setLoading(false);
    }
  };

  const handleDevLogin = async (role: Role) => {
    setError(null);
    setLoadingRole(role);
    try {
      const data = await apiClient.post<DevLoginResponse>(
        '/auth/dev-login',
        { role },
        { skipAuth: true },
      );
      saveSession({
        token: data.accessToken,
        userId: data.profile.id,
        role: data.profile.role,
        fullName: data.profile.full_name,
      });
      router.replace(role === 'doctor' ? '/dashboard' : '/questionnaire');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erreur inattendue.';
      setError(message);
      setLoadingRole(null);
    }
  };

  return (
    <div className="space-y-4">
      {!showDevMode && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Connexion</h2>
          <p className="text-sm text-gray-500 mb-6">
            Entrez votre num&eacute;ro pour recevoir un code de v&eacute;rification.
          </p>
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                Num&eacute;ro de t&eacute;l&eacute;phone
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-300 bg-gray-50 text-sm text-gray-600 font-medium">
                  +224
                </span>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="6XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ''))}
                  maxLength={9}
                  className="flex-1 px-4 py-3 rounded-r-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#E91E8C] focus:border-transparent"
                  autoComplete="tel"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Vous recevrez un code SMS &agrave; 6 chiffres</p>
            </div>
            <Button type="submit" fullWidth isLoading={loading} disabled={phone.length < 8}>
              Continuer
            </Button>
          </form>
        </div>
      )}

      {showDevMode && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
            <span className="font-bold">Mode d&eacute;mo</span> &mdash; Connexion directe sans SMS
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Connexion</h2>
          <p className="text-sm text-gray-500 mb-6">Choisissez un profil de test.</p>
          <div className="flex flex-col gap-3">
            <button type="button" onClick={() => handleDevLogin('doctor')} disabled={loadingRole !== null}
              className="flex items-center justify-between w-full px-4 py-3.5 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all text-left disabled:opacity-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-lg">&#129658;</div>
                <div>
                  <div className="text-sm font-semibold text-gray-800">Dr. Maladho Barry</div>
                  <div className="text-xs text-gray-500">Dashboard m&eacute;decin</div>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                {loadingRole === 'doctor' ? '...' : 'M\u00e9decin'}
              </span>
            </button>

            <button type="button" onClick={() => handleDevLogin('patient')} disabled={loadingRole !== null}
              className="flex items-center justify-between w-full px-4 py-3.5 rounded-xl border border-gray-200 hover:border-pink-400 hover:bg-pink-50/50 transition-all text-left disabled:opacity-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center text-lg">&#129328;</div>
                <div>
                  <div className="text-sm font-semibold text-gray-800">A&iuml;ssatou Diallo</div>
                  <div className="text-xs text-gray-500">Questionnaire quotidien</div>
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-pink-100 text-pink-700">
                {loadingRole === 'patient' ? '...' : 'Patiente'}
              </span>
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">{error}</div>
      )}

      {process.env.NODE_ENV === 'development' && (
        <button type="button" onClick={() => setShowDevMode(!showDevMode)}
          className="w-full text-center text-xs text-gray-400 hover:text-[#E91E8C] transition-colors py-2">
          {showDevMode ? 'Connexion par t\u00e9l\u00e9phone' : 'Mode d\u00e9veloppeur'}
        </button>
      )}
    </div>
  );
}
