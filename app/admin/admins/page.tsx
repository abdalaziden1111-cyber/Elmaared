import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDate, timeAgo } from '@/lib/utils/format';

interface AdminRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  preferred_language: string | null;
  created_at: string;
}

interface ActivityRow {
  actor_id: string;
  created_at: string;
}

export default async function AdminAdminsPage() {
  const admin = createAdminClient();

  const { data: rowsRaw } = await admin
    .from('profiles')
    .select('id, full_name, phone, preferred_language, created_at')
    .eq('role', 'admin')
    .order('created_at', { ascending: false });
  const rows = (rowsRaw ?? []) as unknown as AdminRow[];

  // Last admin action timestamp per actor (one query, group in memory)
  const adminIds = rows.map((r) => r.id);
  let lastActivity = new Map<string, string>();
  if (adminIds.length > 0) {
    const { data: activityRaw } = await admin
      .from('audit_logs')
      .select('actor_id, created_at')
      .eq('actor_role', 'admin')
      .in('actor_id', adminIds)
      .order('created_at', { ascending: false })
      .limit(500);
    const activity = (activityRaw ?? []) as unknown as ActivityRow[];
    for (const a of activity) {
      if (!lastActivity.has(a.actor_id)) lastActivity.set(a.actor_id, a.created_at);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
        فريق Admin
      </h1>
      <p className="mt-1 text-sm text-[var(--color-stone-600)]">
        كل الحسابات ذات صلاحية Admin على المنصة. إضافة Admin جديدة تتم من Supabase
        مباشرةً (دور Admin يُمنح من قاعدة البيانات حالياً) — هذه الصفحة للعرض فقط.
      </p>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi label="إجمالي Admins" value={String(rows.length)} />
        <Kpi
          label="نَشِط آخر 24 ساعة"
          value={String(
            rows.filter((r) => {
              const last = lastActivity.get(r.id);
              if (!last) return false;
              return Date.now() - new Date(last).getTime() < 24 * 60 * 60 * 1000;
            }).length
          )}
          tone="success"
        />
        <Kpi
          label="بدون نشاط مسجّل"
          value={String(rows.filter((r) => !lastActivity.has(r.id)).length)}
          tone="warning"
        />
      </section>

      {rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[var(--color-stone-300)] p-10 text-center">
          <p className="text-sm text-[var(--color-stone-600)]">
            لا يوجد Admins بعد. يجب أن يكون هناك Admin واحد على الأقل.
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-3">
          {rows.map((a) => {
            const last = lastActivity.get(a.id) ?? null;
            return (
              <li key={a.id}>
                <Link
                  href={`/admin/users/${a.id}`}
                  className="block rounded-2xl border border-[var(--color-stone-300)] bg-white p-5 hover:border-[var(--color-action-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold">
                        {a.full_name ?? '—'}
                      </h2>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-[var(--color-stone-600)]">
                        {a.phone ? <span className="num">{a.phone}</span> : null}
                        <span>· انضمّ {formatDate(a.created_at)}</span>
                        {a.preferred_language ? (
                          <span>· اللغة: {a.preferred_language === 'ar' ? 'العربية' : a.preferred_language}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="shrink-0 text-end">
                      <span className="rounded-full bg-[var(--color-midnight-green)]/10 px-3 py-1 text-xs text-[var(--color-midnight-green)]">
                        Admin
                      </span>
                      {last ? (
                        <p className="mt-1 text-xs text-[var(--color-stone-600)]">
                          آخر نشاط: {timeAgo(last)}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-[var(--color-warning)]">
                          لا يوجد نشاط مسجّل
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-8 rounded-2xl border border-[var(--color-stone-300)] bg-[var(--color-cream)] p-5 text-xs text-[var(--color-stone-600)]">
        <p className="font-medium">إضافة Admin جديدة</p>
        <p className="mt-1">
          إضافة المسؤولين تتم من Supabase Auth + جدول <span className="num">profiles</span>{' '}
          بقيمة <span className="num">role = &apos;admin&apos;</span>. واجهة الإضافة من المنصة
          ستتاح في إصدار قادم مع طبقة الصلاحيات (RBAC).
        </p>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'success' | 'warning';
}) {
  const cls =
    tone === 'success'
      ? 'text-[var(--color-success)]'
      : tone === 'warning'
        ? 'text-[var(--color-warning)]'
        : 'text-[var(--color-midnight-green)]';
  return (
    <div className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-4">
      <p className="text-xs text-[var(--color-stone-600)]">{label}</p>
      <p className={`num mt-2 text-xl font-semibold ${cls}`}>{value}</p>
    </div>
  );
}
