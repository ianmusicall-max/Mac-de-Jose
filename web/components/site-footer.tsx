import { TOOLS } from '@/lib/tools';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <h2>Herramientas</h2>
          <ul>
            <li>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Keep site navigation independent of client routing. */}
              <a href="/">Inicio</a>
            </li>
            {TOOLS.map(tool => (
              <li key={tool.path}>
                <a href={tool.path}>{tool.nav}</a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2>Legal</h2>
          <ul>
            <li>
              <a href="/privacidad">Privacidad</a>
            </li>
            <li>
              <a href="/terminos">Términos de uso</a>
            </li>
          </ul>
        </div>

        <div className="footer-note">
          <h2>Sobre SnapReel</h2>
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
