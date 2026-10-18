import { act, screen, waitFor } from '@testing-library/react'
import { ApiError } from '@/api/client'
import * as api from '@/api/rooms'
import type {
  Invitation,
  OrganizerView,
  ParticipantView,
  Room,
} from '@/api/types'
import { OTHER_TOKEN, renderAt, TOKEN } from '@/test/render'
import { t } from '@/texts/es'

vi.mock('@/api/rooms')

// El socket se sustituye por uno falso que guarda los callbacks, para
// simular avisos `room:changed` y rechazos del token.
const socket = vi.hoisted(() => ({
  subs: [] as { onChange: () => void; onAuthError: () => void }[],
}))
vi.mock('@/realtime/socket', () => ({
  subscribeToRoom: vi.fn(
    (_role: string, _token: string, cb: (typeof socket.subs)[number]) => {
      socket.subs.push(cb)
      return () => {}
    },
  ),
}))

const room: Room = {
  name: 'Cena de Navidad',
  giftDate: '2026-12-20',
  budget: 15,
  status: 'open',
  pairRuleEnabled: true,
}

beforeEach(() => {
  vi.resetAllMocks()
  socket.subs.length = 0
})

describe('Inicio', () => {
  it('lleva a crear sala si hay hueco', async () => {
    vi.mocked(api.getAvailability).mockResolvedValue({ canCreateRoom: true })
    renderAt('/')
    const links = await screen.findAllByRole('link', { name: t.home.createRoom })
    expect(links[0]).toHaveAttribute('href', '/crear')
  })

  it('avisa cuando no se admiten más salas', async () => {
    vi.mocked(api.getAvailability).mockResolvedValue({ canCreateRoom: false })
    renderAt('/')
    expect(
      (await screen.findAllByText(t.status.noRooms.title)).length,
    ).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: t.home.createRoom })).toBeNull()
  })
})

describe('Crear sala', () => {
  it('valida antes de enviar', async () => {
    const { user } = renderAt('/crear')
    await user.type(screen.getByLabelText(t.create.name), 'ab')
    await user.type(screen.getByLabelText(t.create.budget), '0')
    await user.click(screen.getByRole('button', { name: t.create.submit }))
    expect(screen.getByText(t.create.errors.nameShort)).toBeInTheDocument()
    expect(screen.getByText(t.create.errors.budget)).toBeInTheDocument()
    expect(api.createRoom).not.toHaveBeenCalled()
  })

  it('crea la sala y muestra los dos enlaces', async () => {
    vi.mocked(api.createRoom).mockResolvedValue({
      room: { ...room, budget: 15.5 },
      inviteCode: 'AbCdEfGhIjKlMnOp',
      manageToken: TOKEN,
    })
    const { user } = renderAt('/crear')
    await user.type(screen.getByLabelText(t.create.name), '  Cena de   Navidad ')
    await user.type(screen.getByLabelText(t.create.budget), '15,5')
    await user.click(screen.getByRole('button', { name: t.create.submit }))

    expect(api.createRoom).toHaveBeenCalledWith({
      name: 'Cena de Navidad',
      budget: 15.5,
    })
    expect(
      await screen.findByRole('heading', { name: t.created.title }),
    ).toBeInTheDocument()
    expect(screen.getByText(/\/s\/AbCdEfGhIjKlMnOp$/)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`/o#${TOKEN}$`))).toBeInTheDocument()
    expect(screen.getByText(t.created.manageWarningStrong)).toBeInTheDocument()
    expect(screen.getByText('Presupuesto sugerido: 15,50 €')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: t.created.goToRoom })).toHaveAttribute(
      'href',
      `/o#${TOKEN}`,
    )
  })

  it('muestra el error del servidor', async () => {
    vi.mocked(api.createRoom).mockRejectedValue(
      new ApiError(503, 'MAX_ROOMS_REACHED', 'x'),
    )
    const { user } = renderAt('/crear')
    await user.type(screen.getByLabelText(t.create.name), 'Cena')
    await user.click(screen.getByRole('button', { name: t.create.submit }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      t.errors.MAX_ROOMS_REACHED,
    )
  })

  it('sin los datos de la creación, «Sala creada» vuelve al inicio', async () => {
    vi.mocked(api.getAvailability).mockResolvedValue({ canCreateRoom: true })
    renderAt('/creada')
    expect(
      await screen.findByRole('heading', { level: 1, name: t.appName }),
    ).toBeInTheDocument()
  })
})

