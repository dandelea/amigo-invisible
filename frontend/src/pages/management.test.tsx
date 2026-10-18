import { act, screen, waitFor, within } from '@testing-library/react';
import { ApiError } from '@/api/client';
import * as api from '@/api/rooms';
import type {
  OrganizerView,
  ParticipantView,
  ParticipantWithWishlist,
  Room,
  Wishlist,
} from '@/api/types';
import { goToUrl } from '@/lib/navigation';
import { renderAt, TOKEN } from '@/test/render';
import { t } from '@/texts/es';

vi.mock('@/api/rooms');
vi.mock('@/lib/navigation');

const socket = vi.hoisted(() => ({
  subs: [] as { onChange: () => void; onAuthError: () => void }[],
}));
vi.mock('@/realtime/socket', () => ({
  subscribeToRoom: vi.fn(
    (_role: string, _token: string, cb: (typeof socket.subs)[number]) => {
      socket.subs.push(cb);
      return () => {};
    },
  ),
}));

const room: Room = {
  name: 'Cena de Navidad',
  giftDate: '2026-12-20',
  budget: 15,
  status: 'open',
  pairRuleEnabled: true,
};

const link: Wishlist = {
  kind: 'link',
  url: 'https://ejemplo.com/lista',
  fileName: null,
  fileType: null,
  fileSize: null,
};
const pdf: Wishlist = {
  kind: 'file',
  url: null,
  fileName: 'lista-deseos.pdf',
  fileType: 'PDF',
  fileSize: 1258291,
};

const person = (
  name: string,
  wishlist: Wishlist | null = null,
): ParticipantWithWishlist => ({ id: `id-${name}`, name, wishlist });

beforeEach(() => {
  vi.resetAllMocks();
  socket.subs.length = 0;
});

