'use server';

/**
 * @fileOverview Implements a Genkit flow to enhance CSV import functionality by matching CSV data rows to existing design and size IDs,
 * using AI to resolve discrepancies and generate mismatch reports.
 *
 * - `enhanceCsvDataMatching` - The main function to process CSV data and match it with existing design and size IDs.
 * - `EnhanceCsvDataMatchingInput` - The input type for the `enhanceCsvDataMatching` function.
 * - `EnhanceCsvDataMatchingOutput` - The output type for the `enhanceCsvDataMatching` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input schema for the CSV data matching flow
const EnhanceCsvDataMatchingInputSchema = z.object({
  csvData: z.string().describe('CSV data containing design_id, size_id, quantity.'),
  designs: z.array(
    z.object({
      design_id: z.string(),
      design_name: z.string(),
      sizes: z.array(
        z.object({
          size_id: z.string(),
          label: z.string(),
        })
      ),
    })
  ).describe('JSON dataset of designs with design_id, design_name, and sizes (size_id, label).'),
});
export type EnhanceCsvDataMatchingInput = z.infer<typeof EnhanceCsvDataMatchingInputSchema>;

// Output schema for the CSV data matching flow
const EnhanceCsvDataMatchingOutputSchema = z.object({
  matchedData: z.array(
    z.object({
      design_id: z.string(),
      size_id: z.string(),
      quantity: z.number(),
    })
  ).describe('Array of matched data with design_id, size_id, and quantity.'),
  mismatchReport: z.string().describe('Detailed report of mismatches or ambiguities found during the matching process.'),
});
export type EnhanceCsvDataMatchingOutput = z.infer<typeof EnhanceCsvDataMatchingOutputSchema>;


export async function enhanceCsvDataMatching(input: EnhanceCsvDataMatchingInput): Promise<EnhanceCsvDataMatchingOutput> {
  return enhanceCsvDataMatchingFlow(input);
}

const enhanceCsvDataMatchingPrompt = ai.definePrompt({
  name: 'enhanceCsvDataMatchingPrompt',
  input: {schema: EnhanceCsvDataMatchingInputSchema},
  output: {schema: EnhanceCsvDataMatchingOutputSchema},
  prompt: `You are an AI assistant designed to match CSV data rows to existing design and size IDs.

  Given the following CSV data:
  {{csvData}}

  And the following design data:
  {{designs}}

  Attempt to match the CSV rows to the design and size IDs. If a mismatch occurs, use fuzzy matching to resolve discrepancies.

  Generate a detailed report of any remaining mismatches or ambiguities.

  Return the matched data and the mismatch report in the following JSON format:
  {
    "matchedData": [
      {
        "design_id": "string",
        "size_id": "string",
        "quantity": number
      }
    ],
    "mismatchReport": "string"
  }`,
});

const enhanceCsvDataMatchingFlow = ai.defineFlow(
  {
    name: 'enhanceCsvDataMatchingFlow',
    inputSchema: EnhanceCsvDataMatchingInputSchema,
    outputSchema: EnhanceCsvDataMatchingOutputSchema,
  },
  async input => {
    const {output} = await enhanceCsvDataMatchingPrompt(input);
    return output!;
  }
);

