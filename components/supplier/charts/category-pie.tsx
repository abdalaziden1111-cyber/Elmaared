'use client';

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { CategoryWinRate } from '@/lib/supplier/kpis';

interface Props {
  data: CategoryWinRate[];
}

// Saudi-green-forward palette so the pie keeps a consistent brand voice.
const COLORS = ['#0E3B43', '#006C35', '#C8A24C', '#FE7002', '#7A766F'];

const SERVICE_LABEL_AR: Record<string, string> = {
  booth: 'أجنحة',
  gifts: 'هدايا',
  event: 'فعاليات',
  printing: 'مطبوعات',
  unknown: 'غير محدد',
};

export function CategoryPieChart({ data }: Props) {
  const pieData = data
    .filter((d) => d.proposals > 0)
    .map((d) => ({
      name: SERVICE_LABEL_AR[d.category] ?? d.category,
      value: d.proposals,
    }));

  if (pieData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[var(--color-stone-600)]">
        لا توجد بيانات بعد.
      </div>
    );
  }

  return (
    <div className="h-64 w-full" data-component="category-pie-chart">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={85}
            dataKey="value"
            stroke="#fff"
            strokeWidth={2}
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) =>
              [`${Number(value)} عرض`, 'العدد'] as [string, string]
            }
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
