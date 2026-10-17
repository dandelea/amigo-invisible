import { t } from '@/texts/es'

// Esqueleto de la Fase 0: muestra el inicio estático con el tema de los
// mockups. Las rutas (invitación, personal, gestión) llegan en la Fase 2.
function App() {
  return (
    <main className="mx-auto flex min-h-svh max-w-[760px] flex-col gap-3.5 p-5">
      <div className="flex flex-1 flex-col justify-center gap-3.5">
        <h1 className="text-[28px] leading-tight font-bold">{t.appName}</h1>
        <p className="text-base text-muted-foreground">{t.home.tagline}</p>
      </div>
      <ol className="flex flex-col gap-3.5">
        {t.home.steps.map((step, i) => (
          <li
            key={step.title}
            className="flex items-center gap-2.5 rounded-xl border bg-card p-3.5"
          >
            <span
              aria-hidden="true"
              className="flex size-8 flex-none items-center justify-center rounded-full bg-muted text-[13px] font-bold"
            >
              {i + 1}
            </span>
            <div>
              <h2 className="text-[17px] font-semibold">{step.title}</h2>
              <p className="text-[13px] text-muted-foreground">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        disabled
        className="mt-2 min-h-13 rounded-lg bg-primary px-4 text-[17px] font-semibold text-primary-foreground disabled:opacity-60"
      >
        {t.home.createRoom}
      </button>
    </main>
  )
}

export default App
