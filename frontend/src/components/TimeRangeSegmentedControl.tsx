import { cn } from '@/lib/utils'

export type TimeRangeOption<T extends string> = {
  value: T
  label: string
}

type Props<T extends string> = {
  value: T | null
  options: Array<TimeRangeOption<T>>
  onChange: (value: T) => void
  className?: string
}

export default function TimeRangeSegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
}: Props<T>) {
  return (
    <div
      className={cn(
        // Match height of the "Copy" button in the chart control row
        'inline-flex h-9 items-center rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 shadow-sm overflow-hidden',
        className
      )}
      role="group"
      aria-label="Time range"
    >
      {options.map((opt, idx) => {
        const active = value !== null && opt.value === value
        return (
          <div key={opt.value} className="flex items-stretch">
            <button
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                'h-9 px-4 py-0 text-sm font-semibold transition-colors select-none',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800',
                active
                  ? 'bg-secondary-900 text-white'
                  : 'bg-transparent text-secondary-900 dark:text-white/90 hover:bg-gray-200/60 dark:hover:bg-gray-600'
              )}
              aria-pressed={active}
            >
              {opt.label}
            </button>
            {idx < options.length - 1 && (
              <div className="w-px h-full bg-gray-200 dark:bg-gray-600" aria-hidden="true" />
            )}
          </div>
        )
      })}
    </div>
  )
}

