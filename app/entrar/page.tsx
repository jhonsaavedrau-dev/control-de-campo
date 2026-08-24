import { redirect } from "next/navigation";
import { SimboloPBI } from "@/components/Marca";
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
        <div className="flex flex-col items-center text-center mb-7">
          <SimboloPBI className="w-14 h-14" />
          <h1 className="font-[family-name:var(--font-placa)] font-semibold text-[22px] mt-3">
            Control de Generación
          </h1>
          <p
            className="font-[family-name:var(--font-mono)] text-[12.5px] mt-1"
            style={{ color: "var(--color-tenue)" }}
          >
            Petroleum Blending International SAS ESP
          </p>
        </div>

        <div className="panel p-5">
          {hayLogin ? (
            <FormularioEntrar destino={destino} />
          ) : (
            <p className="text-[14.5px]" style={{ color: "var(--color-tenue)" }}>
              El login todavía no está configurado en este servidor. Falta la
              variable <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
            </p>
          )}
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
