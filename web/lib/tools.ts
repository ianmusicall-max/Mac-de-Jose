import type { Media } from './media';

/**
 * Every tool page is one entry here.
 *
 * Sites in this category tend to hand-write one page per tool, which is how they
 * end up with thirty near-identical files that drift apart. Here the catalogue is
 * the single source of truth: it drives the navigation, the cross-links, each
 * page's metadata and the copy on it, so adding a tool means adding an entry.
 */
export type Tool = {
  /** URL path. The hub lives at '/'. */
  path: string;
  /** Short label for navigation and cross-links. */
  nav: string;
  /** Which format the downloader starts on. */
  kind: Media['kind'];
  platform?: 'tiktok' | 'youtube' | 'facebook';
  formats?: readonly Media['kind'][];
  /** <title> and meta description. */
  title: string;
  description: string;
  /** Split headline: the accent half is coloured. */
  heading: string;
  headingAccent: string;
  intro: string;
  placeholder: string;
  /** The three numbered steps. */
  steps: { heading: string; body: string }[];
  faq: { question: string; answer: string }[];
};

const PASTE_STEP = {
  heading: 'Pega el enlace',
  body: 'Cópialo desde Instagram con «Copiar enlace» y pégalo en el campo de arriba.',
};

const SCAN_STEP = {
  heading: 'Revisamos la publicación',
  body: 'Leemos lo que la publicación expone públicamente y te mostramos lo que hay, separado por formato.',
};

/** Questions worth answering honestly, reused where they apply to every tool. */
const COMMON_FAQ = [
  {
    question: '¿Hace falta iniciar sesión o dar mi contraseña?',
    answer:
      'No, y no deberías dárnosla a nosotros ni a ninguna herramienta parecida. Solo trabajamos con lo que una publicación muestra públicamente, sin cuenta ni cookies de sesión.',
  },
  {
    question: '¿Funciona con cuentas privadas o con historias?',
    answer:
      'No. Una publicación privada, una historia o una cuenta que tengas que seguir solo son accesibles con una sesión iniciada, y aquí no hay ninguna. Si el enlace no es público, no vamos a poder leerlo.',
  },
  {
    question: '¿Guardáis los archivos que descargo?',
    answer:
      'El archivo se guarda temporalmente en almacenamiento privado para poder servírtelo de nuevo sin volver a consultar el origen. No se publica en ningún sitio ni se asocia a una cuenta tuya, porque no hay cuentas.',
  },
  {
    question: '¿Puedo descargar cualquier cosa que encuentre?',
    answer:
      'Poder y deber no son lo mismo. El contenido sigue siendo de quien lo publicó: guarda lo tuyo, o aquello para lo que tengas permiso, y respeta los términos de Instagram y los derechos de autor.',
  },
  {
    question: 'Me dice que el origen está limitando las consultas, ¿qué hago?',
    answer:
      'Instagram corta el paso cuando recibe muchas peticiones seguidas. Verás una cuenta atrás: espera a que termine y vuelve a intentarlo. Mientras tanto, lo que ya se descargó una vez sigue disponible.',
  },
];

const INSTAGRAM: Tool = {
  path: '/instagram',
  nav: 'Instagram',
  kind: 'video',
  title: 'VideoVault · Descargar vídeo, audio y fotos de Instagram',
  description:
    'Pega el enlace de una publicación o reel público de Instagram y guarda el vídeo, el audio o las imágenes. Sin cuentas y sin instalar nada.',
  heading: 'Guarda lo que te inspira',
  headingAccent: 'de Instagram',
  intro:
    'Pega el enlace de una publicación o reel público y elige qué quieres guardar: el vídeo, solo el audio o las imágenes.',
  placeholder: 'https://www.instagram.com/reel/...',
  steps: [
    PASTE_STEP,
    SCAN_STEP,
    {
      heading: 'Elige y descarga',
      body: 'Vídeo, audio o imagen: cambias de formato sin repetir la búsqueda y guardas el archivo en tu dispositivo.',
    },
  ],
  faq: COMMON_FAQ,
};

