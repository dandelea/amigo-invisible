import { io } from 'socket.io-client';
import type { Role } from '@/api/types';
import { API_URL } from '@/config';

interface RoomSubscription {
  // Al conectar, al reconectar y con cada aviso `room:changed`.
  onChange: () => void;
  // El servidor rechazó el token: el enlace ya no es válido.
  onAuthError: () => void;
}

// Se suscribe a los avisos de una sala. Los avisos no traen datos: quien
// escucha vuelve a pedir el estado por HTTP. Socket.IO reconecta solo si se
// corta la conexión; si el servidor rechaza el token, no reintenta.
// Devuelve la función para cancelar la suscripción.
export function subscribeToRoom(
  role: Role,
  token: string,
  { onChange, onAuthError }: RoomSubscription,
): () => void {
  const socket = io(`${API_URL}/rooms`, { auth: { role, token } });
  socket.on('connect', onChange);
  socket.on('room:changed', onChange);
  socket.on('connect_error', (err) => {
    if (err.message === 'NOT_FOUND') onAuthError();
  });
  // El servidor cierra el socket de quien es expulsado o sale: se recarga
  // el estado, que responderá «No encontrado».
  socket.on('disconnect', (reason) => {
    if (reason === 'io server disconnect') onChange();
  });
  return () => {
    socket.disconnect();
  };
}
