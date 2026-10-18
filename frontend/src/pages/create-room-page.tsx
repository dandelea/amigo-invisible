import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { ApiError } from '@/api/client';
import { createRoom } from '@/api/rooms';
import type { CreateRoomInput } from '@/api/types';
import { PageLayout } from '@/components/page-layout';
import { RoomFields } from '@/components/room-form';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  parseRoomForm,
  serverFieldErrors,
  useRoomForm,
} from '@/hooks/use-room-form';
import { errorText, t } from '@/texts/es';
import { usePageTitle } from '@/hooks/use-page-title';

export function CreateRoomPage() {
  usePageTitle(t.create.title);
  const navigate = useNavigate();
  const form = useRoomForm();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const { errors, parsed } = parseRoomForm(form.values);
    form.setErrors(errors);
    setServerError(null);
    if (Object.keys(errors).length > 0) return;
    const input: CreateRoomInput = { name: parsed.name };
    if (parsed.giftDate) input.giftDate = parsed.giftDate;
    if (parsed.budget != null) input.budget = parsed.budget;
    setSubmitting(true);
    try {
      const created = await createRoom(input);
      void navigate('/creada', { state: created });
    } catch (error) {
      const fields = serverFieldErrors(error);
      if (fields) {
        form.setErrors(fields);
      } else {
        const err = error instanceof ApiError ? error : null;
        setServerError(errorText(err?.code ?? 'UNKNOWN', err?.message));
      }
      setSubmitting(false);
    }
  }

  return (
    <PageLayout>
      <form
        onSubmit={onSubmit}
        noValidate
        className="flex flex-1 flex-col gap-3.5 lg:mx-auto lg:w-full lg:max-w-[560px] lg:flex-none lg:rounded-xl lg:border lg:bg-card lg:p-7"
      >
        <h1 className="text-2xl font-bold">{t.create.title}</h1>
        <RoomFields values={form.values} errors={form.errors} set={form.set} />
        <Card variant="muted">
          <p className="text-[13px] text-muted-foreground">{t.create.note}</p>
        </Card>
        {serverError && <Alert variant="error">{serverError}</Alert>}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="mt-auto lg:mt-2"
          disabled={submitting}
        >
          {submitting ? t.create.submitting : t.create.submit}
        </Button>
      </form>
    </PageLayout>
  );
}
