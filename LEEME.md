# Sistema de Control de Campo — PBI

Prototipo funcional. Ya se puede abrir, navegar, registrar intervenciones,
reportar novedades e imprimir el acta.

---

## Cómo abrirlo

Haz **doble clic en `INICIAR.bat`**.

Se abre una ventana negra (esa es el motor, **no la cierres** mientras uses el
sistema) y el navegador entra solo a:

```
http://localhost:3000
```

Para apagarlo, cierra la ventana negra.

---

## Qué se puede hacer hoy

| Pantalla | Qué hace |
|---|---|
| **Inicio** | Lista los controladores, con buscador y contadores. Avisa cuál tiene la revisión vencida. |
| **Ficha del controlador** | La pantalla de tu diseño: datos del equipo, del controlador, backup, documentos e historial. |
| **Registrar intervención** | Formulario completo. Asigna solo el consecutivo `INT-2026-0001`. |
| **Acta de intervención** | El acta con la estructura del FOR-MTO-06. Con **Imprimir → Guardar como PDF** sale el documento. |
| **Reportar novedad** | Reporte de fallas con severidad. |
| **Historial** | Todas las intervenciones y todas las novedades. |

### Funciona sin señal

Si el celular se queda sin internet mientras registras, aparece una barra abajo
avisando. El registro **no se pierde**: queda guardado en el dispositivo y se
sube solo cuando vuelve la señal.

### Para probarlo desde el celular

Con el sistema encendido, mira la dirección `http://192.168.x.x:3000` que aparece
en la ventana negra (dice **Network**). Escríbela en el celular estando en el
mismo wifi.

---

## Lo que todavía NO está

Estas cosas están pendientes **a propósito**, porque necesito información tuya:

1. **El PDF oficial FOR-MTO-06.** El acta actual sigue la estructura del formato
   (Solicitud / Equipo / Descripción / Mantenimiento / Cierre) pero **no es una
   copia exacta**. Para eso necesito el Excel del formato.

2. **Las casillas marcadas «Por definir»** en el acta: Power Center, orden de
   servicio, permiso de trabajo, dependencia solicitante, repuestos, horas
   hombre, tipo de mano de obra y quién recibe.

3. **Login y roles** (técnico / supervisor). Hoy entra cualquiera sin clave.

4. **Guardado en Google Drive.** El acta se imprime desde el navegador; todavía
   no se archiva sola en `06_INTERVENCIONES`.

5. **Fotos.** Los espacios están, pero no se pueden subir todavía.

6. **Datos reales.** Los que ves son de ejemplo, sacados de tu diseño. Cuando me
   pases la hoja de Controladores, los reemplazo por los de verdad.

---

## Dónde están los datos

- `data/seed.json` — los datos de arranque (los de ejemplo).
- `.data/db.json` — lo que se va guardando al usar el sistema.

Si quieres **empezar de cero**, borra el archivo `.data/db.json` y vuelve a abrir
el sistema: se regenera desde los datos de ejemplo.

---

## Estructura del proyecto

```
app/                      Las pantallas
  page.tsx                  Inicio (lista de controladores)
  controlador/[id]/         Ficha del controlador
  intervencion/nueva/       Formulario de intervención
  intervencion/[id]/        Acta imprimible
  novedad/nueva/            Reporte de novedad
  intervenciones/           Historial completo
  novedades/                Novedades reportadas
  api/                      Guardado de intervenciones y novedades

components/               Piezas reutilizables (ficha, formularios, iconos)
lib/
  db.ts                     Acceso a datos  <-- esto es lo único que cambia
                            cuando conectemos Supabase
  tipos.ts                  Estructura de sedes, equipos, controladores...
  pendientes.ts             Cola para trabajar sin señal
data/seed.json            Datos de ejemplo
```
