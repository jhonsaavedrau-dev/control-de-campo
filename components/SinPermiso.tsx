import { Encabezado, PieDePagina } from "./Marco";

/**
 * Lo que ve alguien que llegó a una pantalla de administración sin serlo.
 *
 * No es un error del sistema, así que no se pinta como tal: se explica y
 * se le devuelve al inicio.
 */
export default function SinPermiso({
  que = "Esta pantalla",
}: {
  que?: string;
}) {
  return (
    <>
      <Encabezado atras={{ href: "/", texto: "Inicio" }} />
      <main className="flex-1 w-full max-w-[640px] mx-auto px-4 py-5">
        <h1 className="font-[family-name:var(--font-placa)] font-semibold text-[22px]">
          {que} es solo para administradores
        </h1>
        <p
          className="text-[14.5px] mt-2 leading-relaxed"
          style={{ color: "var(--color-tenue)" }}
        >
          Desde aquí se manejan las cuentas y las conexiones del sistema. Si
          necesitas entrar, pídele a un administrador que te cambie el
          permiso.
        </p>
      </main>
      <PieDePagina />
    </>
  );
}