describe('Unirse', () => {
  const invitation: Invitation = {
    room,
    participantCount: 3,
    maxParticipants: 30,
    participantNames: ['Ana', 'Luis', 'Marta'],
    cannotJoinReason: null,
  }

  it('muestra la sala y quién está dentro', async () => {
    vi.mocked(api.getInvitation).mockResolvedValue({ ...invitation })
    renderAt('/s/AbCdEfGhIjKlMnOp')
    expect(await screen.findByText('Ana, Luis y Marta')).toBeInTheDocument()
    expect(screen.getByText('Entrega: 20 dic 2026 · hasta 15 €')).toBeInTheDocument()
    expect(api.getInvitation).toHaveBeenCalledWith('AbCdEfGhIjKlMnOp')
  })

  it('explica cómo arreglar un nombre repetido', async () => {
    vi.mocked(api.getInvitation).mockResolvedValue({ ...invitation })
    vi.mocked(api.joinRoom).mockRejectedValue(new ApiError(409, 'NAME_TAKEN', 'x'))
    const { user } = renderAt('/s/AbCdEfGhIjKlMnOp')
    await user.type(await screen.findByLabelText(t.join.name), ' ANA ')
    await user.click(screen.getByRole('button', { name: t.join.submit }))
    expect(await screen.findByRole('alert')).toHaveTextContent(t.join.nameTaken('ANA'))
    expect(screen.getByText(t.join.nameTakenNote)).toBeInTheDocument()
    expect(screen.getByLabelText(t.join.name)).toHaveAttribute('aria-invalid', 'true')
  })

  it('al entrar lleva a la sala y pide guardar el enlace personal', async () => {
    vi.mocked(api.getInvitation).mockResolvedValue({ ...invitation })
    vi.mocked(api.joinRoom).mockResolvedValue({
      participant: { id: 'p4', name: 'Sofía' },
      participantToken: TOKEN,
    })
    vi.mocked(api.getParticipantView).mockResolvedValue({
      room,
      me: { id: 'p4', name: 'Sofía' },
      participants: [{ id: 'p4', name: 'Sofía' }],
      maxParticipants: 30,
    })
    const { user } = renderAt('/s/AbCdEfGhIjKlMnOp')
    await user.type(await screen.findByLabelText(t.join.name), 'Sofía')
    await user.click(screen.getByRole('button', { name: t.join.submit }))
    expect(
      await screen.findByText(t.participant.savePersonalTitle),
    ).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`/p#${TOKEN}$`))).toBeInTheDocument()
    expect(api.getParticipantView).toHaveBeenCalledWith(TOKEN)
  })

  it.each([
    ['ROOM_FULL', t.status.full.title],
    ['ROOM_CLOSED', t.status.closed.title],
  ] as const)('con %s no muestra el formulario', async (reason, title) => {
    vi.mocked(api.getInvitation).mockResolvedValue({
      ...invitation,
      participantNames: [],
      cannotJoinReason: reason,
    })
    renderAt('/s/AbCdEfGhIjKlMnOp')
    expect(await screen.findByText(title)).toBeInTheDocument()
    expect(screen.queryByLabelText(t.join.name)).toBeNull()
  })

  it('un código inexistente muestra «No encontrado»', async () => {
    vi.mocked(api.getInvitation).mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'x'))
    renderAt('/s/AAAAAAAAAAAAAAAA')
    expect(await screen.findByText(t.status.notFound.title)).toBeInTheDocument()
  })
})

