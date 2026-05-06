import { z } from 'zod';

const ratingField = z.number().int().min(1).max(5);

export const reviewSchema = z.object({
  ratingOverall: ratingField,
  ratingQuality: ratingField.optional(),
  ratingTimeliness: ratingField.optional(),
  ratingCommunication: ratingField.optional(),
  ratingFlexibility: ratingField.optional(),
  ratingPriceValue: ratingField.optional(),
  comment: z.string().optional(),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
