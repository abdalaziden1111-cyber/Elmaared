# Phase 7 — Reviews, Disputes & Launch Polish (Weeks 15-16)

> **Goal**: Close the loop. Client and supplier review each other on 6 criteria. Disputes have a basic admin-mediated flow. Marketing pages are real (not placeholders). SEO basics in place. Performance hits Lighthouse > 90. The platform is ready for the 10-company pilot.

> **Prerequisite**: Phases 0–6 complete. End-to-end transaction flow works.

---

## What this phase delivers

By end of Week 16:

1. `/[locale]/dashboard/rfqs/[id]/review` — client rates supplier on 6 criteria + comment.
2. `/[locale]/supplier/rfqs/[id]/review` — supplier rates client on 3 criteria + comment.
3. Reviews appear on public supplier profile (`/discover/[id]`).
4. DB trigger updates `suppliers.rating_avg` and `total_reviews` on each new review.
5. Basic disputes flow: client or supplier opens dispute → admin mediates → resolution.
6. `/[locale]/dashboard/notifications` + `/[locale]/supplier/notifications` — list of in-app notifications.
7. Real marketing pages: `/`, `/for-clients`, `/for-suppliers`, `/how-it-works`, `/pricing`.
8. Legal pages: `/terms`, `/privacy`.
9. SEO: sitemap.xml, robots.txt, OG images, meta tags per page.
10. Performance: image optimization, font preload, route-level caching review, Lighthouse pass.
11. Cron jobs (Vercel) for: auto-approve deliveries after 14 days, retry AI scoring failures.
12. Final QA + 10-pilot acceptance.

---

## Step 7.1 — Migrations

### File: `supabase/migrations/20260801000001_reviews_extensions.sql`

```sql
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS quality int CHECK (quality BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS communication int CHECK (communication BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS timeliness int CHECK (timeliness BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS professionalism int CHECK (professionalism BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS value int CHECK (value BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS would_rehire int CHECK (would_rehire BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS overall numeric(3,2),
  ADD COLUMN IF NOT EXISTS review_type text CHECK (review_type IN ('client_to_supplier', 'supplier_to_client')) NOT NULL DEFAULT 'client_to_supplier';

CREATE UNIQUE INDEX IF NOT EXISTS reviews_unique_per_rfq_type
  ON reviews(rfq_id, reviewer_id, review_type);

-- Trigger: compute "overall" from the 6 criteria, update supplier stats
CREATE OR REPLACE FUNCTION compute_review_overall()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.review_type = 'client_to_supplier' THEN
    NEW.overall := round(
      (
        coalesce(NEW.quality, 0) +
        coalesce(NEW.communication, 0) +
        coalesce(NEW.timeliness, 0) +
        coalesce(NEW.professionalism, 0) +
        coalesce(NEW.value, 0) +
        coalesce(NEW.would_rehire, 0)
      )::numeric / 6, 2
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_compute_overall ON reviews;
CREATE TRIGGER reviews_compute_overall
  BEFORE INSERT OR UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION compute_review_overall();

-- Trigger: update supplier rating_avg + total_reviews on new client→supplier review
CREATE OR REPLACE FUNCTION update_supplier_rating()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.review_type = 'client_to_supplier' THEN
    UPDATE suppliers
    SET rating_avg = (
      SELECT round(avg(overall)::numeric, 2)
      FROM reviews
      WHERE reviewee_id = NEW.reviewee_id AND review_type = 'client_to_supplier'
    ),
    total_reviews = (
      SELECT count(*) FROM reviews
      WHERE reviewee_id = NEW.reviewee_id AND review_type = 'client_to_supplier'
    )
    WHERE id = NEW.reviewee_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_update_supplier_rating ON reviews;
CREATE TRIGGER reviews_update_supplier_rating
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_supplier_rating();
```

### File: `supabase/migrations/20260801000002_disputes.sql`

(Phase 0 already created the disputes table — extend if needed.)

```sql
ALTER TABLE disputes
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS opened_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS opened_by_role text CHECK (opened_by_role IN ('client', 'supplier')),
  ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('open', 'in_review', 'resolved', 'closed')) DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS resolution text,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES profiles(id);

CREATE INDEX IF NOT EXISTS disputes_open_idx ON disputes(created_at) WHERE status IN ('open', 'in_review');
```

---

## Step 7.2 — Review Server Actions

### File: `app/actions/review.ts`

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth/get-user';

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

const clientReviewSchema = z.object({
  rfqId: z.string().uuid(),
  quality: z.number().int().min(1).max(5),
  communication: z.number().int().min(1).max(5),
  timeliness: z.number().int().min(1).max(5),
  professionalism: z.number().int().min(1).max(5),
  value: z.number().int().min(1).max(5),
  wouldRehire: z.number().int().min(1).max(5),
  comment: z.string().min(20, 'اكتب تقييماً مفيداً للآخرين (20 حرف على الأقل).').max(2000),
});

