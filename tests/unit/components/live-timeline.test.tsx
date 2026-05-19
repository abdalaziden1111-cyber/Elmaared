import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  LiveTimeline,
  type TimelineEvent,
} from '@/components/trust/live-timeline';

const events: TimelineEvent[] = [
  {
    id: 'a',
    kind: 'kickoff',
    title: 'بدء التنفيذ',
    timestamp: '2026-05-01T09:00:00Z',
  },
  {
    id: 'b',
    kind: 'check_in',
    title: 'تحديث يومي',
    timestamp: '2026-05-05T12:00:00Z',
    description: 'تم تجهيز الهيكل المعدني.',
    photoUrl: 'https://example.com/img.jpg',
  },
  {
    id: 'c',
    kind: 'delivery',
    title: 'تسليم نهائي',
    timestamp: '2026-05-10T18:00:00Z',
  },
];

describe('LiveTimeline', () => {
  it('renders the empty-state card when events is empty', () => {
    render(<LiveTimeline events={[]} />);
    expect(screen.getByText(/لا توجد أحداث بعد/)).toBeInTheDocument();
  });

  it('renders all events with their titles', () => {
    render(<LiveTimeline events={events} />);
    expect(screen.getByText('بدء التنفيذ')).toBeInTheDocument();
    expect(screen.getByText('تحديث يومي')).toBeInTheDocument();
    expect(screen.getByText('تسليم نهائي')).toBeInTheDocument();
  });

  it('sorts events newest-first so the delivery appears before kickoff in the DOM', () => {
    const { container } = render(<LiveTimeline events={events} />);
    const li = container.querySelectorAll('ol > li');
    expect(li[0].getAttribute('data-kind')).toBe('delivery');
    expect(li[li.length - 1].getAttribute('data-kind')).toBe('kickoff');
  });

  it('exposes a photo link when photoUrl is present on an event', () => {
    render(<LiveTimeline events={events} />);
    const photoLink = screen.getByRole('link', { name: /عرض صورة التحديث/ });
    expect(photoLink.getAttribute('href')).toBe('https://example.com/img.jpg');
    expect(photoLink.getAttribute('target')).toBe('_blank');
  });

  it('renders the SLA banner with the right tone when on_track', () => {
    const { container } = render(
      <LiveTimeline
        events={events}
        sla={{ status: 'on_track', daysRemaining: 5 }}
      />,
    );
    const banner = container.querySelector('[data-sla="on_track"]');
    expect(banner?.textContent).toContain('في موعده');
    expect(banner?.textContent).toContain('5 يوم');
  });

  it('shows "متأخر" suffix when daysRemaining is negative on overdue', () => {
    render(
      <LiveTimeline
        events={events}
        sla={{ status: 'overdue', daysRemaining: -3 }}
      />,
    );
    expect(screen.getByText(/3 يوم متأخر/)).toBeInTheDocument();
  });

  it('omits the SLA banner entirely when hideSla is true', () => {
    const { container } = render(
      <LiveTimeline
        events={events}
        sla={{ status: 'overdue' }}
        hideSla
      />,
    );
    expect(container.querySelector('[data-sla]')).toBeNull();
  });

  it('renders descriptions when provided', () => {
    render(<LiveTimeline events={events} />);
    expect(screen.getByText('تم تجهيز الهيكل المعدني.')).toBeInTheDocument();
  });
});
