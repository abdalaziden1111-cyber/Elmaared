'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CategoryWinRate } from '@/lib/supplier/kpis';

interface Props {
  data: CategoryWinRate[];
  rtl?: boolean;
}

const SERVICE_LABEL_AR: Record<string, string> = {
  booth: 'أجنحة',
  gifts: 'هدايا',
  event: 'فعاليات',
  printing: 'مطبوعات',
  unknown: 'غير محدد',
};

export function WinRateBarChart({ data, rtl = true }: Props) {
  const chartData = data
    .filter((d) => d.proposals > 0)
    .map((d) => ({
      category: SERVICE_LABEL_AR[d.category] ?? d.category,
      winRate: d.winRatePct,
      proposals: d.proposals,
    }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[var(--color-stone-600)]">
        لا توجد بيانات بعد.
      </div>
    );
  }

  return (
    <div className="h-64 w-full" data-component="win-rate-bar-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E0" />
          <XAxis dataKey="category" tick={{ fontSize: 11 }} reversed={rtl} />
          <YAxis
            tick={{ fontSize: 11 }}
            orientation={rtl ? 'right' : 'left'}
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}٪`}
          />
          <Tooltip
            formatter={(value, _name, item) => {
              const proposals =
                (item?.payload as { proposals?: number } | undefined)
                  ?.proposals ?? 0;
              return [`${value}٪ (${proposals} عرض)`, 'معدل الفوز'] as [
                string,
                string,
              ];
            }}
            cursor={{ fill: 'rgba(0,108,53,0.05)' }}
          />
          <Bar dataKey="winRate" fill="#006C35" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
