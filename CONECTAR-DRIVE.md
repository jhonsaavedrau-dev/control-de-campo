# Conectar el Drive — con carpeta de prueba

El objetivo es que el sistema guarde los PDF y las fotos en Drive, **sin tocar
el Drive real** hasta que estemos seguros.

La idea: creamos una carpeta de prueba idéntica y le damos acceso a un "robot"
(una cuenta de servicio) **únicamente a esa carpeta**. Si algo sale mal, el
Drive real ni se entera.

---

## Parte 1 — La carpeta de prueba (5 minutos)

En tu Drive, al lado de `CONTROL GENERACION`, crea:

```
CONTROL GENERACION - PRUEBA
└── 01_SEDES
    └── SD-001
        └── 01_EQUIPOS
            └── GE-001
                └── 06_INTERVENCIONES
```

Copia dentro un par de archivos de ejemplo (una foto, un PDF viejo) para que yo
vea cómo se llaman las cosas en la vida real.

**Importante:** copia también ahí el `Formato_Intervencion_PBI.docx`. Ese es el
archivo que me falta para armar el documento oficial.

---

## Parte 2 — Crear el robot

### Paso 0 — El sitio correcto

Tiene que ser **`console.cloud.google.com`**.

No es `admin.google.com` ni `drive.google.com`. La consola se ve así: fondo
blanco, arriba a la izquierda dice **Google Cloud**, y hay una barra de
búsqueda ancha arriba.

Revisa tu foto de perfil arriba a la derecha: debes estar con **la misma cuenta
que tiene el Drive**. Si tienes varias cuentas de Google, esta es la trampa más
común de todas.

### Paso 1 — Crear el proyecto

**Sin este paso, "Cuentas de servicio" no aparece por ningún lado.**

1. Arriba, a la derecha de **Google Cloud**, hay un botón. Puede decir el
   nombre de un proyecto o **"Selecciona un proyecto"**. Clic ahí.
2. En la ventanita que se abre, arriba a la derecha: **"PROYECTO NUEVO"**.
3. Nombre: `control-campo-pbi`
4. Botón **CREAR**.
5. Espera unos 30 segundos. Aparece una campanita arriba a la derecha; ábrela y
   pulsa **"SELECCIONAR PROYECTO"**.

**Verifica:** arriba, junto a "Google Cloud", debe decir `control-campo-pbi`.

### Paso 2 — Habilitar la API de Drive

1. En la barra de búsqueda escribe: `Google Drive API`
2. Clic en el resultado llamado exactamente **Google Drive API**.
3. Botón azul **HABILITAR**. Espera a que termine.

### Paso 3 — Cuentas de servicio

Atajo directo:

```
https://console.cloud.google.com/iam-admin/serviceaccounts
```

O por el menú: ícono de **tres rayitas** (☰) arriba a la izquierda →
**"IAM y administración"** → **"Cuentas de servicio"**.

> En inglés se llama **"IAM & Admin" → "Service Accounts"**. Puedes cambiar el
> idioma en el engranaje de arriba a la derecha → Preferencias → Idioma.

Ya adentro:

4. **"+ CREAR CUENTA DE SERVICIO"**
5. Nombre: `robot-control-campo` → **CREAR Y CONTINUAR**
6. El paso de "roles": **no pongas ninguno** → **CONTINUAR**
7. **LISTO**

### Paso 4 — Descargar la llave

8. Aparece la cuenta en la lista con un correo largo, algo como:
   ```
   robot-control-campo@control-campo-pbi.iam.gserviceaccount.com
   ```
   **Cópialo**, lo necesitas en la Parte 3.
9. Clic sobre ese correo → pestaña **"CLAVES"**
10. **"AGREGAR CLAVE"** → **"Crear clave nueva"** → **JSON** → **CREAR**
11. Se descarga un archivo `.json`.

---

## ⚠️ Sobre ese archivo .json

Es **la llave del robot**. Quien lo tenga puede entrar a lo que el robot vea.

- **NO lo pegues en el chat.** No necesito abrirlo ni una vez.
- Guárdalo en la carpeta del proyecto con este nombre exacto:

```
control-de-campo\credenciales-drive.json
```

Ya está bloqueado para que nunca se suba a git.

