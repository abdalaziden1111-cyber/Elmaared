import { ArrowLeft, ArrowRight, Play } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';

export async function Hero({ locale }: { locale: 'ar' | 'en' }) {
  const t = await getTranslations('landing.hero');
  const isAr = locale === 'ar';
  const Arrow = isAr ? ArrowLeft : ArrowRight;

  return (
    <section className="hero">
      <div className="landing-wrap">
        <h1 className="hero-headline">
          {t('headlineLeading')}{' '}
          <span className="hero-inline-pill" aria-label={t('pillScore')}>
            <span className="avatar">S</span>
            <span className="num">{t('pillScore')}</span>
            <span className="dots" aria-hidden>
              <span className="on" />
              <span className="on" />
              <span className="on" />
              <span className="on" />
              <span />
            </span>
          </span>{' '}
          {t('headlineMiddle')}
          <br />
          {t('headlineLine2')}
        </h1>
        <p className="hero-sub">{t('sub')}</p>
        <div className="hero-cta">
          <Link href="/signup" className="l-btn l-btn-primary">
            <span>{t('ctaPrimary')}</span>
            <Arrow className="size-4" />
          </Link>
          <Link href="/how-it-works" className="l-btn l-btn-ghost">
            <Play className="size-4" />
            <span>{t('ctaSecondary')}</span>
          </Link>
        </div>
        <p className="hero-trust">{t('trustLine')}</p>

        {/* Messy-papers stage */}
        <div className="hero-stage-wrap">
          <div className="hero-stage">
            {/* Workspace (dark green) */}
            <div className="hero-card-dark">
              <div className="workspace-label">{t('workspace.label')}</div>
              <div className="ws-score">
                <span className="num">{t('pillScore')}</span>
                <span className="delta num">+12%</span>
              </div>
              <div className="ws-user">
                <div className="ws-avatar" aria-hidden>
                  {isAr ? 'س' : 'S'}
                </div>
                <div>
                  <div className="ws-user-name">{t('workspace.userName')}</div>
                  <div className="ws-user-role">{t('workspace.userRole')}</div>
                </div>
              </div>
              <div className="ws-progress">
                <div className="ws-progress-label">
                  <span>{t('workspace.progressLabel')}</span>
                  <span className="num">78%</span>
                </div>
                <div className="ws-progress-bar">
                  <div className="ws-progress-fill" />
                </div>
              </div>
              <div className="ws-rfq-code num" dir="ltr">
                {t('workspace.rfqLabel')} · RFQ-2026-0143
              </div>
            </div>

            {/* The table with floating papers */}
            <div className="hero-card-light">
              <PaperGauge t={t} />
              <PaperRfq t={t} />
              <PaperAlert t={t} />
              <PaperSkills t={t} />
              <PaperAiTip t={t} />
              <PaperEscrow t={t} />
              <PaperVenue t={t} />
              <PaperCalendar t={t} />
              <PaperSticky t={t} />
              <PaperChat t={t} />
              <PaperSignature t={t} />
              <PaperTeam t={t} />
              <PaperBudget t={t} />
              <PaperChecklist t={t} />
              <PaperMap t={t} />
              <PaperNotif t={t} />

              <div className="deal-halo" aria-hidden />
              <div className="deal-pill" role="status" aria-live="polite">
                {t('deal')}
              </div>
            </div>
          </div>

          <div className="hero-logos">
            <div className="hero-logos-label num" dir="ltr">
              {t('trustedByLabel')}
            </div>
            <div className="hero-logos-track">
              <div className="hero-logos-row">
                {[...Array(2)].map((_, dup) => (
                  <span key={dup} style={{ display: 'contents' }}>
                    <span>NORTHERN CO</span>
                    <span dir="rtl">شركة الفجر</span>
                    <span>ATLAS</span>
                    <span dir="rtl">مجموعة الواحة</span>
                    <span>SAUDI TECH</span>
                    <span dir="rtl">دار التميّز</span>
                    <span>OASIS GROUP</span>
                    <span dir="rtl">مدارات</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Helper: typed t callable (any to avoid leaking next-intl types into 16 components)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type T = any;

function PaperGauge({ t }: { t: T }) {
  return (
    <div
      className="paper"
      style={
        {
          top: '6%',
          insetInlineStart: '4%',
          width: 160,
          '--rot': '-7deg',
          '--delay': '0.2s',
          zIndex: 12,
        } as React.CSSProperties
      }
    >
      <div className="paper-title">{t('stage.satisfactionTitle')}</div>
      <svg viewBox="0 0 80 50" className="gauge-svg" style={{ width: '100%', height: 56 }}>
        <path className="track" d="M 8 40 A 32 32 0 0 1 72 40" />
        <path className="fill" d="M 8 40 A 32 32 0 0 1 64 18" />
      </svg>
      <div className="paper-meta">{t('stage.satisfactionSub')}</div>
    </div>
  );
}

function PaperRfq({ t }: { t: T }) {
  return (
    <div
      className="paper"
      style={
        {
          top: '12%',
          insetInlineEnd: '6%',
          width: 200,
          '--rot': '5deg',
          '--delay': '0.5s',
          zIndex: 13,
        } as React.CSSProperties
      }
    >
      <span className="tag">{t('stage.rfqTag')}</span>
      <div className="paper-title" style={{ marginTop: 6 }}>
        {t('stage.rfqTitle')}
      </div>
      <div className="paper-meta">{t('stage.rfqMeta')}</div>
    </div>
  );
}

function PaperAlert({ t }: { t: T }) {
  return (
    <div
      className="paper"
      style={
        {
          top: '24%',
          insetInlineStart: '32%',
          width: 200,
          '--rot': '-4deg',
          '--delay': '0.7s',
          zIndex: 11,
        } as React.CSSProperties
      }
    >
      <span className="tag" style={{ background: '#FEE2E2', color: '#9B1C1C' }}>
        {t('stage.alertTag')}
      </span>
      <div className="paper-title" style={{ marginTop: 6 }}>
        {t('stage.alertTitle')}
      </div>
      <div className="paper-meta">{t('stage.alertBody')}</div>
    </div>
  );
}

function PaperSkills({ t }: { t: T }) {
  return (
    <div
      className="paper"
      style={
        {
          top: '34%',
          insetInlineEnd: '4%',
          width: 220,
          '--rot': '4deg',
          '--delay': '0.9s',
          zIndex: 14,
        } as React.CSSProperties
      }
    >
      <div className="paper-title">{t('stage.skillsTitle')}</div>
      <table style={{ width: '100%', fontSize: 11, marginTop: 6 }}>
        <tbody>
          <tr>
            <td style={{ padding: '2px 0' }}>{t('stage.skillsRow1')}</td>
            <td className="num" style={{ textAlign: 'end', color: '#155F3D', fontWeight: 700 }}>
              98%
            </td>
          </tr>
          <tr>
            <td style={{ padding: '2px 0' }}>{t('stage.skillsRow2')}</td>
            <td className="num" style={{ textAlign: 'end', color: '#155F3D', fontWeight: 700 }}>
              94%
            </td>
          </tr>
          <tr>
            <td style={{ padding: '2px 0' }}>{t('stage.skillsRow3')}</td>
            <td className="num" style={{ textAlign: 'end', color: '#D4A848', fontWeight: 700 }}>
              88%
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function PaperAiTip({ t }: { t: T }) {
  return (
    <div
      className="paper lime"
      style={
        {
          top: '46%',
          insetInlineStart: '6%',
          width: 170,
          '--rot': '-3deg',
          '--delay': '1.1s',
          zIndex: 10,
        } as React.CSSProperties
      }
    >
      <span className="tag">{t('stage.aiTip')}</span>
      <div className="paper-meta" style={{ marginTop: 6, color: '#0B2E20', fontWeight: 600 }}>
        {t('stage.aiTipBody')}
      </div>
    </div>
  );
}

function PaperEscrow({ t }: { t: T }) {
  return (
    <div
      className="paper dark"
      style={
        {
          top: '72%',
          insetInlineEnd: '32%',
          width: 180,
          '--rot': '6deg',
          '--delay': '1.3s',
          zIndex: 11,
        } as React.CSSProperties
      }
    >
      <span className="tag">{t('stage.escrowTag')}</span>
      <div className="paper-title" style={{ marginTop: 6 }}>
        <span className="num" dir="ltr">{t('stage.escrowAmount')}</span>
      </div>
      <div className="paper-meta">{t('stage.escrowMeta')}</div>
    </div>
  );
}

function PaperVenue({ t }: { t: T }) {
  return (
    <div
      className="paper"
      style={
        {
          top: '4%',
          insetInlineStart: '46%',
          width: 130,
          height: 90,
          '--rot': '-8deg',
          '--delay': '0.3s',
          zIndex: 9,
          padding: 0,
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #155F3D, #0B2E20)',
        } as React.CSSProperties
      }
    >
      <div
        style={{
          padding: '6px 8px',
          background: 'rgba(11,46,32,0.6)',
          color: '#C8FF66',
          fontSize: 10.5,
          fontWeight: 600,
          position: 'absolute',
          bottom: 0,
          insetInlineStart: 0,
          insetInlineEnd: 0,
        }}
      >
        {t('stage.venuePhotoLabel')} · {t('stage.venuePhotoMeta')}
      </div>
    </div>
  );
}

function PaperCalendar({ t }: { t: T }) {
  return (
    <div
      className="paper"
      style={
        {
          top: '4%',
          insetInlineStart: '24%',
          width: 110,
          '--rot': '6deg',
          '--delay': '0.4s',
          zIndex: 10,
          textAlign: 'center',
        } as React.CSSProperties
      }
    >
      <div
        style={{
          background: '#0B2E20',
          color: '#C8FF66',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          margin: '-12px -14px 6px',
          padding: '4px 0',
          borderRadius: '12px 12px 0 0',
        }}
      >
        {t('stage.calendarMonth')}
      </div>
      <div className="num" style={{ fontSize: 26, fontWeight: 800, color: '#0B2E20', lineHeight: 1 }}>
        14
      </div>
      <div className="paper-meta" style={{ fontSize: 10, marginTop: 4 }}>
        {t('stage.calendarEvent')}
      </div>
      <div className="num paper-meta" style={{ fontSize: 10 }} dir="ltr">
        09:00 AM
      </div>
    </div>
  );
}

function PaperSticky({ t }: { t: T }) {
  return (
    <div
      className="paper"
      style={
        {
          top: '58%',
          insetInlineEnd: '4%',
          width: 160,
          '--rot': '-5deg',
          '--delay': '1.2s',
          zIndex: 10,
          background: '#FEF3C7',
          fontFamily: '"Caveat", "Marker Felt", cursive',
        } as React.CSSProperties
      }
    >
      <div style={{ fontWeight: 700, fontSize: 13, color: '#92400E' }}>
        {t('stage.stickyTitle')}
      </div>
      <div style={{ fontSize: 13, color: '#78350F', marginTop: 4, lineHeight: 1.35 }}>
        {t('stage.stickyBody')}
      </div>
      <div style={{ fontSize: 11, color: '#92400E', marginTop: 6, textAlign: 'end' }}>
        {t('stage.stickySigner')}
      </div>
    </div>
  );
}

function PaperChat({ t }: { t: T }) {
  return (
    <div
      className="paper dark"
      style={
        {
          top: '60%',
          insetInlineStart: '24%',
          width: 200,
          '--rot': '-2deg',
          '--delay': '1.4s',
          zIndex: 12,
        } as React.CSSProperties
      }
    >
      <div className="paper-meta">{t('stage.chatFrom')}</div>
      <div style={{ fontSize: 12.5, color: '#F4F0E8', marginTop: 6, lineHeight: 1.5 }}>
        {t('stage.chatBody')}
      </div>
    </div>
  );
}

function PaperSignature({ t }: { t: T }) {
  return (
    <div
      className="paper"
      style={
        {
          top: '74%',
          insetInlineStart: '6%',
          width: 180,
          '--rot': '4deg',
          '--delay': '1.6s',
          zIndex: 12,
        } as React.CSSProperties
      }
    >
      <span className="paper-stamp">{t('stage.signatureStamp')}</span>
      <div className="paper-signature">{t('stage.signatureBody')}</div>
      <div className="paper-meta">{t('stage.signatureMeta')}</div>
    </div>
  );
}

function PaperTeam({ t }: { t: T }) {
  return (
    <div
      className="paper"
      style={
        {
          top: '20%',
          insetInlineStart: '6%',
          width: 170,
          '--rot': '3deg',
          '--delay': '0.6s',
          zIndex: 13,
        } as React.CSSProperties
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="paper-avatar-stack" aria-hidden>
          <span className="av">س</span>
          <span className="av" style={{ background: '#D4A848' }}>
            ف
          </span>
          <span className="av" style={{ background: '#E94B7E' }}>
            ع
          </span>
        </span>
        <div>
          <div className="paper-title" style={{ marginBottom: 0 }}>
            {t('stage.liveTeamCount')}
          </div>
          <div className="paper-meta">{t('stage.liveTeamStatus')}</div>
        </div>
      </div>
    </div>
  );
}

function PaperBudget({ t }: { t: T }) {
  return (
    <div
      className="paper"
      style={
        {
          top: '32%',
          insetInlineStart: '14%',
          width: 180,
          '--rot': '-3deg',
          '--delay': '0.8s',
          zIndex: 11,
        } as React.CSSProperties
      }
    >
      <div className="paper-title">{t('stage.budgetTitle')}</div>
      <div className="paper-budget-row">
        <span style={{ minWidth: 50 }}>{t('stage.budgetBuild')}</span>
        <div className="bar">
          <span style={{ width: '62%' }} />
        </div>
      </div>
      <div className="paper-budget-row">
        <span style={{ minWidth: 50 }}>{t('stage.budgetCreative')}</span>
        <div className="bar gold">
          <span style={{ width: '28%' }} />
        </div>
      </div>
      <div className="paper-budget-row">
        <span style={{ minWidth: 50 }}>{t('stage.budgetOps')}</span>
        <div className="bar pink">
          <span style={{ width: '14%' }} />
        </div>
      </div>
    </div>
  );
}

function PaperChecklist({ t }: { t: T }) {
  return (
    <div
      className="paper"
      style={
        {
          top: '64%',
          insetInlineStart: '46%',
          width: 200,
          '--rot': '3deg',
          '--delay': '1.5s',
          zIndex: 13,
        } as React.CSSProperties
      }
    >
      <div className="paper-title">{t('stage.checklistTitle')}</div>
      <div className="paper-check-row done">
        <span className="ck">✓</span>
        <span>{t('stage.checklistStep1')}</span>
      </div>
      <div className="paper-check-row done">
        <span className="ck">✓</span>
        <span>{t('stage.checklistStep2')}</span>
      </div>
      <div className="paper-check-row now">
        <span className="ck" aria-hidden />
        <span style={{ color: '#0B2E20', fontWeight: 600 }}>
          {t('stage.checklistStep3')}
        </span>
      </div>
      <div className="paper-check-row">
        <span className="ck" />
        <span>{t('stage.checklistStep4')}</span>
      </div>
      <div className="paper-check-row">
        <span className="ck" />
        <span>{t('stage.checklistStep5')}</span>
      </div>
    </div>
  );
}

function PaperMap({ t }: { t: T }) {
  return (
    <div
      className="paper"
      style={
        {
          top: '46%',
          insetInlineEnd: '20%',
          width: 130,
          '--rot': '-6deg',
          '--delay': '1.0s',
          zIndex: 10,
          padding: 10,
        } as React.CSSProperties
      }
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #E6F7EC, #C8F2DC)',
          borderRadius: 8,
          height: 50,
          position: 'relative',
          marginBottom: 6,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '40%',
            insetInlineStart: '40%',
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: '#E94B7E',
            border: '3px solid white',
            boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
          }}
        />
      </div>
      <div className="paper-title" style={{ fontSize: 11 }}>
        {t('stage.mapVenue')}
      </div>
      <div className="paper-meta" style={{ fontSize: 10 }}>
        {t('stage.mapMeta')}
      </div>
    </div>
  );
}

function PaperNotif({ t }: { t: T }) {
  return (
    <div
      className="paper dark"
      style={
        {
          top: '-3%',
          insetInlineEnd: '20%',
          padding: '8px 14px',
          width: 'auto',
          '--rot': '5deg',
          '--delay': '0.15s',
          zIndex: 14,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
        } as React.CSSProperties
      }
    >
      <span
        style={{
          background: '#C8FF66',
          color: '#0B2E20',
          fontSize: 11,
          fontWeight: 800,
          padding: '2px 8px',
          borderRadius: 99,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {t('stage.notifTag')}
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 500 }}>
        {t('stage.notifMessage')}
      </span>
    </div>
  );
}
