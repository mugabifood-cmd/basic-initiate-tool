import { useEffect, useState } from "react";
import { resolveStudentPhotoUrl } from "@/lib/studentPhoto";

interface Props {
  photoRef: string | null | undefined;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}

/** Renders a student photo, resolving private-bucket paths to signed URLs. */
export function StudentPhoto({ photoRef, alt = "Student", className, style }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    resolveStudentPhotoUrl(photoRef).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [photoRef]);

  if (!src) return null;
  return <img src={src} alt={alt} className={className} style={style} />;
}
