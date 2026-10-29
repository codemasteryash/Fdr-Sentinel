import { useSyncExternalStore } from 'react'
import { demoStore } from '../services/demoDataService'

export function useDemoState() {
  return useSyncExternalStore(demoStore.subscribe, demoStore.getState, demoStore.getState)
}
