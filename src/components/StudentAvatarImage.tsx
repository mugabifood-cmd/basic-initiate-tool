import { useEffect, useState } from "react";
import { AvatarImage } from "@/components/ui/avatar";
import { resolveStudentPhotoUrl } from "@/lib/studentPhoto";

interface Props {
  photoRef: string | null | undefined;
  alt?: string;
}

export function StudentAvatarImage({ photoRef, alt }: Props) {
  const [src, setSrc] = useState<string | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    resolveStudentPhotoUrl(photoRef).then((url) => {
      if (!cancelled) setSrc(url ?? undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [photoRef]);
  return <AvatarImage src={src} alt={alt} />;
}