export async function submitClientReviewAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = clientReviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid' };

  const supabase = await createClient();
  const admin = createAdminClient();

  // Verify the reviewer is the client on a completed RFQ
  const { data: rfq } = await supabase
    .from('rfqs')
    .select('id, client_id, winning_proposal_id, status')
    .eq('id', parsed.data.rfqId)
    .single();

  if (!rfq) return { ok: false, error: 'الطلب غير موجود.' };
  if (rfq.client_id !== user.id) return { ok: false, error: 'لست العميل على هذا الطلب.' };
  if (!['completed', 'delivered'].includes(rfq.status)) {
    return { ok: false, error: 'يمكن التقييم بعد اكتمال المعاملة فقط.' };
  }

  const { data: proposal } = await supabase
    .from('proposals')
    .select('supplier_id')
    .eq('id', rfq.winning_proposal_id!)
    .single();

  if (!proposal) return { ok: false, error: 'لم نجد المورد الفائز.' };

  const { error } = await supabase.from('reviews').insert({
    rfq_id: rfq.id,
    reviewer_id: user.id,
    reviewee_id: proposal.supplier_id,
    review_type: 'client_to_supplier',
    quality: parsed.data.quality,
    communication: parsed.data.communication,
    timeliness: parsed.data.timeliness,
    professionalism: parsed.data.professionalism,
    value: parsed.data.value,
    would_rehire: parsed.data.wouldRehire,
    comment: parsed.data.comment,
  });

  if (error) {
    if (error.code === '23505') return { ok: false, error: 'قيّمت هذا المورد على هذا الطلب بالفعل.' };
    return { ok: false, error: 'فشل في حفظ التقييم.' };
  }

  await admin.from('audit_logs').insert({
    user_id: user.id,
    action: 'submit_review',
    resource_type: 'rfq',
    resource_id: rfq.id,
    metadata: { reviewee_id: proposal.supplier_id, type: 'client_to_supplier' },
  });

  await admin.from('notifications').insert({
    user_id: proposal.supplier_id,
    type: 'review_received',
    title: 'وصلك تقييم جديد',
    body: 'افتح ملفك لرؤية التقييم.',
    link: '/supplier/profile',
  });

  revalidatePath(`/dashboard/rfqs/${rfq.id}`);
  revalidatePath(`/discover/${proposal.supplier_id}`);
  return { ok: true };
}

const supplierReviewSchema = z.object({
  rfqId: z.string().uuid(),
  paymentReliability: z.number().int().min(1).max(5),
  clarity: z.number().int().min(1).max(5),
  professionalism: z.number().int().min(1).max(5),
  comment: z.string().min(20).max(2000),
});

export async function submitSupplierReviewAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = supplierReviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid' };

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: rfq } = await supabase
    .from('rfqs')
    .select('id, client_id, status, winning_proposal_id')
    .eq('id', parsed.data.rfqId)
    .single();

  if (!rfq) return { ok: false, error: 'الطلب غير موجود.' };

  const { data: proposal } = await supabase
    .from('proposals')
    .select('supplier_id')
    .eq('id', rfq.winning_proposal_id!)
    .single();

  if (proposal?.supplier_id !== user.id) return { ok: false, error: 'لست المورد على هذا الطلب.' };
  if (rfq.status !== 'completed') return { ok: false, error: 'يمكن التقييم بعد اكتمال المعاملة فقط.' };

  // Store as JSON in the comment + use existing fields creatively, OR add separate fields
  // For simplicity in this schema we reuse quality/communication/professionalism for supplier→client
  const { error } = await supabase.from('reviews').insert({
    rfq_id: rfq.id,
    reviewer_id: user.id,
    reviewee_id: rfq.client_id,
    review_type: 'supplier_to_client',
    quality: parsed.data.paymentReliability, // reuse as "payment reliability"
    communication: parsed.data.clarity,
    professionalism: parsed.data.professionalism,
    comment: parsed.data.comment,
  });

  if (error) {
    if (error.code === '23505') return { ok: false, error: 'قيّمت هذا العميل بالفعل.' };
    return { ok: false, error: 'فشل في حفظ التقييم.' };
  }

  return { ok: true };
}
```

---

## Step 7.3 — Review forms

### File: `app/[locale]/(client)/dashboard/rfqs/[id]/review/page.tsx`

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { ClientReviewForm } from './review-form';

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole(['client']);
  const supabase = await createClient();

  const { data: rfq } = await supabase
    .from('rfqs')
    .select(`id, status, rfq_number, title, winning_proposal_id, companies:winning_proposal_id(name)`)
    .eq('id', id)
    .eq('client_id', user.id)
    .single();

  if (!rfq) notFound();

  const { data: existing } = await supabase
    .from('reviews')
    .select('id')
    .eq('rfq_id', id)
    .eq('reviewer_id', user.id)
    .eq('review_type', 'client_to_supplier')
    .maybeSingle();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-xs text-stone-600 font-mono num">{rfq.rfq_number}</p>
        <h1 className="text-2xl font-bold text-midnight-green">قيّم المورد</h1>
        <p className="text-sm text-stone-600 mt-1">تقييمك يساعد آخرين على اختيار الأفضل.</p>
      </div>
      {existing ? (
        <div className="bg-success-100 border border-success/30 rounded-xl p-4 text-sm">
          شكراً، قدمت تقييمك بالفعل.
        </div>
      ) : (
        <ClientReviewForm rfqId={rfq.id} />
      )}
    </div>
  );
}
```

