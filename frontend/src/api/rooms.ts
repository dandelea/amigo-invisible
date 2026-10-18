import { apiRequest } from './client'
import type {
  CreateRoomInput,
  CreateRoomResponse,
  Invitation,
  JoinRoomResponse,
  OrganizerView,
  ParticipantView,
} from './types'

export const getAvailability = () =>
  apiRequest<{ canCreateRoom: boolean }>('/api/rooms/availability')

export const createRoom = (input: CreateRoomInput) =>
  apiRequest<CreateRoomResponse>('/api/rooms', { method: 'POST', body: input })

export const getInvitation = (code: string) =>
  apiRequest<Invitation>(`/api/invitations/${encodeURIComponent(code)}`)

export const joinRoom = (code: string, name: string) =>
  apiRequest<JoinRoomResponse>(
    `/api/invitations/${encodeURIComponent(code)}/participants`,
    { method: 'POST', body: { name } },
  )

export const getParticipantView = (token: string) =>
  apiRequest<ParticipantView>('/api/me', { token })

export const getOrganizerView = (token: string) =>
  apiRequest<OrganizerView>('/api/manage', { token })
