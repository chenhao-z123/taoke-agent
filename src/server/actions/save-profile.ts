"use server";

import { replaceUserProfile } from "@/lib/repo/user-profile";
import { userProfileSchema } from "@/lib/schema/input";

export async function saveProfile(input: unknown) {
  const parsedInput = userProfileSchema.parse(input);
  const profile = await replaceUserProfile(parsedInput);

  return { profile };
}
