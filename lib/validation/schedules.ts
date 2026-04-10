import { z } from "zod";

const scheduleOptionSchema = z.object({
  startAt: z
    .string()
    .trim()
    .min(1, "Start time is required")
    .transform((value, ctx) => {
      const normalized = new Date(value);

      if (Number.isNaN(normalized.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Start time must be a valid date-time value",
        });

        return z.NEVER;
      }

      return normalized.toISOString();
    }),
  endAt: z
    .string()
    .trim()
    .min(1, "End time is required")
    .transform((value, ctx) => {
      const normalized = new Date(value);

      if (Number.isNaN(normalized.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End time must be a valid date-time value",
        });

        return z.NEVER;
      }

      return normalized.toISOString();
    }),
  note: z.string().trim().max(300).optional().default(""),
}).superRefine((value, ctx) => {
  if (new Date(value.endAt).getTime() <= new Date(value.startAt).getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "End time must be later than start time",
      path: ["endAt"],
    });
  }
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
  note: z.string().trim().min(1, "Note is required").max(500),
  adminPassword: z.string().trim().min(1, "Admin password is required").max(100),
  accessPassword: optionalPasswordSchema,
  requireEmail: z.boolean().optional().default(false),
  requirePhone: z.boolean().optional().default(false),
  options: z.array(scheduleOptionSchema).min(1, "At least one schedule option is required"),
});

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
