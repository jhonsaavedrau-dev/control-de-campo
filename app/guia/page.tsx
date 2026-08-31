import Link from "next/link";
import { Encabezado, PieDePagina } from "@/components/Marco";
import {
  IcoCodigoQR, IcoChip, IcoHerramienta, IcoCamara, IcoDocumento,
  IcoLlave, IcoPersona, IcoReloj, IcoLupa, IcoLapiz,
} from "@/components/Iconos";
import { usuarioActual, puedeEditar, esAdministrador, loginConfigurado } from "@/lib/sesion";
import { ETIQUETA_ROL } from "@/lib/tipos";

export const dynamic = "force-dynamic";

type Paso = {
  titulo: string;
  texto: string;
  icono: React.ReactNode;
  ojo?: string;
};

/** El recorrido completo, tal como pasa en planta. */
const PASOS: Paso[] = [
  {
    titulo: "Escanea el código del equipo",
    texto:
      "El adhesivo está pegado en el generador. Con la cámara del celular basta: te lleva directo a la ficha de ese equipo, sin buscar nada.",
    icono: <IcoCodigoQR className="w-4 h-4" />,
    ojo: "Si te pide entrar, entra y te deja en la ficha que ibas a ver.",
  },
  {
    titulo: "Mira en qué estado está",
    texto:
      "La ficha te dice de un vistazo el estado, el horómetro, cuánto falta para el preventivo, los datos del controlador y las fotos de referencia.",
    icono: <IcoChip className="w-4 h-4" />,
    ojo: "Abajo tienes el historial: qué se le hizo antes y quién lo hizo.",
  },
  {
    titulo: "Registra lo que hiciste",
    texto:
      "Botón «Registrar intervención». Eliges el tipo, marcas las tareas de la lista y escribes lo que no esté en ella. Anota el horómetro: de ahí sale el aviso del próximo preventivo.",
    icono: <IcoHerramienta className="w-4 h-4" />,
    ojo: "Tu nombre ya viene puesto, sale de tu cuenta.",
  },
  {
    titulo: "Toma las fotografías",
    texto:
      "La evidencia de lo que encontraste y de cómo quedó. Van dentro del acta y quedan archivadas junto a ella.",
    icono: <IcoCamara className="w-4 h-4" />,
    ojo: "Sin señal también: se guardan en el teléfono y suben solas.",
  },
  {
    titulo: "Cierra el acta",
    texto:
      "Resultado, recomendaciones, pendientes y quién recibió en sitio. Al guardar, el acta se genera en PDF y se archiva sola en la carpeta del equipo en Drive.",
    icono: <IcoDocumento className="w-4 h-4" />,
    ojo: "Si tienes firma cargada, el acta sale firmada con tu nombre. No hay que imprimirla ni escanearla.",
  },
];

