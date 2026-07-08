export function hasValidClerkPublishableKey() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return false;
  }

  return /^pk_(test|live)_[A-Za-z0-9_-]{10,}$/.test(publishableKey);
}