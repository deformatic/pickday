import { z } from "zod";

export const verifySchedulePasswordSchema = z.object({
  password: z.string().trim().min(1, "Password is required").max(100),
});

const optionalStringSchema = z
  .string()
  .trim()
  .max(500)
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional();

export const createScheduleResponseSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Email must be valid").max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  comment: optionalStringSchema,
  selectedOptionIds: z.array(z.number().int().positive()).min(1, "Select at least one option"),
});

export type CreateScheduleResponseInput = z.infer<typeof createScheduleResponseSchema>;
