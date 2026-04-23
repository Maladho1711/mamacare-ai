import Link from 'next/link';
import ScrollReveal from '@/components/ui/ScrollReveal';

/**
 * Landing page MamaCare AI.
 * Présente la plateforme aux visiteurs et redirige vers le login.
 * Server Component — zero JS côté client, chargement instantané.
 */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* -- Hero Section ----------------------------------------------------- */}
      <header className="bg-gradient-to-br from-pink-50 via-white to-pink-50">
        <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#E91E8C] flex items-center justify-center">
              <span className="text-white text-lg">&#9829;</span>
            </div>
            <span className="text-lg font-bold text-gray-900">MamaCare</span>
          </div>
          <Link
            href="/login"
            className="text-sm font-semibold text-[#E91E8C] hover:text-[#C9177A] transition-colors px-4 py-2 rounded-xl hover:bg-pink-50"
          >
            Se connecter
          </Link>
        </nav>

        <div className="max-w-6xl mx-auto px-4 pt-12 pb-20 md:pt-20 md:pb-28">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-100 text-[#E91E8C] text-xs font-semibold mb-6">
              <span className="w-2 h-2 rounded-full bg-[#E91E8C] animate-pulse" />
              Santé maternelle propulsée par l&apos;IA
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight tracking-tight">
              Chaque grossesse
              <span className="text-[#E91E8C]"> protégée,</span>
              <br />
              chaque mère
              <span className="text-[#E91E8C]"> accompagnée</span>
            </h1>

            <p className="mt-6 text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
              MamaCare AI aide les femmes enceintes guinéennes à surveiller
              leur santé au quotidien et alerte leurs médecins en temps réel
              en cas de danger.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-[#E91E8C] text-white font-semibold text-sm hover:bg-[#C9177A] active:bg-[#A81266] transition-colors shadow-lg shadow-pink-200"
              >
                Commencer maintenant
              </Link>
              <a
                href="#fonctionnement"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:border-[#E91E8C] hover:text-[#E91E8C] transition-colors"
              >
                Comment ça marche ?
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* -- Stats Section ---------------------------------------------------- */}
      <section className="bg-[#E91E8C] py-12">
        <div className="max-w-6xl mx-auto px-4">
          <ScrollReveal>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
              {[
                { value: ‘550’, label: ‘Décès maternels / 100k’, sub: ‘en Guinée’ },
                { value: ‘<3 min’, label: ‘Questionnaire quotidien’, sub: ‘simple et rapide’ },
                { value: ‘<2 min’, label: "Délai d’alerte", sub: ‘au médecin’ },
                { value: ‘24/7’, label: ‘Surveillance IA’, sub: ‘protocole OMS’ },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-3xl md:text-4xl font-bold">{stat.value}</div>
                  <div className="text-sm font-medium mt-1 text-pink-100">{stat.label}</div>
                  <div className="text-xs text-pink-200 mt-0.5">{stat.sub}</div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* -- Problème -------------------------------------------------------- */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <ScrollReveal>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                Les 3 retards qui tuent
              </h2>
              <p className="mt-3 text-gray-600">
                En Guinée, la mortalité maternelle est liée à trois retards
                critiques. MamaCare s&apos;attaque aux trois.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: ‘⏱️’,
                title: ‘Retard de décision’,
                desc: ‘La femme ne reconnaît pas les signes de danger. MamaCare pose les bonnes questions chaque jour et explique les risques en français simple.’,
                color: ‘bg-red-50 text-red-600’,
              },
              {
                icon: ‘📱’,
                title: "Retard d’accès",
                desc: "Le médecin est alerté trop tard. MamaCare envoie une alerte WhatsApp + SMS au médecin en moins de 2 minutes.",
                color: ‘bg-orange-50 text-orange-600’,
              },
              {
                icon: ‘📋’,
                title: ‘Retard de traitement’,
                desc: "Le médecin manque d’informations. MamaCare fournit l’historique complet des symptômes sur 30 jours avec analyse IA.",
                color: ‘bg-green-50 text-green-600’,
              },
            ].map((item, i) => (
              <ScrollReveal key={item.title} delayMs={i * 100}>
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm h-full">
                  <div
                    className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center text-2xl mb-4`}
                  >
                    {item.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* -- Comment ça marche ----------------------------------------------- */}
      <section id="fonctionnement" className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              Comment ça marche ?
            </h2>
            <p className="mt-3 text-gray-600">
              Un processus simple en 4 étapes pour protéger chaque grossesse.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                step: ‘1’,
                title: ‘Inscription’,
                desc: "Le médecin crée le profil de sa patiente. Elle reçoit un lien SMS pour accéder à l’app.",
              },
              {
                step: ‘2’,
                title: ‘Questionnaire quotidien’,
                desc: ‘Chaque matin, la patiente répond à 10-15 questions simples sur ses symptômes en moins de 3 minutes.’,
              },
              {
                step: ‘3’,
                title: ‘Analyse IA + OMS’,
                desc: "L’IA analyse les réponses selon les protocoles OMS et attribue un niveau d’alerte : vert, orange ou rouge.",
              },
              {
                step: ‘4’,
                title: ‘Alerte au médecin’,
                desc: ‘En cas de danger, le médecin reçoit une alerte WhatsApp immédiate avec les détails des symptômes.’,
              },
            ].map((item, i) => (
              <ScrollReveal key={item.step} delayMs={i * 100}>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-[#E91E8C] text-white font-bold text-lg flex items-center justify-center mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* -- Pour qui ? ------------------------------------------------------- */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              Pour qui ?
            </h2>
          </div>

          <ScrollReveal>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Patiente */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-pink-100 flex items-center justify-center text-3xl mb-5">
                🤰
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Pour les futures mamans
              </h3>
              <ul className="space-y-3 text-sm text-gray-600">
                {[
                  'Questionnaire simple en français, moins de 3 minutes',
                  'Explication claire de vos symptômes par l’IA',
                  'Historique complet de votre grossesse',
                  'Fonctionne même avec une connexion lente',
                  'Aucun téléchargement — s’installe directement',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-[#E91E8C] mt-0.5 shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Médecin */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-3xl mb-5">
                🩺
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Pour les médecins
              </h3>
              <ul className="space-y-3 text-sm text-gray-600">
                {[
                  'Dashboard temps réel de toutes vos patientes',
                  'Alertes WhatsApp + SMS en cas d’urgence',
                  'Historique 30 jours avec graphique d’évolution',
                  'Tri automatique par niveau de risque',
                  'Gestion complète des profils patientes',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5 shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          </ScrollReveal>
        </div>
      </section>

      {/* -- Technologie ------------------------------------------------------ */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              Technologie de confiance
            </h2>
            <p className="mt-3 text-gray-600">
              MamaCare combine intelligence artificielle et protocoles médicaux
              éprouvés.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '🤖', label: 'IA Claude', desc: 'Analyse médicale' },
              { icon: '📋', label: 'Protocole OMS', desc: 'Règles validées' },
              { icon: '💬', label: 'WhatsApp', desc: 'Alertes instant.' },
              { icon: '📱', label: 'PWA Mobile', desc: 'Fonctionne offline' },
            ].map((tech) => (
              <div
                key={tech.label}
                className="bg-gray-50 rounded-2xl p-5 text-center border border-gray-100"
              >
                <div className="text-3xl mb-2">{tech.icon}</div>
                <div className="text-sm font-semibold text-gray-900">{tech.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{tech.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -- FAQ ------------------------------------------------------------- */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">
            Questions fréquentes
          </h2>
          <div className="flex flex-col gap-4">
            {[
              {
                q: "Est-ce que MamaCare remplace mon médecin ?",
                a: "Non. MamaCare est un outil de suivi qui complète le travail de votre médecin. L'application ne pose jamais de diagnostic et dirige toujours vers votre professionnel de santé.",
              },
              {
                q: "Combien coûte MamaCare ?",
                a: "MamaCare est entièrement gratuit pendant la phase pilote. Aucun frais pour les patientes ni pour les médecins.",
              },
              {
                q: "J'ai une connexion internet instable, ça marche quand même ?",
                a: "Oui. MamaCare est conçu pour fonctionner avec une connexion lente ou intermittente. Vos réponses sont sauvegardées localement et envoyées dès que la connexion revient.",
              },
              {
                q: "Comment mon médecin est-il alerté ?",
                a: "En cas de danger, votre médecin reçoit immédiatement une alerte WhatsApp. Si le WhatsApp ne passe pas, un SMS est envoyé en moins de 5 minutes.",
              },
            ].map((faq) => (
              <details
                key={faq.q}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm group"
              >
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-semibold text-gray-800 list-none">
                  {faq.q}
                  <span className="text-gray-400 group-open:rotate-45 transition-transform text-lg ml-3">+</span>
                </summary>
                <p className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* -- CTA Final -------------------------------------------------------- */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-[#E91E8C] to-[#A81266]">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            Protégez vos patientes dès aujourd&apos;hui
          </h2>
          <p className="mt-4 text-pink-100 text-base leading-relaxed">
            Rejoignez le programme pilote MamaCare AI.
            Gratuit pour les médecins et leurs patientes.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-white text-[#E91E8C] font-bold text-sm hover:bg-pink-50 transition-colors shadow-lg"
            >
              Accéder à MamaCare
            </Link>
          </div>
        </div>
      </section>

      {/* -- Footer ----------------------------------------------------------- */}
      <footer className="py-8 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#E91E8C] flex items-center justify-center">
                <span className="text-white text-sm">&#9829;</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                MamaCare AI
              </span>
            </div>
            <p className="text-xs text-gray-500">
              &copy; {new Date().getFullYear()} ImprOOve — Guinée. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
