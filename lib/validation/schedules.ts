import { z } from "zod";

const scheduleOptionSchema = z.object({
  datetime: z
    .string()
    .trim()
    .min(1, "Datetime is required")
    .transform((value, ctx) => {
      const normalized = new Date(value);

      if (Number.isNaN(normalized.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Datetime must be a valid date-time value",
        });

        return z.NEVER;
      }

      return normalized.toISOString();
    }),
  label: z.string().trim().min(1, "Label is required").max(200),
});

const optionalPasswordSchema = z
  .string()
  .trim()
  .max(100)
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional();

export const createScheduleSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  location: z.string().trim().min(1, "Location is required").max(200),
  timeInfo: z.string().trim().min(1, "Time info is required").max(500),
  adminPassword: z.string().trim().min(1, "Admin password is required").max(100),
  accessPassword: optionalPasswordSchema,
  requireEmail: z.boolean().optional().default(false),
  requirePhone: z.boolean().optional().default(false),
  options: z.array(scheduleOptionSchema).min(1, "At least one schedule option is required"),
});

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
