/**
 * Detects academic level from class name.
 * S.5, S.6, S5, S6 → A-Level
 * Everything else → O-Level
 */
export function getAcademicLevel(className: string): 'a-level' | 'o-level' {
  const normalized = className.toUpperCase().replace(/\s+/g, '').replace(/\./g, '');
  if (/S[56]/.test(normalized)) return 'a-level';
  return 'o-level';
}

export function getALevelGrade(percentage: number): string {
  if (percentage >= 75) return 'A';
  if (percentage >= 65) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 35) return 'D';
  return 'E';
}

export function getOLevelGrade(percentage: number): string {
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 40) return 'D';
  return 'E';
}
