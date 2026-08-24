"use client";

/**
 * Manda la hoja a la impresora.
 *
 * Existe porque en el celular no hay Ctrl+P a la vista, y esta hoja se
 * arma muchas veces desde el teléfono de quien va a la planta.
 */
export default function BotonImprimir({
  texto = "Imprimir la hoja",
}: {
  texto?: string;
}) {
  return (
    <button type="button" onClick={() => window.print()} className="accion">
      {texto}
    </button>
  );
}
