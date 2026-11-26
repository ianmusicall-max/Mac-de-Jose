import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

export const metadata: Metadata = {
  title: 'Privacidad · SnapReel',
  description: 'Qué datos trata SnapReel y qué no guarda.',
  alternates: { canonical: '/privacidad' },
};

export default function Page() {
  return (
    <>
      <SiteHeader current="/privacidad" />

      <main className="page">
        <h1>Privacidad</h1>

        <div className="legal">
          <p>
            Esto describe lo que hace el código de esta web, no una intención general. Si algo de
            aquí deja de ser cierto, es un error que hay que corregir.
          </p>

          <h2>No hay cuentas</h2>
          <p>
            No puedes registrarte, así que no hay nada que registrar. No pedimos tu usuario ni tu
            contraseña de Instagram, y ninguna herramienta de este tipo debería pedírtelos.
          </p>

          <h2>Qué se guarda en tu navegador</h2>
          <p>
            Los últimos seis enlaces que has buscado, en el almacenamiento local de tu navegador.
            No salen de tu dispositivo y los borras cuando quieras con «Borrar historial».
          </p>

          <h2>Qué se guarda en el servidor</h2>
          <ul>
            <li>
              El archivo que descargas se conserva temporalmente en almacenamiento privado para
              poder servírtelo otra vez sin volver a consultar el origen.
            </li>
            <li>
              El resultado de una búsqueda se reutiliza durante unos minutos, para no repetir la
              misma consulta.
            </li>
            <li>
              Un contador de espera por sitio, cuando un origen nos pide que reduzcamos el ritmo.
            </li>
          </ul>
          <p>
            Nada de eso se asocia a una persona, porque no hay cuentas con las que asociarlo, y no
            se publica en ningún sitio.
          </p>

          <h2>Peticiones a otros sitios</h2>
          <p>
            Para resolver un enlace, el servidor lo visita. Comprobamos que apunte a una dirección
            pública, también después de cada redirección, para que no se use esta web como puente
            hacia servidores internos.
          </p>

          <h2>Terceros</h2>
          <p>
            No hay analítica, ni publicidad, ni botones de redes que te sigan. El contenido
            multimedia lo sirven los servidores de quien lo publicó.
          </p>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