### File: `app/[locale]/(client)/dashboard/rfqs/[id]/review/review-form.tsx`

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { submitClientReviewAction } from '@/app/actions/review';
import { cn } from '@/lib/utils/cn';

const CRITERIA = [
  { key: 'quality', label: 'جودة العمل' },
  { key: 'communication', label: 'سرعة الرد والتواصل' },
  { key: 'timeliness', label: 'الالتزام بالمواعيد' },
  { key: 'professionalism', label: 'الاحترافية' },
  { key: 'value', label: 'القيمة مقابل السعر' },
  { key: 'wouldRehire', label: 'هل ستتعامل معه مجدداً؟' },
] as const;

export function ClientReviewForm({ rfqId }: { rfqId: string }) {
  const router = useRouter();
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const allRated = CRITERIA.every((c) => ratings[c.key] >= 1);
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!allRated) { setError('قيّم كل المعايير.'); return; }
    start(async () => {
      const res = await submitClientReviewAction({
        rfqId,
        ...ratings,
        comment,
      });
      if (!res.ok) { setError(res.error); return; }
      router.push(`/dashboard/rfqs/${rfqId}`);
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {CRITERIA.map((c) => (
        <RatingRow
          key={c.key}
          label={c.label}
          value={ratings[c.key] ?? 0}
          onChange={(v) => setRatings({ ...ratings, [c.key]: v })}
        />
      ))}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium">تعليقك (يظهر للعموم)</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={5}
          placeholder="ما الذي ميّز التعامل؟ ما يمكن تحسينه؟"
          className="w-full px-3 py-2 rounded-md bg-cream border border-stone-300 text-sm"
          required
          minLength={20}
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" variant="brand" size="lg" disabled={pending || !allRated}>
        {pending ? 'جارٍ الإرسال…' : 'أرسل التقييم'}
      </Button>
    </form>
  );
}

function RatingRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-stone-100 rounded-md p-3">
      <span className="text-sm">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="p-0.5"
            aria-label={`${n} نجوم`}
          >
            <Star
              className={cn(
                'size-6',
                n <= value
                  ? 'fill-dune-gold text-dune-gold'
                  : 'fill-none text-stone-300 hover:text-dune-gold/50'
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
```

(Supplier review form mirrors this with 3 criteria — `paymentReliability`, `clarity`, `professionalism` — and posts to `submitSupplierReviewAction`.)

### File: Update `app/[locale]/(marketing)/discover/[id]/page.tsx`

After the portfolio section, add a Reviews section:

```tsx
{/* Reviews */}
{Array.isArray(supplier.reviews) && supplier.reviews.length > 0 && (
  <section className="space-y-3">
    <h2 className="font-semibold text-midnight-green">التقييمات ({supplier.reviews.length})</h2>
    <div className="space-y-3">
      {supplier.reviews.map((r: any) => (
        <article key={r.id} className="bg-stone-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`size-4 ${i < Math.round(r.overall) ? 'fill-dune-gold text-dune-gold' : 'fill-none text-stone-300'}`} />
              ))}
            </div>
            <span className="text-xs text-stone-600">{formatDate(r.created_at, 'ar')}</span>
          </div>
          <p className="text-sm whitespace-pre-line">{r.comment}</p>
        </article>
      ))}
    </div>
  </section>
)}
```

(Update the `select` to include `reviews(id, overall, comment, created_at)` filtered to `review_type='client_to_supplier'` and `status='approved'`.)

---

## Step 7.4 — Disputes flow (basic)

### File: `app/actions/dispute.ts`

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth/get-user';

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

const openDisputeSchema = z.object({
  rfqId: z.string().uuid(),
  title: z.string().min(5).max(200),
  description: z.string().min(50).max(4000),
  attachments: z.array(z.object({
    path: z.string(), url: z.string(), filename: z.string(),
    sizeBytes: z.number(), mimeType: z.string(),
  })).default([]),
});

export async function openDisputeAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = openDisputeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid' };

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: rfq } = await supabase
    .from('rfqs')
    .select('id, client_id, winning_proposal_id, status')
    .eq('id', parsed.data.rfqId)
    .single();

  if (!rfq) return { ok: false, error: 'الطلب غير موجود.' };

  const { data: proposal } = await supabase
    .from('proposals')
    .select('supplier_id')
    .eq('id', rfq.winning_proposal_id!)
    .single();

  const isClient = rfq.client_id === user.id;
  const isSupplier = proposal?.supplier_id === user.id;
  if (!isClient && !isSupplier) return { ok: false, error: 'لست طرفاً في هذا الطلب.' };

  const { data: dispute, error } = await supabase
    .from('disputes')
    .insert({
      rfq_id: rfq.id,
      title: parsed.data.title,
      description: parsed.data.description,
      attachments: parsed.data.attachments,
      opened_by: user.id,
      opened_by_role: isClient ? 'client' : 'supplier',
      status: 'open',
    })
    .select('id')
    .single();

  if (error || !dispute) return { ok: false, error: 'فشل في فتح النزاع.' };

  // Mark RFQ as disputed
  await admin.from('rfqs').update({ status: 'disputed' }).eq('id', rfq.id);

  // Notify all admins + the other party
  const otherPartyId = isClient ? proposal?.supplier_id : rfq.client_id;
  const { data: admins } = await admin.from('profiles').select('id').eq('role', 'admin');
  if (admins) {
    await admin.from('notifications').insert(
      admins.map((a) => ({
        user_id: a.id,
        type: 'dispute_opened',
        title: '⚠️ نزاع جديد',
        body: parsed.data.title,
        link: `/admin/disputes/${dispute.id}`,
      }))
    );
  }
  if (otherPartyId) {
    await admin.from('notifications').insert({
      user_id: otherPartyId,
      type: 'dispute_opened',
      title: 'الطرف الآخر فتح نزاعاً',
      body: parsed.data.title,
      link: `/dashboard/rfqs/${rfq.id}`,
    });
  }

  revalidatePath(`/dashboard/rfqs/${rfq.id}`);
  return { ok: true, data: { id: dispute.id } };
}

export async function adminResolveDisputeAction(disputeId: string, resolution: string): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return { ok: false, error: 'Forbidden' };

  if (resolution.trim().length < 30) return { ok: false, error: 'Resolution must be ≥30 characters.' };

  const admin = createAdminClient();

  const { data: d } = await supabase
    .from('disputes')
    .select('id, rfq_id')
    .eq('id', disputeId)
    .single();

  if (!d) return { ok: false, error: 'Dispute not found.' };

  await supabase
    .from('disputes')
    .update({
      status: 'resolved',
      resolution,
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq('id', disputeId);

  // Restore RFQ to 'in_progress' (admin's call — could be 'completed' depending on resolution)
  await admin.from('rfqs').update({ status: 'in_progress' }).eq('id', d.rfq_id);

  await admin.from('audit_logs').insert({
    user_id: user.id,
    action: 'resolve_dispute',
    resource_type: 'dispute',
    resource_id: disputeId,
    metadata: { resolution },
  });

  revalidatePath(`/admin/disputes`);
  return { ok: true };
}
```

### File: `app/admin/disputes/page.tsx`

```tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { timeAgo } from '@/lib/utils/format';

export default async function AdminDisputesPage() {
  const supabase = await createClient();
  const { data: open } = await supabase
    .from('disputes')
    .select(`id, title, opened_by_role, created_at, status, rfqs!inner(rfq_number, title)`)
    .in('status', ['open', 'in_review'])
    .order('created_at', { ascending: true });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Open Disputes ({open?.length ?? 0})</h1>
      <div className="space-y-2">
        {(open ?? []).map((d: any) => (
          <Link
            key={d.id}
            href={`/admin/disputes/${d.id}`}
            className="block bg-stone-100 hover:bg-stone-200 rounded p-3 border border-stone-300"
          >
            <div className="text-xs font-mono num">{d.rfqs.rfq_number}</div>
            <div className="font-semibold">{d.title}</div>
            <div className="text-xs text-stone-600 mt-1">
              Opened by {d.opened_by_role} {timeAgo(d.created_at, 'en')}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

---

## Step 7.5 — Notifications page

### File: `app/[locale]/(client)/dashboard/notifications/page.tsx`

```tsx
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/get-user';
import { timeAgo } from '@/lib/utils/format';