export default async function Guia() {
  const usuario = await usuarioActual();
  const editor = !loginConfigurado() || puedeEditar(usuario);
  const admin = !loginConfigurado() || esAdministrador(usuario);

  return (
    <>
      <Encabezado atras={{ href: "/", texto: "Inicio" }} />

      <main className="flex-1 w-full lienzo-reticula">
        <div className="max-w-[760px] mx-auto px-4 sm:px-6 py-6 sm:py-9">
          <div
            className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-[0.14em] uppercase"
            style={{ color: "var(--color-sin-info)" }}
          >
            Cómo se usa
          </div>
          <h1 className="font-[family-name:var(--font-placa)] font-semibold text-[34px] sm:text-[40px] leading-none mt-1.5">
            De la máquina al acta
          </h1>
          <p
            className="text-[15.5px] mt-3 leading-relaxed"
            style={{ color: "var(--color-tenue)" }}
          >
            {usuario ? (
              <>
                Hola, {usuario.nombre.split(" ")[0]}. Entraste como{" "}
                <strong style={{ color: "var(--color-tinta)" }}>
                  {ETIQUETA_ROL[usuario.rol].toLowerCase()}
                </strong>
                , así que esto es lo que puedes hacer.
              </>
            ) : (
              <>Esto es todo lo que hace el sistema, en orden.</>
            )}
          </p>

          {/* --- El recorrido --- */}
          <h2 className="rotulo">Paso a paso en planta</h2>
          <ol className="pasos">
            {PASOS.map((p, i) => (
              <li key={p.titulo} className="paso">
                <span className="paso-numero">{i + 1}</span>
                <div className="paso-cuerpo">
                  <div className="paso-titulo">
                    <span className="paso-icono">{p.icono}</span>
                    {p.titulo}
                  </div>
                  <p className="paso-texto">{p.texto}</p>
                  {p.ojo ? <p className="paso-ojo">{p.ojo}</p> : null}
                </div>
              </li>
            ))}
          </ol>

          {/* --- Sin señal: lo que más miedo da en campo --- */}
          <h2 className="rotulo">Si no hay señal</h2>
          <div
            className="rounded-lg p-4 sm:p-5"
            style={{
              background: "var(--color-consola)",
              color: "var(--color-consola-tinta)",
              border: "1px solid var(--color-consola-borde)",
            }}
          >
            <p className="text-[15.5px] font-medium">Sigue trabajando igual.</p>
            <p className="text-[14.5px] mt-2 leading-relaxed opacity-85">
              El acta y sus fotografías quedan guardadas en tu propio teléfono.
              En cuanto vuelvas a tener señal se envían solas, sin que tengas
              que acordarte. Abajo de la pantalla te aparece una barra diciendo
              cuántas están esperando.
            </p>
            <p className="text-[13.5px] mt-2.5 opacity-70">
              No cierres sesión mientras haya actas esperando: se guardan en ese
              teléfono, no en el servidor.
            </p>
          </div>

          {/* --- Lo que además puede hacer supervisión --- */}
          {editor ? (
            <>
              <h2 className="rotulo">Además, como supervisión</h2>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <Tarjeta
                  href="/nuevo"
                  icono={<IcoHerramienta className="w-4 h-4" />}
                  titulo="Dar de alta"
                  texto="Un generador, un controlador o una sede nuevos. El identificador lo pone el sistema."
                />
                <Tarjeta
                  href="/"
                  icono={<IcoLupa className="w-4 h-4" />}
                  titulo="Corregir una ficha"
                  texto="Desde la ficha del equipo, «Editar ficha». Ahí van potencias, placas y la red del controlador."
                />
                <Tarjeta
                  href="/"
                  icono={<IcoCamara className="w-4 h-4" />}
                  titulo="Cambiar las fotos"
                  texto="Las tres de referencia del equipo se reemplazan desde la ficha, estando frente a la máquina."
                />
                <Tarjeta
                  href="/qr"
                  icono={<IcoCodigoQR className="w-4 h-4" />}
                  titulo="Imprimir los códigos"
                  texto="Todos los adhesivos en una hoja, con línea de corte."
                />
              </div>
            </>
          ) : null}

          {/* --- Y como administración --- */}
          {admin ? (
            <>
              <h2 className="rotulo">Y como administración</h2>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <Tarjeta
                  href="/admin/usuarios"
                  icono={<IcoPersona className="w-4 h-4" />}
                  titulo="Cuentas"
                  texto="Crear cuentas con su contraseña, cambiar permisos y dar de baja."
                />
                <Tarjeta
                  href="/admin/usuarios"
                  icono={<IcoLapiz className="w-4 h-4" />}
                  titulo="Firmas para las actas"
                  texto="Cada quien manda su firma y se carga en su cuenta. Desde ahí, sus actas salen firmadas solas."
                />
                <Tarjeta
                  href="/admin"
                  icono={<IcoLlave className="w-4 h-4" />}
                  titulo="Conexiones y documentos"
                  texto="Estado de la base y de Drive, la guía en PDF, y rehacer las actas archivadas."
                />
              </div>
            </>
          ) : null}

          {/* --- El aviso de mantenimiento, que es lo nuevo --- */}
          <h2 className="rotulo">Cómo sabe el sistema cuándo toca preventivo</h2>
          <div className="panel p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span style={{ color: "var(--color-activo)" }}>
                <IcoReloj className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[14.5px] leading-relaxed">
                  Con dos datos: el <strong>horómetro</strong> que anotas en cada
                  intervención y las <strong>horas entre preventivos</strong> que
                  dice el fabricante. Restando el horómetro de hoy al del último
                  preventivo, el sistema sabe cuántas horas lleva corridas.
                </p>
                <p
                  className="text-[13.5px] mt-2 leading-relaxed"
                  style={{ color: "var(--color-tenue)" }}
                >
                  Por eso importa anotar el horómetro aunque parezca un detalle:
                  es lo que convierte el archivo en algo que se puede planear. Lo
                  vencido y lo próximo salen arriba en la pantalla de inicio.
                </p>
              </div>
            </div>
          </div>

          <h2 className="rotulo">Tu cuenta</h2>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Tarjeta
              href="/cuenta"
              icono={<IcoPersona className="w-4 h-4" />}
              titulo="Cambiar tu contraseña"
              texto="Si entraste con una contraseña de estreno, cámbiala. El sistema guarda las claves de los controladores."
            />
            <Tarjeta
              href="/intervenciones"
              icono={<IcoDocumento className="w-4 h-4" />}
              titulo="Buscar en el historial"
              texto="Por equipo, tipo, fecha o técnico. El filtro queda en la dirección y se puede compartir."
            />
          </div>

          <p
            className="text-[13.5px] mt-7 leading-relaxed"
            style={{ color: "var(--color-sin-info)" }}
          >
            Si algo no cuadra, avísale a tu supervisor antes de forzar nada. Un
            dato mal anotado se arrastra a todas las actas siguientes.
          </p>
        </div>
      </main>

      <PieDePagina />
    </>
  );
}

function Tarjeta({
  href,
  icono,
  titulo,
  texto,
}: {
  href: string;
  icono: React.ReactNode;
  titulo: string;
  texto: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg p-4 transition-shadow hover:shadow-sm"
      style={{
        background: "var(--color-panel)",
        border: "1px solid var(--color-borde)",
        borderBottomColor: "var(--color-borde-fuerte)",
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
