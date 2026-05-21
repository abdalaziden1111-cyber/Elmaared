import { getTranslations } from 'next-intl/server';

export async function AnalyticsPreview() {
  const t = await getTranslations('landing.analytics');

  // Hex radar — 6 axes, 5 rings
  const cx = 50;
  const cy = 50;
  const r = 40;
  const axisAngles = [-90, -30, 30, 90, 150, 210]; // degrees, evenly spaced
  const values = [0.94, 0.88, 0.82, 0.92, 0.85, 0.96]; // per-axis normalized 0..1
  const axisLabels = [
    t('radarAxis1'),
    t('radarAxis2'),
    t('radarAxis3'),
    t('radarAxis4'),
    t('radarAxis5'),
    t('radarAxis6'),
  ];
  const toPoint = (idx: number, scale = 1) => {
    const a = (axisAngles[idx] * Math.PI) / 180;
    return [cx + Math.cos(a) * r * scale, cy + Math.sin(a) * r * scale] as const;
  };
  const ringPath = (scale: number) =>
    axisAngles
      .map((_, i) => {
        const [x, y] = toPoint(i, scale);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ') + ' Z';
  const areaPath = axisAngles
    .map((_, i) => {
      const [x, y] = toPoint(i, values[i]);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ') + ' Z';

  return (
    <section id="analytics" className="landing-section" style={{ background: 'var(--landing-paper)', borderTop: '1px solid var(--landing-line)', borderBottom: '1px solid var(--landing-line)' }}>
      <div className="landing-wrap">
        <div className="mb-10 max-w-3xl">
          <span className="eyebrow">
            <span className="dot" />
            {t('eyebrow')}
          </span>
          <h2 className="mt-5">{t('headline')}</h2>
          <p className="lead mt-4">{t('sub')}</p>
        </div>

        <div className="ana-grid reveal">
          <div className="ana-card">
            <h3>{t('radarTitle')}</h3>
            <p className="sub">{t('radarSub')}</p>
            <div className="ana-radar">
              <svg viewBox="0 0 100 100">
                {[0.2, 0.4, 0.6, 0.8, 1].map((s) => (
                  <path key={s} className="grid" d={ringPath(s)} />
                ))}
                {axisAngles.map((_, i) => {
                  const [x, y] = toPoint(i, 1);
                  return (
                    <line
                      key={i}
                      className="axis"
                      x1={cx}
                      y1={cy}
                      x2={x}
                      y2={y}
                    />
                  );
                })}
                <path className="area" d={areaPath} />
                {axisAngles.map((_, i) => {
                  const [x, y] = toPoint(i, values[i]);
                  return <circle key={i} className="dot" cx={x} cy={y} r="1.6" />;
                })}
                {axisAngles.map((a, i) => {
                  const rad = (a * Math.PI) / 180;
                  const lx = cx + Math.cos(rad) * (r + 8);
                  const ly = cy + Math.sin(rad) * (r + 8) + 1;
                  return (
                    <text
                      key={i}
                      className="lbl"
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                    >
                      {axisLabels[i]}
                    </text>
                  );
                })}
              </svg>
              <div className="center">
                <div className="num">{t('radarScore')}</div>
                <div className="lbl">{t('radarScoreLabel')}</div>
              </div>
            </div>
          </div>

          <div className="col">
            <div className="ana-card">
              <h3>{t('skillsTitle')}</h3>
              <p className="sub">{t('skillsSub')}</p>
              <table className="skills-table">
                <tbody>
                  {[
                    { name: 'skillsRow1', val: 'skillsRow1Val' },
                    { name: 'skillsRow2', val: 'skillsRow2Val' },
                    { name: 'skillsRow3', val: 'skillsRow3Val' },
                    { name: 'skillsRow4', val: 'skillsRow4Val' },
                  ].map((r) => (
                    <tr key={r.name}>
                      <td className="name">{t(r.name as 'skillsRow1')}</td>
                      <td style={{ width: '40%' }}>
                        <div className="bar">
                          <span
                            style={{
                              width: `${parseInt(t(r.val as 'skillsRow1Val'), 10)}%`,
                            }}
                          />
                        </div>
                      </td>
                      <td className="val num">{t(r.val as 'skillsRow1Val')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ana-card">
              <h3>{t('runsTitle')}</h3>
              <p className="sub">{t('runsSub')}</p>
              <div className="runs-grid">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div className="tile" key={i}>
                    <div className="num" dir="ltr">
                      {t(`runs${i}Num` as 'runs1Num')}
                    </div>
                    <div className="lbl">{t(`runs${i}Label` as 'runs1Label')}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
