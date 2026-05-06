import { Clock } from 'lucide-react';

export default function SupplierPendingPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center text-center">
      <Clock className="size-12 text-[var(--color-warning)]" />
      <h1 className="mt-4 text-2xl font-semibold text-[var(--color-midnight-green)]">
        حسابك قيد المراجعة
      </h1>
      <p className="mt-2 text-sm text-[var(--color-stone-600)]">
        تتم مراجعة بياناتك خلال 24–48 ساعة عمل. سترسل لك رسالة تأكيد على بريدك
        فور الاعتماد، وستتمكّن وقتها من استقبال الطلبات وتقديم العروض.
      </p>
    </main>
  );
}