describe('Participante', () => {
  const view = (names: string[]): ParticipantView => ({
    room,
    me: { id: 'id-Ana', name: 'Ana' },
    participants: names.map((name) => ({ id: `id-${name}`, name })),
    maxParticipants: 30,
  })

  it('sin token válido muestra «No encontrado» sin llamar a la API', async () => {
    renderAt('/p#corto')
    expect(await screen.findByText(t.status.notFound.title)).toBeInTheDocument()
    expect(api.getParticipantView).not.toHaveBeenCalled()
  })

  it('muestra la sala y se actualiza con cada aviso del socket', async () => {
    vi.mocked(api.getParticipantView)
      .mockResolvedValueOnce(view(['Ana']))
      .mockResolvedValue(view(['Ana', 'Luis']))
    renderAt(`/p#${TOKEN}`)
    expect(await screen.findByText(t.room.status(true, 1, 30))).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent(`Ana ${t.room.you}`)

    act(() => socket.subs[0].onChange())
    expect(await screen.findByText('Luis')).toBeInTheDocument()
    expect(screen.getByText(t.room.status(true, 2, 30))).toBeInTheDocument()
    // Al entrar por el enlace (sin acabar de unirse) no pide guardarlo.
    expect(screen.queryByText(t.participant.savePersonalTitle)).toBeNull()
  })

  it('un fallo pasajero al recargar no borra la sala', async () => {
    vi.mocked(api.getParticipantView)
      .mockResolvedValueOnce(view(['Ana']))
      .mockRejectedValue(new ApiError(0, 'NETWORK', 'x'))
    renderAt(`/p#${TOKEN}`)
    expect(await screen.findByText('Cena de Navidad')).toBeInTheDocument()
    act(() => socket.subs[0].onChange())
    await waitFor(() => expect(api.getParticipantView).toHaveBeenCalledTimes(2))
    expect(screen.getByText('Cena de Navidad')).toBeInTheDocument()
  })

  it('si el servidor rechaza el token, muestra «No encontrado»', async () => {
    vi.mocked(api.getParticipantView).mockResolvedValue(view(['Ana']))
    renderAt(`/p#${TOKEN}`)
    await screen.findByText('Cena de Navidad')
    act(() => socket.subs[0].onAuthError())
    expect(await screen.findByText(t.status.notFound.title)).toBeInTheDocument()
  })
})

describe('Organizador', () => {
  const view: OrganizerView = {
    room,
    inviteCode: 'AbCdEfGhIjKlMnOp',
    participants: [
      { id: '1', name: 'Ana' },
      { id: '2', name: 'Luis' },
    ],
    maxParticipants: 30,
  }

  it('muestra la sala, la invitación y la lista, sin «Tú»', async () => {
    vi.mocked(api.getOrganizerView).mockResolvedValue(view)
    renderAt(`/o#${OTHER_TOKEN}`)
    expect(await screen.findByText(t.organizer.title)).toBeInTheDocument()
    expect(screen.getByText(/\/s\/AbCdEfGhIjKlMnOp$/)).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.queryByText(t.room.you)).toBeNull()
    expect(api.getOrganizerView).toHaveBeenCalledWith(OTHER_TOKEN)
  })

  it('un error de red ofrece reintentar', async () => {
    vi.mocked(api.getOrganizerView)
      .mockRejectedValueOnce(new ApiError(0, 'NETWORK', 'x'))
      .mockResolvedValue(view)
    const { user } = renderAt(`/o#${OTHER_TOKEN}`)
    await user.click(await screen.findByRole('button', { name: t.retry }))
    expect(await screen.findByText(t.organizer.title)).toBeInTheDocument()
  })
})

it('una ruta desconocida muestra «No encontrado»', async () => {
  renderAt('/no-existe')
  expect(await screen.findByText(t.status.notFound.title)).toBeInTheDocument()
})
