// Todos los textos visibles de la app, en un solo sitio (solo español).
// Salen de los mockups (docs/mockups/src); se añaden por pantalla en cada
// fase.

export const t = {
  appName: 'Amigo Invisible',
  loading: 'Cargando…',
  retry: 'Reintentar',
  goHome: 'Ir al inicio',

  home: {
    tagline:
      'Organiza el sorteo de tu grupo en un minuto. Sin cuentas ni registros.',
    steps: [
      { title: 'Crea la sala', body: 'Ponle nombre, fecha y presupuesto.' },
      {
        title: 'Comparte el enlace',
        body: 'Cada persona entra y escribe su nombre.',
      },
      { title: 'Sortea', body: 'Todos ven a quién regalan, solo ellos.' },
    ],
    createRoom: 'Crear sala',
  },

  create: {
    title: 'Crear sala',
    name: 'Nombre de la sala',
    nameHint:
      'Usa un nombre descriptivo que todos reconozcan: evento, grupo o lugar.',
    giftDate: 'Día de entrega de los regalos',
    budget: 'Presupuesto sugerido (€)',
    budgetHint: 'Es orientativo. Lo verán todos los participantes.',
    optional: 'Opcional',
    note: 'Podrás editar estos datos mientras la sala esté abierta. El organizador no participa en el sorteo.',
    submit: 'Crear sala',
    submitting: 'Creando…',
    errors: {
      nameShort: 'El nombre debe tener al menos 3 caracteres.',
      nameChars: 'El nombre tiene caracteres no permitidos.',
      datePast: 'La fecha no puede ser anterior a hoy.',
      budget: 'Escribe un importe entre 1 y 1000 €, con hasta 2 decimales.',
    },
  },

  created: {
    title: 'Sala creada',
    giftDate: (date: string) => `Entrega de regalos: ${date}`,
    budget: (budget: string) => `Presupuesto sugerido: ${budget}`,
    inviteTag: 'Para compartir',
    inviteTitle: 'Enlace de invitación',
    inviteHint: 'Envíalo al grupo por WhatsApp.',
    manageTag: 'Privado',
    manageTitle: 'Enlace de gestión',
    manageWarningStrong: 'No compartas este enlace.',
    manageWarning:
      'Guárdalo ahora: se muestra una sola vez y, si lo pierdes, nadie podrá gestionar la sala.',
    goToRoom: 'Ir a mi sala',
  },

  copy: {
    button: 'Copiar enlace',
    done: 'Enlace copiado',
    failed:
      'No se ha podido copiar. Mantén pulsado el enlace para copiarlo a mano.',
  },

  join: {
    invited: 'Te han invitado',
    alreadyIn: 'Ya están dentro',
    nobodyYet: 'Todavía no hay nadie. ¡Sé la primera persona!',
    name: 'Tu nombre',
    nameHint: 'Así te verá el grupo. Usa un nombre que te reconozcan.',
    note: 'Al entrar recibirás tu enlace personal. Guárdalo: es la forma de volver a ver tu resultado.',
    submit: 'Entrar en la sala',
    submitting: 'Entrando…',
    nameTaken: (name: string) =>
      `Ya hay alguien llamado «${name}» en la sala. Prueba con otro, por ejemplo añadiendo tu apellido o una inicial.`,
    nameTakenNote:
      'No distinguimos mayúsculas ni tildes: «Ana», «ANA» y «Aná» cuentan como el mismo nombre.',
    errors: {
      nameEmpty: 'Escribe tu nombre.',
      nameChars: "El nombre solo puede tener letras, números, espacios y ' - .",
    },
  },

  room: {
    status: (open: boolean, count: number, max: number) =>
      `${open ? 'Abierta' : 'Sorteada'} · ${count}/${max}`,
    summary: (date: string | null, budget: string | null) =>
      [date && `Entrega: ${date}`, budget && `hasta ${budget}`]
        .filter(Boolean)
        .join(' · '),
    participants: 'Participantes',
    you: 'Tú',
    empty: 'Todavía no ha entrado nadie. Comparte el enlace de invitación.',
  },

  participant: {
    savePersonalTitle: 'Guarda tu enlace personal',
    savePersonalBody:
      'Es la forma de volver a ver tu resultado. Si lo pierdes, el organizador puede generar uno nuevo.',
  },

  organizer: {
    title: 'Tu sala',
    inviteTitle: 'Enlace de invitación',
    inviteHint: 'Compártelo con el grupo para que entren.',
  },

  status: {
    waking: {
      title: 'Despertando el servidor',
      body: 'Puede tardar hasta un minuto la primera vez.',
    },
    full: {
      title: 'Sala llena',
      body: 'Esta sala ya tiene 30 participantes.',
    },
    closed: {
      title: 'Sala cerrada',
      body: 'El sorteo ya se ha hecho y no admite a nadie más.',
    },
    notFound: {
      title: 'No encontrado',
      body: 'Este enlace no es válido. Pide al organizador uno nuevo.',
    },
    noRooms: {
      title: 'Ahora mismo no se admiten más salas',
      body: 'Vuelve a intentarlo más adelante.',
    },
    error: {
      title: 'Algo ha fallado',
      body: 'No se ha podido cargar la página. Inténtalo de nuevo.',
    },
  },

  // Texto para cada código de error del backend.
  errors: {
    NETWORK:
      'No se ha podido conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.',
    TOO_MANY_REQUESTS:
      'Demasiados intentos seguidos. Espera un momento y vuelve a probar.',
    MAX_ROOMS_REACHED: 'Ahora mismo no se admiten más salas.',
    ROOM_FULL: 'Esta sala ya tiene 30 participantes.',
    ROOM_CLOSED: 'El sorteo ya se ha hecho y no admite a nadie más.',
    NOT_FOUND: 'Este enlace no es válido.',
    default: 'Algo ha fallado. Inténtalo de nuevo.',
  } as Record<string, string>,
} as const

export function errorText(code: string, serverMessage?: string): string {
  if (code === 'VALIDATION_ERROR' && serverMessage) return serverMessage
  return t.errors[code] ?? t.errors.default
}
