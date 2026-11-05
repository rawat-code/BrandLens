import { z } from 'zod';

export const guidelineCategoryEnum = z.enum([
  'tone',
  'messaging',
  'claim',
  'fact',
  'visual',
  'accessibility',
  'security',
  'terminology',
]);

export const guidelineCreateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title cannot exceed 200 characters'),
  category: z
    .string()
    .trim()
    .min(1, 'Category is required')
    .max(50, 'Category cannot exceed 50 characters'),
  body: z
    .string()
    .trim()
    .min(1, 'Guideline rule body is required')
    .max(5000, 'Guideline body cannot exceed 5000 characters'),
  clarification: z
    .string()
    .trim()
    .max(2000, 'Clarification cannot exceed 2000 characters')
    .nullable()
    .optional(),
});

export const guidelineUpdateSchema = guidelineCreateSchema.partial();

export const factStatusEnum = z.enum(['approved', 'retired']);

export const factCreateSchema = z.object({
  statement: z
    .string()
    .trim()
    .min(1, 'Fact statement is required')
    .max(2000, 'Statement cannot exceed 2000 characters'),
  source_note: z
    .string()
    .trim()
    .max(500, 'Source note cannot exceed 500 characters')
    .nullable()
    .optional(),
  owner: z
    .string()
    .trim()
    .max(200, 'Owner name/department cannot exceed 200 characters')
    .nullable()
    .optional(),
  expires_at: z
    .string()
    .trim()
    .nullable()
    .optional()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Invalid expiration date format',
    }),
  status: factStatusEnum.default('approved'),
});

export const factUpdateSchema = factCreateSchema.partial();

export const termKindEnum = z.enum(['banned', 'caution', 'preferred']);

export const termCreateSchema = z.object({
  term: z
    .string()
    .trim()
    .min(1, 'Term is required')
    .max(100, 'Term cannot exceed 100 characters'),
  kind: termKindEnum,
  replacement: z
    .string()
    .trim()
    .max(100, 'Replacement cannot exceed 100 characters')
    .nullable()
    .optional(),
  note: z
    .string()
    .trim()
    .max(1000, 'Note cannot exceed 1000 characters')
    .nullable()
    .optional(),
});

export const termUpdateSchema = termCreateSchema.partial();

export type GuidelineCreateInput = z.infer<typeof guidelineCreateSchema>;
export type GuidelineUpdateInput = z.infer<typeof guidelineUpdateSchema>;
export type FactCreateInput = z.infer<typeof factCreateSchema>;
export type FactUpdateInput = z.infer<typeof factUpdateSchema>;
export type TermCreateInput = z.infer<typeof termCreateSchema>;
export type TermUpdateInput = z.infer<typeof termUpdateSchema>;
