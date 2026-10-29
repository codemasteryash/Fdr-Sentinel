import { useDemoState } from './useDemoState'
import { getUserById, getDemoUserForRole, can } from '../data/users'

export function useCurrentUser() {
  const state = useDemoState()
  const user =
    getUserById(state.settings.currentUserId) ?? getDemoUserForRole(state.settings.role)
  return {
    ...user,
    can: (permission) => can(user.role, permission),
    roleConfig: state.settings.role,
  }
}
