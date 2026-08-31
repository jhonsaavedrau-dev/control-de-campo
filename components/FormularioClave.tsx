"use client";

import { useActionState } from "react";
import { cambiarClave } from "@/app/cuenta/acciones";

export default function FormularioClave() {
  const [estado, accion, enviando] = useActionState(cambiarClave, null);

  if (estado?.ok) {
    return (
      <div
        className="border rounded px-4 py-3 text-[14.5px]"
        style={{
          borderColor: "var(--color-operativo)",
          color: "var(--color-operativo)",
          background: "var(--color-campo)",
        }}
      >
        Contraseña cambiada. Úsala la próxima vez que entres.
      </div>
    );
  }

  return (
    <form action={accion} className="space-y-4">
      <div>
        <label className="entrada-rotulo" htmlFor="nueva">
          Contraseña nueva
        </label>
        <input
          id="nueva"
          name="nueva"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="entrada"
        />
        <p className="text-[12.5px] mt-1" style={{ color: "var(--color-sin-info)" }}>
          Al menos 8 caracteres.
        </p>
      </div>

      <div>
        <label className="entrada-rotulo" htmlFor="repetida">
          Repítela
        </label>
        <input
          id="repetida"
          name="repetida"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="entrada"
        />
      </div>

      {estado?.error ? (
        <div
          className="border rounded px-3 py-2.5 text-[13.5px]"
          style={{
            borderColor: "var(--color-critico)",
            color: "var(--color-critico)",
            background: "var(--color-campo)",
          }}
        >
          {estado.error}
        </div>
      ) : null}

      <button disabled={enviando} className="accion">
        {enviando ? "Cambiando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}
