/**
 * Crea las cuentas iniciales del sistema.
 *
 * Las contraseñas se generan al azar y quedan en `usuarios-iniciales.txt`
 * (ignorado por git). Cada persona debería cambiarlas al entrar.
 *
 *   node crear-usuarios.mjs
 */
import fs from "node:fs";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const PERSONAS = [
  { correo: "jhonsaavedrau@gmail.com", nombre: "Jhon Saavedra", rol: "administrador" },
  { correo: "eduenes@pbi.com.co", nombre: "Eduar Dueñes", rol: "supervisor" },
];

// Sin caracteres que se confundan al dictarlos por telefono
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const clave = () =>
  Array.from(crypto.randomBytes(14))
    .map((b) => ALFABETO[b % ALFABETO.length])
    .join("");

const lineas = [
  "============================================================",
  " CUENTAS DEL SISTEMA DE CONTROL DE CAMPO",
  "",
  " Entrar en: https://control-de-campo.vercel.app",
  "",
  " Cada persona deberia cambiar su contrasena al entrar.",
  " NO compartas este archivo. No se sube a git.",
  "============================================================",
  "",
];

for (const p of PERSONAS) {
  const contrasena = clave();

  const { data: creado, error } = await db.auth.admin.createUser({
    email: p.correo,
    password: contrasena,
    email_confirm: true,
  });

  let nota = "";
  if (error) {
    if (/already|registrad/i.test(error.message)) {
      nota = "(ya existia; contrasena sin cambiar)";
      console.log(`  = ${p.correo} ya existe`);
    } else {
      console.log(`  ! ${p.correo}: ${error.message}`);
      continue;
    }
  } else {
    console.log(`  + ${p.correo} creado`);
  }

  // El perfil (nombre y rol) va en la tabla usuarios
  const { error: errorPerfil } = await db
    .from("usuarios")
    .upsert(
      {
        nombre_completo: p.nombre,
        correo: p.correo,
        rol: p.rol,
        activo: true,
        auth_user_id: creado?.user?.id ?? null,
      },
      { onConflict: "correo" },
    );
  if (errorPerfil) console.log(`    perfil: ${errorPerfil.message}`);

  lineas.push(`--- ${p.nombre} (${p.rol}) ---`);
  lineas.push(`Correo:     ${p.correo}`);
  lineas.push(nota ? `Contrasena: ${nota}` : `Contrasena: ${contrasena}`);
  lineas.push("");
}

fs.writeFileSync("usuarios-iniciales.txt", lineas.join("\n"), "utf8");
console.log("\ncredenciales escritas en usuarios-iniciales.txt");
