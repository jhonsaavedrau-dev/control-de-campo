"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { contarPendientes, sincronizar } from "@/lib/pendientes";

/**
 * Barra flotante que solo aparece cuando hay algo sin subir o
 * cuando el dispositivo se quedó sin conexión.
 */
export default function Sincronizador() {
  const router = useRouter();
  const [pendientes, setPendientes] = useState(0);
  const [enLinea, setEnLinea] = useState(true);
  const [subiendo, setSubiendo] = useState(false);

  useEffect(() => {
    setPendientes(contarPendientes());
    setEnLinea(navigator.onLine);

    const refrescar = () => setPendientes(contarPendientes());
    window.addEventListener("pbi:pendientes", refrescar);

    const alConectar = async () => {
      setEnLinea(true);
      if (contarPendientes() === 0) return;
      setSubiendo(true);
      const subidos = await sincronizar();
      setSubiendo(false);
      setPendientes(contarPendientes());
      if (subidos > 0) router.refresh();
    };
    const alDesconectar = () => setEnLinea(false);

    window.addEventListener("online", alConectar);
    window.addEventListener("offline", alDesconectar);

    // Por si ya había señal al abrir con cosas en cola.
    if (navigator.onLine) void alConectar();

    return () => {
      window.removeEventListener("pbi:pendientes", refrescar);
      window.removeEventListener("online", alConectar);
      window.removeEventListener("offline", alDesconectar);
    };
  }, [router]);

  if (enLinea && pendientes === 0) return null;

  return (
    <div className="no-imprimir fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-[520px]">
      <div
        className={`rounded-xl border shadow-lg px-4 py-3 text-[13px] font-medium flex items-center gap-3 ${
          enLinea
            ? "bg-[#fff5e0] border-[#ffe0a3] text-[#7a4f00]"
            : "bg-marino-900 border-marino-700 text-white"
        }`}
      >
        <span
          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
            enLinea ? "bg-[#e0a800]" : "bg-[#f97066]"
          }`}
        />
        <span className="flex-1">
          {!enLinea
            ? "Sin conexión. Puedes seguir registrando: todo se guarda en este dispositivo."
            : subiendo
              ? "Subiendo registros guardados…"
              : `${pendientes} registro${pendientes === 1 ? "" : "s"} sin subir.`}
        </span>
        {enLinea && !subiendo && pendientes > 0 ? (
          <button
            onClick={async () => {
              setSubiendo(true);
              await sincronizar();
              setSubiendo(false);
              setPendientes(contarPendientes());
              router.refresh();
            }}
            className="shrink-0 bg-[#e0a800] hover:bg-[#c79400] text-white rounded-lg px-3 py-1.5 text-[12px] font-bold transition-colors"
          >
            Subir ahora
          </button>
        ) : null}
      </div>
    </div>
  );
}