describe('Participante: parejas y deseos', () => {
  const view = (over: Partial<ParticipantView> = {}): ParticipantView => ({
    room,
    me: { id: 'id-Marta', name: 'Marta' },
    participants: [
      person('Ana', link),
      person('Luis'),
      person('Marta'),
      person('Carla', pdf),
    ],
    pairs: [{ id: 'pair-1', participantIds: ['id-Ana', 'id-Luis'] }],
    maxParticipants: 30,
    ...over,
  });

  it('muestra las parejas juntas con su etiqueta accesible', async () => {
    vi.mocked(api.getParticipantView).mockResolvedValue(view());
    renderAt(`/p#${TOKEN}`);
    const group = await screen.findByRole('group', {
      name: t.pairs.label('Ana', 'Luis'),
    });
    expect(within(group).getByText('Ana')).toBeInTheDocument();
    expect(within(group).getByText('Luis')).toBeInTheDocument();
    expect(
      within(group).getByRole('img', { name: t.pairs.heart }),
    ).toBeInTheDocument();
  });

  it('abre la lista de otra persona con un enlace seguro', async () => {
    vi.mocked(api.getParticipantView).mockResolvedValue(view());
    const { user } = renderAt(`/p#${TOKEN}`);
    expect(
      await screen.findByText(t.participant.noWishlist),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: t.participant.seeWishes('Ana') }),
    );
    const dialog = screen.getByRole('dialog', { name: t.wishlist.of('Ana') });
    const open = within(dialog).getByRole('link', {
      name: t.wishlist.openLink,
    });
    expect(open).toHaveAttribute('href', link.url);
    expect(open).toHaveAttribute('target', '_blank');
    expect(open).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('descarga un archivo con la URL firmada', async () => {
    vi.mocked(api.getParticipantView).mockResolvedValue(view());
    vi.mocked(api.getWishlistDownloadUrl).mockResolvedValue({
      url: 'https://s3.test/firmada',
      expiresInSeconds: 300,
    });
    const { user } = renderAt(`/p#${TOKEN}`);
    await user.click(
      await screen.findByRole('button', {
        name: t.participant.seeWishes('Carla'),
      }),
    );
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByText('lista-deseos.pdf · 1,2 MB'),
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole('button', { name: t.wishlist.download }),
    );
    expect(api.getWishlistDownloadUrl).toHaveBeenCalledWith(TOKEN, 'id-Carla');
    expect(goToUrl).toHaveBeenCalledWith('https://s3.test/firmada');
  });

  it('guarda un enlace propio y valida que sea https', async () => {
    vi.mocked(api.getParticipantView).mockResolvedValue(view());
    vi.mocked(api.setWishlistLink).mockResolvedValue(link);
    const { user } = renderAt(`/p#${TOKEN}`);
    await user.click(
      await screen.findByRole('button', { name: t.wishlist.add }),
    );
    const dialog = screen.getByRole('dialog', { name: t.wishlist.mine });
    const field = within(dialog).getByLabelText(t.wishlist.linkField);
    await user.type(field, 'http://inseguro.com');
    await user.click(
      within(dialog).getByRole('button', { name: t.wishlist.save }),
    );
    expect(
      within(dialog).getByText(t.wishlist.errors.link),
    ).toBeInTheDocument();
    expect(api.setWishlistLink).not.toHaveBeenCalled();

    await user.clear(field);
    await user.type(field, 'https://ejemplo.com/lista');
    await user.click(
      within(dialog).getByRole('button', { name: t.wishlist.save }),
    );
    expect(api.setWishlistLink).toHaveBeenCalledWith(
      TOKEN,
      'https://ejemplo.com/lista',
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('sube un archivo y rechaza los de más de 5 MB antes de enviarlos', async () => {
    vi.mocked(api.getParticipantView).mockResolvedValue(view());
    vi.mocked(api.uploadWishlistFile).mockResolvedValue(pdf);
    const { user } = renderAt(`/p#${TOKEN}`);
    await user.click(
      await screen.findByRole('button', { name: t.wishlist.add }),
    );
    const dialog = screen.getByRole('dialog');
    await user.click(
      within(dialog).getByRole('radio', { name: t.wishlist.file }),
    );
    const input = within(dialog).getByLabelText(t.wishlist.chooseFile);

    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'grande.png', {
      type: 'image/png',
    });
    await user.upload(input, big);
    expect(
      within(dialog).getByText(t.wishlist.errors.fileSize),
    ).toBeInTheDocument();

    const ok = new File(['%PDF-1.7'], 'regalos.pdf', {
      type: 'application/pdf',
    });
    await user.upload(input, ok);
    expect(within(dialog).getByText(/^regalos\.pdf · /)).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole('button', { name: t.wishlist.save }),
    );
    expect(api.uploadWishlistFile).toHaveBeenCalledWith(TOKEN, ok);
  });

  it('muestra el error del servidor al subir', async () => {
    vi.mocked(api.getParticipantView).mockResolvedValue(view());
    vi.mocked(api.uploadWishlistFile).mockRejectedValue(
      new ApiError(415, 'UNSUPPORTED_FILE_TYPE', 'x'),
    );
    const { user } = renderAt(`/p#${TOKEN}`);
    await user.click(
      await screen.findByRole('button', { name: t.wishlist.add }),
    );
    const dialog = screen.getByRole('dialog');
    await user.click(
      within(dialog).getByRole('radio', { name: t.wishlist.file }),
    );
    await user.upload(
      within(dialog).getByLabelText(t.wishlist.chooseFile),
      new File(['x'], 'foto.png', { type: 'image/png' }),
    );
    await user.click(
      within(dialog).getByRole('button', { name: t.wishlist.save }),
    );
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      t.errors.UNSUPPORTED_FILE_TYPE,
    );
  });

  it('quita la lista propia', async () => {
    vi.mocked(api.getParticipantView).mockResolvedValue(
      view({ me: { id: 'id-Ana', name: 'Ana' } }),
    );
    vi.mocked(api.removeWishlist).mockResolvedValue(undefined);
    const { user } = renderAt(`/p#${TOKEN}`);
    expect(await screen.findByText(link.url!)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: t.wishlist.remove }));
    expect(api.removeWishlist).toHaveBeenCalledWith(TOKEN);
  });

  it('sale de la sala tras confirmar', async () => {
    vi.mocked(api.getParticipantView).mockResolvedValue(view());
    vi.mocked(api.leaveRoom).mockResolvedValue(undefined);
    const { user } = renderAt(`/p#${TOKEN}`);
    await user.click(
      await screen.findByRole('button', { name: t.participant.leave }),
    );
    const dialog = screen.getByRole('dialog', {
      name: t.participant.leaveTitle,
    });
    for (const line of t.participant.leaveConsequences) {
      expect(within(dialog).getByText(line)).toBeInTheDocument();
    }
    await user.click(
      within(dialog).getByRole('button', { name: t.participant.leaveConfirm }),
    );
    expect(api.leaveRoom).toHaveBeenCalledWith(TOKEN);
    expect(
      await screen.findByText(t.participant.left.title),
    ).toBeInTheDocument();
  });

  it('tras el sorteo no se puede editar ni salir', async () => {
    vi.mocked(api.getParticipantView).mockResolvedValue(
      view({ room: { ...room, status: 'drawn' } }),
    );
    renderAt(`/p#${TOKEN}`);
    expect(await screen.findByText(t.wishlist.mine)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t.wishlist.add })).toBeNull();
    expect(
      screen.queryByRole('button', { name: t.participant.leave }),
    ).toBeNull();
    // Las listas de los demás se siguen viendo.
    expect(
      screen.getByRole('button', { name: t.participant.seeWishes('Ana') }),
    ).toBeInTheDocument();
  });

  it('si el servidor cierra su conexión (expulsión), recarga y ve «No encontrado»', async () => {
    vi.mocked(api.getParticipantView)
      .mockResolvedValueOnce(view())
      .mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'x'));
    renderAt(`/p#${TOKEN}`);
    await screen.findByText('Cena de Navidad');
    act(() => socket.subs[0].onChange());
    expect(
      await screen.findByText(t.status.notFound.title),
    ).toBeInTheDocument();
  });
});

