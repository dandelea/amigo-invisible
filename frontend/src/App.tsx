import { BrowserRouter, Route, Routes } from 'react-router'
import { CreateRoomPage } from '@/pages/create-room-page'
import { HomePage } from '@/pages/home-page'
import { JoinPage, NotFoundScreen } from '@/pages/join-page'
import { OrganizerPage } from '@/pages/organizer-page'
import { ParticipantPage } from '@/pages/participant-page'
import { RoomCreatedPage } from '@/pages/room-created-page'

// Rutas de la app. Los enlaces de gestión (/o) y personal (/p) llevan el
// token en el fragmento (#).
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/crear" element={<CreateRoomPage />} />
      <Route path="/creada" element={<RoomCreatedPage />} />
      <Route path="/s/:code" element={<JoinPage />} />
      <Route path="/p" element={<ParticipantPage />} />
      <Route path="/o" element={<OrganizerPage />} />
      <Route path="*" element={<NotFoundScreen />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
