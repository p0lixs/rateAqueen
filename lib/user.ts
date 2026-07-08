type UserWithMetadata = {
  user_metadata?: Record<string, unknown>;
};

export function displayNameFromUser(user: UserWithMetadata) {
  const value = user.user_metadata?.display_name;
  if (typeof value !== "string") return null;
  const clean = value.trim();
  return clean.length >= 2 && clean.length <= 40 ? clean : null;
}
