import type { Media } from './media';
import type { LocalizedText } from './i18n/locale';

/**
 * Every tool page is one entry here.
 *
 * Sites in this category tend to hand-write one page per tool, which is how they
 * end up with thirty near-identical files that drift apart. Here the catalogue is
 * the single source of truth: it drives the navigation, the cross-links, each
 * page's metadata and the copy on it, so adding a tool means adding an entry.
 *
 * Every text field is bilingual-plus (en/es/pt). `title`/`description` back the
 * page's static <title>/meta description, which stay English-only (`.en`) per
 * app/*\/page.tsx; everything else is picked per the visitor's locale at render
 * time by the components that consume it.
 */
export type Tool = {
  /** URL path. The hub lives at '/'. */
  path: string;
  /** Short label for navigation and cross-links. */
  nav: LocalizedText;
  /** Which format the downloader starts on. */
  kind: Media['kind'];
  platform?: 'tiktok' | 'youtube' | 'facebook';
  formats?: readonly Media['kind'][];
  /** <title> and meta description. English-only: picked via `.en`. */
  title: LocalizedText;
  description: LocalizedText;
  /** Split headline: the accent half is coloured. */
  heading: LocalizedText;
  headingAccent: LocalizedText;
  intro: LocalizedText;
  placeholder: string;
  /** The three numbered steps. */
  steps: { heading: LocalizedText; body: LocalizedText }[];
  faq: { question: LocalizedText; answer: LocalizedText }[];
};

const PASTE_STEP = {
  heading: { en: 'Paste the link', es: 'Pega el enlace', pt: 'Cole o link' },
  body: {
    en: 'Copy it from Instagram with "Copy link" and paste it in the field above.',
    es: 'Cópialo desde Instagram con «Copiar enlace» y pégalo en el campo de arriba.',
    pt: 'Copie-o do Instagram com "Copiar link" e cole-o no campo acima.',
  },
};

const SCAN_STEP = {
  heading: { en: 'We check the post', es: 'Revisamos la publicación', pt: 'Verificamos a publicação' },
  body: {
    en: "We read what the post exposes publicly and show you what's there, split by format.",
    es: 'Leemos lo que la publicación expone públicamente y te mostramos lo que hay, separado por formato.',
    pt: 'Lemos o que a publicação expõe publicamente e mostramos o que há, separado por formato.',
  },
};

