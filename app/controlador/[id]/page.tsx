import { redirect, notFound } from "next/navigation";
import { equipoDeControlador } from "@/lib/db";

/**
 * Compatibilidad: los QR y enlaces que apuntaban a un controlador
 * siguen funcionando, llevan a la ficha de su equipo.
 */
export default async function ControladorRedirige({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const idEquipo = await equipoDeControlador(
    decodeURIComponent(id).toUpperCase(),
  );
  if (!idEquipo) notFound();
  redirect(`/equipo/${idEquipo}`);
}