Si crees que se filtró: vuelve a la pestaña **Claves**, bórrala y crea otra. El
robot viejo queda inservible al instante.

---

## Parte 3 — Darle acceso solo a la prueba (2 minutos)

1. Vuelve a tu Drive.
2. Clic derecho sobre **`CONTROL GENERACION - PRUEBA`** → **Compartir**.
3. Pega el correo largo del robot.
4. Permiso: **Editor**.
5. **Desmarca** "Notificar a las personas".
6. **Enviar** / **Compartir**.

Listo. El robot ve esa carpeta y nada más. El `CONTROL GENERACION` real le
sigue siendo invisible.

---

## Si algo no calza

**"Me pide activar la facturación o una tarjeta"**
Para la API de Drive no hace falta. Si insiste, avísame antes de meter tarjeta.

**"Dice que mi organización no lo permite"**
Tu cuenta es corporativa y sistemas tiene bloqueada esa función. Salida fácil:
crea el proyecto con **una cuenta personal de Gmail tuya**. El robot vive en esa
cuenta, y desde el Drive de la empresa compartes la carpeta de prueba con su
correo. Funciona igual: compartir no depende de a qué organización pertenezca
quien recibe.

**"No veo el menú de las tres rayitas"**
La ventana está muy angosta y Google lo esconde. Maximiza el navegador.

**"No encuentro Cuentas de servicio"**
Casi siempre es que falta el Paso 1 (no hay proyecto seleccionado), o que la
consola está en inglés y se llama *Service Accounts*.

---

## Cuando termines

Dime **"listo el drive"**. Yo me encargo del resto: buscar las carpetas por ID,
subir las fotos y archivar los PDF en `06_INTERVENCIONES`.

Pasar después al Drive real es **cambiar un solo dato de configuración**.

---

# Parte 4 — Unidad compartida (esto faltaba)

Al probar la subida real apareció un límite de Google que conviene conocer:

> **Las cuentas de servicio no tienen espacio de almacenamiento propio.**

Es decir: el robot **sí puede crear carpetas** (no ocupan espacio), pero **no
puede subir archivos** a una carpeta que viva en tu «Mi unidad», porque los
archivos necesitan un dueño con cuota, y el robot no la tiene.

La solución que recomienda Google es poner la carpeta en una
**Unidad compartida**. Ahí los archivos pertenecen a la unidad, no a una
persona ni al robot.

## Pasos

1. Abre Drive. En la columna de la izquierda busca **«Unidades compartidas»**.

   > Si no aparece esa opción, tu cuenta no es de Google Workspace. Mira la
   > sección «Si no tienes Unidades compartidas» más abajo.

2. Clic derecho sobre **Unidades compartidas** → **Nueva unidad compartida**.
   Ponle de nombre: `CONTROL GENERACION`.

3. Entra a la unidad recién creada → botón **Administrar miembros** (o el ícono
   de personas arriba).

4. Agrega el correo del robot:
   ```
   robot-control-campo@control-campo-pbi.iam.gserviceaccount.com
   ```
   Con el rol **Administrador de contenido**.

5. Ahora mueve la carpeta `control generacion prueba1` dentro de esa unidad
   compartida: arrástrala, o clic derecho → **Organizar** → **Mover**.

6. Listo. El identificador de la carpeta **no cambia** al moverla, así que el
   `.env.local` sigue igual y no hay que tocar nada.

Para comprobarlo, abre `http://localhost:3000/admin/drive`: los cuatro pasos
deben quedar en verde.

## Si no tienes Unidades compartidas

Significa que la cuenta es un Gmail normal, no Workspace. Hay dos caminos:

- **Usar una cuenta de Workspace** de la empresa (el dominio `pbi.com.co`
  probablemente ya lo es). Es lo más limpio.
- **Cambiar a permiso por usuario (OAuth)**: en vez de un robot, el sistema
  pide permiso una vez a una persona y sube los archivos como esa persona. Es
  más trabajo de montar y hay que renovarlo cada cierto tiempo. Dímelo y lo
  armo así.

## Mientras tanto, nada se pierde

Si el archivado a Drive falla por cualquier motivo, el acta en PDF **se guarda
igual** en la carpeta `.data/actas` del proyecto, y desde la pantalla del acta
se puede reintentar el archivado cuando el Drive quede listo.
