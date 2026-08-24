import { redirect } from "next/navigation";
import { Encabezado, PieDePagina } from "@/components/Marco";
import { Rotulo, Datos, Campo } from "@/components/Piezas";
import FormularioClave from "@/components/FormularioClave";
import { usuarioActual, loginConfigurado } from "@/lib/sesion";
import { ETIQUETA_ROL } from "@/lib/tipos";

export const dynamic = "force-dynamic";

export default async function Cuenta() {
  const usuario = await usuarioActual();
  if (loginConfigurado() && !usuario) redirect("/entrar?destino=/cuenta");

  return (
    <>
      <Encabezado atras={{ href: "/", texto: "Inicio" }} />

      <main className="flex-1 w-full max-w-[640px] mx-auto px-4 py-5">
        <h1 className="font-[family-name:var(--font-placa)] font-semibold text-[24px]">
          Mi cuenta
        </h1>

        <Rotulo>Quién eres</Rotulo>
        <Datos>
          <Campo etiqueta="Nombre">{usuario?.nombre}</Campo>
          <Campo etiqueta="Correo">{usuario?.correo}</Campo>
          <Campo etiqueta="Permiso">
            {usuario ? ETIQUETA_ROL[usuario.rol] : ""}
          </Campo>
        </Datos>

        <Rotulo>Cambiar la contraseña</Rotulo>
        <div className="panel p-5">
          <FormularioClave />
        </div>

        <p
          className="text-[12px] mt-4 leading-relaxed"
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
