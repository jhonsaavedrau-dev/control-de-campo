"use client";

import { useActionState } from "react";
import { entrar } from "@/app/entrar/acciones";

export default function FormularioEntrar({ destino }: { destino: string }) {
  const [estado, accion, enviando] = useActionState(entrar, null);

  return (
    <form action={accion} className="space-y-4">
      <input type="hidden" name="destino" value={destino} />

      <div>
        <label className="entrada-rotulo" htmlFor="correo">
          Correo
        </label>
        <input
          id="correo"
          name="correo"
          type="email"
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          required
          className="entrada"
          placeholder="nombre@pbi.com.co"
        />
      </div>

      <div>
        <label className="entrada-rotulo" htmlFor="clave">
          Contraseña
        </label>
        <input
          id="clave"
          name="clave"
          type="password"
          autoComplete="current-password"
          required
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
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
