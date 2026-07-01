'use client'

import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'

interface SheetProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
}

const SheetTrigger = ({ className, ...props }: React.HTMLAttributes<HTMLButtonElement>) => (
  <button className={cn('inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50', className)} {...props} />
)

const SheetContent = ({ className, children, ...props }: SheetProps) => (
  <div className={cn('fixed inset-0 z-50 flex h-full w-full items-end sm:items-center', className)} {...props}>
    <div className="relative max-w-xl w-full max-h-screen">
      <div className="relative bg-background shadow-lg rounded-b-lg border border-input">
        {children}
      </div>
    </div>
  </div>
)

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center space-x-4 p-6 border-b border-input', className)} {...props} />
)

const SheetTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
)

const SheetDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('mt-2 text-sm text-muted-foreground', className)} {...props} />
)

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center p-6 space-x-3', className)} {...props}>
    <div className="ml-auto">{props.children ?? ''}</div>
  </div>
)

export { SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter }