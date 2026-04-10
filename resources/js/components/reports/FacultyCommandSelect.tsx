import { Check, ChevronsUpDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ReportFaculty } from '@/components/reports/types';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type Props = {
    faculties: ReportFaculty[];
    value?: string;
    onValueChange: (value: string) => void;
};

function facultyDisplayName(faculty: ReportFaculty): string {
    return [faculty.full_name, faculty.middle_name]
        .map((value) => (value ? value.trim() : ''))
        .filter((value) => value !== '')
        .join(' ');
}

function facultyLabel(faculty: ReportFaculty): string {
    const parts = [
        facultyDisplayName(faculty),
        faculty.faculty_code ? `(${faculty.faculty_code})` : '',
    ].filter((value) => value !== '');

    return parts.join(' ');
}

export default function FacultyCommandSelect({
    faculties,
    value,
    onValueChange,
}: Props) {
    const [open, setOpen] = useState(false);

    const selectedFaculty = useMemo(
        () => faculties.find((faculty) => String(faculty.id) === value),
        [faculties, value],
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={faculties.length === 0}
                    className="w-full justify-between"
                >
                    <span className="truncate text-left">
                        {selectedFaculty
                            ? facultyLabel(selectedFaculty)
                            : faculties.length === 0
                              ? 'No faculty available'
                              : 'Select faculty'}
                    </span>
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                    <CommandInput placeholder="Search faculty..." />
                    <CommandList>
                        <CommandEmpty>No faculty found.</CommandEmpty>
                        <CommandGroup>
                            {faculties.map((faculty) => {
                                const isSelected = String(faculty.id) === value;

                                return (
                                    <CommandItem
                                        key={faculty.id}
                                        value={[
                                            facultyDisplayName(faculty),
                                            faculty.faculty_code,
                                            faculty.department?.name,
                                            faculty.emp_status,
                                        ]
                                            .filter(Boolean)
                                            .join(' ')}
                                        onSelect={() => {
                                            onValueChange(String(faculty.id));
                                            setOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                'size-4',
                                                isSelected
                                                    ? 'opacity-100'
                                                    : 'opacity-0',
                                            )}
                                        />
                                        <div className="min-w-0">
                                            <div className="truncate">
                                                {facultyLabel(faculty)}
                                            </div>
                                            <div className="truncate text-xs text-muted-foreground">
                                                {faculty.department?.name ?? 'No department'}
                                                {faculty.emp_status
                                                    ? ` • ${faculty.emp_status}`
                                                    : ''}
                                            </div>
                                        </div>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
