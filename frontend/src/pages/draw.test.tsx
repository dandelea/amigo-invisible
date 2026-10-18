import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import * as api from '@/api/rooms';
import type {
  Assignment,
  OrganizerView,
  ParticipantView,
  Room,
} from '@/api/types';
import { prefersReducedMotion } from '@/lib/motion';
import { renderAt, TOKEN } from '@/test/render';
import { t } from '@/texts/es';

vi.mock('@/api/rooms');
vi.mock('@/lib/motion');

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

const ORG = 'C'.repeat(43);
const room: Room = {
  name: 'Cena de Navidad',
  giftDate: '2026-12-20',
  budget: 15,
  status: 'open',
  pairRuleEnabled: true,
};
const drawnRoom: Room = { ...room, status: 'drawn' };
const NAMES = ['Ana', 'Luis', 'Marta', 'Pablo', 'Carla'];

beforeEach(() => {
  vi.resetAllMocks();
  socket.subs.length = 0;
});

describe('Organizador: sorteo', () => {
  const view = (over: Partial<OrganizerView> = {}): OrganizerView => ({
    room,
    inviteCode: 'AbCdEfGhIjKlMnOp',
    participants: NAMES.map((n) => ({ id: `id-${n}`, name: n })),
    pairs: [],
    maxParticipants: 30,
    draw: {
      round: 0,
      feasibility: { ok: true, code: null },
      seenCount: 0,
      total: NAMES.length,
      seen: [],
    },
    ...over,
  });

  it('avisa de que no hay solución y no deja sortear', async () => {
    vi.mocked(api.getOrganizerView).mockResolvedValue(
      view({
        draw: {
          ...view().draw,
          feasibility: { ok: false, code: 'NO_SOLUTION' },
        },
      }),
    );
    renderAt(`/o#${ORG}`);
    expect(
      await screen.findByText(t.draw.noSolutionStrong),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: t.draw.drawButton }),
    ).toBeDisabled();
  });

  it('con menos de 3 participantes explica por qué no se puede', async () => {
    vi.mocked(api.getOrganizerView).mockResolvedValue(
      view({
        draw: {
          ...view().draw,
          feasibility: { ok: false, code: 'TOO_FEW_PARTICIPANTS' },
        },
      }),
    );
    renderAt(`/o#${ORG}`);
    expect(await screen.findByText(t.draw.tooFew)).toBeInTheDocument();
  });

  it('sortea al pulsar «Sortear»', async () => {
    vi.mocked(api.getOrganizerView).mockResolvedValue(view());
    vi.mocked(api.draw).mockResolvedValue({ round: 1, seen: false });
    const { user } = renderAt(`/o#${ORG}`);
    await user.click(
      await screen.findByRole('button', { name: t.draw.drawButton }),
    );
    expect(api.draw).toHaveBeenCalledWith(ORG);
  });

  const drawnView = () =>
    view({
      room: drawnRoom,
      draw: {
        round: 1,
        feasibility: { ok: true, code: null },
        seenCount: 2,
        total: 5,
        seen: NAMES.map((name, i) => ({ name, seen: i < 2 })),
      },
    });

  it('muestra el contador y, con «Más», solo quién lo ha visto', async () => {
    vi.mocked(api.getOrganizerView).mockResolvedValue(drawnView());
    const { user } = renderAt(`/o#${ORG}`);
    expect(
      await screen.findByRole('progressbar', {
        name: t.draw.seenProgress(2, 5),
      }),
    ).toHaveAttribute('aria-valuenow', '2');
    await user.click(screen.getByRole('button', { name: t.draw.moreLabel }));
    const dialog = screen.getByRole('dialog', { name: t.draw.seenTitle });
    expect(dialog).toHaveAccessibleDescription(t.draw.seenDialogHint);
    expect(within(dialog).getByText(t.draw.seenGroup(2))).toBeInTheDocument();
    expect(
      within(dialog).getByText(t.draw.pendingGroup(3)),
    ).toBeInTheDocument();
    expect(within(dialog).getAllByText(t.draw.seenState)).toHaveLength(2);
    expect(within(dialog).getAllByText(t.draw.pendingState)).toHaveLength(3);
  });

  it('repite el sorteo tras avisar de cuántos lo han visto', async () => {
    vi.mocked(api.getOrganizerView).mockResolvedValue(drawnView());
    vi.mocked(api.redraw).mockResolvedValue({ round: 2, seen: false });
    const { user } = renderAt(`/o#${ORG}`);
    expect(await screen.findByText(t.draw.repeatNote(2))).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: t.draw.repeat }));
    const dialog = screen.getByRole('dialog', { name: t.draw.repeatTitle });
    expect(
      within(dialog).getByText(t.draw.repeatWarning(2, 5)),
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole('button', { name: t.draw.repeat }),
    );
    expect(api.redraw).toHaveBeenCalledWith(ORG);
  });

  it('regenera un enlace y lo muestra una sola vez', async () => {
    const NEW = 'N'.repeat(43);
    vi.mocked(api.getOrganizerView).mockResolvedValue(drawnView());
    vi.mocked(api.regenerateParticipantToken).mockResolvedValue({
      participantToken: NEW,
    });
    const { user } = renderAt(`/o#${ORG}`);
    await user.click(
      await screen.findByRole('button', { name: t.organizer.actions('Marta') }),
    );
    await user.click(
      screen.getByRole('button', { name: new RegExp(t.draw.regenerate) }),
    );
    const confirm = screen.getByRole('dialog', {
      name: t.draw.regenerateTitle('Marta'),
    });
    await user.click(
      within(confirm).getByRole('button', { name: t.draw.regenerateConfirm }),
    );
    expect(api.regenerateParticipantToken).toHaveBeenCalledWith(
      ORG,
      'id-Marta',
    );
    const shown = await screen.findByRole('dialog', {
      name: t.draw.newLinkTitle('Marta'),
    });
    expect(
      within(shown).getByText(new RegExp(`/p#${NEW}$`)),
    ).toBeInTheDocument();
    expect(
      within(shown).getByText(t.draw.newLinkOnceStrong),
    ).toBeInTheDocument();
    await user.click(within(shown).getByRole('button', { name: t.draw.done }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByText(new RegExp(NEW))).toBeNull();
  });
});

