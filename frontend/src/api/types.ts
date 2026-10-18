// Tipos de la API. Reflejan los DTOs del backend (docs/openapi.json).

export interface Room {
  name: string
  giftDate: string | null
  budget: number | null
  status: 'open' | 'drawn'
  pairRuleEnabled: boolean
}

export interface Participant {
  id: string
  name: string
}

export interface CreateRoomInput {
  name: string
  giftDate?: string
  budget?: number
}

export interface CreateRoomResponse {
  room: Room
  inviteCode: string
  manageToken: string
}

export interface Invitation {
  room: Room
  participantCount: number
  maxParticipants: number
  participantNames: string[]
  cannotJoinReason: 'ROOM_FULL' | 'ROOM_CLOSED' | null
}

export interface JoinRoomResponse {
  participant: Participant
  participantToken: string
}

export interface ParticipantView {
  room: Room
  me: Participant
  participants: Participant[]
  maxParticipants: number
}

export interface OrganizerView {
  room: Room
  inviteCode: string
  participants: Participant[]
  maxParticipants: number
}

export type Role = 'organizer' | 'participant'
