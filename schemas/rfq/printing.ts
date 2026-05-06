import { z } from 'zod';

export const printingDetailsSchema = z.object({
  printType: z.enum(['brochure', 'banner', 'business_card', 'catalog', 'poster', 'flyer', 'sticker', 'other'], { message: 'نوع المطبوعة مطلوب' }),
  quantity: z.number().int().positive('الكمية مطلوبة'),
  size: z.string().min(1, 'المقاس مطلوب'),
  paperType: z.enum(['glossy', 'matte', 'recycled', 'premium']).optional(),
  colorType: z.enum(['full_color', 'single_color', 'two_color']).default('full_color'),
  doubleSided: z.boolean().default(false),
  hasDesign: z.boolean().default(false),
  deliveryDate: z.coerce.date({ message: 'تاريخ التسليم مطلوب' }),
  specialRequirements: z.string().optional(),
});

export type PrintingDetails = z.infer<typeof printingDetailsSchema>;
