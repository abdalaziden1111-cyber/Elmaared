import { z } from 'zod';

export const proposalSchema = z.object({
  totalPrice: z.number().positive('السعر يجب أن يكون أكبر من صفر'),
  deliveryDays: z.number().int().positive('مدة التسليم مطلوبة'),
  description: z.string().min(50, 'الوصف يجب أن يكون 50 حرفاً على الأقل'),
  scopeOfWork: z.string().min(100, 'نطاق العمل يجب أن يكون 100 حرف على الأقل'),
  excludedItems: z.string().optional(),
  paymentTerms: z.string().min(10, 'شروط الدفع مطلوبة'),
  validityDays: z.number().int().min(7).max(30).default(14),
});

export type ProposalInput = z.infer<typeof proposalSchema>;
