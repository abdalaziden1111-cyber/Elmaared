import { z } from 'zod';

export const eventDetailsSchema = z.object({
  eventType: z.enum(['conference', 'seminar', 'gala', 'launch', 'workshop'], { message: 'نوع الفعالية مطلوب' }),
  expectedAttendees: z.number().int().positive('عدد الحضور مطلوب'),
  eventDate: z.coerce.date({ message: 'تاريخ الفعالية مطلوب' }),
  duration: z.enum(['half_day', 'full_day', 'multi_day'], { message: 'المدة مطلوبة' }),
  venueProvided: z.boolean().default(false),
  needsCatering: z.boolean().default(false),
  needsAV: z.boolean().default(true),
  needsPhotography: z.boolean().default(false),
  specialRequirements: z.string().optional(),
});

export type EventDetails = z.infer<typeof eventDetailsSchema>;
