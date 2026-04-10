import { Check, ChevronsUpDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { DashboardTermOption } from '@/components/dashboard/types';
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
    terms: DashboardTermOption[];
    value?: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyLabel?: string;
};

function termLabel(term: DashboardTermOption): string {
    if (term.period_code && term.period_code.trim() !== '') {
        return `${term.period_code} (${term.academic_year} - ${term.term_name})`;
    }

    return `${term.academic_year} - ${term.term_name}`;
}

export default function TermCommandSelect({
    terms,
    value,
    onValueChange,
    placeholder = 'Select term',
    searchPlaceholder = 'Search term...',
    emptyLabel = 'No term found.',
}: Props) {
    const [open, setOpen] = useState(false);

    const selectedTerm = useMemo(
        () => terms.find((term) => String(term.id) === value),
        [terms, value],
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={terms.length === 0}
                    className="w-full justify-between"
                >
                    <span className="truncate text-left">
                        {selectedTerm
                            ? `${termLabel(selectedTerm)}${selectedTerm.is_active ? ' (Active)' : ''}`
                            : terms.length === 0
                              ? 'No terms available'
                              : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                    <CommandInput placeholder={searchPlaceholder} />
                    <CommandList>
                        <CommandEmpty>{emptyLabel}</CommandEmpty>
                        <CommandGroup>
                            {terms.map((term) => {
                                const isSelected = String(term.id) === value;

                                return (
                                    <CommandItem
                                        key={term.id}
                                        value={`${termLabel(term)} ${term.id}`}
                                        onSelect={() => {
                                            onValueChange(String(term.id));
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
                                        <span className="truncate">
                                            {termLabel(term)}
                                            {term.is_active ? ' (Active)' : ''}
                                        </span>
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
