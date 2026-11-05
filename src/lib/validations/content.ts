import { z } from 'zod';

export const contentChannelEnum = z.enum([
  'instagram',
  'blog',
  'email',
  'website',
  'packaging',
  'press_release',
  'other',
]);

export const contentCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title cannot exceed 200 characters'),
  channel: z
    .string()
    .trim()
    .min(1, 'Channel is required')
    .max(50, 'Channel cannot exceed 50 characters'),
  audience: z
    .string()
    .trim()
    .max(200, 'Audience cannot exceed 200 characters')
    .nullable()
    .optional(),
  confidential: z.boolean().default(false),
  body: z
    .string()
    .trim()
    .min(1, 'Content body is required')
    .max(10000, 'Content body cannot exceed 10,000 characters'),
  note: z
    .string()
    .trim()
    .max(500, 'Version note cannot exceed 500 characters')
    .nullable()
    .optional(),
});

export type ContentCreateInput = z.infer<typeof contentCreateSchema>;

