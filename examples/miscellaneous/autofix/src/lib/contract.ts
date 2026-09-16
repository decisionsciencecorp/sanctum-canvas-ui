import { z } from "zod/v4";

export const MAX_GENERATION_CHARS = 100_000;
export const MAX_CONTEXT_CHARS = 8_000;

export const inputSchema = z
  .object({
    generation: z
      .string()
      .max(MAX_GENERATION_CHARS)
      .refine((value) => value.trim().length > 0, "Enter an OpenUI Lang program."),
    context: z.string().trim().max(MAX_CONTEXT_CHARS).default(""),
  })
  .strict();

const fixErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  statementId: z.string().optional(),
  component: z.string().optional(),
  path: z.string().optional(),
});

export const completionSchema = z
  .object({
    choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })).min(1),
    fix_summary: z.object({
      status: z.enum(["already_valid", "fixed", "fix_failed"]),
      fixed_errors: z.array(fixErrorSchema),
      unfixed_errors: z.array(fixErrorSchema),
    }),
    usage: z
      .object({
        prompt_tokens: z.number(),
        completion_tokens: z.number(),
        total_tokens: z.number(),
      })
      .optional(),
  })
  .refine(
    (value) =>
      value.fix_summary.status === "fix_failed"
        ? value.choices[0]?.message.content === null
        : Boolean(value.choices[0]?.message.content?.trim()),
    "Autofix returned inconsistent content and status.",
  );

export type AutofixInput = z.infer<typeof inputSchema>;
export type AutofixCompletion = z.infer<typeof completionSchema>;
