'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { RatingTrendPoint } from '@/lib/supplier/kpis';

interface Props {
  data: RatingTrendPoint[];
  rtl?: boolean;
}

export function SatisfactionLineChart({ data, rtl = true }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[var(--color-stone-600)]">
        لم تصلك تقييمات بعد.
      </div>
    );
  }
  return (
    <div className="h-64 w-full" data-component="satisfaction-line-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E0" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11 }}
            reversed={rtl}
            tickFormatter={(v: string) => v.slice(5)}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            orientation={rtl ? 'right' : 'left'}
            domain={[1, 5]}
            ticks={[1, 2, 3, 4, 5]}
          />
          <Tooltip
            formatter={(value, _name, item) => {
              const count =
                (item?.payload as { count?: number } | undefined)?.count ?? 0;
              return [`${value} نجوم (${count} تقييم)`, 'متوسط'] as [string, string];
            }}
          />
          <Line
            type="monotone"
            dataKey="average"
            stroke="#C8A24C"
            strokeWidth={2.5}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
