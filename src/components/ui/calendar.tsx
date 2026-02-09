"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 bg-background", className)}
      modifiers={{
        sunday: (date) => date.getDay() === 0,
      }}
      modifiersClassNames={{
        sunday: "text-zinc-500/80", // Dark grey for Sundays
      }}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center mb-4",
        caption_label: "text-sm font-semibold tracking-tight",
        nav: "space-x-1 flex items-center",
        button_previous: cn(
          buttonVariants({ variant: "ghost" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1 rounded-full transition-all"
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1 rounded-full transition-all"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex justify-between w-full mb-2",
        weekday: "text-muted-foreground w-9 font-medium text-[11px] uppercase tracking-wider text-center",
        week: "flex w-full justify-between mt-1",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-full hover:bg-muted transition-all"
        ),
        selected: "bg-[#FF3B30] text-white hover:bg-[#FF3B30] hover:text-white focus:bg-[#FF3B30] focus:text-white font-bold shadow-sm",
        today: "text-black font-bold bg-[#FF3B30] ring-2 ring-[#FF3B30] ring-offset-1", // Apple's Red highlight with black text
        outside: "text-muted-foreground opacity-20 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
