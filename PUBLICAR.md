# Publicar el sistema en internet

Hoy el sistema solo funciona en tu computador. Publicarlo hace que los técnicos
puedan abrirlo desde sus celulares en campo, que es el objetivo final.

Vamos a usar **Vercel**: es gratis para este uso y no hace falta crear nada en
GitHub.

Calcula unos 20 minutos la primera vez.

---

## Paso 1 — Entrar a Vercel

Abre la ventana negra del proyecto (o una ventana de comandos en la carpeta) y
escribe:

```
npx vercel login
```

Te va a preguntar con qué cuenta. Elige **Continue with Google** y se abre el
navegador. Entra con tu cuenta y vuelve a la ventana negra: debe decir
*Success!*.

> La primera vez pregunta si quieres instalar el paquete `vercel`. Responde
> **y** (sí).

---

## Paso 2 — Subir el proyecto

En la misma ventana:

```
npx vercel
```

Te hace unas preguntas. Responde así:

| Pregunta | Respuesta |
|---|---|
| Set up and deploy? | **y** |
| Which scope? | tu cuenta (pulsa Enter) |
| Link to existing project? | **n** |
| What's your project's name? | `control-de-campo` (o pulsa Enter) |
| In which directory is your code? | **./** (pulsa Enter) |
| Want to modify the settings? | **n** |

Sube el proyecto y te da una dirección. **Todavía no funciona**: le faltan las
llaves. Eso es el paso siguiente.

---

## Paso 3 — Poner las llaves

1. Abre **https://vercel.com/dashboard** y entra a tu proyecto
   `control-de-campo`.

2. Ve a **Settings** → **Environment Variables**.

3. Abre el archivo **`vercel-variables.txt`** que está en la carpeta del
   proyecto. Tiene las cinco variables preparadas y listas para copiar.

   ```
   notepad vercel-variables.txt
   ```

4. Agrega las **cuatro primeras** una por una. Para cada una:
   - **Key:** el nombre que dice el archivo
   - **Value:** el valor que dice el archivo
   - Marca las tres casillas: **Production**, **Preview** y **Development**
   - **Save**

   > La cuarta (`DRIVE_CREDENCIALES`) es larguísima: es todo lo que va entre
   > `>>>INICIO` y `<<<FIN`, en **una sola línea**. Cópiala completa.

   La quinta se agrega en el paso 5.

---

## Paso 4 — Publicar de verdad

De vuelta en la ventana negra:

```
npx vercel --prod
```

Ahora sí queda funcionando. Te da la dirección definitiva, algo como:

```
https://control-de-campo.vercel.app
```

**Ábrela en el celular.** Debe verse igual que en el computador.

---

## Paso 5 — Los códigos QR

Los QR tienen que apuntar a la dirección definitiva, no a `localhost`.

1. Vuelve a **Settings → Environment Variables** en Vercel.
2. Agrega la quinta variable:
   - **Key:** `NEXT_PUBLIC_URL_PUBLICA`
   - **Value:** la dirección que te dio Vercel, sin barra al final
3. Guarda y vuelve a publicar:

```
npx vercel --prod
```

Ahora entra a la ficha de cualquier equipo → **Ver código QR**. Abajo debe
decir *"Dirección pública: este adhesivo ya se puede imprimir"*.

**A partir de aquí los QR son definitivos.** La dirección no vuelve a cambiar,
así que puedes imprimirlos y pegarlos en los equipos sin miedo.

---

## Comprobar que todo quedó bien

En el celular, entra a la dirección y revisa:

1. **`/admin`** — las dos conexiones en verde
2. Abre un equipo → **Registrar intervención** → llena y guarda con una foto
3. Verifica en Drive que el acta llegó a `06_INTERVENCIONES`

Si algo falla, en Vercel hay una pestaña **Logs** que dice exactamente qué
pasó. Pásamelo y lo revisamos.

---

## Cada vez que haya cambios

Cuando yo modifique algo, para que llegue a producción basta con:

```
npx vercel --prod
```

---

## Cuidado con el archivo de variables

`vercel-variables.txt` tiene las llaves del sistema en texto plano. Ya está
bloqueado para que no se suba a git, pero **no lo mandes por correo ni por
WhatsApp**. Cuando termines de configurar Vercel puedes borrarlo: las llaves
originales siguen en `.env.local` y en Supabase.