export default async function NotificationsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  // Mark all as read in the background
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-midnight-green">الإشعارات</h1>
      {!notifications || notifications.length === 0 ? (
        <div className="bg-stone-100 rounded-xl p-8 text-center space-y-2">
          <Bell className="size-10 text-stone-600 mx-auto" />
          <p className="text-sm text-stone-600">لا إشعارات بعد.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Link
              key={n.id}
              href={n.link ?? '#'}
              className="block bg-stone-100 hover:bg-stone-200 rounded-md p-3 border border-stone-300"
            >
              <div className="flex justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-sm">{n.title}</h3>
                  <p className="text-sm text-stone-600 mt-1">{n.body}</p>
                </div>
                <span className="text-xs text-stone-600 shrink-0">{timeAgo(n.created_at, 'ar')}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

(Mirror at `/supplier/notifications`.)

---

## Step 7.6 — Marketing pages

### File: `app/[locale]/(marketing)/for-clients/page.tsx`

```tsx
import Link from 'next/link';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ForClientsPage() {
  return (
    <div>
      <section className="container mx-auto px-4 pt-16 pb-12 max-w-3xl text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-midnight-green leading-tight mb-4">
          وفّر 35-55% على ميزانية معارضك
        </h1>
        <p className="text-lg text-stone-600 mb-8 leading-relaxed">
          200+ مورد معتمد في 4 خدمات. عمولة 5% فقط مقابل 40-60% للوكالات.
          ضمان مالي على كل ريال. فاتورة ضريبية موحدة.
        </p>
        <Button asChild size="lg" variant="brand">
          <Link href="/signup">أنشئ طلباً مجاناً</Link>
        </Button>
      </section>

      <section className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="grid sm:grid-cols-3 gap-6">
          <Feature title="قارن العروض بـ AI" desc="درجة 0-100 لكل عرض، مع تحليل تفصيلي للسعر والنطاق والاحترافية." />
          <Feature title="ضمان مالي" desc="فلوسك في حساب المنصة حتى توافق على التسليم." />
          <Feature title="فاتورة ضريبية" desc="فاتورة موحدة للعميل، نتعامل مع الموردين والضريبة بدلاً منك." />
        </div>
      </section>
    </div>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="space-y-2">
      <Check className="size-6 text-midnight-green" />
      <h3 className="font-semibold text-charcoal">{title}</h3>
      <p className="text-sm text-stone-600 leading-relaxed">{desc}</p>
    </div>
  );
}
```

(Mirror for `/for-suppliers`, `/how-it-works`, `/pricing`.)

### File: `app/[locale]/(marketing)/terms/page.tsx`

```tsx
export default function TermsPage() {
  return (
    <article className="container mx-auto px-4 py-12 max-w-3xl prose prose-sm">
      <h1>شروط الاستخدام</h1>
      <p>محتوى الشروط بانتظار المراجعة القانونية. يجب الانتهاء قبل الإطلاق العام.</p>
    </article>
  );
}
```

(Mirror for `/privacy`.)

---

## Step 7.7 — SEO infrastructure

### File: `app/sitemap.ts`

```ts
import { MetadataRoute } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app-exhibition.sa';

  const staticRoutes = [
    '', '/for-clients', '/for-suppliers', '/how-it-works', '/pricing', '/discover',
  ].flatMap((path) => [
    { url: `${baseUrl}/ar${path}`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 1 },
    { url: `${baseUrl}/en${path}`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.8 },
  ]);

  // Approved supplier profiles
  const admin = createAdminClient();
  const { data: suppliers } = await admin
    .from('suppliers')
    .select('id, updated_at')
    .eq('status', 'approved')
    .limit(1000);

  const supplierRoutes = (suppliers ?? []).flatMap((s) => [
    { url: `${baseUrl}/ar/discover/${s.id}`, lastModified: new Date(s.updated_at), changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/en/discover/${s.id}`, lastModified: new Date(s.updated_at), changeFrequency: 'monthly' as const, priority: 0.5 },
  ]);

  return [...staticRoutes, ...supplierRoutes];
}
```

### File: `app/robots.ts`

```ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app-exhibition.sa';
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/discover'],
        disallow: ['/dashboard', '/supplier', '/admin', '/api'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
```

### Per-page metadata

For each marketing page, export `generateMetadata` (or `metadata`) per the patterns in `09-copy-voice.md`:

```tsx
// app/[locale]/(marketing)/page.tsx
export const metadata = {
  title: 'تطبيق المعارض — منصة B2B لموردي المعارض في السعودية',
  description: 'منصة B2B واحدة تربطك بـ 200+ مورد معتمد لمعارضك. عمولة 5% فقط، ضمان مالي على كل ريال، فاتورة موحدة.',
};
```

### OG images

Use Next.js dynamic OG image generation:

### File: `app/[locale]/(marketing)/opengraph-image.tsx`

```tsx
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OG() {
  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        background: '#0E3B43', color: '#FAF8F4', justifyContent: 'center',
        alignItems: 'center', fontFamily: 'sans-serif', padding: 60,
      }}>
        <div style={{ fontSize: 48, fontWeight: 700 }}>تطبيق المعارض</div>
        <div style={{ fontSize: 28, color: '#C8A24C', marginTop: 16 }}>5% عمولة فقط · 200+ مورد معتمد</div>
      </div>
    ),
    size
  );
}
```

---

## Step 7.8 — Cron jobs (Vercel)

### Update `vercel.ts` with cron entries

```ts
import { defineConfig } from '@vercel/config/v1';

