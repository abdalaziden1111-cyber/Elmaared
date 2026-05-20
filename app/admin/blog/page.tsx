import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { timeAgo } from '@/lib/utils/format';
import { DeletePostButton } from './delete-button';

interface PostRow {
  id: string;
  slug: string;
  title_ar: string;
  status: 'draft' | 'scheduled' | 'published';
  published_at: string | null;
  tags: string[];
  updated_at: string;
}

const STATUS_LABEL = {
  draft: 'مسودة',
  scheduled: 'مجدول',
  published: 'منشور',
} as const;
const STATUS_TONE = {
  draft: 'bg-[var(--color-stone-100)] text-[var(--color-stone-600)]',
  scheduled:
    'bg-[var(--color-warning-50,#FFFBEB)] text-[var(--color-warning,#B45309)]',
  published:
    'bg-[var(--color-success-50,#ECFDF5)] text-[var(--color-success,#047857)]',
} as const;

export default async function AdminBlogPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from('blog_posts')
    .select('id, slug, title_ar, status, published_at, tags, updated_at')
    .order('updated_at', { ascending: false })
    .limit(100);
  const posts = (data ?? []) as PostRow[];

  return (
    <div>
      <Breadcrumbs items={[{ href: '/admin', label: 'نظرة عامة' }, { label: 'المدوّنة' }]} />
      <header className="mt-2 mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
            المدوّنة
          </h1>
          <p className="mt-1 text-sm text-[var(--color-stone-600)]">
            إدارة مقالات المدوّنة العامة. نشر، جدولة، مسوّدات.
          </p>
        </div>
        <Link
          href="/admin/blog/new"
          className="inline-flex h-10 items-center rounded-xl bg-[var(--color-action-blue)] px-4 text-sm font-semibold text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)]"
        >
          + مقال جديد
        </Link>
      </header>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-stone-300)] bg-white p-10 text-center text-sm text-[var(--color-stone-600)]">
          لا توجد مقالات بعد. اضغط "مقال جديد" للبدء.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--color-stone-300)] bg-white">
          <table className="w-full text-start text-sm">
            <thead className="bg-[var(--color-stone-100)] text-xs text-[var(--color-stone-600)]">
              <tr>
                <th className="px-4 py-3 text-start">العنوان</th>
                <th className="px-4 py-3 text-start">الحالة</th>
                <th className="px-4 py-3 text-start">الوسوم</th>
                <th className="px-4 py-3 text-start">تاريخ النشر</th>
                <th className="px-4 py-3 text-start">آخر تعديل</th>
                <th className="px-4 py-3 text-start" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-stone-300)]">
              {posts.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/blog/${p.id}/edit`}
                      className="font-semibold text-[var(--color-action-blue)] hover:underline"
                    >
                      {p.title_ar}
                    </Link>
                    <div className="text-[10px] text-[var(--color-stone-600)]" dir="ltr">
                      /{p.slug}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[p.status]}`}
                    >
                      {STATUS_LABEL[p.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-stone-600)]">
                    {p.tags.slice(0, 3).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-stone-600)]">
                    {p.published_at
                      ? new Date(p.published_at).toLocaleDateString('ar-SA')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-stone-600)]">
                    {timeAgo(new Date(p.updated_at))}
                  </td>
                  <td className="px-4 py-3">
                    <DeletePostButton id={p.id} title={p.title_ar} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
