import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ApiError } from '@/api/client';
import { getInvitation, joinRoom } from '@/api/rooms';
import type { Invitation } from '@/api/types';
import { PageLayout } from '@/components/page-layout';
import { StatusScreen } from '@/components/status-screen';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Pill } from '@/components/ui/pill';
import { personalPath } from '@/lib/links';
import { roomSummary } from '@/lib/room';
import {
  cleanName,
  PARTICIPANT_NAME_MAX,
  PARTICIPANT_NAME_PATTERN,
} from '@/lib/names';
import { errorText, t } from '@/texts/es';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; invitation: Invitation }
  | { status: 'error'; code: string };

const listFormat = new Intl.ListFormat('es', {
  style: 'long',
  type: 'conjunction',
});

export function JoinPage() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameTaken, setNameTaken] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    getInvitation(code)
      .then((invitation) => active && setLoad({ status: 'ready', invitation }))
      .catch((error: unknown) => {
        if (!active) return;
        const errCode = error instanceof ApiError ? error.code : 'UNKNOWN';
        setLoad({ status: 'error', code: errCode });
      });
    return () => {
      active = false;
    };
  }, [code, attempt]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const cleaned = cleanName(name);
    setServerError(null);
    setNameTaken(false);
    if (!cleaned) return setNameError(t.join.errors.nameEmpty);
    if (!PARTICIPANT_NAME_PATTERN.test(cleaned))
      return setNameError(t.join.errors.nameChars);
    setNameError(null);
    setSubmitting(true);
    try {
      const { participantToken } = await joinRoom(code, cleaned);
      void navigate(personalPath(participantToken), {
        replace: true,
        state: { justJoined: true },
      });
    } catch (error) {
      setSubmitting(false);
      const err = error instanceof ApiError ? error : null;
      const errCode = err?.code ?? 'UNKNOWN';
      if (errCode === 'NAME_TAKEN') {
        setNameError(t.join.nameTaken(cleaned));
        setNameTaken(true);
      } else if (errCode === 'VALIDATION_ERROR' && err?.fields.name) {
        setNameError(err.fields.name);
      } else if (
        errCode === 'ROOM_FULL' ||
        errCode === 'ROOM_CLOSED' ||
        errCode === 'NOT_FOUND'
      ) {
        // La sala cambió mientras se escribía: se recarga su estado.
        setAttempt((n) => n + 1);
      } else {
        setServerError(errorText(errCode, err?.message));
      }
    }
  }

  if (load.status === 'loading') {
    return <StatusScreen title={t.loading} spinner />;
  }
  if (load.status === 'error') {
    if (load.code === 'NOT_FOUND') return <NotFoundScreen />;
    return (
      <StatusScreen
        title={t.status.error.title}
        body={errorText(load.code)}
        action={
          <Button onClick={() => setAttempt((n) => n + 1)}>{t.retry}</Button>
        }
      />
    );
  }

  const { invitation } = load;
  if (invitation.cannotJoinReason === 'ROOM_FULL') {
    return <StatusScreen {...t.status.full} />;
  }
  if (invitation.cannotJoinReason === 'ROOM_CLOSED') {
    return <StatusScreen {...t.status.closed} />;
  }

  const summary = roomSummary(invitation.room);
  return (
    <PageLayout>
      <form
        onSubmit={onSubmit}
        noValidate
        className="flex flex-1 flex-col gap-3.5 lg:mx-auto lg:w-full lg:max-w-[560px] lg:flex-none"
      >
        <Pill variant="accent">{t.join.invited}</Pill>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl leading-tight font-bold break-words">
            {invitation.room.name}
          </h1>
          {summary && (
            <p className="text-[13px] text-muted-foreground">{summary}</p>
          )}
        </div>
        <Card>
          <div className="flex items-center justify-between gap-2.5">
            <h2 className="text-[17px] font-semibold">{t.join.alreadyIn}</h2>
            <Pill>
              {t.room.status(
                true,
                invitation.participantCount,
                invitation.maxParticipants,
              )}
            </Pill>
          </div>
          <p className="text-[13px] text-muted-foreground">
            {invitation.participantNames.length > 0
              ? listFormat.format(invitation.participantNames)
              : t.join.nobodyYet}
          </p>
        </Card>
        <FormField
          label={t.join.name}
          hint={t.join.nameHint}
          error={nameError}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={PARTICIPANT_NAME_MAX}
          showCounter
          autoComplete="given-name"
          required
        />
        <Card variant="muted">
          <p className="text-[13px] text-muted-foreground">
            {nameTaken ? t.join.nameTakenNote : t.join.note}
          </p>
        </Card>
        {serverError && <Alert variant="error">{serverError}</Alert>}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="mt-auto lg:mt-2"
          disabled={submitting}
        >
          {submitting ? t.join.submitting : t.join.submit}
        </Button>
      </form>
    </PageLayout>
  );
}

export function NotFoundScreen() {
  return (
    <StatusScreen
      {...t.status.notFound}
      action={
        <Button asChild>
          <Link to="/">{t.goHome}</Link>
        </Button>
      }
    />
  );
}