/** Questions worth answering honestly, reused where they apply to every tool. */
const COMMON_FAQ = [
  {
    question: {
      en: 'Do I need to sign in or give my password?',
      es: '¿Hace falta iniciar sesión o dar mi contraseña?',
      pt: 'Preciso fazer login ou dar minha senha?',
    },
    answer: {
      en: "No, and you shouldn't give it to us or to any similar tool. We only work with what a post shows publicly, no account or session cookies.",
      es: 'No, y no deberías dárnosla a nosotros ni a ninguna herramienta parecida. Solo trabajamos con lo que una publicación muestra públicamente, sin cuenta ni cookies de sesión.',
      pt: 'Não, e você não deveria dá-la a nós nem a nenhuma ferramenta parecida. Só trabalhamos com o que uma publicação mostra publicamente, sem conta nem cookies de sessão.',
    },
  },
  {
    question: {
      en: 'Does it work with private accounts or stories?',
      es: '¿Funciona con cuentas privadas o con historias?',
      pt: 'Funciona com contas privadas ou com stories?',
    },
    answer: {
      en: "No. A private post, a story, or an account you'd need to follow are only reachable with a signed-in session, and there's none here. If the link isn't public, we won't be able to read it.",
      es: 'No. Una publicación privada, una historia o una cuenta que tengas que seguir solo son accesibles con una sesión iniciada, y aquí no hay ninguna. Si el enlace no es público, no vamos a poder leerlo.',
      pt: 'Não. Uma publicação privada, um story ou uma conta que você precise seguir só são acessíveis com uma sessão iniciada, e aqui não há nenhuma. Se o link não for público, não vamos conseguir lê-lo.',
    },
  },
  {
    question: {
      en: 'Do you keep the files I download?',
      es: '¿Guardáis los archivos que descargo?',
      pt: 'Vocês guardam os arquivos que eu baixo?',
    },
    answer: {
      en: "The file is saved temporarily in private storage so we can serve it to you again without checking the source again. It's never published anywhere nor tied to an account of yours, because there are no accounts.",
      es: 'El archivo se guarda temporalmente en almacenamiento privado para poder servírtelo de nuevo sin volver a consultar el origen. No se publica en ningún sitio ni se asocia a una cuenta tuya, porque no hay cuentas.',
      pt: 'O arquivo é salvo temporariamente em armazenamento privado para poder ser servido a você de novo sem consultar a origem outra vez. Não é publicado em nenhum lugar nem associado a uma conta sua, porque não há contas.',
    },
  },
  {
    question: {
      en: 'Can I download anything I find?',
      es: '¿Puedo descargar cualquier cosa que encuentre?',
      pt: 'Posso baixar qualquer coisa que encontrar?',
    },
    answer: {
      en: "Being able to and being allowed to aren't the same thing. The content still belongs to whoever posted it: save your own material, or material you have permission to use, and respect Instagram's terms and copyright.",
      es: 'Poder y deber no son lo mismo. El contenido sigue siendo de quien lo publicó: guarda lo tuyo, o aquello para lo que tengas permiso, y respeta los términos de Instagram y los derechos de autor.',
      pt: 'Poder e dever não são a mesma coisa. O conteúdo continua sendo de quem o publicou: salve o que é seu, ou aquilo para o qual tenha permissão, e respeite os termos do Instagram e os direitos autorais.',
    },
  },
  {
    question: {
      en: "It says the source is rate-limiting, what do I do?",
      es: 'Me dice que el origen está limitando las consultas, ¿qué hago?',
      pt: 'Aparece que a origem está limitando as consultas, o que eu faço?',
    },
    answer: {
      en: "Instagram cuts off access when it gets too many requests in a row. You'll see a countdown: wait for it to end and try again. Meanwhile, whatever was already downloaded once stays available.",
      es: 'Instagram corta el paso cuando recibe muchas peticiones seguidas. Verás una cuenta atrás: espera a que termine y vuelve a intentarlo. Mientras tanto, lo que ya se descargó una vez sigue disponible.',
      pt: 'O Instagram corta o acesso quando recebe muitas requisições seguidas. Você verá uma contagem regressiva: espere ela terminar e tente de novo. Enquanto isso, o que já foi baixado uma vez continua disponível.',
    },
  },
];

const INSTAGRAM: Tool = {
  path: '/instagram',
  nav: { en: 'Instagram', es: 'Instagram', pt: 'Instagram' },
  kind: 'video',
  title: {
    en: 'SnapReel · Download Instagram video, audio and photos',
    es: 'SnapReel · Descargar vídeo, audio y fotos de Instagram',
    pt: 'SnapReel · Baixar vídeo, áudio e fotos do Instagram',
  },
  description: {
    en: "Paste the link of a public Instagram post or reel and save the video, the audio or the images. No accounts and nothing to install.",
    es: 'Pega el enlace de una publicación o reel público de Instagram y guarda el vídeo, el audio o las imágenes. Sin cuentas y sin instalar nada.',
    pt: 'Cole o link de uma publicação ou reel público do Instagram e salve o vídeo, o áudio ou as imagens. Sem contas e sem instalar nada.',
  },
  heading: { en: 'Save what inspires you', es: 'Guarda lo que te inspira', pt: 'Salve o que te inspira' },
  headingAccent: { en: 'from Instagram', es: 'de Instagram', pt: 'do Instagram' },
  intro: {
    en: 'Paste the link of a public post or reel and choose what to save: the video, just the audio, or the images.',
    es: 'Pega el enlace de una publicación o reel público y elige qué quieres guardar: el vídeo, solo el audio o las imágenes.',
    pt: 'Cole o link de uma publicação ou reel público e escolha o que quer salvar: o vídeo, só o áudio ou as imagens.',
  },
  placeholder: 'https://www.instagram.com/reel/...',
  steps: [
    PASTE_STEP,
    SCAN_STEP,
    {
      heading: { en: 'Choose and download', es: 'Elige y descarga', pt: 'Escolha e baixe' },
      body: {
        en: "Video, audio or image: switch formats without repeating the search, and save the file to your device.",
        es: 'Vídeo, audio o imagen: cambias de formato sin repetir la búsqueda y guardas el archivo en tu dispositivo.',
        pt: 'Vídeo, áudio ou imagem: você troca de formato sem repetir a busca e salva o arquivo no seu dispositivo.',
      },
    },
  ],
  faq: COMMON_FAQ,
};

