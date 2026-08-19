import { useState, useEffect } from 'react';
import { ArrowUpRight, Landmark } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function HeroGreeting({ onApplyHajj }: { onApplyHajj: () => void }) {
  const { profile } = useAuth();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours();
  let greeting = 'Good evening';
  let greetingBn = 'শুভ সন্ধ্যা';
  let emoji = '🌙';

  if (hours < 12) {
    greeting = 'Good morning';
    greetingBn = 'শুভ সকাল';
    emoji = '🌤️';
  } else if (hours < 17) {
    greeting = 'Good afternoon';
    greetingBn = 'শুভ দুপুর';
    emoji = '☀️';
  }

  const userName = profile?.full_name?.split(' ')[0] || 'Admin';

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-sky-950 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8 border border-white/10">
      {/* Subtle Background Glows */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Left: Greeting & Welcome text */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-sky-200 border border-white/10">
            <span>{emoji}</span>
            <span>{greetingBn} / {greeting}, {userName}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Sonar Madina Travel & ERP Dashboard
          </h2>

          <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
            Monitor live air ticket sales, pilgrim visas, hotel bookings, and cash flow in real-time.
          </p>
        </div>

        {/* Right: Currency Rates & Live Clock Widget */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Live Currency Cards */}
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/10 text-xs">
            <div className="p-1.5 bg-amber-400/20 text-amber-300 rounded-lg font-black">SAR</div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">1 SAR (Riyal)</div>
              <div className="font-bold text-white text-sm">৳ 32.45</div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/10 text-xs">
            <div className="p-1.5 bg-emerald-400/20 text-emerald-300 rounded-lg font-black">USD</div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">1 USD (Dollar)</div>
              <div className="font-bold text-white text-sm">৳ 121.80</div>
            </div>
          </div>

          {/* Quick Hajj Promo Action */}
          <button
            onClick={onApplyHajj}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold rounded-2xl text-xs transition-all duration-200 shadow-lg hover:shadow-amber-400/20 hover:-translate-y-0.5"
          >
            <Landmark className="w-4 h-4 text-slate-950" />
            <span>Hajj 2025 Portal</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
