import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
});

export const signupClientSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
  fullName: z.string().min(3, 'الاسم يجب أن يكون 3 أحرف على الأقل'),
  phone: z.string().regex(/^\+966\d{9}$/, 'رقم الهاتف يجب أن يبدأ بـ +966 ويتبعه 9 أرقام'),
  companyName: z.string().min(2, 'اسم الشركة مطلوب'),
  legalName: z.string().optional(),
  crNumber: z.string().length(10, 'رقم السجل التجاري يجب أن يكون 10 أرقام بالضبط').regex(/^\d+$/, 'أرقام فقط'),
  vatNumber: z.string().optional(),
  size: z.enum(['enterprise', 'mid', 'startup']),
  industry: z.string().optional(),
  city: z.string().min(2, 'المدينة مطلوبة'),
});

export const signupSupplierSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
  fullName: z.string().min(3, 'الاسم يجب أن يكون 3 أحرف على الأقل'),
  phone: z.string().regex(/^\+966\d{9}$/, 'رقم الهاتف يجب أن يبدأ بـ +966 ويتبعه 9 أرقام'),
  companyName: z.string().min(2, 'اسم الشركة مطلوب'),
  legalName: z.string().optional(),
  crNumber: z.string().length(10, 'رقم السجل التجاري يجب أن يكون 10 أرقام بالضبط').regex(/^\d+$/, 'أرقام فقط'),
  vatNumber: z.string().optional(),
  specializations: z.array(z.enum(['booth', 'gifts', 'event', 'printing'])).min(1, 'اختر تخصصاً واحداً على الأقل'),
  cities: z.array(z.string()).min(1, 'اختر مدينة واحدة على الأقل'),
  bio: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  teamSize: z.number().int().positive().optional(),
  yearsOfExperience: z.number().int().min(0).optional(),
  minOrderValue: z.number().min(0).optional(),
  bankName: z.string().optional(),
  iban: z.string().regex(/^SA\d{22}$/, 'IBAN سعودي يجب أن يبدأ بـ SA ويتبعه 22 رقم').optional().or(z.literal('')),
  accountHolderName: z.string().optional(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح'),
});

export const updatePasswordSchema = z.object({
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'كلمتا المرور غير متطابقتين',
  path: ['confirmPassword'],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupClientInput = z.infer<typeof signupClientSchema>;
export type SignupSupplierInput = z.infer<typeof signupSupplierSchema>;
