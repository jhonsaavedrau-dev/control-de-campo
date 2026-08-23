# Control de Generación — PBI

Sistema de Control de Campo para **Gestión Energy SAS**.
Equipos de generación, controladores e intervenciones.

---

## Cómo abrirlo

Doble clic en **`INICIAR.bat`**.

Se abre una ventana negra (es el motor, no la cierres) y el navegador entra a
`http://localhost:3000`. Para apagarlo, cierra la ventana negra.

**Desde el celular:** en la ventana negra busca la línea que dice `Network` y
usa esa dirección, estando en el mismo wifi.

---

## Qué hace

| Pantalla | Qué hace |
|---|---|
| **Inicio** | Equipos agrupados por sede, con semáforo de estado y buscador. |
| **Ficha del equipo** | La pantalla que abre el técnico al escanear el QR. |
| **Código QR** | El adhesivo listo para imprimir y pegar en el equipo. |
| **Registrar intervención** | Formulario completo, con cámara para la evidencia. |
| **Acta** | El acta oficial, con botón para verla en PDF y para archivarla. |
| **Historial** | Todas las intervenciones, o las de un equipo. |
| **/admin/drive** | Estado de la conexión con Drive y creación de carpetas. |

---

## El ciclo completo

Al guardar una intervención, en un solo paso el sistema:

1. asigna el consecutivo `INT-AAAA-NNNN`;
2. actualiza el horómetro y el estado del equipo;
3. sube la evidencia fotográfica a `05_FOTOS/<intervención>/` del equipo;
4. genera el acta en PDF replicando el `Formato_Intervencion_PBI` — 8 secciones,
   casillas marcadas y las fotos incrustadas;
5. la archiva en `06_INTERVENCIONES` del equipo;
6. guarda el enlace de Drive en el registro.

La carpeta del equipo se ubica **por relación de identificadores**, nunca por
ruta fija ni por una columna de URL. Si no existe, se crea.

**Si Drive falla** (sin señal, permisos, cuota): la intervención se guarda
igual y el acta queda en `.data/actas`. Desde la pantalla del acta hay un botón
para reintentar el archivado.

**Sin señal:** aparece una barra abajo. El registro queda guardado en el
dispositivo y se sube solo cuando vuelve la conexión. Las fotos no caben en esa
cola: se adjuntan cuando haya señal.

---

## Google Drive

Conectado con cuenta de servicio contra la unidad compartida
**CONTROL GENERACION PRUEBA**.

El estado se revisa en `/admin/drive`, donde también está el botón para crear
la estructura de carpetas de todos los equipos (repetible sin duplicar nada).

Para pasar a producción se cambia **solo** `DRIVE_CARPETA_RAIZ` en `.env.local`
por el identificador de la unidad definitiva.

> **Importante:** la carpeta tiene que estar en una **Unidad compartida**. Las
> cuentas de servicio no tienen espacio propio y no pueden subir archivos a
> "Mi unidad". Los detalles están en `CONECTAR-DRIVE.md`.

---

## Lo que falta

1. **Login y roles** (técnico / supervisor / administrador). El esquema ya los
   contempla; hoy entra cualquiera sin clave.
2. **Supabase.** Hoy los datos viven en un archivo local. El `schema.sql` está
   escrito y listo para ejecutar.
3. **Panel de supervisión de escritorio** (modo oscuro), previsto en la
   composición pero todavía no construido.
4. **Publicar en internet**, para que los códigos QR apunten a una dirección
   fija y definitiva.

---

## Diseño

Dos contextos, a propósito:

- **Modo campo** (lo que hay hoy): claro, alto contraste, pensado para el
  celular bajo sol directo. Tipografías Barlow Semi Condensed, IBM Plex Sans e
  IBM Plex Mono. Sin degradados, sin sombras, sin brillos.
- **Modo oficina**: oscuro, reservado al panel de supervisión. Pendiente.

La identidad PBI (azul marino, amarillo, el símbolo del átomo con la llama) se
usa en la marca y en los documentos impresos.

---

## Datos

- `data/seed.json` — datos de arranque: 6 sedes, 15 equipos, 5 controladores
  reales, importados del Excel maestro.
- `.data/db.json` — lo que se guarda al usar el sistema (no va a git).
- `.data/actas` — actas que no se pudieron archivar en Drive.

Para **empezar de cero**: borra la carpeta `.data` y vuelve a abrir el sistema.

---

## Archivos que no van a git

`credenciales-drive.json` y `.env.local` están bloqueados a propósito: son la
llave del robot y la configuración de la carpeta.

---

## Estructura

```
app/
  page.tsx                       Inicio: equipos por sede
  equipo/[id]/                   Ficha del equipo  ← lo que abre el QR
  equipo/[id]/qr/                Adhesivo QR imprimible
  intervencion/nueva/            Formulario (con cámara)
  intervencion/[id]/             Acta
  intervenciones/                Historial
  controlador/[id]/              Redirige a la ficha de su equipo
  admin/drive/                   Estado y administración de Drive
  api/                           Guardado, PDF, archivado y estructura

lib/
  tipos.ts                       Modelo de datos, igual a schema.sql
  db.ts                          Acceso a datos  ← lo único que cambia con Supabase
  drive.ts                       Google Drive con cuenta de servicio
  estructura-drive.ts            Las carpetas por sede y equipo
  fotos.ts                       Evidencia fotográfica
  pdf-acta.tsx                   El acta oficial en PDF
  archivar.ts                    Fotos + PDF + archivado, en un paso
  pendientes.ts                  Cola para trabajar sin señal

docs/                            Formato oficial y estructura del Drive
schema.sql                       Base de datos para Supabase
```

Los nombres de campo son **idénticos a `schema.sql`** a propósito: al conectar
Supabase el mapeo es uno a uno.
