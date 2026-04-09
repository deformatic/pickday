import { z } from "zod";

export const tokenParamSchema = z.object({
  token: z.string().trim().min(1).max(255),
});

export const adminTokenParamSchema = z.object({
  adminToken: z.string().trim().min(1).max(255),
});

export const responseRouteParamSchema = z.object({
  adminToken: z.string().trim().min(1).max(255),
  responseId: z.coerce.number().int().positive(),
});

export const instructorAutocompleteQuerySchema = z.object({
  q: z.string().trim().max(120).default(""),
});