describe('Organizador: gestión', () => {
  const ORG = 'C'.repeat(43);
  const view = (over: Partial<OrganizerView> = {}): OrganizerView => ({
    room,
    inviteCode: 'AbCdEfGhIjKlMnOp',
    participants: ['Ana', 'Luis', 'Marta', 'Pablo'].map((n) => ({
      id: `id-${n}`,
      name: n,
    })),
    pairs: [{ id: 'pair-1', participantIds: ['id-Ana', 'id-Luis'] }],
    maxParticipants: 30,
    ...over,
  });

  it('cambia la regla de pareja con el interruptor', async () => {
    vi.mocked(api.getOrganizerView).mockResolvedValue(view());
    vi.mocked(api.setPairRule).mockResolvedValue({
      ...room,
      pairRuleEnabled: false,
    });
    const { user } = renderAt(`/o#${ORG}`);
    const toggle = await screen.findByRole('switch', {
      name: t.organizer.pairRule,
    });
    expect(toggle).toHaveAccessibleDescription(t.organizer.pairRuleOn);
    await user.click(toggle);
    expect(api.setPairRule).toHaveBeenCalledWith(ORG, false);
  });

  it('marca una pareja eligiendo a dos personas sin pareja', async () => {
    vi.mocked(api.getOrganizerView).mockResolvedValue(view());
    vi.mocked(api.createPair).mockResolvedValue({
      id: 'pair-2',
      participantIds: ['id-Marta', 'id-Pablo'],
    });
    const { user } = renderAt(`/o#${ORG}`);
    await user.click(
      await screen.findByRole('button', { name: t.organizer.markPair }),
    );
    const dialog = screen.getByRole('dialog', { name: t.organizer.markPair });
    expect(
      within(dialog).getByRole('checkbox', { name: /Ana/ }),
    ).toBeDisabled();
    const confirm = within(dialog).getByRole('button', {
      name: t.organizer.confirmPair,
    });
    expect(confirm).toBeDisabled();
    await user.click(within(dialog).getByRole('checkbox', { name: /Marta/ }));
    await user.click(within(dialog).getByRole('checkbox', { name: /Pablo/ }));
    expect(within(dialog).getByText(t.organizer.chosen(2))).toBeInTheDocument();
    await user.click(confirm);
    expect(api.createPair).toHaveBeenCalledWith(ORG, ['id-Marta', 'id-Pablo']);
  });

  it('deshace una pareja', async () => {
    vi.mocked(api.getOrganizerView).mockResolvedValue(view());
    vi.mocked(api.deletePair).mockResolvedValue(undefined);
    const { user } = renderAt(`/o#${ORG}`);
    await user.click(
      await screen.findByRole('button', { name: t.organizer.undoPair }),
    );
    expect(api.deletePair).toHaveBeenCalledWith(ORG, 'pair-1');
  });

  it('muestra «Sin pareja» y no ofrece marcar pareja si no quedan dos libres', async () => {
    vi.mocked(api.getOrganizerView).mockResolvedValue(
      view({
        pairs: [
          { id: 'p1', participantIds: ['id-Ana', 'id-Luis'] },
          { id: 'p2', participantIds: ['id-Marta', 'id-Pablo'] },
        ],
      }),
    );
    renderAt(`/o#${ORG}`);
    await screen.findAllByRole('group');
    expect(screen.queryByText(t.pairs.single)).toBeNull();
    expect(
      screen.queryByRole('button', { name: t.organizer.markPair }),
    ).toBeNull();
  });

  it('expulsa a alguien desde su menú tras confirmar', async () => {
    vi.mocked(api.getOrganizerView).mockResolvedValue(view());
    vi.mocked(api.expelParticipant).mockResolvedValue(undefined);
    const { user } = renderAt(`/o#${ORG}`);
    await user.click(
      await screen.findByRole('button', { name: t.organizer.actions('Marta') }),
    );
    await user.click(
      screen.getByRole('button', { name: new RegExp(t.organizer.expel) }),
    );
    const dialog = screen.getByRole('dialog', {
      name: t.organizer.expelTitle('Marta'),
    });
    expect(within(dialog).getByText(t.organizer.expelBody)).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole('button', { name: t.organizer.expelConfirm }),
    );
    expect(api.expelParticipant).toHaveBeenCalledWith(ORG, 'id-Marta');
  });

  it('edita la sala enviando solo lo que cambia', async () => {
    vi.mocked(api.getOrganizerView).mockResolvedValue(view());
    vi.mocked(api.updateRoom).mockResolvedValue({ ...room, name: 'Cena 2026' });
    const { user } = renderAt(`/o#${ORG}`);
    await user.click(
      await screen.findByRole('button', { name: t.organizer.edit }),
    );
    const dialog = screen.getByRole('dialog', { name: t.organizer.editTitle });
    const name = within(dialog).getByLabelText(t.create.name);
    expect(name).toHaveValue('Cena de Navidad');
    await user.clear(name);
    await user.type(name, 'Cena 2026');
    await user.click(
      within(dialog).getByRole('button', { name: t.organizer.save }),
    );
    expect(api.updateRoom).toHaveBeenCalledWith(ORG, { name: 'Cena 2026' });
  });

  it('tras el sorteo la gestión queda bloqueada', async () => {
    vi.mocked(api.getOrganizerView).mockResolvedValue(
      view({ room: { ...room, status: 'drawn' } }),
    );
    renderAt(`/o#${ORG}`);
    expect(await screen.findByRole('switch')).toBeDisabled();
    expect(screen.queryByRole('button', { name: t.organizer.edit })).toBeNull();
    expect(
      screen.queryByRole('button', { name: t.organizer.undoPair }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: t.organizer.actions('Marta') }),
    ).toBeNull();
  });

  it('el error de una acción se muestra en el panel', async () => {
    vi.mocked(api.getOrganizerView).mockResolvedValue(view());
    vi.mocked(api.deletePair).mockRejectedValue(
      new ApiError(409, 'ROOM_CLOSED', 'x'),
    );
    const { user } = renderAt(`/o#${ORG}`);
    await user.click(
      await screen.findByRole('button', { name: t.organizer.undoPair }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      t.errors.ROOM_CLOSED,
    );
  });
});

describe('Sala creada', () => {
  it('permite editar los datos y los muestra al momento', async () => {
    vi.mocked(api.updateRoom).mockResolvedValue({ ...room, budget: 20 });
    const { user } = renderAt('/creada', {
      room,
      inviteCode: 'AbCdEfGhIjKlMnOp',
      manageToken: TOKEN,
    });
    expect(screen.getByText('Presupuesto sugerido: 15 €')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: t.organizer.edit }));
    const dialog = screen.getByRole('dialog');
    const budget = within(dialog).getByLabelText(t.create.budget);
    await user.clear(budget);
    await user.type(budget, '20');
    await user.click(
      within(dialog).getByRole('button', { name: t.organizer.save }),
    );
    expect(api.updateRoom).toHaveBeenCalledWith(TOKEN, { budget: 20 });
    expect(
      await screen.findByText('Presupuesto sugerido: 20 €'),
    ).toBeInTheDocument();
  });
});
