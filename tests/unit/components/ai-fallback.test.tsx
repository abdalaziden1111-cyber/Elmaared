import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AIFallback } from '@/components/ai/ai-fallback';

describe('AIFallback', () => {
  it('renders the canonical "أمامي N صفقة" headline when sampleSize is given', () => {
    render(<AIFallback reason="insufficient_data" sampleSize={2} />);
    expect(screen.getByText(/أمامي 2 صفقتين فقط/)).toBeInTheDocument();
    expect(screen.getByText(/لا أعرف بعد/)).toBeInTheDocument();
  });

  it('uses pluralisation hint for sample size 1', () => {
    render(<AIFallback reason="insufficient_data" sampleSize={1} />);
    expect(screen.getByText(/أمامي 1 صفقة فقط/)).toBeInTheDocument();
  });

  it('falls back to the generic insufficient-data headline when no sampleSize is given', () => {
    render(<AIFallback reason="insufficient_data" />);
    expect(
      screen.getByText('لا توجد بيانات كافية بعد — لا أعرف بعد')
    ).toBeInTheDocument();
  });

  it('renders the service_error headline', () => {
    render(<AIFallback reason="service_error" />);
    expect(
      screen.getByText('تقييم AI غير متاح مؤقتاً — حاول لاحقاً')
    ).toBeInTheDocument();
  });

  it('renders the unsupported headline + its default whatNext', () => {
    render(<AIFallback reason="unsupported" />);
    expect(
      screen.getByText('هذه الفئة لم نُدرّب AI عليها بعد')
    ).toBeInTheDocument();
    expect(screen.getByText(/تواصل معنا لطلب تقدير مخصص/)).toBeInTheDocument();
  });

  it('renders an action button and forwards clicks', () => {
    const click = vi.fn();
    render(
      <AIFallback
        reason="unsupported"
        action={{ label: 'اطلب تقديراً', onClick: click }}
      />
    );
    const btn = screen.getByRole('button', { name: 'اطلب تقديراً' });
    fireEvent.click(btn);
    expect(click).toHaveBeenCalledOnce();
  });

  it('honors a custom headline and whatNext override', () => {
    render(
      <AIFallback
        reason="pending"
        headline="نحلّل العرض الآن…"
        whatNext="هذا قد يأخذ دقيقتين"
      />
    );
    expect(screen.getByText('نحلّل العرض الآن…')).toBeInTheDocument();
    expect(screen.getByText('هذا قد يأخذ دقيقتين')).toBeInTheDocument();
  });

  it('carries a data-reason attribute reflecting the prop', () => {
    const { container } = render(<AIFallback reason="service_error" />);
    expect(
      container.querySelector('[data-component="ai-fallback"]')?.getAttribute(
        'data-reason'
      )
    ).toBe('service_error');
  });
});
