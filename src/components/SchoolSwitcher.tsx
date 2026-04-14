import { useSchool } from '@/hooks/useSchool';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';

export function SchoolSwitcher() {
  const { schools, activeSchool, setActiveSchool } = useSchool();

  if (schools.length <= 1) {
    return activeSchool ? (
      <div className="flex items-center gap-2 text-sm">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium truncate max-w-[180px]">{activeSchool.name}</span>
      </div>
    ) : null;
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select
        value={activeSchool?.id || ''}
        onValueChange={(id) => {
          const school = schools.find(s => s.id === id);
          if (school) setActiveSchool(school);
        }}
      >
        <SelectTrigger className="h-8 w-[200px]">
          <SelectValue placeholder="Select school" />
        </SelectTrigger>
        <SelectContent>
          {schools.map(school => (
            <SelectItem key={school.id} value={school.id}>
              {school.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