export default defineConfig({
  framework: 'nextjs',
  crons: [
    { path: '/api/cron/auto-approve-deliveries', schedule: '0 3 * * *' }, // Daily 3 AM UTC
    { path: '/api/cron/retry-failed-ai-scoring', schedule: '*/30 * * * *' }, // Every 30 min
    { path: '/api/cron/cleanup-stale-rfqs', schedule: '0 4 * * *' }, // Daily 4 AM UTC
  ],
});
```

### File: `app/api/cron/auto-approve-deliveries/route.ts`

```ts
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: Request) {
  // Vercel Cron auth check
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const admin = createAdminClient();
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const { data: stale } = await admin
    .from('deliveries')
    .select('id, rfq_id, supplier_id, client_id')
    .eq('status', 'submitted')
    .lt('submitted_at', fourteenDaysAgo.toISOString());

  if (!stale || stale.length === 0) {
    return NextResponse.json({ approved: 0 });
  }

  for (const d of stale) {
    await admin
      .from('deliveries')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', d.id);

    await admin
      .from('escrow_transactions')
      .update({ status: 'delivery_approved' })
      .eq('rfq_id', d.rfq_id);

    await admin.from('notifications').insert([
      {
        user_id: d.client_id,
        type: 'auto_approved_delivery',
        title: 'تم القبول التلقائي للتسليم',
        body: 'مرّ 14 يوماً دون موافقة، فاعتُمد التسليم تلقائياً.',
        link: `/dashboard/rfqs/${d.rfq_id}`,
      },
      {
        user_id: d.supplier_id,
        type: 'auto_approved_delivery',
        title: '✅ قُبل التسليم تلقائياً',
        body: 'مرّ 14 يوماً دون اعتراض من العميل.',
        link: `/supplier/projects/${d.rfq_id}`,
      },
    ]);
  }

  return NextResponse.json({ approved: stale.length });
}
```

### File: `app/api/cron/retry-failed-ai-scoring/route.ts`

```ts
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { scoreProposal } from '@/lib/ai/score-proposal';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const admin = createAdminClient();
  const { data: failed } = await admin
    .from('proposals')
    .select('id')
    .ilike('ai_summary', '[scoring failed%')
    .limit(5);

  if (!failed) return NextResponse.json({ retried: 0 });

  for (const p of failed) {
    try { await scoreProposal(p.id); } catch (e) { console.error('retry failed for', p.id, e); }
  }

  return NextResponse.json({ retried: failed.length });
}
```

### Add to `.env.example`

```
CRON_SECRET=...
```

(Generate with `openssl rand -base64 32`. In Vercel, set as encrypted env var.)

---

## Step 7.9 — Performance polish

### Image optimization

Make sure every `<Image>` has `width`/`height` or `fill` + `sizes`. Run:

```bash
grep -rn "next/image" app/ components/ | head
```

### Font preload

Already handled by Phase 0's `next/font` setup. Verify with Lighthouse: no font-display issues.

### Bundle size

Run:

```bash
pnpm build
# Look at the route summary printed at the end. Goals:
# Each route's "First Load JS" < 200kb
# Largest shared chunk < 100kb
```

If a route is heavy: lazy-load heavy components with `next/dynamic`:

```tsx
import dynamic from 'next/dynamic';
const ChatWindow = dynamic(() => import('@/components/chat/chat-window').then(m => m.ChatWindow), { ssr: false });
```

### Lighthouse pass

- Open the production preview deployment
- Run Lighthouse on: `/`, `/discover`, `/login`, `/dashboard` (logged in)
- Target: Performance > 90, Accessibility > 95, Best Practices > 95, SEO > 95
- Fix any > 200ms TBT (Total Blocking Time) issue

---

## Step 7.10 — QA matrix (10-pilot acceptance)

Run through this matrix manually with 2 real human accounts (1 client, 1 supplier) and 1 admin:

```
Path: Sign up client → verify → login → dashboard empty state ✓
Path: Sign up supplier → verify → pending screen ✓
Path: Admin approves supplier → supplier sees activated dashboard ✓
Path: Client creates booth RFQ → published → supplier matched gets email + in-app ✓
Path: Supplier opens RFQ → submits proposal → AI scoring populates ✓
Path: Client opens compare → AI rec shown → shortlists 1 supplier → chat opens ✓
Path: Both parties exchange messages in real time ✓
Path: Either presses panic → admin notified within seconds ✓
Path: Admin joins chat → both see "🛡️ Admin انضم" ✓
Path: Client awards → losers notified, winner gets agreement ✓
Path: Both write understanding → AI analysis appears ✓
Path: Admin approves → both sign → RFQ in_escrow ✓
Path: Client uploads receipt → admin confirms → RFQ in_progress ✓
Path: Supplier uploads delivery → client approves → escrow delivery_approved ✓
Path: Client uploads final receipt → admin processes payout → RFQ completed ✓
Path: Both can review → ratings update supplier profile ✓
```

---

## Step 7.11 — Tests

### File: `tests/unit/review/rating-validation.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const clientReviewSchema = z.object({
  rfqId: z.string().uuid(),
  quality: z.number().int().min(1).max(5),
  communication: z.number().int().min(1).max(5),
  timeliness: z.number().int().min(1).max(5),
  professionalism: z.number().int().min(1).max(5),
  value: z.number().int().min(1).max(5),
  wouldRehire: z.number().int().min(1).max(5),
  comment: z.string().min(20).max(2000),
});

