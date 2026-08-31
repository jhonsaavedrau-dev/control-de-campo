import { redirect } from "next/navigation";
import FormularioEntrar from "@/components/FormularioEntrar";
import { loginConfigurado, usuarioActual } from "@/lib/sesion";

export const dynamic = "force-dynamic";

export default async function Entrar({
  searchParams,
}: {
  searchParams: Promise<{ destino?: string }>;
}) {
  const { destino = "/" } = await searchParams;

  // Si ya entró, no tiene sentido mostrarle la puerta.
  if (await usuarioActual()) redirect(destino.startsWith("/") ? destino : "/");

  const hayLogin = loginConfigurado();

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[360px]">
        {/* La marca va dentro de la tarjeta y sobre blanco. El logotipo
            lleva las letras en azul marino, y en modo oscuro el lienzo
            de la pagina es casi negro: suelto ahi no se veia. */}
        <div className="panel overflow-hidden">
          <div
            className="flex flex-col items-center text-center px-5 pt-7 pb-6"
            style={{ background: "#ffffff" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-pbi.gif"
              alt="PBI"
              width={160}
              height={80}
              className="h-14 w-auto"
            />
            <h1
              className="font-[family-name:var(--font-placa)] font-semibold text-[23px] mt-4"
              style={{ color: "var(--color-marino)" }}
            >
              Control de Generación
            </h1>
            <p
              className="font-[family-name:var(--font-mono)] text-[12px] mt-1.5"
              style={{ color: "#7b7b7b" }}
            >
              Petroleum Blending International SAS ESP
            </p>
          </div>

          <div style={{ height: "3px", background: "var(--color-naranja)" }} />

          <div className="p-5">
          {hayLogin ? (
            <FormularioEntrar destino={destino} />
          ) : (
            <p className="text-[14.5px]" style={{ color: "var(--color-tenue)" }}>
              El login todavía no está configurado en este servidor. Falta la
              variable <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
            </p>
          )}
          </div>
        </div>

        <p
          className="text-[12.5px] text-center mt-5 leading-relaxed"
          style={{ color: "var(--color-sin-info)" }}
        >
          Si escaneaste el código de un equipo, entra y te lleva directo a su
          ficha.
        </p>
      </div>
    </main>
  );
}
