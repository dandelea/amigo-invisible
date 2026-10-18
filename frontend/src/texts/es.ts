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
      dateFar: 'La fecha puede ser como mucho dentro de 2 años.',
      budgetNumber: 'Escribe un importe en euros, por ejemplo 15 o 12,50.',
      budgetMin: 'El presupuesto mínimo es 1 €.',
      budgetMax: 'El presupuesto máximo es 1000 €.',
      budgetDecimals: 'El presupuesto puede tener como mucho 2 decimales.',
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

  dialog: {
    close: 'Cerrar',
    cancel: 'Cancelar',
  },

  pairs: {
    label: (a: string, b: string) => `Pareja: ${a} y ${b}`,
    heart: 'pareja',
    single: 'Sin pareja',
  },

  participant: {
    savePersonalTitle: 'Guarda tu enlace personal',
    savePersonalBody:
      'Es la forma de volver a ver tu resultado. Si lo pierdes, el organizador puede generar uno nuevo.',
    listHint: 'Toca el icono de regalo para ver la lista de cada persona.',
    noWishlist: 'Sin lista',
    seeWishes: (name: string) => `Ver deseos de ${name}`,
    seeWishesTooltip: 'Ver deseos',
    leave: 'Salir de la sala',
    leaveTitle: '¿Salir de la sala?',
    leaveBody: (room: string) =>
      `Dejarás de participar en el sorteo de «${room}».`,
    leaveConsequences: [
      'Se borrará tu lista de deseos.',
      'Si tenías pareja, se deshará.',
      'Tu enlace personal dejará de funcionar.',
    ],
    leaveNote:
      'Podrás volver a entrar con el enlace de invitación mientras la sala esté abierta.',
    leaveConfirm: 'Salir de la sala',
    leaveCancel: 'Quedarme',
    left: {
      title: 'Has salido de la sala',
      body: 'Puedes volver a entrar con el enlace de invitación mientras siga abierta.',
    },
  },

  wishlist: {
    mine: 'Mi lista de deseos',
    of: (name: string) => `Lista de deseos de ${name}`,
    empty: 'Todavía no has añadido nada. Puede ser un enlace o un archivo.',
    add: 'Añadir',
    change: 'Cambiar',
    remove: 'Quitar',
    oneItem: 'Solo puedes tener un elemento: un enlace o un archivo.',
    link: 'Enlace',
    file: 'Archivo',
    kindLabel: 'Tipo de lista',
    openLink: 'Abrir enlace',
    opensNewTab: 'Se abre en una pestaña nueva.',
    download: 'Descargar archivo',
    downloading: 'Preparando la descarga…',
    linkField: 'Enlace (https)',
    linkHint: 'Debe empezar por https://',
    replaceNote:
      'Solo tienes un elemento: un enlace o un archivo. Al guardar, reemplaza el actual.',
    current: 'Actual',
    newFile: 'Nuevo',
    chooseFile: 'Elegir archivo',
    chooseOther: 'Elegir otro archivo',
    fileRules:
      'PDF, JPEG, PNG o WebP. Máximo 5 MB. Al guardar, el archivo actual se borra y se reemplaza por el nuevo.',
    save: 'Guardar',
    saving: 'Guardando…',
    removeMine: 'Quitar mi lista',
    errors: {
      link: 'El enlace debe empezar por https://',
      noFile: 'Elige un archivo.',
      fileType: 'Solo se admiten PDF, JPEG, PNG o WebP.',
      fileSize: 'El archivo pesa más de 5 MB.',
    },
  },

  organizer: {
    title: 'Tu sala',
    inviteTitle: 'Enlace de invitación',
    inviteHint: 'Compártelo con el grupo para que entren.',
    edit: 'Editar',
    editTitle: 'Editar la sala',
    save: 'Guardar',
    saving: 'Guardando…',
    pairRule: 'Regla de pareja',
    pairRuleOn: 'Activa: las parejas no se regalarán entre sí.',
    pairRuleOff: 'Desactivada: las parejas pueden regalarse entre sí.',
    lockedNote:
      'La regla y las parejas solo se pueden cambiar antes del primer sorteo.',
    markPair: 'Marcar pareja',
    markPairHint:
      'Elige a dos personas sin pareja. Con la regla activa, no se tocarán en el sorteo.',
    alreadyPaired: 'Ya tiene pareja',
    chosen: (n: number) => `${n} de 2 elegidas`,
    confirmPair: 'Confirmar pareja',
    undoPair: 'Deshacer pareja',
    actions: (name: string) => `Acciones de ${name}`,
    actionsTooltip: 'Acciones',
    expel: 'Expulsar de la sala',
    expelHint: 'Solo disponible antes del primer sorteo.',
    expelTitle: (name: string) => `¿Expulsar a ${name}?`,
    expelBody:
      'Se borrarán su lista de deseos y su pareja, y su enlace dejará de funcionar.',
    expelConfirm: 'Expulsar',
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
    ALREADY_PAIRED: 'Alguna de esas personas ya tiene pareja.',
    FILE_TOO_LARGE: 'El archivo pesa más de 5 MB.',
    UNSUPPORTED_FILE_TYPE: 'Solo se admiten PDF, JPEG, PNG o WebP.',
    FILE_REQUIRED: 'Elige un archivo.',
    default: 'Algo ha fallado. Inténtalo de nuevo.',
  } as Record<string, string>,
} as const

export function errorText(code: string, serverMessage?: string): string {
  if (code === 'VALIDATION_ERROR' && serverMessage) return serverMessage
  return t.errors[code] ?? t.errors.default
}
