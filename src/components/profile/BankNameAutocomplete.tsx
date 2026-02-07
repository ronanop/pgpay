import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { INDIAN_BANKS } from '@/constants/banks';

interface BankNameAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function BankNameAutocomplete({
  value,
  onChange,
  disabled = false,
  placeholder = "Select or type bank name...",
}: BankNameAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBanks = useMemo(() => {
    if (!searchQuery) return INDIAN_BANKS.slice(0, 10); // Show first 10 by default
    const query = searchQuery.toLowerCase();
    return INDIAN_BANKS.filter((bank) =>
      bank.toLowerCase().includes(query)
    ).slice(0, 15); // Limit to 15 results for performance
  }, [searchQuery]);

  const handleSelect = (selectedBank: string) => {
    onChange(selectedBank);
    setOpen(false);
    setSearchQuery('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between h-10 font-normal",
            !value && "text-muted-foreground",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <span className="truncate">
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-50" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search banks..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {searchQuery ? (
                <div className="py-2 px-3 text-sm">
                  <p className="text-muted-foreground mb-2">No bank found.</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => handleSelect(searchQuery)}
                  >
                    Use "{searchQuery}"
                  </Button>
                </div>
              ) : (
                "Start typing to search..."
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredBanks.map((bank) => (
                <CommandItem
                  key={bank}
                  value={bank}
                  onSelect={() => handleSelect(bank)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === bank ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{bank}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