export const TOOLS: Tool[] = [
  INSTAGRAM,
  {
    path: '/tiktok',
    nav: 'TikTok',
    kind: 'video',
    platform: 'tiktok',
    formats: ['video', 'audio'],
    title: 'Descargar vídeos de TikTok en MP4 · VideoVault',
    description: 'Pega el enlace de un vídeo público de TikTok y descárgalo en MP4 desde tu navegador.',
    heading: 'Descargar vídeos',
    headingAccent: 'de TikTok en MP4',
    intro: 'Pega un enlace público de TikTok y elige vídeo MP4 o audio M4A.',
    placeholder: 'https://www.tiktok.com/@usuario/video/…',
    steps: [
      { heading: 'Copia el enlace', body: 'En TikTok, toca «Compartir» y luego «Copiar enlace».' },
      { heading: 'Busca el vídeo', body: 'Pega el enlace completo o el enlace corto que te dio TikTok.' },
      { heading: 'Descarga el MP4', body: 'Cuando aparezca el vídeo, pulsa «Descargar» para guardarlo.' },
    ],
    faq: [
      {
        question: '¿Qué calidad tiene el vídeo?',
        answer: 'La calidad depende de las versiones que TikTok entregue para ese enlace. Guardamos el MP4 tal como lo recibimos.',
      },
      {
        question: '¿El vídeo conserva la marca de agua?',
        answer: 'Depende del archivo disponible. Si el vídeo que entrega TikTok lleva una marca de agua, se conserva.',
      },
      {
        question: '¿Qué enlaces funcionan?',
        answer: 'Puedes pegar la dirección completa o un enlace corto de un vídeo público. Si TikTok pide iniciar sesión, el vídeo no estará disponible aquí.',
      },
    ],
  },
  {
    path: '/facebook',
    nav: 'Facebook',
    kind: 'video',
    platform: 'facebook',
    formats: ['video', 'audio', 'image'],
    title: 'Descargar vídeos de Facebook en MP4 · VideoVault',
    description: 'Busca y descarga vídeos y reels públicos de Facebook en MP4.',
    heading: 'Descargar vídeos',
    headingAccent: 'de Facebook en MP4',
    intro: 'Pega un enlace público de Facebook y elige vídeo MP4, audio M4A o imagen.',
    placeholder: 'https://www.facebook.com/reel/…',
    steps: [
      { heading: 'Copia el enlace', body: 'En Facebook, abre el vídeo o reel y elige «Compartir» y «Copiar enlace».' },
      { heading: 'Busca el vídeo', body: 'Pega el enlace de Facebook en el campo de arriba y pulsa «Buscar vídeo».' },
      { heading: 'Descarga el MP4', body: 'Elige un vídeo, su audio o la imagen que Facebook publique para ese enlace.' },
    ],
    faq: [
      { question: '¿Qué enlaces de Facebook funcionan?', answer: 'Puedes usar enlaces de vídeos y reels que se puedan abrir sin iniciar sesión, incluidos los enlaces cortos de Facebook.' },
      { question: '¿Qué imagen puedo descargar?', answer: 'Si Facebook la publica, verás la foto enlazada o la portada del vídeo.' },
      { question: '¿Cuándo aparece la opción HD?', answer: 'Verás HD cuando Facebook ofrezca un MP4 en esa calidad. Las opciones dependen de cada vídeo.' },
      { question: '¿Dónde encuentro el archivo?', answer: 'Revisa la carpeta Descargas o el historial de descargas de tu navegador.' },
    ],
  },
  {
    path: '/youtube',
    nav: 'YouTube',
    kind: 'video',
    platform: 'youtube',
    formats: ['video', 'audio'],
    title: 'Descargar vídeos de YouTube en MP4 · VideoVault',
    description: 'Comprueba si un vídeo público de YouTube está disponible como archivo MP4 directo.',
    heading: 'Descargar vídeos',
    headingAccent: 'de YouTube en MP4',
    intro: 'Pega un enlace de YouTube y elige vídeo MP4 o audio M4A.',
    placeholder: 'https://www.youtube.com/watch?v=…',
    steps: [
      { heading: 'Copia el enlace', body: 'Copia la dirección de un vídeo o Short de YouTube.' },
      { heading: 'Busca el vídeo', body: 'Pega el enlace y comprueba si YouTube ofrece un MP4 directo.' },
      { heading: 'Guarda el MP4', body: 'Si aparece el vídeo, pulsa «Descargar vídeo» o «Guardar en Fotos» en iPhone.' },
    ],
    faq: [
      { question: '¿Por qué algunos vídeos no se pueden descargar aquí?', answer: 'La herramienta necesita que YouTube entregue un MP4 directo y accesible. Si el vídeo es tuyo, puedes exportarlo desde YouTube Studio.' },
    ],
  },
  {
    path: '/reel',
    nav: 'Reels',
    kind: 'video',
    title: 'Descargar Reels de Instagram · VideoVault',
    description:
      'Guarda un reel público de Instagram como archivo de vídeo. Sin iniciar sesión y sin instalar nada.',
    heading: 'Descargar reels',
    headingAccent: 'de Instagram',
    intro:
      'Pega el enlace de un reel público y lo guardas como archivo de vídeo en tu móvil u ordenador.',
    placeholder: 'https://www.instagram.com/reel/...',
    steps: [
      PASTE_STEP,
      SCAN_STEP,
      {
        heading: 'Guarda el reel',
        body: 'Descargas el vídeo tal cual lo publica Instagram, sin recomprimir ni añadir marcas de agua.',
      },
    ],
    faq: [
      {
        question: '¿Se descarga con la música original?',
        answer:
          'Sí: el archivo es el vídeo que publica Instagram, con su pista de audio incluida. Si solo quieres la música, usa la herramienta de audio.',
      },
      ...COMMON_FAQ,
    ],
  },
  {
    path: '/video',
    nav: 'Vídeo',
    kind: 'video',
    title: 'Descargar vídeos de Instagram · VideoVault',
    description:
      'Guarda el vídeo de una publicación pública de Instagram en tu dispositivo, sin cuenta ni instalación.',
    heading: 'Descargar vídeos',
    headingAccent: 'de publicaciones',
    intro:
      'Para publicaciones de feed con vídeo. Pega el enlace y te mostramos lo que se puede guardar.',
    placeholder: 'https://www.instagram.com/p/...',
    steps: [
      PASTE_STEP,
      SCAN_STEP,
      {
        heading: 'Guarda el vídeo',
        body: 'Si la publicación es un carrusel con varios vídeos, aparecerán todos y eliges cuál quieres.',
      },
    ],
    faq: [
      {
        question: '¿Y si la publicación tiene varios vídeos?',
        answer:
          'Un carrusel muestra cada elemento por separado, numerado, para que descargues solo el que te interesa.',
      },
      ...COMMON_FAQ,
    ],
  },
  {
    path: '/foto',
    nav: 'Fotos',
    kind: 'image',
    title: 'Descargar fotos de Instagram · VideoVault',
    description:
      'Guarda las imágenes de una publicación pública de Instagram, una a una o el carrusel completo en ZIP.',
    heading: 'Descargar fotos',
    headingAccent: 'y carruseles',
    intro:
      'Pega el enlace de una publicación pública y guarda sus imágenes, sueltas o todas juntas en un ZIP.',
    placeholder: 'https://www.instagram.com/p/...',
    steps: [
      PASTE_STEP,
      SCAN_STEP,
      {
        heading: 'Guarda las imágenes',
        body: 'Descarga una imagen concreta, o el carrusel entero en un ZIP de hasta 100 MB.',
      },
    ],
    faq: [
      {
        question: '¿Puedo bajar el carrusel entero de una vez?',
        answer:
          'Sí: cuando hay más de una imagen aparece el botón para descargarlas todas en un ZIP. Si el álbum pasa de 100 MB tendrás que bajarlas por separado.',
      },
      {
        question: 'Me sale una imagen que no es del carrusel, ¿qué es?',
        answer:
          'Es la portada que la página publica para las vistas previas de enlaces. La marcamos como portada para que no la confundas con una foto del álbum.',
      },
      ...COMMON_FAQ,
    ],
  },
  {
    path: '/audio',
    nav: 'Audio',
    kind: 'audio',
    title: 'Extraer el audio de un vídeo de Instagram (M4A) · VideoVault',
    description:
      'Saca la pista de audio de un vídeo público de Instagram en M4A, sin recomprimir y sin perder calidad.',
    heading: 'Extraer el audio',
    headingAccent: 'de un vídeo',
    intro:
      'Pega el enlace de un vídeo público y guarda solo su pista de sonido en M4A, tal cual viene, sin recomprimir.',
    placeholder: 'https://www.instagram.com/reel/...',
    steps: [
      PASTE_STEP,
      {
        heading: 'Elegimos la pista',
        body: 'Buscamos audio publicado por separado y, si no lo hay, la pista AAC del propio vídeo.',
      },
      {
        heading: 'Guarda el M4A',
        body: 'La pista se copia sin recomprimir, así que suena igual que en el vídeo original.',
      },
    ],
    faq: [
      {
        question: '¿Pierde calidad al extraer el audio?',
        answer:
          'No. La pista AAC se copia tal cual del vídeo, no se vuelve a codificar, así que suena exactamente igual que el original.',
      },
      {
        question: '¿Por qué es M4A y no MP3?',
        answer:
          'Porque el audio de un vídeo de Instagram ya viene en AAC, y M4A es su envoltorio natural. Convertirlo a MP3 obligaría a recomprimir y a perder calidad sin ganar nada.',
      },
      {
        question: '¿Hay un límite de tamaño?',
        answer:
          'Sí, 32 MB por vídeo. Es de sobra para un reel; un vídeo muy largo puede quedarse fuera.',
      },
      ...COMMON_FAQ,
    ],
  },
];

export function toolByPath(path: string): Tool | undefined {
  return TOOLS.find(tool => tool.path === path);
}

/** The other tools, for the cross-link section at the foot of each page. */
export function otherTools(path: string): Tool[] {
  return TOOLS.filter(tool => tool.path !== path);
}
