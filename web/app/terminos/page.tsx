import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

export const metadata: Metadata = {
  title: 'Términos de uso · SnapReel',
  description: 'Condiciones y límites de uso de SnapReel.',
  alternates: { canonical: '/terminos' },
};

export default function Page() {
  return (
    <>
      <SiteHeader current="/terminos" />

      <main className="page">
        <h1>Términos de uso</h1>

        <div className="legal">
          <h2>Qué es esta herramienta</h2>
          <p>
            Una utilidad para guardar archivos que una página ya publica de forma pública. No
            accede a contenido privado, no inicia sesión en tu nombre y no evita ninguna
            protección de contenido.
          </p>

          <h2>Qué te corresponde a ti</h2>
          <p>
            El contenido sigue siendo de quien lo creó. Descargar algo no te da derechos sobre
            ello. Guarda material propio, o aquel para el que tengas permiso, y respeta los
            derechos de autor y los términos de los sitios que visites.
          </p>
          <ul>
            <li>No lo uses para republicar el trabajo de otra persona como si fuera tuyo.</li>
            <li>No lo uses para acosar a nadie ni para recopilar material sobre una persona.</li>
            <li>Si el autor te pide que retires algo suyo, retíralo.</li>
          </ul>

          <h2>Qué no te podemos garantizar</h2>
          <p>
            Que funcione siempre. Depende de páginas de terceros que cambian sin avisar y que
            pueden limitar o bloquear las consultas cuando quieran. El servicio se ofrece tal cual,
            sin garantía de disponibilidad ni de resultado.
          </p>

          <h2>Qué no admite</h2>
          <ul>
            <li>Cuentas privadas, historias y publicaciones que requieran seguir a alguien.</li>
            <li>Emisiones HLS y páginas que necesiten ejecutar un reproductor.</li>
            <li>Contenido con protección anticopia.</li>
          </ul>

          <h2>Relación con Instagram</h2>
          <p>
            SnapReel no está asociado, patrocinado ni respaldado por Instagram ni por Meta. Las
            marcas mencionadas pertenecen a sus titulares.
          </p>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
