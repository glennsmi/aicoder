import { useState } from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { DayPicker, DateRange } from 'react-day-picker'
import * as Popover from '@radix-ui/react-popover'
import { cn } from '@/lib/utils'
import 'react-day-picker/dist/style.css'
import './DateRangePicker.css'

interface DateRangePickerProps {
  value?: DateRange
  onChange?: (range: DateRange | undefined) => void
  placeholder?: string
  className?: string
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Pick a date range",
  className
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)

  const handleSelect = (range: DateRange | undefined) => {
    console.log('Date range selected:', range)
    
    // Validate the range - ensure end date is not in the future
    if (range?.to && range.to > new Date()) {
      const adjustedRange = {
        ...range,
        to: new Date() // Set to today
      }
      console.log('Adjusted range to prevent future dates:', adjustedRange)
      onChange?.(adjustedRange)
    } else {
      onChange?.(range)
    }
  }

  const formatDateRange = (range: DateRange | undefined) => {
    if (!range?.from) return placeholder
    if (!range.to) return format(range.from, 'LLL dd, y')
    return `${format(range.from, 'LLL dd, y')} - ${format(range.to, 'LLL dd, y')}`
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className={cn(
            "flex items-center justify-between w-full px-3 py-2 text-sm border rounded-md transition-colors text-left",
            // light
            "border-gray-300 bg-white hover:bg-gray-50 text-gray-800",
            // dark
            "dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100",
            !value?.from && "text-gray-500 dark:text-gray-300",
            className
          )}
        >
          <span>{formatDateRange(value)}</span>
          <CalendarIcon className="w-4 h-4 ml-2 opacity-50" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-auto max-w-2xl p-4 bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
          align="end"
          side="bottom"
          sideOffset={4}
          avoidCollisions={true}
          collisionPadding={20}
        >
          <DayPicker
            mode="range"
            selected={value}
            onSelect={handleSelect}
            numberOfMonths={2}
            showOutsideDays={true}
            disabled={{ after: new Date() }} // Disable future dates
            defaultMonth={new Date(new Date().getFullYear(), new Date().getMonth() - 1)} // Start with previous month
            fromMonth={new Date(new Date().getFullYear() - 1, new Date().getMonth())} // Allow 1 year back
            toMonth={new Date()} // Don't allow navigation beyond current month
            className="rdp"
            classNames={{
              months: 'flex flex-row space-x-4', // Ensure horizontal layout for months
              month: 'space-y-4', // Default month styling
              caption_label: 'text-sm font-medium',
              head_cell: 'w-9 text-xs font-medium text-muted-foreground', // Adjusted for better alignment
              cell: 'h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
              day: 'h-9 w-9 p-0 font-normal aria-selected:opacity-100',
              day_selected:
                'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
              day_today: 'bg-accent text-accent-foreground',
              day_outside: 'text-muted-foreground opacity-50',
              day_disabled: 'text-muted-foreground opacity-50',
              day_range_middle:
                'aria-selected:bg-accent aria-selected:text-accent-foreground',
              day_hidden: 'invisible',
              nav_button: 'inline-flex items-center justify-center w-8 h-8 border border-input rounded-md bg-transparent hover:bg-accent hover:text-accent-foreground',
              nav_button_previous: 'absolute left-1 top-1/2 -translate-y-1/2',
              nav_button_next: 'absolute right-1 top-1/2 -translate-y-1/2',
              caption: 'flex justify-center pt-1 relative items-center',
              table: 'w-full border-collapse space-y-1',
            }}
          />
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
} 