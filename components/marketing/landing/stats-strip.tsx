import { Wallet, Clock, Users, Shield } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export async function StatsStrip() {
  const t = await getTranslations('landing.stats');
  const cells = [
    { kicker: 'commissionKicker', value: 'commissionValue', unit: 'commissionUnit', desc: 'commissionDesc', icon: Wallet },
    { kicker: 'responseKicker', value: 'responseValue', unit: 'responseUnit', desc: 'responseDesc', icon: Clock },
    { kicker: 'suppliersKicker', value: 'suppliersValue', unit: 'suppliersUnit', desc: 'suppliersDesc', icon: Users },
    { kicker: 'escrowKicker', value: 'escrowValue', unit: 'escrowUnit', desc: 'escrowDesc', icon: Shield },
  ] as const;
  return (
    <section className="stats-strip">
      <div className="landing-wrap">
        <div className="stats-grid">
          {cells.map(({ kicker, value, unit, desc, icon: Icon }) => (
            <div className="stat-cell" key={kicker}>
              <div className="stat-kicker num" dir="ltr">
                <span className="ic" aria-hidden>
                  <Icon className="size-3.5" />
                </span>
                <span>{t(kicker)}</span>
              </div>
              <div className="stat-num num">
                <span dir="ltr">{t(value)}</span>
                <span className="unit" dir="ltr">{t(unit)}</span>
              </div>
              <p className="stat-desc">{t(desc)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
