import { z } from 'zod';

export const agreementUnderstandingSchema = z.object({
  understanding: z.string().min(100, 'فهم الاتفاق يجب أن يكون 100 حرف على الأقل'),
});

export type AgreementUnderstandingInput = z.infer<typeof agreementUnderstandingSchema>;