describe('Participante: sorteo', () => {
  const view = (draw: ParticipantView['draw']): ParticipantView => ({
    room: drawnRoom,
    me: { id: 'id-Marta', name: 'Marta' },
    participants: NAMES.map((n) => ({
      id: `id-${n}`,
      name: n,
      wishlist: null,
    })),
    pairs: [],
    maxParticipants: 30,
    draw,
  });
  const assignment = (round = 1): Assignment => ({
    receiver: {
      id: 'id-Carla',
      name: 'Carla',
      wishlist: {
        kind: 'link',
        url: 'https://ejemplo.com/lista-de-carla',
        fileName: null,
        fileType: null,
        fileSize: null,
      },
    },
    round,
    seen: false,
  });

  it('con movimiento reducido, descubrir muestra el resultado directamente', async () => {
    vi.mocked(prefersReducedMotion).mockReturnValue(true);
    vi.mocked(api.getParticipantView).mockResolvedValue(
      view({ round: 1, seen: false }),
    );
    vi.mocked(api.getAssignment).mockResolvedValue(assignment());
    vi.mocked(api.markAssignmentSeen).mockResolvedValue(undefined);
    const { user } = renderAt(`/p#${TOKEN}`);
    expect(await screen.findByText(t.draw.doneTitle)).toBeInTheDocument();
    // La asignación no se pide hasta que se quiere descubrir.
    expect(api.getAssignment).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: t.draw.discover }));
    expect(
      await screen.findByRole('heading', { name: t.draw.resultTitle('Marta') }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(t.draw.resultAnnounce('Carla')),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: t.wishlist.openLink }),
    ).toHaveAttribute('href', 'https://ejemplo.com/lista-de-carla');
    expect(screen.queryByText(t.draw.spinning)).toBeNull();
    expect(api.markAssignmentSeen).toHaveBeenCalledWith(TOKEN, 1);
  });

  it('la ruleta gira unos 15 segundos y termina en el resultado', async () => {
    vi.mocked(prefersReducedMotion).mockReturnValue(false);
    vi.mocked(api.getParticipantView).mockResolvedValue(
      view({ round: 1, seen: false }),
    );
    vi.mocked(api.getAssignment).mockResolvedValue(assignment());
    vi.mocked(api.markAssignmentSeen).mockResolvedValue(undefined);
    renderAt(`/p#${TOKEN}`);
    const discover = await screen.findByRole('button', {
      name: t.draw.discover,
    });
    vi.useFakeTimers({
      toFake: [
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'performance',
        'setTimeout',
        'clearTimeout',
      ],
    });
    try {
      fireEvent.click(discover);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });
      expect(screen.getByText(t.draw.spinning)).toBeInTheDocument();
      expect(api.markAssignmentSeen).not.toHaveBeenCalled();
      // A los 10 s sigue girando (dura unos 15 s).
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10000);
      });
      expect(screen.getByText(t.draw.spinning)).toBeInTheDocument();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(6000);
      });
    } finally {
      vi.useRealTimers();
    }
    expect(
      await screen.findByRole('heading', { name: t.draw.resultTitle('Marta') }),
    ).toBeInTheDocument();
    expect(api.markAssignmentSeen).toHaveBeenCalledWith(TOKEN, 1);
  });

  it('«Saltar animación» lleva al resultado al momento', async () => {
    vi.mocked(prefersReducedMotion).mockReturnValue(false);
    vi.mocked(api.getParticipantView).mockResolvedValue(
      view({ round: 1, seen: false }),
    );
    vi.mocked(api.getAssignment).mockResolvedValue(assignment());
    vi.mocked(api.markAssignmentSeen).mockResolvedValue(undefined);
    const { user } = renderAt(`/p#${TOKEN}`);
    await user.click(
      await screen.findByRole('button', { name: t.draw.discover }),
    );
    await user.click(await screen.findByRole('button', { name: t.draw.skip }));
    expect(
      await screen.findByRole('heading', { name: t.draw.resultTitle('Marta') }),
    ).toBeInTheDocument();
    expect(api.markAssignmentSeen).toHaveBeenCalledWith(TOKEN, 1);
  });

  it('si ya lo había visto, va directo al resultado sin ruleta', async () => {
    vi.mocked(api.getParticipantView).mockResolvedValue(
      view({ round: 1, seen: true }),
    );
    vi.mocked(api.getAssignment).mockResolvedValue({
      ...assignment(),
      seen: true,
    });
    renderAt(`/p#${TOKEN}`);
    expect(
      await screen.findByRole('heading', { name: t.draw.resultTitle('Marta') }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: t.draw.discover })).toBeNull();
    expect(api.markAssignmentSeen).not.toHaveBeenCalled();
  });

  it('si el organizador repite el sorteo, avisa y vuelve a empezar', async () => {
    vi.mocked(prefersReducedMotion).mockReturnValue(true);
    vi.mocked(api.getParticipantView)
      .mockResolvedValueOnce(view({ round: 1, seen: true }))
      .mockResolvedValue(view({ round: 2, seen: false }));
    vi.mocked(api.getAssignment).mockResolvedValue(assignment());
    renderAt(`/p#${TOKEN}`);
    await screen.findByRole('heading', { name: t.draw.resultTitle('Marta') });

    act(() => socket.subs[0].onChange());

    expect(await screen.findByText(t.draw.repeatedStrong)).toBeInTheDocument();
    expect(screen.getByText(t.draw.newTitle)).toBeInTheDocument();
    expect(screen.getByText(t.draw.sameLinkTitle)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: t.draw.discoverNew }),
    ).toBeInTheDocument();
  });
});
