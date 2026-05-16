import { z } from 'zod';

const ratingField = z
  .number({ message: 'يرجى اختيار تقييم' })
  .int({ message: 'التقييم يجب أن يكون رقماً صحيحاً' })
  .min(1, 'التقييم يجب أن يكون 1 على الأقل')
  .max(5, 'التقييم لا يتجاوز 5');

export const reviewSchema = z.object({
  ratingOverall: ratingField,
  ratingQuality: ratingField.optional(),
  ratingTimeliness: ratingField.optional(),
  ratingCommunication: ratingField.optional(),
  ratingFlexibility: ratingField.optional(),
  ratingPriceValue: ratingField.optional(),
  comment: z
    .string()
    .max(2000, 'التعليق طويل جداً (الحد الأقصى 2000 حرف)')
    .optional(),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
