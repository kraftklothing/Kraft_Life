import {
  OPTIONAL_NAV_LABELS,
  OPTIONAL_NAV_VIEWS,
  type NavVisibility,
  type OptionalNavView,
} from './types'

interface NavigationSettingsPanelProps {
  visibility: NavVisibility
  onToggle: (view: OptionalNavView) => void
}

export default function NavigationSettingsPanel({
  visibility,
  onToggle,
}: NavigationSettingsPanelProps) {
  return (
    <>
      <p className="muted reorder-hint view-hint">
        Choose which icons show in the bottom bar. Plus and Settings always stay.
        Hiding a view only removes its icon — your data stays saved.
      </p>
      <ul className="task-list nav-visibility-list">
        {OPTIONAL_NAV_VIEWS.map((view) => {
          const label = OPTIONAL_NAV_LABELS[view]
          const checked = visibility[view] !== false
          return (
            <li key={view} className="nav-visibility-row">
              <label className="nav-visibility-toggle">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(view)}
                />
                <span>{label}</span>
              </label>
            </li>
          )
        })}
      </ul>
      <p className="muted view-hint nav-visibility-locked-hint">
        Always visible: Plus (when adding) and Settings.
      </p>
    </>
  )
}