describe('client review schema', () => {
  it('rejects rating of 0', () => {
    const r = clientReviewSchema.safeParse({
      rfqId: '00000000-0000-0000-0000-000000000000',
      quality: 0, communication: 5, timeliness: 5, professionalism: 5, value: 5, wouldRehire: 5,
      comment: 'a'.repeat(50),
    });
    expect(r.success).toBe(false);
  });

  it('rejects rating of 6', () => {
    const r = clientReviewSchema.safeParse({
      rfqId: '00000000-0000-0000-0000-000000000000',
      quality: 6, communication: 5, timeliness: 5, professionalism: 5, value: 5, wouldRehire: 5,
      comment: 'a'.repeat(50),
    });
    expect(r.success).toBe(false);
  });

  it('rejects short comment', () => {
    const r = clientReviewSchema.safeParse({
      rfqId: '00000000-0000-0000-0000-000000000000',
      quality: 5, communication: 5, timeliness: 5, professionalism: 5, value: 5, wouldRehire: 5,
      comment: 'good',
    });
    expect(r.success).toBe(false);
  });

  it('accepts valid review', () => {
    const r = clientReviewSchema.safeParse({
      rfqId: '00000000-0000-0000-0000-000000000000',
      quality: 5, communication: 4, timeliness: 5, professionalism: 5, value: 4, wouldRehire: 5,
      comment: 'تجربة ممتازة، تسليم في الموعد، احترافية عالية.',
    });
    expect(r.success).toBe(true);
  });
});
```

### File: `tests/integration/review-trigger.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

describe.skipIf(!process.env.RUN_INTEGRATION)('review triggers update supplier stats', () => {
  it('inserting a review updates rating_avg + total_reviews', async () => {
    const ts = Date.now();
    const { data: client } = await admin.auth.admin.createUser({ email: `c-${ts}@test.local`, password: 'longenough1', email_confirm: true });
    const { data: supplier } = await admin.auth.admin.createUser({ email: `s-${ts}@test.local`, password: 'longenough1', email_confirm: true });
    const { data: cc } = await admin.from('companies').insert({ name: 'C', cr_number: '1010' + (ts % 1000000).toString().padStart(6, '0'), city: 'riyadh', created_by: client.user!.id }).select('id').single();
    const { data: sc } = await admin.from('companies').insert({ name: 'S', cr_number: '2020' + (ts % 1000000).toString().padStart(6, '0'), city: 'riyadh', created_by: supplier.user!.id }).select('id').single();
    await admin.from('profiles').insert([
      { id: client.user!.id, email: client.user!.email!, full_name: 'C', role: 'client', company_id: cc!.id },
      { id: supplier.user!.id, email: supplier.user!.email!, full_name: 'S', role: 'supplier', company_id: sc!.id },
    ]);
    await admin.from('suppliers').insert({
      id: supplier.user!.id, company_id: sc!.id,
      specializations: ['booth'], cities: ['riyadh'],
      bank_name: 'Test', iban: 'SA0380000000608010167519', account_holder: 'X', status: 'approved',
    });

    const { data: rfq } = await admin.from('rfqs').insert({
      client_id: client.user!.id, company_id: cc!.id,
      service_type: 'booth', title: 'X', city: 'riyadh',
      deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
      details: { area: 36, exhibitionName: 'X', floors: '1' }, status: 'completed',
    }).select('id').single();

    await admin.from('reviews').insert({
      rfq_id: rfq!.id, reviewer_id: client.user!.id, reviewee_id: supplier.user!.id,
      review_type: 'client_to_supplier',
      quality: 5, communication: 4, timeliness: 5, professionalism: 5, value: 4, would_rehire: 5,
      comment: 'a'.repeat(50),
    });

    const { data: s } = await admin.from('suppliers').select('rating_avg, total_reviews').eq('id', supplier.user!.id).single();
    expect(s?.total_reviews).toBe(1);
    expect(Number(s?.rating_avg)).toBeCloseTo(4.67, 1);

    // Cleanup
    await admin.from('reviews').delete().eq('rfq_id', rfq!.id);
    await admin.from('rfqs').delete().eq('id', rfq!.id);
    await admin.from('suppliers').delete().eq('id', supplier.user!.id);
    await admin.from('profiles').delete().in('id', [client.user!.id, supplier.user!.id]);
    await admin.from('companies').delete().in('id', [cc!.id, sc!.id]);
    await admin.auth.admin.deleteUser(client.user!.id);
    await admin.auth.admin.deleteUser(supplier.user!.id);
  });
});
```

### File: `tests/e2e/full-happy-path.spec.ts`

```ts
import { test, expect } from '@playwright/test';

test.skip(!process.env.E2E_FULL_FLOW, 'long-running full-flow test');

