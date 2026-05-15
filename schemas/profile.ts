import { z } from 'zod';

export const updateClientProfileSchema = z.object({
  fullName: z.string().min(3, 'الاسم يجب أن يكون 3 أحرف على الأقل'),
  phone: z
    .string()
    .regex(/^\+966\d{9}$/, 'رقم الهاتف يجب أن يبدأ بـ +966 ويتبعه 9 أرقام'),
});

export const updateClientCompanySchema = z.object({
  companyName: z.string().min(2, 'اسم الشركة مطلوب'),
  legalName: z.string().optional(),
  crNumber: z
    .string()
    .length(10, 'رقم السجل التجاري يجب أن يكون 10 أرقام بالضبط')
    .regex(/^\d+$/, 'أرقام فقط'),
  vatNumber: z.string().optional(),
  size: z.enum(['enterprise', 'mid', 'startup']),
  industry: z.string().optional(),
  city: z.string().min(2, 'المدينة مطلوبة'),
  address: z.string().optional(),
});

export type UpdateClientProfileInput = z.infer<typeof updateClientProfileSchema>;
export type UpdateClientCompanyInput = z.infer<typeof updateClientCompanySchema>;
