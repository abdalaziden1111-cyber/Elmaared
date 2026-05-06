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