export const TOOLS: Tool[] = [
  INSTAGRAM,
  {
    path: '/tiktok',
    nav: { en: 'TikTok', es: 'TikTok', pt: 'TikTok' },
    kind: 'video',
    platform: 'tiktok',
    formats: ['video', 'audio'],
    title: {
      en: 'Download TikTok videos in MP4 · SnapReel',
      es: 'Descargar vídeos de TikTok en MP4 · SnapReel',
      pt: 'Baixar vídeos do TikTok em MP4 · SnapReel',
    },
    description: {
      en: 'Paste the link of a public TikTok video and download it in MP4 from your browser.',
      es: 'Pega el enlace de un vídeo público de TikTok y descárgalo en MP4 desde tu navegador.',
      pt: 'Cole o link de um vídeo público do TikTok e baixe-o em MP4 direto do seu navegador.',
    },
    heading: { en: 'Download videos', es: 'Descargar vídeos', pt: 'Baixar vídeos' },
    headingAccent: { en: 'from TikTok in MP4', es: 'de TikTok en MP4', pt: 'do TikTok em MP4' },
    intro: {
      en: 'Paste a public TikTok link and choose MP4 video or M4A audio.',
      es: 'Pega un enlace público de TikTok y elige vídeo MP4 o audio M4A.',
      pt: 'Cole um link público do TikTok e escolha vídeo MP4 ou áudio M4A.',
    },
    placeholder: 'https://www.tiktok.com/@usuario/video/…',
    steps: [
      {
        heading: { en: 'Copy the link', es: 'Copia el enlace', pt: 'Copie o link' },
        body: {
          en: 'In TikTok, tap "Share" and then "Copy link".',
          es: 'En TikTok, toca «Compartir» y luego «Copiar enlace».',
          pt: 'No TikTok, toque em "Compartilhar" e depois em "Copiar link".',
        },
      },
      {
        heading: { en: 'Find the video', es: 'Busca el vídeo', pt: 'Encontre o vídeo' },
        body: {
          en: 'Paste the full link or the short link TikTok gave you.',
          es: 'Pega el enlace completo o el enlace corto que te dio TikTok.',
          pt: 'Cole o link completo ou o link curto que o TikTok te deu.',
        },
      },
      {
        heading: { en: 'Download the MP4', es: 'Descarga el MP4', pt: 'Baixe o MP4' },
        body: {
          en: 'When the video shows up, tap "Download" to save it.',
          es: 'Cuando aparezca el vídeo, pulsa «Descargar» para guardarlo.',
          pt: 'Quando o vídeo aparecer, toque em "Baixar" para salvá-lo.',
        },
      },
    ],
    faq: [
      {
        question: { en: 'What quality does the video have?', es: '¿Qué calidad tiene el vídeo?', pt: 'Qual é a qualidade do vídeo?' },
        answer: {
          en: 'The quality depends on the versions TikTok delivers for that link. We save the MP4 exactly as we receive it.',
          es: 'La calidad depende de las versiones que TikTok entregue para ese enlace. Guardamos el MP4 tal como lo recibimos.',
          pt: 'A qualidade depende das versões que o TikTok entrega para esse link. Salvamos o MP4 exatamente como o recebemos.',
        },
      },
      {
        question: { en: 'Does the video keep the watermark?', es: '¿El vídeo conserva la marca de agua?', pt: 'O vídeo mantém a marca d’água?' },
        answer: {
          en: 'It depends on the file available. If the video TikTok delivers has a watermark, it stays.',
          es: 'Depende del archivo disponible. Si el vídeo que entrega TikTok lleva una marca de agua, se conserva.',
          pt: 'Depende do arquivo disponível. Se o vídeo entregue pelo TikTok tiver marca d’água, ela é mantida.',
        },
      },
      {
        question: { en: 'Which links work?', es: '¿Qué enlaces funcionan?', pt: 'Quais links funcionam?' },
        answer: {
          en: "You can paste the full address or a short link to a public video. If TikTok asks for sign-in, the video won't be available here.",
          es: 'Puedes pegar la dirección completa o un enlace corto de un vídeo público. Si TikTok pide iniciar sesión, el vídeo no estará disponible aquí.',
          pt: 'Você pode colar o endereço completo ou um link curto de um vídeo público. Se o TikTok pedir login, o vídeo não vai estar disponível aqui.',
        },
      },
    ],
  },
  {
    path: '/facebook',
    nav: { en: 'Facebook', es: 'Facebook', pt: 'Facebook' },
    kind: 'video',
    platform: 'facebook',
    formats: ['video', 'audio', 'image'],
    title: {
      en: 'Download Facebook videos in MP4 · SnapReel',
      es: 'Descargar vídeos de Facebook en MP4 · SnapReel',
      pt: 'Baixar vídeos do Facebook em MP4 · SnapReel',
    },
    description: {
      en: 'Find and download public Facebook videos and reels in MP4.',
      es: 'Busca y descarga vídeos y reels públicos de Facebook en MP4.',
      pt: 'Encontre e baixe vídeos e reels públicos do Facebook em MP4.',
    },
    heading: { en: 'Download videos', es: 'Descargar vídeos', pt: 'Baixar vídeos' },
    headingAccent: { en: 'from Facebook in MP4', es: 'de Facebook en MP4', pt: 'do Facebook em MP4' },
    intro: {
      en: 'Paste a public Facebook link and choose MP4 video, M4A audio, or image.',
      es: 'Pega un enlace público de Facebook y elige vídeo MP4, audio M4A o imagen.',
      pt: 'Cole um link público do Facebook e escolha vídeo MP4, áudio M4A ou imagem.',
    },
    placeholder: 'https://www.facebook.com/reel/…',
    steps: [
      {
        heading: { en: 'Copy the link', es: 'Copia el enlace', pt: 'Copie o link' },
        body: {
          en: 'On Facebook, open the video or reel and choose "Share" and "Copy link".',
          es: 'En Facebook, abre el vídeo o reel y elige «Compartir» y «Copiar enlace».',
          pt: 'No Facebook, abra o vídeo ou reel e escolha "Compartilhar" e "Copiar link".',
        },
      },
      {
        heading: { en: 'Find the video', es: 'Busca el vídeo', pt: 'Encontre o vídeo' },
        body: {
          en: 'Paste the Facebook link in the field above and tap "Find video".',
          es: 'Pega el enlace de Facebook en el campo de arriba y pulsa «Buscar vídeo».',
          pt: 'Cole o link do Facebook no campo acima e toque em "Buscar vídeo".',
        },
      },
      {
        heading: { en: 'Download the MP4', es: 'Descarga el MP4', pt: 'Baixe o MP4' },
        body: {
          en: 'Choose a video, its audio, or the image Facebook publishes for that link.',
          es: 'Elige un vídeo, su audio o la imagen que Facebook publique para ese enlace.',
          pt: 'Escolha um vídeo, o áudio dele ou a imagem que o Facebook publica para esse link.',
        },
      },
    ],
    faq: [
      {
        question: { en: 'Which Facebook links work?', es: '¿Qué enlaces de Facebook funcionan?', pt: 'Quais links do Facebook funcionam?' },
        answer: {
          en: 'You can use video and reel links that open without signing in, including short Facebook links.',
          es: 'Puedes usar enlaces de vídeos y reels que se puedan abrir sin iniciar sesión, incluidos los enlaces cortos de Facebook.',
          pt: 'Você pode usar links de vídeos e reels que abram sem fazer login, incluindo os links curtos do Facebook.',
        },
      },
      {
        question: { en: 'Which image can I download?', es: '¿Qué imagen puedo descargar?', pt: 'Qual imagem posso baixar?' },
        answer: {
          en: "If Facebook publishes it, you'll see the linked photo or the video's cover.",
          es: 'Si Facebook la publica, verás la foto enlazada o la portada del vídeo.',
          pt: 'Se o Facebook a publica, você verá a foto vinculada ou a capa do vídeo.',
        },
      },
      {
        question: { en: 'When does the HD option show up?', es: '¿Cuándo aparece la opción HD?', pt: 'Quando aparece a opção HD?' },
        answer: {
          en: "You'll see HD when Facebook offers an MP4 in that quality. The options depend on each video.",
          es: 'Verás HD cuando Facebook ofrezca un MP4 en esa calidad. Las opciones dependen de cada vídeo.',
          pt: 'Você vai ver HD quando o Facebook oferecer um MP4 nessa qualidade. As opções dependem de cada vídeo.',
        },
      },
      {
        question: { en: 'Where do I find the file?', es: '¿Dónde encuentro el archivo?', pt: 'Onde encontro o arquivo?' },
        answer: {
          en: "Check your browser's Downloads folder or download history.",
          es: 'Revisa la carpeta Descargas o el historial de descargas de tu navegador.',
          pt: 'Verifique a pasta Downloads ou o histórico de downloads do seu navegador.',
        },
      },
    ],
  },
  {
    path: '/youtube',
    nav: { en: 'YouTube', es: 'YouTube', pt: 'YouTube' },
    kind: 'video',
    platform: 'youtube',
    formats: ['video', 'audio'],
    title: {
      en: 'Download YouTube videos in MP4 · SnapReel',
      es: 'Descargar vídeos de YouTube en MP4 · SnapReel',
      pt: 'Baixar vídeos do YouTube em MP4 · SnapReel',
    },
    description: {
      en: 'Check whether a public YouTube video is available as a direct MP4 file.',
      es: 'Comprueba si un vídeo público de YouTube está disponible como archivo MP4 directo.',
      pt: 'Veja se um vídeo público do YouTube está disponível como arquivo MP4 direto.',
    },
    heading: { en: 'Download videos', es: 'Descargar vídeos', pt: 'Baixar vídeos' },
    headingAccent: { en: 'from YouTube in MP4', es: 'de YouTube en MP4', pt: 'do YouTube em MP4' },
    intro: {
      en: 'Paste a YouTube link and choose MP4 video or M4A audio.',
      es: 'Pega un enlace de YouTube y elige vídeo MP4 o audio M4A.',
      pt: 'Cole um link do YouTube e escolha vídeo MP4 ou áudio M4A.',
    },
    placeholder: 'https://www.youtube.com/watch?v=…',
    steps: [
      {
        heading: { en: 'Copy the link', es: 'Copia el enlace', pt: 'Copie o link' },
        body: {
          en: 'Copy the address of a YouTube video or Short.',
          es: 'Copia la dirección de un vídeo o Short de YouTube.',
          pt: 'Copie o endereço de um vídeo ou Short do YouTube.',
        },
      },
      {
        heading: { en: 'Find the video', es: 'Busca el vídeo', pt: 'Encontre o vídeo' },
        body: {
          en: 'Paste the link and check whether YouTube offers a direct MP4.',
          es: 'Pega el enlace y comprueba si YouTube ofrece un MP4 directo.',
          pt: 'Cole o link e veja se o YouTube oferece um MP4 direto.',
        },
      },
      {
        heading: { en: 'Save the MP4', es: 'Guarda el MP4', pt: 'Salve o MP4' },
        body: {
          en: 'If the video shows up, tap "Download video" or "Save to Photos" on iPhone.',
          es: 'Si aparece el vídeo, pulsa «Descargar vídeo» o «Guardar en Fotos» en iPhone.',
          pt: 'Se o vídeo aparecer, toque em "Baixar vídeo" ou "Salvar em Fotos" no iPhone.',
        },
      },
    ],
    faq: [
      {
        question: {
          en: "Why can't some videos be downloaded here?",
          es: '¿Por qué algunos vídeos no se pueden descargar aquí?',
          pt: 'Por que alguns vídeos não podem ser baixados aqui?',
        },
        answer: {
          en: 'This tool needs YouTube to deliver a direct, accessible MP4. If the video is yours, you can export it from YouTube Studio.',
          es: 'La herramienta necesita que YouTube entregue un MP4 directo y accesible. Si el vídeo es tuyo, puedes exportarlo desde YouTube Studio.',
          pt: 'A ferramenta precisa que o YouTube entregue um MP4 direto e acessível. Se o vídeo é seu, você pode exportá-lo pelo YouTube Studio.',
        },
      },
    ],
  },
  {
    path: '/reel',
    nav: { en: 'Reels', es: 'Reels', pt: 'Reels' },
    kind: 'video',
    title: {
      en: 'Download Instagram Reels · SnapReel',
      es: 'Descargar Reels de Instagram · SnapReel',
      pt: 'Baixar Reels do Instagram · SnapReel',
    },
    description: {
      en: 'Save a public Instagram reel as a video file. No sign-in, nothing to install.',
      es: 'Guarda un reel público de Instagram como archivo de vídeo. Sin iniciar sesión y sin instalar nada.',
      pt: 'Salve um reel público do Instagram como arquivo de vídeo. Sem login e sem instalar nada.',
    },
    heading: { en: 'Download reels', es: 'Descargar reels', pt: 'Baixar reels' },
    headingAccent: { en: 'from Instagram', es: 'de Instagram', pt: 'do Instagram' },
    intro: {
      en: 'Paste the link of a public reel and save it as a video file on your phone or computer.',
      es: 'Pega el enlace de un reel público y lo guardas como archivo de vídeo en tu móvil u ordenador.',
      pt: 'Cole o link de um reel público e salve-o como arquivo de vídeo no seu celular ou computador.',
    },
    placeholder: 'https://www.instagram.com/reel/...',
    steps: [
      PASTE_STEP,
      SCAN_STEP,
      {
        heading: { en: 'Save the reel', es: 'Guarda el reel', pt: 'Salve o reel' },
        body: {
          en: 'You download the video exactly as Instagram publishes it, with no recompression or added watermarks.',
          es: 'Descargas el vídeo tal cual lo publica Instagram, sin recomprimir ni añadir marcas de agua.',
          pt: 'Você baixa o vídeo exatamente como o Instagram publica, sem recompressão nem marcas d’água adicionadas.',
        },
      },
    ],
    faq: [
      {
        question: {
          en: 'Does it download with the original music?',
          es: '¿Se descarga con la música original?',
          pt: 'Ele baixa com a música original?',
        },
        answer: {
          en: "Yes: the file is the video Instagram publishes, audio track included. If you only want the music, use the audio tool.",
          es: 'Sí: el archivo es el vídeo que publica Instagram, con su pista de audio incluida. Si solo quieres la música, usa la herramienta de audio.',
          pt: 'Sim: o arquivo é o vídeo que o Instagram publica, com a trilha de áudio incluída. Se você só quer a música, use a ferramenta de áudio.',
        },
      },
      ...COMMON_FAQ,
    ],
  },
  {
    path: '/video',
    nav: { en: 'Video', es: 'Vídeo', pt: 'Vídeo' },
    kind: 'video',
    title: {
      en: 'Download Instagram videos · SnapReel',
      es: 'Descargar vídeos de Instagram · SnapReel',
      pt: 'Baixar vídeos do Instagram · SnapReel',
    },
    description: {
      en: 'Save the video from a public Instagram post to your device, no account or install needed.',
      es: 'Guarda el vídeo de una publicación pública de Instagram en tu dispositivo, sin cuenta ni instalación.',
      pt: 'Salve o vídeo de uma publicação pública do Instagram no seu dispositivo, sem conta nem instalação.',
    },
    heading: { en: 'Download videos', es: 'Descargar vídeos', pt: 'Baixar vídeos' },
    headingAccent: { en: 'from posts', es: 'de publicaciones', pt: 'de publicações' },
    intro: {
      en: "For feed posts with video. Paste the link and we'll show you what can be saved.",
      es: 'Para publicaciones de feed con vídeo. Pega el enlace y te mostramos lo que se puede guardar.',
      pt: 'Para publicações do feed com vídeo. Cole o link e mostramos o que pode ser salvo.',
    },
    placeholder: 'https://www.instagram.com/p/...',
    steps: [
      PASTE_STEP,
      SCAN_STEP,
      {
        heading: { en: 'Save the video', es: 'Guarda el vídeo', pt: 'Salve o vídeo' },
        body: {
          en: "If the post is a carousel with several videos, they'll all show up so you pick the one you want.",
          es: 'Si la publicación es un carrusel con varios vídeos, aparecerán todos y eliges cuál quieres.',
          pt: 'Se a publicação for um carrossel com vários vídeos, todos vão aparecer para você escolher qual quer.',
        },
      },
    ],
    faq: [
      {
        question: {
          en: 'What if the post has several videos?',
          es: '¿Y si la publicación tiene varios vídeos?',
          pt: 'E se a publicação tiver vários vídeos?',
        },
        answer: {
          en: 'A carousel shows each item separately, numbered, so you download only the one you want.',
          es: 'Un carrusel muestra cada elemento por separado, numerado, para que descargues solo el que te interesa.',
          pt: 'Um carrossel mostra cada item separadamente, numerado, para que você baixe só o que te interessa.',
        },
      },
      ...COMMON_FAQ,
    ],
  },
  {
    path: '/foto',
    nav: { en: 'Photos', es: 'Fotos', pt: 'Fotos' },
    kind: 'image',
    title: {
      en: 'Download Instagram photos · SnapReel',
      es: 'Descargar fotos de Instagram · SnapReel',
      pt: 'Baixar fotos do Instagram · SnapReel',
    },
    description: {
      en: 'Save the images from a public Instagram post, one by one or the whole carousel as a ZIP.',
      es: 'Guarda las imágenes de una publicación pública de Instagram, una a una o el carrusel completo en ZIP.',
      pt: 'Salve as imagens de uma publicação pública do Instagram, uma a uma ou o carrossel inteiro em ZIP.',
    },
    heading: { en: 'Download photos', es: 'Descargar fotos', pt: 'Baixar fotos' },
    headingAccent: { en: 'and carousels', es: 'y carruseles', pt: 'e carrosséis' },
    intro: {
      en: 'Paste the link of a public post and save its images, individually or all together in a ZIP.',
      es: 'Pega el enlace de una publicación pública y guarda sus imágenes, sueltas o todas juntas en un ZIP.',
      pt: 'Cole o link de uma publicação pública e salve as imagens dela, separadas ou todas juntas em um ZIP.',
    },
    placeholder: 'https://www.instagram.com/p/...',
    steps: [
      PASTE_STEP,
      SCAN_STEP,
      {
        heading: { en: 'Save the images', es: 'Guarda las imágenes', pt: 'Salve as imagens' },
        body: {
          en: 'Download one specific image, or the whole carousel in a ZIP of up to 100 MB.',
          es: 'Descarga una imagen concreta, o el carrusel entero en un ZIP de hasta 100 MB.',
          pt: 'Baixe uma imagem específica, ou o carrossel inteiro em um ZIP de até 100 MB.',
        },
      },
    ],
    faq: [
      {
        question: {
          en: 'Can I download the whole carousel at once?',
          es: '¿Puedo bajar el carrusel entero de una vez?',
          pt: 'Posso baixar o carrossel inteiro de uma vez?',
        },
        answer: {
          en: "Yes: when there's more than one image, a button appears to download them all in a ZIP. If the album is over 100 MB you'll need to download them separately.",
          es: 'Sí: cuando hay más de una imagen aparece el botón para descargarlas todas en un ZIP. Si el álbum pasa de 100 MB tendrás que bajarlas por separado.',
          pt: 'Sim: quando há mais de uma imagem, aparece o botão para baixar todas em um ZIP. Se o álbum passar de 100 MB, você vai precisar baixá-las separadamente.',
        },
      },
      {
        question: {
          en: "An image that's not from the carousel shows up, what is it?",
          es: 'Me sale una imagen que no es del carrusel, ¿qué es?',
          pt: 'Aparece uma imagem que não é do carrossel, o que é?',
        },
        answer: {
          en: "It's the cover image the page publishes for link previews. We mark it as cover so you don't confuse it with a carousel photo.",
          es: 'Es la portada que la página publica para las vistas previas de enlaces. La marcamos como portada para que no la confundas con una foto del álbum.',
          pt: 'É a capa que a página publica para as prévias de link. Marcamos como capa para você não confundir com uma foto do álbum.',
        },
      },
      ...COMMON_FAQ,
    ],
  },
  {
    path: '/audio',
    nav: { en: 'Audio', es: 'Audio', pt: 'Áudio' },
    kind: 'audio',
    title: {
      en: 'Extract audio from an Instagram video (M4A) · SnapReel',
      es: 'Extraer el audio de un vídeo de Instagram (M4A) · SnapReel',
      pt: 'Extrair o áudio de um vídeo do Instagram (M4A) · SnapReel',
    },
    description: {
      en: 'Get the audio track from a public Instagram video in M4A, no recompression and no quality loss.',
      es: 'Saca la pista de audio de un vídeo público de Instagram en M4A, sin recomprimir y sin perder calidad.',
      pt: 'Tire a trilha de áudio de um vídeo público do Instagram em M4A, sem recompressão e sem perder qualidade.',
    },
    heading: { en: 'Extract the audio', es: 'Extraer el audio', pt: 'Extrair o áudio' },
    headingAccent: { en: 'from a video', es: 'de un vídeo', pt: 'de um vídeo' },
    intro: {
      en: 'Paste the link of a public video and save just its sound track in M4A, as-is, with no recompression.',
      es: 'Pega el enlace de un vídeo público y guarda solo su pista de sonido en M4A, tal cual viene, sin recomprimir.',
      pt: 'Cole o link de um vídeo público e salve só a trilha sonora em M4A, como ela vem, sem recomprimir.',
    },
    placeholder: 'https://www.instagram.com/reel/...',
    steps: [
      PASTE_STEP,
      {
        heading: { en: 'We pick the track', es: 'Elegimos la pista', pt: 'Escolhemos a trilha' },
        body: {
          en: "We look for audio published separately and, if there isn't any, the video's own AAC track.",
          es: 'Buscamos audio publicado por separado y, si no lo hay, la pista AAC del propio vídeo.',
          pt: 'Procuramos áudio publicado separadamente e, se não houver, a trilha AAC do próprio vídeo.',
        },
      },
      {
        heading: { en: 'Save the M4A', es: 'Guarda el M4A', pt: 'Salve o M4A' },
        body: {
          en: "The track is copied with no recompression, so it sounds the same as in the original video.",
          es: 'La pista se copia sin recomprimir, así que suena igual que en el vídeo original.',
          pt: 'A trilha é copiada sem recompressão, então soa igual ao vídeo original.',
        },
      },
    ],
    faq: [
      {
        question: {
          en: 'Does extracting the audio lose quality?',
          es: '¿Pierde calidad al extraer el audio?',
          pt: 'Extrair o áudio perde qualidade?',
        },
        answer: {
          en: "No. The AAC track is copied as-is from the video, never re-encoded, so it sounds exactly like the original.",
          es: 'No. La pista AAC se copia tal cual del vídeo, no se vuelve a codificar, así que suena exactamente igual que el original.',
          pt: 'Não. A trilha AAC é copiada como está do vídeo, nunca recodificada, então soa exatamente igual ao original.',
        },
      },
      {
        question: {
          en: 'Why M4A and not MP3?',
          es: '¿Por qué es M4A y no MP3?',
          pt: 'Por que é M4A e não MP3?',
        },
        answer: {
          en: "Because an Instagram video's audio already comes in AAC, and M4A is its natural container. Converting to MP3 would force a recompression and a quality loss for no gain.",
          es: 'Porque el audio de un vídeo de Instagram ya viene en AAC, y M4A es su envoltorio natural. Convertirlo a MP3 obligaría a recomprimir y a perder calidad sin ganar nada.',
          pt: 'Porque o áudio de um vídeo do Instagram já vem em AAC, e M4A é o contêiner natural dele. Converter para MP3 forçaria uma recompressão e perda de qualidade sem ganhar nada.',
        },
      },
      {
        question: {
          en: 'Is there a size limit?',
          es: '¿Hay un límite de tamaño?',
          pt: 'Há um limite de tamanho?',
        },
        answer: {
          en: "Yes, 32 MB per video. That's plenty for a reel; a very long video might fall outside that.",
          es: 'Sí, 32 MB por vídeo. Es de sobra para un reel; un vídeo muy largo puede quedarse fuera.',
          pt: 'Sim, 32 MB por vídeo. É de sobra para um reel; um vídeo muito longo pode ficar de fora.',
        },
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
