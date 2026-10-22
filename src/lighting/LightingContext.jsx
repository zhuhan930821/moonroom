import { createContext, useContext } from 'react'

const LightingContext = createContext({ cinematic: false, decorationLights: true })

export const LightingProvider = LightingContext.Provider
export const useLighting = () => useContext(LightingContext)
