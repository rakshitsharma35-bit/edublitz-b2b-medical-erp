import { userApi } from './axios'
import type { Organization } from '../types'

export const organizationsApi = {
  listByType: (type: Organization['type']) =>
    userApi.get<Organization[]>(`/organizations/type/${type}`).then(r => r.data),

  getById: (id: string) =>
    userApi.get<Organization>(`/organizations/${id}`).then(r => r.data),
}
