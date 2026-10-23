// Shopkeeper looks, matched against the keeper's description (first match wins).
// ears: round | pointy | long | small | none; extras: beak, antlers, spikes, glow.
import { define } from '../registry.js'

;[
  ['polar-bear', '北极熊|白熊', { ears: 'round', color: '#f4f0e8', snout: '#e8e0d4' }],
  ['bear', '熊', { ears: 'round', color: '#8a5a3a', snout: '#d8b890' }],
  ['fox', '狐', { ears: 'pointy', color: '#e0783a', snout: '#fff4e8' }],
  ['rabbit', '兔', { ears: 'long', color: '#f4e8ec', snout: '#ffffff' }],
  ['bird', '猫头鹰|鹰|燕|鸥|鸟|雀', { ears: 'none', beak: true, color: '#9a8070', snout: '#e8d8c0' }],
  ['cat', '猫|貂|鼬|獴', { ears: 'pointy', color: '#a8a0a8', snout: '#f0e8e8' }],
  ['deer', '鹿', { ears: 'pointy', antlers: true, color: '#b07a50', snout: '#e8d0b0' }],
  ['camel', '骆驼', { ears: 'small', color: '#d8b080', snout: '#e8d0a8' }],
  ['reptile', '龟|蜥蜴|蟹', { ears: 'none', color: '#7aa870', snout: '#c8e0b0' }],
  ['otter', '獭|狗|犬', { ears: 'small', color: '#8a6a50', snout: '#d8c0a0' }],
  ['hedgehog', '刺猬', { ears: 'small', spikes: true, color: '#c8a888', snout: '#f0e0d0' }],
  ['firefly', '萤火虫', { ears: 'none', glow: true, color: '#c8d870', snout: '#f0f0c0' }],
].forEach(([id, match, look]) => define('species', { id, match: new RegExp(match), ...look }))

export const DEFAULT_LOOK = { ears: 'small', color: '#c8b8d8', snout: '#f4ecf8' }
