import { z } from 'zod';

export const giftsDetailsSchema = z.object({
  recipientType: z.enum(['VIP', 'general', 'staff', 'speakers'], { message: 'نوع المتلقي مطلوب' }),
  quantity: z.number().int().positive('الكمية يجب أن تكون أكبر من صفر'),
  category: z.enum(['tech', 'traditional', 'luxury', 'eco', 'custom'], { message: 'الفئة مطلوبة' }),
  hasBranding: z.boolean().default(true),
  brandingType: z.enum(['logo', 'full_print', 'engraving', 'embroidery']).optional(),
  deliveryDate: z.coerce.date({ message: 'تاريخ التسليم مطلوب' }),
  sampleRequired: z.boolean().default(false),
  specialRequirements: z.string().optional(),
});

export type GiftsDetails = z.infer<typeof giftsDetailsSchema>;
