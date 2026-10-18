// Tipos de la API. Reflejan los DTOs del backend (docs/openapi.json).

export interface Room {
  name: string;
  giftDate: string | null;
  budget: number | null;
  status: 'open' | 'drawn';
  pairRuleEnabled: boolean;
}

export interface Participant {
  id: string;
  name: string;
}

export interface CreateRoomInput {
  name: string;
  giftDate?: string;
  budget?: number;
}

export interface CreateRoomResponse {
  room: Room;
  inviteCode: string;
  manageToken: string;
}

export interface Invitation {
  room: Room;
  participantCount: number;
  maxParticipants: number;
  participantNames: string[];
  cannotJoinReason: 'ROOM_FULL' | 'ROOM_CLOSED' | null;
}

export interface JoinRoomResponse {
  participant: Participant;
  participantToken: string;
}

export interface Wishlist {
  kind: 'link' | 'file';
  url: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
}

export interface ParticipantWithWishlist extends Participant {
  wishlist: Wishlist | null;
}

export interface Pair {
  id: string;
  participantIds: [string, string];
}

export interface ParticipantDraw {
  round: number;
  seen: boolean;
}

export interface ParticipantView {
  room: Room;
  me: Participant;
  participants: ParticipantWithWishlist[];
  pairs: Pair[];
  maxParticipants: number;
  draw: ParticipantDraw;
}

export interface OrganizerDraw {
  round: number;
  feasibility: {
    ok: boolean;
    code: 'NO_SOLUTION' | 'TOO_FEW_PARTICIPANTS' | null;
  };
  seenCount: number;
  total: number;
  // Solo nombre y estado: nunca a quién le ha tocado cada persona.
  seen: { name: string; seen: boolean }[];
}

export interface Assignment {
  receiver: ParticipantWithWishlist;
  round: number;
  seen: boolean;
}

export interface OrganizerView {
  room: Room;
  inviteCode: string;
  participants: Participant[];
  pairs: Pair[];
  maxParticipants: number;
  draw: OrganizerDraw;
}

export interface UpdateRoomInput {
  name?: string;
  giftDate?: string | null;
  budget?: number | null;
}

export type Role = 'organizer' | 'participant';
