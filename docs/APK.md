# La APK

Cómo convertir el sistema en una aplicación de Android.

---

## La idea, en una frase

**No se escribe una aplicación nueva.** Se empaqueta la que ya existe.

Android puede meter una página web dentro de una APK de verdad —se llama
*Trusted Web Activity*, TWA— y el resultado es indistinguible de una
aplicación nativa: icono en el cajón, pantalla completa sin barra de
direcciones, y sitio en la Play Store si algún día se quiere.

La ventaja no es ahorrar trabajo hoy: es que **no hay dos sistemas que
mantener**. Cada arreglo se publica una vez, en Vercel, y los teléfonos
lo tienen sin actualizar nada. Una aplicación nativa aparte significaría
que el técnico con la versión vieja ve otros datos que el de la oficina,
y ese es exactamente el problema que este proyecto vino a quitar.

---

## Lo que ya está hecho

Todo lo que depende del código está listo y publicado:

| Pieza | Dónde | Para qué |
|---|---|---|
| Manifiesto | [`app/manifest.ts`](../app/manifest.ts) | Nombre, colores, iconos, arranque en pantalla completa |
| Iconos 192 y 512 | `public/icono-*.png` | Los dos tamaños que exige el empaquetador |
| Icono enmascarable | `public/icono-enmascarable-512.png` | Android recorta las esquinas según el teléfono |
| Service worker | [`public/sw.js`](../public/sw.js) | Requisito para instalar, y copia de emergencia sin señal |
| Registro | [`components/RegistrarServicio.tsx`](../components/RegistrarServicio.tsx) | Lo da de alta después de cargar |
| Puerta abierta | [`middleware.ts`](../middleware.ts) | El manifiesto, los iconos y `.well-known` se piden **antes** de entrar |

**Se puede comprobar hoy mismo, sin empaquetar nada:** abrir
https://control-de-campo.vercel.app en Chrome de Android y buscar
«Instalar aplicación» o «Añadir a la pantalla de inicio». Si aparece, el
sistema ya cumple lo que la APK necesita. Para mucha gente esto es
suficiente y no hace falta llegar a la Play Store.

---

## Lo que falta, y por qué no lo puedo hacer yo

Tres cosas, y las tres necesitan a una persona:

1. **La llave de firma.** Una APK va firmada con un certificado que
   identifica a quien la publica. Es un secreto de la empresa y se
   genera una sola vez: si se pierde, **no se puede volver a publicar
   una actualización de esa aplicación nunca más**. Tiene que crearla y
   guardarla alguien de Gestión Energy, no salir de un chat.

2. **Java y el SDK de Android.** El empaquetador se los baja solo la
   primera vez, pero son un par de gigas.

3. **La cuenta de la Play Store**, si se quiere publicar ahí. Son 25
   dólares, una vez. No hace falta para instalar la APK a mano.

---

## Los pasos

### 1. Empaquetar

```bash
npx @bubblewrap/cli init --manifest https://control-de-campo.vercel.app/manifest.webmanifest
```

Pregunta unas cuantas cosas y casi todas las saca del manifiesto. Las que
importan:

- **Application ID**: algo como `co.com.gestionenergy.generacion`. Es el
  identificador único de la aplicación en Android y **no se puede
  cambiar después**.
- **Signing key**: dejar que la cree él la primera vez. Guardar el
  archivo `.keystore` y su contraseña donde se guarden las cosas serias
  de la empresa. Ver el punto 1 de arriba.

Después:

```bash
npx @bubblewrap/cli build
```

Salen dos archivos: `app-release-signed.apk` (para instalar a mano) y
`app-release-bundle.aab` (para la Play Store).

### 2. Quitar la barra del navegador

Sin este paso la aplicación se abre con la barra de direcciones puesta
arriba, que es justo lo que se quería evitar.

`bubblewrap build` imprime la **huella SHA-256** del certificado. Con
ella se crea el archivo `public/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "co.com.gestionenergy.generacion",
    "sha256_cert_fingerprints": ["LA:HUELLA:QUE:IMPRIMIO:BUBBLEWRAP"]
  }
}]
```

Se publica con `npx vercel --prod --yes --force` y se comprueba que
responde:

```bash
curl https://control-de-campo.vercel.app/.well-known/assetlinks.json
```

Si eso devuelve la página de entrar en vez del JSON, algo se rompió en
`PUBLICAS` de `middleware.ts` — está contemplado, pero conviene mirarlo.

> Si se publica por la Play Store, la huella que vale es **la de Google**,
> no la del `.keystore` local: Google vuelve a firmar la aplicación al
> subirla. Sale en Play Console → Integridad de la aplicación.

### 3. Instalar

Para probar, sin Play Store: pasar el `.apk` al teléfono y abrirlo. Hay
que permitir «instalar aplicaciones de esta fuente» una vez.

---

## Lo que conviene saber antes de empezar

**La sesión.** El sistema pide entrar con correo y contraseña, y la
sesión vive en una cookie. Dentro de la TWA funciona igual, pero cada
técnico tendrá que entrar la primera vez que abra la aplicación. Con la
cookie de Supabase la sesión aguanta, así que es una sola vez —conviene
probarlo con un teléfono real antes de repartirla.

**El QR sigue mandando.** Los códigos pegados en los equipos apuntan a
`https://control-de-campo.vercel.app/equipo/GE-XXX`. Con la aplicación
instalada y `assetlinks.json` en su sitio, Android abre esos enlaces
**dentro de la aplicación** en vez del navegador. Eso es lo que hace que
escanear y trabajar sea un solo gesto, y es la razón de verdad para
llegar hasta el paso 2.

**La cámara** funciona igual dentro de la TWA: es el mismo Chrome por
debajo, con los mismos permisos.

**No hace falta tocar la APK para actualizar el sistema.** Solo se
reconstruye cuando cambie el icono, el nombre o el identificador. Todo
lo demás se publica en Vercel como siempre.
