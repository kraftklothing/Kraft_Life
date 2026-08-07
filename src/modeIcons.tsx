import type { ModeIconId } from './types'

export const MODE_ICON_OPTIONS: { id: ModeIconId; label: string }[] = [
  { id: 'plane', label: 'Plane' },
  { id: 'briefcase', label: 'Briefcase' },
  { id: 'home', label: 'Home' },
  { id: 'car', label: 'Car' },
  { id: 'star', label: 'Star' },
  { id: 'heart', label: 'Heart' },
  { id: 'book', label: 'Book' },
  { id: 'sun', label: 'Sun' },
  { id: 'moon', label: 'Moon' },
  { id: 'leaf', label: 'Leaf' },
  { id: 'music', label: 'Music' },
  { id: 'coffee', label: 'Coffee' },
  { id: 'dumbbell', label: 'Dumbbell' },
  { id: 'backpack', label: 'Backpack' },
]

export function ModeIcon({
  icon,
  size = 20,
}: {
  icon: ModeIconId
  size?: number
}) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    'aria-hidden': true as const,
  }

  switch (icon) {
    case 'plane':
      return (
        <svg {...common}>
          <path
            d="M10.5 12.5 3 10l1-2 7.5 1.5L17 3l2 1-3.5 8.5L22 15l-1 2-7.5-2.5L10 21l-2-1 2.5-7.5Z"
            fill="currentColor"
          />
        </svg>
      )
    case 'briefcase':
      return (
        <svg {...common}>
          <path
            d="M8 7V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <rect
            x="3"
            y="7"
            width="18"
            height="13"
            rx="2"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M3 12h18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'home':
      return (
        <svg {...common}>
          <path
            d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'car':
      return (
        <svg {...common}>
          <path
            d="M5 11 6.5 7.5A2 2 0 0 1 8.3 6.5h7.4a2 2 0 0 1 1.8 1L19 11"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M3 11h18v6a1 1 0 0 1-1 1h-1a2 2 0 0 1-4 0H9a2 2 0 0 1-4 0H4a1 1 0 0 1-1-1v-6Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'star':
      return (
        <svg {...common}>
          <path
            d="M12 3.2 14.4 9l6.1.5-4.7 3.9 1.5 5.9L12 16.7 6.7 19.3l1.5-5.9-4.7-3.9L9.6 9 12 3.2Z"
            fill="currentColor"
          />
        </svg>
      )
    case 'heart':
      return (
        <svg {...common}>
          <path
            d="M12 20s-7-4.4-9.2-8.2C1.2 9.2 2.4 6 5.5 6c1.8 0 3.1 1 3.9 2.2C10.2 7 11.5 6 13.3 6c3.1 0 4.3 3.2 2.7 5.8C19 15.6 12 20 12 20Z"
            fill="currentColor"
          />
        </svg>
      )
    case 'book':
      return (
        <svg {...common}>
          <path
            d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v16H7.5A2.5 2.5 0 0 0 5 20.5V4.5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M5 20.5A2.5 2.5 0 0 1 7.5 18H19"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'sun':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
          <path
            d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'moon':
      return (
        <svg {...common}>
          <path
            d="M19 14.5A7.5 7.5 0 1 1 9.5 5a6 6 0 0 0 9.5 9.5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'leaf':
      return (
        <svg {...common}>
          <path
            d="M5 19c8-1 13-6 14-14-8 1-13 6-14 14Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M5 19c3-3 6-6 10-9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'music':
      return (
        <svg {...common}>
          <path
            d="M9 18V6l10-2v12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="7" cy="18" r="2.5" fill="currentColor" />
          <circle cx="17" cy="16" r="2.5" fill="currentColor" />
        </svg>
      )
    case 'coffee':
      return (
        <svg {...common}>
          <path
            d="M5 8h11v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M16 10h2a2.5 2.5 0 0 1 0 5h-2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M8 3.5c.5.8.5 1.5 0 2.3M11 3.5c.5.8.5 1.5 0 2.3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'dumbbell':
      return (
        <svg {...common}>
          <path
            d="M6 9v6M8.5 8v8M15.5 8v8M18 9v6M6 12h12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )
    case 'backpack':
      return (
        <svg {...common}>
          <path
            d="M8 8V6a4 4 0 0 1 8 0v2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <rect
            x="5"
            y="8"
            width="14"
            height="13"
            rx="3"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M9 13h6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="2" />
        </svg>
      )
  }
}
