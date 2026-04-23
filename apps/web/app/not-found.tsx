import Link from 'next/link';

/**
 * Page 404 globale — Next.js App Router.
 *
 * Affichée automatiquement quand une route n'existe pas.
 * Design cohérent avec l'identité MamaCare (rose pastel + UX bienveillante).
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white dark:from-gray-950 dark:to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Icône + code */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#E91E8C]/10 mb-6">
          <span className="text-4xl">🤍</span>
        </div>

        <h1 className="text-6xl font-bold text-[#E91E8C] mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Page introuvable
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
          La page que vous cherchez n&apos;existe pas ou a été déplacée.
          Revenez à l&apos;accueil ou contactez votre médecin si besoin.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-2 items-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-[#E91E8C] text-white rounded-xl text-sm font-medium hover:bg-[#C01875] transition-colors shadow-sm"
          >
            Retour à l&apos;accueil
          </Link>
          <Link
            href="/login"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#E91E8C] transition-colors mt-1"
          >
            Se connecter →
          </Link>
        </div>
      </div>
    </div>
  );
}
