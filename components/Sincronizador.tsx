"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { resumenPendientes, sincronizar } from "@/lib/pendientes";
import type { ResumenPendientes } from "@/lib/pendientes";

/**
 * Barra de estado de conexión. Solo aparece cuando hay algo sin subir
 * o cuando el dispositivo se quedó sin señal — en campo eso importa
 * más que cualquier otra cosa en pantalla.
 */

const VACIO: ResumenPendientes = { registros: 0, fotos: 0, atascados: 0 };

export default function Sincronizador() {
  const router = useRouter();
  const [cola, setCola] = useState<ResumenPendientes>(VACIO);
  const [enLinea, setEnLinea] = useState(true);
  const [subiendo, setSubiendo] = useState(false);

  const refrescar = useCallback(async () => {
    setCola(await resumenPendientes());
  }, []);

  const subir = useCallback(
    async (aLaFuerza: boolean) => {
      setSubiendo(true);
      const subidos = await sincronizar(aLaFuerza);
      setSubiendo(false);
      await refrescar();
      if (subidos > 0) router.refresh();
    },
    [refrescar, router],
  );

  useEffect(() => {
    void refrescar();
    setEnLinea(navigator.onLine);

    const alCambiarCola = () => void refrescar();
    const alConectar = async () => {
      setEnLinea(true);
      if ((await resumenPendientes()).registros === 0) return;
      await subir(false);
    };
    const alDesconectar = () => setEnLinea(false);

    window.addEventListener("pbi:pendientes", alCambiarCola);
    window.addEventListener("online", alConectar);
    window.addEventListener("offline", alDesconectar);
    if (navigator.onLine) void alConectar();

    return () => {
      window.removeEventListener("pbi:pendientes", alCambiarCola);
      window.removeEventListener("online", alConectar);
      window.removeEventListener("offline", alDesconectar);
    };
  }, [refrescar, subir]);

  if (enLinea && cola.registros === 0) return null;

  const sinSenal = !enLinea;
  const n = cola.registros;

  // Que las fotos vayan dentro es justo lo que el técnico necesita
  // saber: antes se le avisaba de que se perdían.
  const conFotos = cola.fotos
    ? ` con ${cola.fotos} fotografía${cola.fotos === 1 ? "" : "s"}`
    : "";

  let texto: string;
  if (sinSenal) {
    texto = n
      ? `Sigue registrando: ${n} acta${n === 1 ? "" : "s"}${conFotos} esperan en este equipo.`
      : "Puedes seguir registrando: todo queda guardado en este equipo, con sus fotografías.";
  } else if (subiendo) {
    texto = "Subiendo lo que quedó guardado…";
  } else if (cola.atascados) {
    texto = `El servidor rechazó ${cola.atascados} de ${n}. Nada se ha perdido; toca SUBIR para reintentar.`;
  } else {
    texto = `${n} acta${n === 1 ? "" : "s"}${conFotos} esperando señal.`;
  }

  const alarma = sinSenal || cola.atascados > 0;

  return (
    <div className="no-imprimir fixed bottom-0 inset-x-0 z-50">
      <div
        className="max-w-[640px] mx-auto m-3 rounded border px-4 py-3 flex items-center gap-3"
        style={
          alarma
            ? {
                background: "var(--color-consola)",
                borderColor: "var(--color-consola-borde)",
                color: "var(--color-consola-tinta)",
              }
            : {
                background: "var(--color-panel)",
                borderColor: "var(--color-pendiente)",
                color: "var(--color-tinta)",
              }
        }
      >
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{
            background: alarma ? "var(--color-critico)" : "var(--color-pendiente)",
          }}
        />
        <div className="flex-1 min-w-0">
          <div className="font-[family-name:var(--font-mono)] text-[12.5px] uppercase tracking-wide opacity-70">
            {sinSenal
              ? "Sin conexión"
              : cola.atascados
                ? "Rechazado por el servidor"
                : "Pendiente de subir"}
          </div>
          <div className="text-[13.5px] mt-0.5">{texto}</div>
        </div>
        {!sinSenal && !subiendo && n > 0 ? (
          <button
            onClick={() => void subir(true)}
            className="shrink-0 rounded px-3 py-1.5 font-[family-name:var(--font-mono)] text-[12.5px]"
            style={{ background: "var(--color-accion)", color: "#151109" }}
          >
            SUBIR
          </button>
        ) : null}
      </div>
    </div>
  );
}
