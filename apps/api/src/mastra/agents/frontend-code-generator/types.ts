import { z } from 'zod';

/**
 * Style options for generated frontend code
 */
export const StyleOptionSchema = z.enum(['modern', 'minimalist', 'colorful']).default('modern');

/**
 * Complexity levels for the generated code
 */
export const ComplexityOptionSchema = z.enum(['simple', 'medium', 'complex']).default('medium');

/**
 * Input schema for frontend code generation
 */
export const FrontendCodeInputSchema = z.object({
  requirement: z.string().min(1).describe('User requirement description for the frontend code'),
  options: z
    .object({
      style: StyleOptionSchema.describe('Visual style of the generated UI'),
      complexity: ComplexityOptionSchema.describe('Complexity level of the generated code'),
    })
    .optional()
    .describe('Optional configuration options'),
});

/**
 * Metadata schema for the generated HTML output
 */
export const MetadataSchema = z.object({
  title: z.string().describe('Brief title of the generated page'),
  description: z.string().describe('Description of what the page does'),
  tailwindVersion: z.string().describe('Version of TailwindCSS used'),
  vueVersion: z.string().describe('Version of Vue.js used'),
  estimatedComplexity: ComplexityOptionSchema.describe('Complexity level of the generated code'),
  components: z.array(z.string()).describe('List of Vue components or UI elements used'),
  generatedAt: z.string().datetime().describe('ISO 8601 timestamp of generation'),
});

/**
 * Output schema for frontend code generation
 */
export const FrontendCodeOutputSchema = z.object({
  html: z.string().describe('Complete HTML document as a string'),
  metadata: MetadataSchema,
  success: z.literal(true).describe('Indicates successful generation'),
});

/**
 * Error output schema
 */
export const FrontendCodeErrorSchema = z.object({
  success: z.literal(false).describe('Indicates failed generation'),
  error: z.object({
    message: z.string().describe('Error message'),
    code: z.string().describe('Error code'),
  }),
});

/**
 * Complete response schema (success or error)
 */
export const FrontendCodeResponseSchema = z.union([
  FrontendCodeOutputSchema,
  FrontendCodeErrorSchema,
]);

// Type exports
export type StyleOption = z.infer<typeof StyleOptionSchema>;
export type ComplexityOption = z.infer<typeof ComplexityOptionSchema>;
export type FrontendCodeInput = z.infer<typeof FrontendCodeInputSchema>;
export type FrontendCodeOutput = z.infer<typeof FrontendCodeOutputSchema>;
export type FrontendCodeError = z.infer<typeof FrontendCodeErrorSchema>;
export type FrontendCodeResponse = z.infer<typeof FrontendCodeResponseSchema>;
export type Metadata = z.infer<typeof MetadataSchema>;
