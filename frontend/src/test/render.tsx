import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { AppRoutes } from '@/App'

// Renderiza la app en una ruta, con fragmento (#token) y estado de
// navegación opcionales.
export function renderAt(path: string, state?: unknown) {
  const url = new URL(path, 'http://localhost')
  const user = userEvent.setup()
  const result = render(
    <MemoryRouter
      initialEntries={[{ pathname: url.pathname, hash: url.hash, state }]}
    >
      <AppRoutes />
    </MemoryRouter>,
  )
  return { user, ...result }
}

export const TOKEN = 'A'.repeat(43)
export const OTHER_TOKEN = 'B'.repeat(43)
