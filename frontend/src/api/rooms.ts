import { apiRequest } from './client'
import type {
  CreateRoomInput,
  CreateRoomResponse,
  Invitation,
  JoinRoomResponse,
  OrganizerView,
  Pair,
  ParticipantView,
  Room,
  UpdateRoomInput,
  Wishlist,
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

// Organizador

export const updateRoom = (token: string, input: UpdateRoomInput) =>
  apiRequest<Room>('/api/manage/room', { method: 'PATCH', token, body: input })

export const setPairRule = (token: string, enabled: boolean) =>
  apiRequest<Room>('/api/manage/pair-rule', {
    method: 'PUT',
    token,
    body: { enabled },
  })

export const createPair = (token: string, participantIds: [string, string]) =>
  apiRequest<Pair>('/api/manage/pairs', {
    method: 'POST',
    token,
    body: { participantIds },
  })

export const deletePair = (token: string, pairId: string) =>
  apiRequest<void>(`/api/manage/pairs/${pairId}`, { method: 'DELETE', token })

export const expelParticipant = (token: string, participantId: string) =>
  apiRequest<void>(`/api/manage/participants/${participantId}`, {
    method: 'DELETE',
    token,
  })

// Participante

export const leaveRoom = (token: string) =>
  apiRequest<void>('/api/me', { method: 'DELETE', token })

export const setWishlistLink = (token: string, url: string) =>
  apiRequest<Wishlist>('/api/me/wishlist/link', {
    method: 'PUT',
    token,
    body: { url },
  })

export function uploadWishlistFile(token: string, file: File) {
  const body = new FormData()
  body.append('file', file)
  return apiRequest<Wishlist>('/api/me/wishlist/file', {
    method: 'PUT',
    token,
    body,
  })
}

export const removeWishlist = (token: string) =>
  apiRequest<void>('/api/me/wishlist', { method: 'DELETE', token })

export const getWishlistDownloadUrl = (token: string, participantId: string) =>
  apiRequest<{ url: string; expiresInSeconds: number }>(
    `/api/wishlists/${participantId}/file`,
    { token },
  )
