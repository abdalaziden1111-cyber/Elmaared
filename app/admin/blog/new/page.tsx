import { requireRole } from '@/lib/auth/require-role';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { BlogEditor } from '../blog-editor';

export default async function NewBlogPostPage() {
  await requireRole(['admin']);
  return (
    <div>
      <Breadcrumbs
        items={[
          { href: '/admin', label: 'نظرة عامة' },
          { href: '/admin/blog', label: 'المدوّنة' },
          { label: 'مقال جديد' },
        ]}
      />
      <h1 className="mt-2 text-2xl font-semibold text-[var(--color-midnight-green)]">
        مقال جديد
      </h1>
      <p className="mt-1 text-sm text-[var(--color-stone-600)]">
        اكتب المحتوى بالعربية والإنجليزية، ارفع صورة الغلاف، ثم اختر "نشر الآن" أو "حفظ كمسودة".
      </p>
      <div className="mt-6">
        <BlogEditor />
      </div>
    </div>
  );
}
