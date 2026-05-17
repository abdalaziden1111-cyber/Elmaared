import { z } from 'zod';

export const supplierProfileSchema = z.object({
  companyName: z.string().min(2),
  bio: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  teamSize: z.number().int().positive().optional(),
  yearsOfExperience: z.number().int().min(0).optional(),
  minOrderValue: z.number().min(0).optional(),
  specializations: z.array(z.enum(['booth', 'gifts', 'event', 'printing'])).min(1),
  cities: z.array(z.string()).min(1),
  bankName: z.string().optional(),
  iban: z.string().regex(/^SA\d{22}$/).optional().or(z.literal('')),
  accountHolderName: z.string().optional(),
});

// Schema for the self-service profile editor at /supplier/profile/edit.
// Mirrors supplierProfileSchema but adds the post-signup fields (legal_name,
// vat_number) and uses the same Saudi IBAN regex. All bank fields together
// trigger an admin re-review (status flips back to pending_review).
export const updateSupplierProfileSchema = z.object({
  companyName: z.string().min(2, 'اسم الشركة قصير جداً'),
  legalName: z.string().optional(),
  vatNumber: z
    .string()
    .regex(/^3\d{14}$/, 'رقم ضريبي غير صحيح (15 رقم يبدأ بـ 3)')
    .optional()
    .or(z.literal('')),
  bio: z.string().max(2000, 'النبذة طويلة جداً').optional(),
  website: z.string().url('رابط غير صحيح').optional().or(z.literal('')),
  teamSize: z.number().int().positive().max(10000).optional(),
  yearsOfExperience: z.number().int().min(0).max(100).optional(),
  minOrderValue: z.number().min(0).optional(),
  specializations: z
    .array(z.enum(['booth', 'gifts', 'event', 'printing']))
    .min(1, 'اختر تخصصاً واحداً على الأقل'),
  cities: z.array(z.string().min(1)).min(1, 'اختر مدينة واحدة على الأقل'),
  bankName: z.string().min(2, 'اسم البنك مطلوب').optional().or(z.literal('')),
  iban: z
    .string()
    .regex(/^SA\d{22}$/, 'IBAN غير صحيح (يبدأ بـ SA ثم 22 رقم)')
    .optional()
    .or(z.literal('')),
  accountHolderName: z.string().min(2).optional().or(z.literal('')),
});

export type UpdateSupplierProfileInput = z.infer<typeof updateSupplierProfileSchema>;

export const portfolioItemSchema = z.object({
  title: z.string().min(2, 'عنوان المشروع مطلوب'),
  description: z.string().optional(),
  serviceType: z.enum(['booth', 'gifts', 'event', 'printing']).optional(),
  clientName: z.string().optional(),
  exhibitionName: z.string().optional(),
  year: z.number().int().min(2015).max(2030).optional(),
});

export type SupplierProfileInput = z.infer<typeof supplierProfileSchema>;
export type PortfolioItemInput = z.infer<typeof portfolioItemSchema>;
