export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Formes decoratives */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-pink-100 rounded-full opacity-30 -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-pink-100 rounded-full opacity-20 translate-y-1/3 -translate-x-1/4" />
      <div className="absolute top-1/3 left-10 w-3 h-3 bg-[#E91E8C] rounded-full opacity-20" />
      <div className="absolute top-1/4 right-16 w-2 h-2 bg-[#E91E8C] rounded-full opacity-15" />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo + branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#E91E8C] to-[#A81266] mb-4 shadow-lg shadow-pink-200">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="32" height="32">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MamaCare AI</h1>
          <p className="text-sm text-gray-500 mt-1">
            {"Sant\u00e9 maternelle intelligente pour la Guin\u00e9e"}
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}
