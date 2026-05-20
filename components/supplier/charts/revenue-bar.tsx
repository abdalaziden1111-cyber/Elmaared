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
import type { MonthlyBucket } from '@/lib/supplier/kpis';

interface Props {
  data: MonthlyBucket[];
  rtl?: boolean;
}

const FILL = '#0E3B43'; // midnight-green

export function RevenueBarChart({ data, rtl = true }: Props) {
  return (
    <div className="h-64 w-full" data-component="revenue-bar-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
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
            tickFormatter={(v: number) =>
              v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
            }
          />
          <Tooltip
            formatter={(value) =>
              [`${Number(value).toLocaleString('en')} ﷼`, 'الإيراد'] as [string, string]
            }
            cursor={{ fill: 'rgba(14,59,67,0.05)' }}
          />
          <Bar dataKey="total" fill={FILL} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
