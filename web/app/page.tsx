import { Camera, Film, Music2 } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

const platforms = [
  { name: 'Instagram', path: '/instagram', description: 'Descarga reels, vídeos, audio y fotos de publicaciones públicas.', Icon: Camera },
  { name: 'TikTok', path: '/tiktok', description: 'Descarga vídeos públicos en MP4 o su audio en M4A.', Icon: Music2 },
  { name: 'Facebook', path: '/facebook', description: 'Busca y descarga vídeos y reels públicos de Facebook en MP4.', Icon: Film },
  { name: 'YouTube', path: '/youtube', description: 'Descarga vídeos y Shorts en MP4 o su audio en M4A.', Icon: Film },
];

export default function Home() {
  return (
    <>
      <SiteHeader current="/" />
      <main className="page">
        <section className="hero" aria-labelledby="home-title">
          <h1 id="home-title">Descargas de{' '}<span>Instagram, TikTok, Facebook y YouTube</span></h1>
          <p className="hero-intro">Elige la plataforma y pega el enlace de la publicación.</p>
        </section>
        <div className="tool-links platform-links">
          {platforms.map(({ name, path, description, Icon }) => (
            <a key={path} href={path} className="tool-link">
              <span className="benefit-icon" aria-hidden="true"><Icon size={20} /></span>
              <h2>{name}</h2>
              <p>{description}</p>
              <span className="tool-link-go">Abrir {name}</span>
            </a>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
