import { useRef, useState, type FormEvent } from 'react';
import { ApiError } from '@/api/client';
import {
  removeWishlist,
  setWishlistLink,
  uploadWishlistFile,
} from '@/api/rooms';
import type { Wishlist } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Pill } from '@/components/ui/pill';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { formatFileSize } from '@/lib/format';
import { fileLabel } from '@/lib/wishlist';
import { errorText, t } from '@/texts/es';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';
const ACCEPTED = /\.(pdf|jpe?g|png|webp)$/i;

const errorOf = (e: unknown) =>
  e instanceof ApiError ? errorText(e.code, e.message) : t.errors.default;

// Tarjeta «Mi lista de deseos» con su editor. Solo se puede cambiar antes
// del sorteo (`editable`).
export function MyWishlist({
  token,
  wishlist,
  editable,
}: {
  token: string;
  wishlist: Wishlist | null;
  editable: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setRemoving(true);
    setError(null);
    try {
      await removeWishlist(token);
    } catch (e) {
      setError(errorOf(e));
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-2.5">
        <h2 className="text-[17px] font-semibold">{t.wishlist.mine}</h2>
        {wishlist && (
          <Pill>
            {wishlist.kind === 'link' ? t.wishlist.link : wishlist.fileType}
          </Pill>
        )}
      </div>
      {wishlist ? (
        <p className="font-semibold break-all">
          {wishlist.kind === 'link' ? wishlist.url : fileLabel(wishlist)}
        </p>
      ) : (
        <p className="text-[13px] text-muted-foreground">{t.wishlist.empty}</p>
      )}
      {editable && (
        <>
          <p className="text-[13px] text-muted-foreground">
            {t.wishlist.oneItem}
          </p>
          {error && <Alert variant="error">{error}</Alert>}
          <div className="flex gap-2.5">
            <Button className="flex-1" onClick={() => setEditing(true)}>
              {wishlist ? t.wishlist.change : t.wishlist.add}
            </Button>
            {wishlist && (
              <Button className="flex-1" onClick={remove} disabled={removing}>
                {t.wishlist.remove}
              </Button>
            )}
          </div>
          <ResponsiveDialog
            open={editing}
            onOpenChange={setEditing}
            title={t.wishlist.mine}
          >
            {editing && (
              <WishlistEditor
                token={token}
                current={wishlist}
                onDone={() => setEditing(false)}
              />
            )}
          </ResponsiveDialog>
        </>
      )}
    </Card>
  );
}

// Editor con dos modos (mockups «Editar mi lista»): enlace o archivo.
function WishlistEditor({
  token,
  current,
  onDone,
}: {
  token: string;
  current: Wishlist | null;
  onDone: () => void;
}) {
  const [kind, setKind] = useState<'link' | 'file'>(current?.kind ?? 'link');
  const [url, setUrl] = useState(
    current?.kind === 'link' ? (current.url ?? '') : '',
  );
  const [file, setFile] = useState<File | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  function pick(chosen: File | undefined) {
    setFieldError(null);
    if (!chosen) return;
    if (!ACCEPTED.test(chosen.name))
      return setFieldError(t.wishlist.errors.fileType);
    if (chosen.size > MAX_BYTES)
      return setFieldError(t.wishlist.errors.fileSize);
    setFile(chosen);
  }

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onDone();
    } catch (e) {
      if (
        e instanceof ApiError &&
        e.code === 'VALIDATION_ERROR' &&
        e.fields.url
      ) {
        setFieldError(e.fields.url);
      } else {
        setError(errorOf(e));
      }
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFieldError(null);
    if (kind === 'link') {
      const value = url.trim();
      if (!/^https:\/\/\S+\.\S+/i.test(value)) {
        return setFieldError(t.wishlist.errors.link);
      }
      return run(() => setWishlistLink(token, value));
    }
    if (!file) return setFieldError(t.wishlist.errors.noFile);
    return run(() => uploadWishlistFile(token, file));
  }

  const currentFile = current?.kind === 'file' ? current : null;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3.5">
      <SegmentedControl
        label={t.wishlist.kindLabel}
        value={kind}
        onChange={(next) => {
          setKind(next);
          setFieldError(null);
        }}
        options={[
          { value: 'link', label: t.wishlist.link },
          { value: 'file', label: t.wishlist.file },
        ]}
      />
      {kind === 'link' ? (
        <>
          <FormField
            label={t.wishlist.linkField}
            hint={t.wishlist.linkHint}
            error={fieldError}
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            maxLength={2000}
            autoComplete="url"
          />
          <Card variant="muted">
            <p className="text-[13px] text-muted-foreground">
              {t.wishlist.replaceNote}
            </p>
          </Card>
        </>
      ) : (
        <>
          {currentFile && (
            <Card>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-muted-foreground">
                  {t.wishlist.current}
                </span>
                <Pill>{currentFile.fileType}</Pill>
              </div>
              <p
                className={
                  file
                    ? 'font-semibold break-all text-muted-foreground line-through'
                    : 'font-semibold break-all'
                }
              >
                {fileLabel(currentFile)}
              </p>
            </Card>
          )}
          <Card variant={file ? 'highlighted' : 'default'}>
            {file && (
              <>
                <span className="text-[13px] text-muted-foreground">
                  {t.wishlist.newFile}
                </span>
                <p className="font-semibold break-all">
                  {file.name} · {formatFileSize(file.size)}
                </p>
              </>
            )}
            <input
              ref={input}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              aria-label={t.wishlist.chooseFile}
              onChange={(e) => pick(e.target.files?.[0])}
            />
            <Button onClick={() => input.current?.click()}>
              {file ? t.wishlist.chooseOther : t.wishlist.chooseFile}
            </Button>
          </Card>
          {fieldError && <Alert variant="error">{fieldError}</Alert>}
          <p className="text-[13px] text-muted-foreground">
            {t.wishlist.fileRules}
          </p>
        </>
      )}
      {error && <Alert variant="error">{error}</Alert>}
      <Button type="submit" variant="primary" size="lg" disabled={busy}>
        {busy ? t.wishlist.saving : t.wishlist.save}
      </Button>
      {current && (
        <Button
          variant="destructive"
          disabled={busy}
          onClick={() => run(() => removeWishlist(token))}
        >
          {t.wishlist.removeMine}
        </Button>
      )}
    </form>
  );
}
