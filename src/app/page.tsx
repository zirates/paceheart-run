import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-orange-50">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">❤️</span>
          <span className="font-bold text-xl text-brand-700">PaceHeart</span>
        </div>
        <div className="flex gap-3">
          <Link href="/auth/login" className="btn-secondary text-sm py-2 px-4">
            Log in
          </Link>
          <Link href="/auth/signup" className="btn-primary text-sm py-2 px-4">
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto text-center px-6 pt-20 pb-16">
        <div className="inline-block bg-brand-100 text-brand-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
          100% Free · No App Download Required
        </div>
        <h1 className="text-5xl font-extrabold text-gray-900 leading-tight mb-6">
          Run Faster.<br />
          <span className="text-brand-600">Run Fitter.</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
          The only free web app that helps you hit both a{' '}
          <strong>pace goal</strong> and a <strong>heart rate goal</strong> —
          proving real cardiovascular improvement, not just speed.
        </p>
        <Link href="/auth/signup" className="btn-primary text-lg py-4 px-10 inline-block">
          Start Your Free Plan →
        </Link>
        <p className="text-sm text-gray-400 mt-4">
          No credit card. No app store. Just run.
        </p>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-20 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            icon: '🎯',
            title: 'Dual Goals',
            desc: 'Set a target pace AND a target heart rate. Track real fitness gains, not just speed.',
          },
          {
            icon: '📋',
            title: 'Smart Training Plans',
            desc: 'Science-backed plans for all levels — 5K to Marathon — built around your current fitness.',
          },
          {
            icon: '📈',
            title: 'HR Efficiency Tracking',
            desc: "Same pace, lower HR over time = proof you're getting fitter. We show you this clearly.",
          },
        ].map((f) => (
          <div key={f.title} className="card text-center">
            <div className="text-4xl mb-3">{f.icon}</div>
            <h3 className="font-bold text-lg mb-2">{f.title}</h3>
            <p className="text-gray-500 text-sm">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Comparison Table */}
      <section className="max-w-4xl mx-auto px-6 pb-24 text-center">
        <h2 className="text-3xl font-bold mb-4">Why PaceHeart?</h2>
        <p className="text-gray-500 mb-10">No other free platform combines all of these.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4">Feature</th>
                <th className="py-3 px-4 text-brand-600 font-bold">PaceHeart</th>
                <th className="py-3 px-4 text-gray-400">Strava</th>
                <th className="py-3 px-4 text-gray-400">Runna</th>
                <th className="py-3 px-4 text-gray-400">Nike RC</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Free web access',        '✅','⚠️','❌','✅'],
                ['Dual pace + HR goal',    '✅','❌','❌','❌'],
                ['HR efficiency tracking', '✅','❌','❌','❌'],
                ['Structured plans',       '✅','❌','✅','✅'],
                ['Beginner friendly',      '✅','❌','⚠️','✅'],
              ].map(([feat, ...vals]) => (
                <tr key={feat} className="border-b border-gray-100">
                  <td className="text-left py-3 px-4 text-gray-600">{feat}</td>
                  {vals.map((v, i) => (
                    <td key={i} className={`py-3 px-4 text-center ${i === 0 ? 'font-bold' : 'text-gray-400'}`}>
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
