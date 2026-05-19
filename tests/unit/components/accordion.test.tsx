import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

// Smoke tests for the new shadcn-style Accordion primitive. Wired by the
// RFQ single-screen view in Sprint 2 S2.3.

function Fixture() {
  return (
    <Accordion type="single" collapsible defaultValue="b">
      <AccordionItem value="a">
        <AccordionTrigger>قسم A</AccordionTrigger>
        <AccordionContent>محتوى A</AccordionContent>
      </AccordionItem>
      <AccordionItem value="b">
        <AccordionTrigger>قسم B</AccordionTrigger>
        <AccordionContent>محتوى B</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

describe('Accordion', () => {
  it('renders triggers + the default-open content', () => {
    render(<Fixture />);
    expect(screen.getByText('قسم A')).toBeInTheDocument();
    expect(screen.getByText('قسم B')).toBeInTheDocument();
    expect(screen.getByText('محتوى B')).toBeVisible();
  });

  it('expands the second item when its trigger is clicked', () => {
    render(<Fixture />);
    const trigger = screen.getByRole('button', { name: 'قسم A' });
    expect(trigger.getAttribute('data-state')).toBe('closed');
    fireEvent.click(trigger);
    expect(trigger.getAttribute('data-state')).toBe('open');
  });

  it('exposes the radix data attributes for downstream styling', () => {
    const { container } = render(<Fixture />);
    expect(container.querySelector('[data-slot="accordion"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="accordion-item"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="accordion-trigger"]')).not.toBeNull();
  });
});
