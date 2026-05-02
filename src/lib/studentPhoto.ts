import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves a stored student photo reference to a usable URL.
 * Accepts either a storage path (preferred) or a legacy full public URL.
 * Returns a short-lived signed URL when given a path; returns the legacy URL as-is.
 */
export async function resolveStudentPhotoUrl(
  photoRef: string | null | undefined,
  expiresInSeconds = 3600,
): Promise<string | null> {
  if (!photoRef) return null;
  // Legacy: if it's already a full URL, return as-is (will only work if it's a public bucket).
  if (/^https?:\/\//i.test(photoRef)) return photoRef;
  const { data, error } = await supabase.storage
    .from("student-photos")
    .createSignedUrl(photoRef, expiresInSeconds);
  if (error) {
    console.error("Failed to sign student photo URL:", error);
    return null;
  }
  return data.signedUrl;
}
