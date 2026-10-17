// Todos los textos visibles de la app, en un solo sitio (solo español).
// Se irán añadiendo por pantalla en cada fase, copiados de los mockups.
export const t = {
  appName: 'Amigo Invisible',
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
  status: {
    waking: {
      title: 'Despertando el servidor',
      body: 'Puede tardar hasta un minuto la primera vez.',
    },
  },
} as const
