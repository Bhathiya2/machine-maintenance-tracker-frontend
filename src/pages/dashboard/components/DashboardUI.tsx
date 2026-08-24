import type { ReactNode } from 'react'

export function Badge({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium ${className}`}
    >
      {children}
    </span>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-card rounded-lg border border-border shadow-sm ${className}`}>{children}</div>
  )
}

export function FormField({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div>
      <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

export const inputCls =
  'w-full border border-border rounded-lg px-3 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors'

export const selectCls =
  'w-full border border-border rounded-lg pl-3 pr-9 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors'

