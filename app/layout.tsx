import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'تطبيق المعارض — منصة B2B لموردي المعارض في السعودية',
  description: 'منصة B2B واحدة تربطك بـ 200+ مورد معتمد لمعارضك. عمولة 5% فقط.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
