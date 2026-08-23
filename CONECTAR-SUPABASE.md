# Conectar la base de datos (Supabase)

Hoy los datos viven en un archivo dentro de tu computador. Eso funciona bien
para trabajar, pero **no sirve para publicar el sistema en internet**: en la
nube no se pueden escribir archivos, y cada vez que el servidor se reinicia se
perdería todo.

Supabase es una base de datos PostgreSQL de verdad, con panel visual. El plan
gratuito sobra de largo para este proyecto.

Calcula unos 15 minutos.

---

## Parte 1 — Crear el proyecto

1. Entra a **https://supabase.com** y pulsa **Start your project**.
   Puedes entrar con tu cuenta de Google.

2. Botón **New project**.

3. Llena así:
   - **Name:** `control-campo-pbi`
   - **Database Password:** pulsa **Generate a password** y
     **guárdala en tu gestor de contraseñas**. No la vas a necesitar para el
     sistema, pero es la llave maestra de la base.
   - **Region:** elige la más cercana. Para Colombia,
     **East US (North Virginia)** suele ser la mejor.

4. **Create new project** y espera. Tarda uno o dos minutos en aprovisionar.

---

## Parte 2 — Crear las tablas

1. En el menú de la izquierda, entra al **SQL Editor** (ícono de terminal).

2. Pulsa **New query**.

3. Abre el archivo **`schema-supabase.sql`** que está en la carpeta del
   proyecto, copia **todo** su contenido y pégalo ahí.

4. Pulsa **Run** (o Ctrl+Enter).

Debe decir *Success. No rows returned*. Eso es lo correcto: crea las tablas,
no devuelve datos.

> Si sale algún error en rojo, cópiamelo y lo reviso. El archivo está escrito
> para poder ejecutarse varias veces sin romperse.

5. Para comprobar: menú **Table Editor**. Deben aparecer `sedes`, `equipos`,
   `controladores`, `intervenciones`, `intervencion_fotos`, `backups`,
   `documentos`, `usuarios` y `contador_consecutivos`.

---

## Parte 3 — Copiar las llaves

1. Menú de la izquierda, abajo: **Project Settings** (el engranaje).

2. Entra a **API**.

3. Vas a ver dos datos que necesitamos:

   - **Project URL** — algo como `https://abcdefghijk.supabase.co`
   - **Service role key** — una cadena larguísima, en la sección
     *Project API keys*. Puede estar oculta: pulsa **Reveal**.

4. Abre el archivo **`.env.local`** de la carpeta del proyecto y déjalo así,
   **sin borrar la línea de Drive que ya está**:

```
DRIVE_CARPETA_RAIZ=0AAdAjm7j4qWVUk9PVA

NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijk.supabase.co
SUPABASE_SERVICE_KEY=la-cadena-larguisima-que-copiaste
```

5. Guarda el archivo y **reinicia el sistema** (cierra la ventana negra y
   vuelve a abrir `INICIAR.bat`). Las llaves solo se leen al arrancar.

---

## ⚠️ Sobre la *service role key*

Esa llave **se salta todas las reglas de seguridad** de la base de datos. Quien
la tenga puede leer y borrar todo.

- **Nunca la pegues en el chat, en un correo ni en un WhatsApp.**
- Vive solo en `.env.local`, que ya está bloqueado para que no se suba a git.
- Si crees que se filtró: en esa misma pantalla de Supabase hay un botón para
  regenerarla. La vieja queda inservible al instante.

Hay una segunda llave, la **anon key**, que sí es pública y se usa desde el
navegador. Esa la usaremos cuando montemos el login de los técnicos.

---

## Parte 4 — Cargar los datos

1. Abre **http://localhost:3000/admin/datos**

2. Arriba debe decir **Supabase (PostgreSQL)** con el punto en verde.

3. Pulsa **Cargar sedes, equipos y controladores**.

Sube tus 6 sedes, 15 equipos y 5 controladores. Se puede repetir las veces que
quieras sin duplicar nada, y no toca las intervenciones ya registradas.

---

## Cómo saber que quedó bien

En `/admin/datos` deben aparecer los conteos:

```
sedes: 6
equipos: 15
controladores: 5
intervenciones: 0
```

Y en `/admin` las dos conexiones —base de datos y Drive— en verde.

A partir de ahí, todo lo que registre el sistema va a PostgreSQL en vez del
archivo local. Las pantallas no cambian: **no hace falta tocar nada más**.

---

## Y después

Con Supabase y Drive conectados, ya se puede publicar el sistema en internet
(Vercel, gratis) y regenerar los códigos QR con la dirección definitiva. Ahí
los técnicos podrán usarlo desde sus celulares en campo, que es el objetivo
final.
