import Link from "next/link";
import { redirect } from "next/navigation";
import { Encabezado, PieDePagina } from "@/components/Marco";
import { Rotulo, Datos, Campo } from "@/components/Piezas";
import FormularioClave from "@/components/FormularioClave";
import {
  IcoChip, IcoLista, IcoHerramienta, IcoCodigoQR, IcoDocumento, IcoLlave,
  IcoBandera, IcoTermometro,
} from "@/components/Iconos";
import {
  usuarioActual, puedeEditar, esAdministrador, loginConfigurado,
} from "@/lib/sesion";
import { ETIQUETA_ROL } from "@/lib/tipos";

export const dynamic = "force-dynamic";

/**
 * Mi cuenta, que además es el panel de todo lo que puedes hacer.
 *
 * Antes solo servía para cambiar la contraseña. Las acciones del sistema
 * vivían en un renglón al pie del inicio, debajo de quince equipos, y no
 * las encontraba nadie. Ahora están aquí y en el menú de la cabecera.
 */
export default async function Cuenta() {
  const usuario = await usuarioActual();
  if (loginConfigurado() && !usuario) redirect("/entrar?destino=/cuenta");

  const abierto = !loginConfigurado();
  const editor = abierto || puedeEditar(usuario);
  const admin = abierto || esAdministrador(usuario);

  return (
    <>
      <Encabezado atras={{ href: "/", texto: "Inicio" }} />

      <main className="flex-1 w-full max-w-[720px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <h1 className="font-[family-name:var(--font-placa)] font-semibold text-[34px] leading-none">
          Mi cuenta
        </h1>

        <Rotulo>Quién eres</Rotulo>
        <Datos>
          <Campo etiqueta="Nombre">{usuario?.nombre ?? "—"}</Campo>
          <Campo etiqueta="Correo">{usuario?.correo ?? "—"}</Campo>
          <Campo etiqueta="Permiso">
            {usuario ? ETIQUETA_ROL[usuario.rol] : "Sin login configurado"}
          </Campo>
        </Datos>

        <Rotulo>Qué puedes hacer</Rotulo>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Acceso
            href="/guia"
            icono={<IcoDocumento className="w-4 h-4" />}
            titulo="Cómo se usa"
            texto="El paso a paso completo, de escanear el código a que el acta quede archivada."
            destacado
          />
          <Acceso
            href="/"
            icono={<IcoChip className="w-4 h-4" />}
            titulo="Equipos"
            texto="Todos los generadores, agrupados por sede, con su estado."
          />
          <Acceso
            href="/intervenciones"
            icono={<IcoLista className="w-4 h-4" />}
            titulo="Intervenciones"
            texto="El historial, con búsqueda y filtros por equipo, tipo, fecha y técnico."
          />
          <Acceso
            href="/programa"
            icono={<IcoBandera className="w-4 h-4" />}
            titulo="Programa del año"
            texto="Qué mantenimiento toca a cada equipo, mes a mes, y cuánto se ha cumplido."
          />
          <Acceso
            href="/indicadores"
            icono={<IcoTermometro className="w-4 h-4" />}
            titulo="Indicadores"
            texto="Disponibilidad y confiabilidad de cada generador, con su gráfica y su calificación."
          />
          <Acceso
            href="/qr"
            icono={<IcoCodigoQR className="w-4 h-4" />}
            titulo="Códigos QR"
            texto="Los adhesivos de todos los equipos en una hoja, para cortar y pegar."
          />
          {editor ? (
            <Acceso
              href="/nuevo"
              icono={<IcoHerramienta className="w-4 h-4" />}
              titulo="Dar de alta"
              texto="Registrar un generador, un controlador o una sede que acaban de llegar."
            />
          ) : null}
          {admin ? (
            <Acceso
              href="/admin"
              icono={<IcoLlave className="w-4 h-4" />}
              titulo="Administración"
              texto="Cuentas del equipo, conexiones del sistema y documentos."
            />
          ) : null}
        </div>

        <Rotulo>Cambiar la contraseña</Rotulo>
        <div className="panel p-5">
          <FormularioClave />
        </div>

        <p
          className="text-[13.5px] mt-4 leading-relaxed"
          style={{ color: "var(--color-tenue)" }}
        >
          El sistema guarda las claves de acceso a los controladores. Si
          entraste con una contraseña de estreno, cámbiala aquí.
        </p>
      </main>

      <PieDePagina />
    </>
  );
}

function Acceso({
  href,
  icono,
  titulo,
  texto,
  destacado,
}: {
  href: string;
  icono: React.ReactNode;
  titulo: string;
  texto: string;
  destacado?: boolean;
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg p-4 transition-shadow hover:shadow-sm"
      style={{
        background: "var(--color-panel)",
        border: "1px solid var(--color-borde)",
        borderBottomColor: "var(--color-borde-fuerte)",
        borderLeft: destacado
          ? "3px solid var(--color-accion)"
          : "1px solid var(--color-borde)",
      }}
    >
      <div className="flex items-center gap-2">
        <span style={{ color: "var(--color-activo)" }}>{icono}</span>
        <span className="text-[14.5px] font-medium">{titulo}</span>
      </div>
      <p
        className="text-[13.5px] mt-1.5 leading-relaxed"
        style={{ color: "var(--color-tenue)" }}
      >
        {texto}
      </p>
    </Link>
  );
}
