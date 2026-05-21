import { getTranslations } from 'next-intl/server';

const portraits = [
  // Public CDN-free SVG placeholders (data URIs) so we don't reach for stock photos.
  // Each is a soft warm gradient with subtle radial spotlight — keeps the design
  // production-ready even before real client photos are licensed.
  'linear-gradient(135deg, #155F3D 0%, #0B2E20 60%, #061A11 100%)',
  'linear-gradient(135deg, #1F8A5A 0%, #0D3525 60%, #0B2E20 100%)',
  'linear-gradient(135deg, #34B97D 0%, #155F3D 60%, #0B2E20 100%)',
  'linear-gradient(135deg, #C8FF66 0%, #1A7148 50%, #0B2E20 100%)',
];

export async function Testimonials() {
  const t = await getTranslations('landing.testimonials');
  return (
    <section className="testi-section landing-section">
      <div className="landing-wrap">
        <div className="mb-10 max-w-3xl reveal">
          <span className="eyebrow">
            <span className="dot" />
            {t('eyebrow')}
          </span>
          <h2 className="mt-5">{t('headline')}</h2>
        </div>
        <div className="testi-track">
          {[1, 2, 3, 4].slice(0, 3).map((i) => (
            <article key={i} className="testi-card reveal" style={{ transitionDelay: `${i * 0.05}s` }}>
              <div className="bg-img" style={{ background: portraits[i - 1] }} aria-hidden />
              <span className="tag num" dir="ltr">{t(`card${i}Tag` as 'card1Tag')}</span>
              <span className="qm" aria-hidden>“</span>
              <blockquote>{t(`card${i}Quote` as 'card1Quote')}</blockquote>
              <div className="who">
                <strong>{t(`card${i}Name` as 'card1Name')}</strong>
                <span>{t(`card${i}Role` as 'card1Role')}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
