// Page de fallback hors-ligne — servie par le Service Worker quand toute
// navigation échoue sans connexion.
// PAS de 'use client' — page statique précachée par next-pwa au build.

export const metadata = {
  title: 'Hors-ligne — MamaCare',
};

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center gap-5">
      <div className="text-5xl" aria-hidden="true">📵</div>

      <div>
        <h1 className="text-xl font-bold text-gray-800">Vous êtes hors-ligne</h1>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed max-w-xs mx-auto">
          Pas de connexion internet. Vos réponses au questionnaire sont
          sauvegardées localement et seront envoyées dès que vous serez
          reconnectée.
        </p>
      </div>

      <div className="bg-[#FDE8F3] border border-pink-200 rounded-xl p-4 max-w-sm w-full text-left">
        <p className="text-xs font-semibold text-[#C9177A] uppercase tracking-wide mb-2">
          Que faire maintenant ?
        </p>
        <ul className="text-sm text-[#A81266] space-y-1.5">
          <li>• Vérifiez votre connexion WiFi ou 4G</li>
          <li>• Votre questionnaire du jour est sauvegardé</li>
          <li>• Revenez dès que vous avez du réseau</li>
          <li>• En urgence, appelez directement votre médecin</li>
        </ul>
      </div>

      <a
        href="/questionnaire"
        className="text-sm text-[#E91E8C] hover:underline font-medium"
      >
        ← Retour au questionnaire
      </a>
    </main>
  );
}
