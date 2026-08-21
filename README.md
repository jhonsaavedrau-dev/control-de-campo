# Sistema de Control de Campo

Registro de intervenciones sobre controladores de plantas eléctricas, pensado
para usarse **con el celular en la mano y sin señal**, que es como se trabaja en
una planta.

Prototipo funcional: ya se puede navegar, registrar una intervención, reportar
una novedad e imprimir el acta.

---

## El problema que resuelve

El técnico que va a una planta anota la intervención en papel, y ese papel se
transcribe después — si alguien se acuerda. Entre la visita y el acta pasan días,
y lo que se pierde no es el papel: es el detalle de qué se hizo, cuándo vence la
próxima revisión y qué quedó pendiente.

Además, en una planta **no hay señal**. Cualquier herramienta que exija internet
para guardar un registro no sirve ahí.

---

## Qué hace

| Pantalla | Qué resuelve |
|---|---|
| **Inicio** | Lista los controladores con buscador, y avisa cuál tiene la revisión vencida |
| **Ficha del controlador** | Datos del equipo, backup de configuración, documentos e historial |
| **Registrar intervención** | Formulario completo. Asigna solo el consecutivo `INT-2026-0001` |
| **Acta de intervención** | Con la estructura del FOR-MTO-06. Imprimir → Guardar como PDF |
| **Reportar novedad** | Reporte de fallas con severidad |
| **Historial** | Todo lo registrado, en un solo sitio |

### Funciona sin señal

Si el celular se queda sin internet mientras se registra, aparece un aviso y
**el registro no se pierde**: queda guardado en el dispositivo y se sube solo
cuando vuelve la señal.

Esa fue la decisión de diseño que mandó sobre las demás. Un formulario que
falla sin conexión es un formulario que el técnico deja de usar a la segunda vez.

---

## Cómo abrirlo

Doble clic en **`INICIAR.bat`**. Se abre una ventana negra —ese es el motor, no
se cierra mientras se usa— y el navegador entra solo a `http://localhost:3000`.

Para apagarlo, se cierra la ventana negra.

Si prefieres la terminal:

```bash
npm install
npm run dev
```

---

## Con qué está hecho

- **Next.js** con App Router y TypeScript
- **Tailwind CSS**
- Los datos de ejemplo viven en `data/seed.json`; no hay base de datos todavía
- El guardado sin señal usa el almacenamiento del propio navegador

---

## Estado

Prototipo. Funciona de punta a punta con datos de ejemplo. Lo que falta para
producción: base de datos de verdad, cuentas de usuario y sincronización entre
varios técnicos.

Los datos de `data/seed.json` son **inventados**. No hay información real de
ningún cliente en este repositorio.

---

Hecho por [Jhon Saavedra](https://github.com/jhonsaavedrau-dev).
