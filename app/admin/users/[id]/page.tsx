import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDate, timeAgo } from '@/lib/utils/format';

interface ProfileDetail {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  preferred_language: string | null;
  created_at: string;
}

const ROLE_LABEL: Record<string, string> = {
  client: 'عميل',
  supplier: 'مورد',
  admin: 'Admin',
};

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: profileRaw } = await admin
    .from('profiles')
    .select('id, full_name, phone, role, preferred_language, created_at')
    .eq('id', id)
    .maybeSingle();
  const profile = profileRaw as ProfileDetail | null;
  if (!profile) notFound();

  // Pull related records depending on role
  const [supplier, rfqs, recentAudit] = await Promise.all([
    profile.role === 'supplier'
      ? admin.from('suppliers').select('id, company_name, status').eq('owner_id', id).maybeSingle()
      : Promise.resolve({ data: null }),
    profile.role === 'client'
      ? admin
          .from('rfqs')
          .select('id, rfq_number, title, status, created_at')
          .eq('client_id', id)
          .order('created_at', { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),
    admin
      .from('audit_logs')
      .select('id, action, resource_type, created_at')
      .eq('actor_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const supplierData = supplier.data as { id: string; company_name: string; status: string } | null;
  const rfqsData = (rfqs.data ?? []) as unknown as {
    id: string;
    rfq_number: string;
    title: string;
    status: string;
    created_at: string;
  }[];
  const auditData = (recentAudit.data ?? []) as unknown as {
    id: string;
    action: string;
    resource_type: string;
    created_at: string;
  }[];

  return (
    <div>
      <Link
        href="/admin/users"
        className="text-sm text-[var(--color-action-blue)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
      >
        ← العودة لقائمة المستخدمين
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
            {profile.full_name ?? '—'}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-stone-600)]">
            تسجّل في {formatDate(profile.created_at)}
          </p>
        </div>
        <span className="rounded-full bg-[var(--color-stone-100)] px-3 py-1 text-xs">
          {ROLE_LABEL[profile.role] ?? profile.role}
        </span>
      </div>

      <section className="mt-6 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          المعلومات الأساسية
        </h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="الاسم الكامل" value={profile.full_name} />
          <Field label="الهاتف" value={profile.phone} mono />
          <Field label="الدور" value={ROLE_LABEL[profile.role] ?? profile.role} />
          <Field label="اللغة المفضّلة" value={profile.preferred_language} />
        </dl>
      </section>

      {supplierData ? (
        <section className="mt-4 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
          <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
            ملف المورد
          </h2>
          <p className="mt-2 text-sm">
            <Link
              href={`/admin/suppliers/${supplierData.id}`}
              className="text-[var(--color-action-blue)] hover:underline"
            >
              {supplierData.company_name}
            </Link>{' '}
            — {supplierData.status}
          </p>
        </section>
      ) : null}

      {profile.role === 'client' && rfqsData.length > 0 ? (
        <section className="mt-4 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
          <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
            آخر طلبات هذا العميل ({rfqsData.length})
          </h2>
          <ul className="mt-3 grid gap-2">
            {rfqsData.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/admin/rfqs/${r.id}`}
                  className="flex items-center justify-between rounded-lg border border-[var(--color-stone-300)] p-3 text-sm hover:border-[var(--color-action-blue)]"
                >
                  <div>
                    <span className="num text-xs text-[var(--color-stone-600)]">
                      {r.rfq_number}
                    </span>
                    <span className="ms-2">{r.title}</span>
                  </div>
                  <span className="text-xs text-[var(--color-stone-600)]">{r.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-4 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          آخر النشاط
        </h2>
        {auditData.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-stone-600)]">لا يوجد نشاط مسجّل.</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {auditData.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-[var(--color-stone-300)] p-2 text-xs"
              >
                <span>
                  {a.action} · <span className="text-[var(--color-stone-600)]">{a.resource_type}</span>
                </span>
                <span className="text-[var(--color-stone-600)]">{timeAgo(a.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-[var(--color-stone-600)]">{label}</dt>
      <dd className={`mt-1 text-sm ${mono ? 'num' : ''}`}>{value ?? '—'}</dd>
    </div>
  );
}
