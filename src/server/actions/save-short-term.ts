"use server";

import { replaceShortTermModifiers } from "@/lib/repo/short-term";
import { shortTermModifiersSchema } from "@/lib/schema/input";

export async function saveShortTerm(input: unknown) {
  const parsedInput = shortTermModifiersSchema.parse(input);
  const short_term_modifiers = await replaceShortTermModifiers(parsedInput);

  return { short_term_modifiers };
}
