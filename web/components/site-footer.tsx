import Link from 'next/link';
import { TOOLS } from '@/lib/tools';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <h2>Herramientas</h2>
          <ul>
            {TOOLS.map(tool => (
              <li key={tool.path}>
                <Link href={tool.path}>{tool.nav}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2>Legal</h2>
          <ul>
            <li>
              <Link href="/privacidad">Privacidad</Link>
            </li>
            <li>
              <Link href="/terminos">Términos de uso</Link>
            </li>
          </ul>
        </div>

        <div className="footer-note">
          <h2>Sobre VideoVault</h2>
          <p>
            Una herramienta para guardar contenido público sin cuentas ni instalaciones. No estamos
            asociados con Instagram ni con Meta.
          </p>
          <p>
            Guarda solo contenido propio o para el que tengas permiso, y respeta los derechos de
            quien lo publicó.
          </p>
        </div>
      </div>

      <p className="footer-limits">
        Admite archivos directos y medios publicados públicamente en HTML. No admite cuentas
        privadas, historias, emisiones HLS ni páginas que necesiten ejecutar un reproductor.
      </p>
    </footer>
  );
}
