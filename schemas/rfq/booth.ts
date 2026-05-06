import { z } from 'zod';

export const boothDetailsSchema = z.object({
  area: z.string().min(1, 'المساحة مطلوبة'),
  exhibitionName: z.string().min(2, 'اسم المعرض مطلوب'),
  exhibitionDate: z.coerce.date({ message: 'تاريخ المعرض مطلوب' }),
  floors: z.enum(['1', '2'], { message: 'عدد الطوابق مطلوب' }),
  openSides: z.enum(['1', '2', '3', '4']).optional(),
  hasStorage: z.boolean().default(false),
  hasMeetingRoom: z.boolean().default(false),
  hasKitchen: z.boolean().default(false),
  screenCount: z.number().int().min(0).default(0),
  specialRequirements: z.string().optional(),
});

export type BoothDetails = z.infer<typeof boothDetailsSchema>;
