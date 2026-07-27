import { useState, type ReactNode } from 'react'

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={open ? 'chevron open' : 'chevron'}
    >
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface SettingsSectionProps {
  title: string
  ariaLabel: string
  children: ReactNode
  defaultOpen?: boolean
  className?: string
}

export default function SettingsSection({
  title,
  ariaLabel,
  children,
  defaultOpen = false,
  className = '',
}: SettingsSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section
      className={`task-group settings-section${open ? '' : ' collapsed'}${className ? ` ${className}` : ''}`}
      aria-label={ariaLabel}
    >
      <button
        type="button"
        className="category-heading-toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <h2 className="category-heading">{title}</h2>
        <span className="category-heading-meta">
          <ChevronIcon open={open} />
        </span>
      </button>
      {open ? <div className="settings-section-body">{children}</div> : null}
    </section>
  )
}
