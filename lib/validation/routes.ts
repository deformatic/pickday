import { z } from "zod";

export const tokenParamSchema = z.object({
  token: z.string().trim().min(1).max(255),
});

export const tokenResponseRouteParamSchema = z.object({
  token: z.string().trim().min(1).max(255),
  responseId: z.coerce.number().int().positive(),
});

export const adminTokenParamSchema = z.object({
  adminToken: z.string().trim().min(1).max(255),
});

export const responseRouteParamSchema = z.object({
  adminToken: z.string().trim().min(1).max(255),
  responseId: z.coerce.number().int().positive(),
});

export const responseOptionRouteParamSchema = z.object({
  adminToken: z.string().trim().min(1).max(255),
  responseId: z.coerce.number().int().positive(),
  optionId: z.coerce.number().int().positive(),
});
