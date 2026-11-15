import { Eye, HardDriveDownload, KeyRound, Smartphone } from 'lucide-react';

/** Claims worth making because the app actually behaves this way. */
const BENEFITS = [
  {
    icon: KeyRound,
    heading: 'Sin cuenta y sin contraseña',
    body: 'No te pedimos credenciales de Instagram. Si una herramienta te las pide, desconfía.',
  },
  {
    icon: Smartphone,
    heading: 'Sin instalar nada',
    body: 'Funciona en el navegador del móvil y del ordenador. También existe la app de Android.',
  },
  {
    icon: HardDriveDownload,
    heading: 'Vídeo, audio o imagen',
    body: 'Una búsqueda, tres formatos. Cambias entre ellos sin volver a consultar el origen.',
  },
  {
    icon: Eye,
    heading: 'Te decimos qué no puede hacer',
    body: 'Cuando algo no es accesible lo decimos, en vez de darte una portada haciéndola pasar por vídeo.',
  },
];

export function Benefits() {
  return (
    <section className="band" aria-labelledby="ventajas">
      <h2 id="ventajas" className="band-title">
        Por qué esta herramienta
      </h2>
      <div className="benefits">
        {BENEFITS.map(({ icon: Icon, heading, body }) => (
          <article key={heading}>
            <span className="benefit-icon">
              <Icon size={18} />
            </span>
            <h3>{heading}</h3>
            <p>{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