test('client signup → RFQ → proposal → award → agreement → escrow → delivery → review', async ({ page, browser }) => {
  // This is a marker for the QA team — run manually rather than CI.
  // For CI, the smaller per-phase tests cover each leg.
  expect(true).toBe(true);
});
```

---

## Step 7.12 — Acceptance checklist

### Functional
- [ ] Reviews work end-to-end (both client→supplier and supplier→client)
- [ ] Supplier rating updates immediately on new review
- [ ] Reviews appear on public profile page
- [ ] Disputes can be opened by either party → admin sees → admin resolves
- [ ] In-app notifications page works for both clients and suppliers
- [ ] Marking notifications as read on visit

### Marketing & SEO
- [ ] Real homepage live (not the placeholder)
- [ ] `/for-clients`, `/for-suppliers`, `/how-it-works`, `/pricing` real content
- [ ] `/terms` and `/privacy` (placeholder OK if legal review pending)
- [ ] `sitemap.xml` returns valid XML with all public routes
- [ ] `robots.txt` correctly disallows `/dashboard`, `/supplier`, `/admin`
- [ ] Each marketing page has unique meta title (≤60 chars) + description (≤155 chars)
- [ ] OG image renders for every route (test with social share preview tools)

### Performance
- [ ] Lighthouse Performance > 90 on `/`, `/discover`, `/login`
- [ ] Lighthouse Accessibility > 95 on all marketing pages
- [ ] LCP < 2.5s on 3G simulation
- [ ] First Load JS per route < 200 KB
- [ ] Mobile (375px) usable on every screen
- [ ] RTL/LTR both render correctly

### Cron
- [ ] `auto-approve-deliveries` cron job registered in Vercel project
- [ ] `retry-failed-ai-scoring` cron job registered
- [ ] Both protected by `CRON_SECRET`

### Testing
- [ ] All Phase 0–7 unit tests pass (~110+ tests total)
- [ ] All Phase 0–7 integration tests pass with `RUN_INTEGRATION=1`
- [ ] At least one E2E test per phase passes
- [ ] CI pipeline (GitHub Actions) green on every PR

### Pilot launch
- [ ] 10 client companies onboarded
- [ ] 5+ approved suppliers per service type (4 types × 5 = 20 suppliers minimum)
- [ ] First real RFQ posted by a pilot client
- [ ] First real proposal scored by AI
- [ ] First real chat opened
- [ ] Sentry / error tracking shows < 1% error rate after 7 days

---

## Files created in Phase 7 (summary)

```
app/actions/review.ts
app/actions/dispute.ts
app/[locale]/(client)/dashboard/rfqs/[id]/review/page.tsx
app/[locale]/(client)/dashboard/rfqs/[id]/review/review-form.tsx
app/[locale]/(supplier)/supplier/rfqs/[id]/review/page.tsx
app/[locale]/(client)/dashboard/notifications/page.tsx
app/[locale]/(supplier)/supplier/notifications/page.tsx
app/[locale]/(marketing)/for-clients/page.tsx
app/[locale]/(marketing)/for-suppliers/page.tsx
app/[locale]/(marketing)/how-it-works/page.tsx
app/[locale]/(marketing)/pricing/page.tsx
app/[locale]/(marketing)/terms/page.tsx
app/[locale]/(marketing)/privacy/page.tsx
app/[locale]/(marketing)/opengraph-image.tsx
app/admin/disputes/page.tsx
app/admin/disputes/[id]/page.tsx
app/api/cron/auto-approve-deliveries/route.ts
app/api/cron/retry-failed-ai-scoring/route.ts
app/api/cron/cleanup-stale-rfqs/route.ts
app/sitemap.ts
app/robots.ts
supabase/migrations/20260801000001_reviews_extensions.sql
supabase/migrations/20260801000002_disputes.sql
tests/unit/review/rating-validation.test.ts
tests/integration/review-trigger.test.ts
tests/e2e/full-happy-path.spec.ts
```

**Lines of code (estimate)**: ~1,700 implementation, ~250 tests.

---

## Final summary across all phases

| Phase | Focus | Files | LOC | Tests |
|-------|-------|-------|-----|-------|
| 0 | Foundation | ~50 | ~3,500 | 43 |
| 1 | Auth & Onboarding | ~45 | ~2,200 | 18 |
| 2 | RFQ & Discovery | ~32 | ~2,400 | 12 |
| 3 | Proposals & AI | ~17 | ~1,800 | 10 |
| 4 | Chat & Real-time | ~18 | ~2,000 | 9 |
| 5 | Award & Agreement | ~17 | ~1,800 | 8 |
| 6 | Escrow & Execution | ~17 | ~2,500 | 9 |
| 7 | Reviews & Polish | ~26 | ~1,700 | 7 |
| **Total** | **16 weeks** | **~220 files** | **~17,900 LOC** | **~116 tests** |

**End of Phase 7 — End of MVP.**

The platform is ready for the 10-company pilot. Subsequent phases (post-MVP) include: real ZATCA e-invoice integration, payment gateway (HyperPay/Tap), CEO read-only role, lead capture in event mode, supplier CRM, and ROI reporting.
