import { useState } from 'react'

// Phones: a card can fold down to its title strip so the room shows through.
// Each card starts open; the toggle is only shown on touch layouts (styles.css).
export function useCollapsible() {
  const [collapsed, setCollapsed] = useState(false)
  const toggle = <button type="button" className="panel-collapse" aria-label={collapsed ? '展开' : '收起'} aria-expanded={!collapsed} data-testid="panel-collapse"
    onPointerDown={event => event.stopPropagation()}
    onClick={event => { event.stopPropagation(); setCollapsed(value => !value) }}>{collapsed ? '▴ 展开' : '▾ 收起'}</button>
  return { collapsed, className: collapsed ? ' collapsed' : '', toggle }
}
