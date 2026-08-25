# Sistema de Control de Campo PBI
## Control de Generación — Petroleum Blending International SAS ESP

### Documento de arquitectura y decisiones de proyecto

---

## 1. Objetivo del sistema

Digitalizar el proceso de operación, mantenimiento y documentación de los equipos de generación eléctrica de Petroleum Blending International SAS ESP, reemplazando el modelo actual basado en Excel, Google Sheets y Drive dispersos por un sistema centralizado donde cada equipo tiene una identidad digital propia, accesible mediante un código QR.

El flujo objetivo para el técnico en campo es:

Escanear QR del equipo → abrir la ficha digital en el celular → pulsar "Registrar intervención" → diligenciar el formulario → adjuntar fotografías → guardar → el sistema genera el documento de intervención, lo archiva en la carpeta correcta de Drive y actualiza el historial del equipo automáticamente.

---

## 2. Restricción de negocio

El único requisito no negociable del cliente es que **el almacenamiento de archivos (fotografías y documentos de intervención) debe vivir en Google Drive**. Esta restricción no obliga a construir el sistema completo sobre Google Apps Script; solo obliga a que los archivos finales terminen guardados en Drive, dentro de la estructura de carpetas ya definida.

Esa restricción se cumple integrando la **API de Google Drive** desde un backend propio, usando una cuenta de servicio (Service Account) con acceso a la carpeta raíz del proyecto.

---

## 3. Decisión de arquitectura

Se descarta continuar exclusivamente sobre Google Apps Script como backend definitivo del sistema, por las siguientes limitaciones identificadas:

- Tiempo de ejecución limitado a 6 minutos por función y cuotas diarias de la cuenta de Google, que se vuelven un cuello de botella con varios técnicos subiendo evidencia fotográfica de forma simultánea.
- Sin soporte real de funcionamiento sin conexión, crítico para técnicos en campo con señal intermitente.
- Google Sheets como base de datos no escala de forma confiable a medida que crecen las sedes, los equipos y el historial de intervenciones.
- Un único archivo de código de gran tamaño es difícil de mantener, versionar y probar en equipo.
- Limita la posibilidad de convertir el sistema en un producto ofrecido a otros clientes en el futuro.

### Arquitectura adoptada

| Componente | Tecnología | Rol |
|---|---|---|
| Base de datos | PostgreSQL (Supabase) | Almacena sedes, equipos, controladores e intervenciones |
| Backend | Next.js (API Routes / Route Handlers) | Lógica de negocio, autenticación, integración con Drive |
| Frontend | Next.js (PWA) | Ficha digital del equipo y formulario de intervención, con soporte offline |
| Almacenamiento de archivos | Google Drive API (Service Account) | Fotografías de evidencia y PDF de intervención, respetando la estructura de carpetas ya definida |
| Generación de PDF | Librería de generación de documentos en el backend (a definir: react-pdf o plantilla DOCX con relleno de campos) | Reemplaza la plantilla de Google Docs usada en la versión Apps Script |
| Autenticación | Supabase Auth | Identifica a cada técnico que registra una intervención |
| Identificación de equipos | Código QR apuntando a la URL de la ficha del equipo | Sin cambios respecto al diseño original |

La estructura de carpetas en Drive se conserva exactamente igual a la ya definida:

```
CONTROL GENERACION
└── 01_SEDES
    └── SD-XXX
        └── 01_EQUIPOS
            └── GE-XXX
                └── 06_INTERVENCIONES
```

La búsqueda de la carpeta correspondiente sigue haciéndose por relación de IDs (Sede → Equipo), no por una ruta fija ni por una columna de URL almacenada, tal como se corrigió en la versión anterior del proyecto.

---

## 4. Continuidad respecto a la versión anterior (Apps Script)

Lo que se traslada sin cambios, porque ya estaba correctamente resuelto a nivel de diseño:

- El modelo de entidades: Sedes, Equipos, Controladores, Intervenciones.
- Los campos del formulario de intervención (técnico, tipo, orden de servicio, permiso de trabajo, horómetro, trabajo realizado, novedad, resultado, backup, recibido por, pendientes, responsable del cliente, observaciones, evidencia fotográfica). Se añade el **cargo** del técnico, y el cierre del acta deja una sola firma: la columna «responsable del cliente» se imprimía vacía en cada acta y PBI pidió quitarla — quien recibe sigue quedando escrito en la sección 6.
- El formato del identificador de intervención: `INT-AAAA-NNNN`, consecutivo por año.
- La estructura de carpetas en Drive y la lógica de búsqueda por ID.
- El abandono definitivo de la plantilla `FOR-MTO-06`.

Lo que se reconstruye:

- La base de datos, de Google Sheets a PostgreSQL (ver `schema.sql`).
- El backend, de Apps Script a Next.js.
- El frontend, de HTML servido por Apps Script a una PWA con soporte offline.
- La generación del PDF, para que coincida exactamente con el formato oficial `Formato_Intervencion_PBI` (pendiente crítico ya identificado: la plantilla anterior no rellenaba las celdas ni los checkboxes del documento real).

---

## 5. Esquema de base de datos

Ver archivo adjunto `schema.sql`. Resumen de tablas:

- `usuarios`: técnicos, supervisores y administradores.
- `sedes`: sitios operativos de Petroleum Blending International SAS ESP.
- `equipos`: grupos electrógenos físicos.
- `controladores`: paneles de control asociados a cada equipo, cada uno con su propia ficha QR.
- `intervenciones`: núcleo del sistema, un registro por cada mantenimiento, diagnóstico o inspección.
- `intervencion_fotos`: evidencia fotográfica, una fila por foto en vez de una lista de URLs.
- `backups` y `documentos`: heredados del diseño anterior, para continuidad.
- `contador_consecutivos`: genera el ID `INT-AAAA-NNNN` de forma segura ante escrituras simultáneas.
- Vista `ficha_equipo`: consolida equipo, controlador, sede y fecha de última intervención en una sola consulta, pensada para alimentar directamente la ficha digital.

---

## 6. Próximos pasos

1. Crear el proyecto en Supabase y ejecutar `schema.sql`.
2. Crear la cuenta de servicio de Google con acceso a la carpeta `CONTROL GENERACION` y generar sus credenciales.
3. Construir el backend en Next.js: endpoints para consultar la ficha de un equipo y para guardar una intervención (base de datos + subida a Drive + generación de PDF).
4. Construir el frontend PWA: página de ficha del equipo y formulario de intervención, con manejo de estado sin conexión.
5. Resolver la generación del PDF contra el formato oficial `Formato_Intervencion_PBI`, incluyendo el manejo de los checkboxes.
6. Probar el flujo completo con un equipo real: escanear QR, registrar una intervención de prueba, verificar que el PDF y las fotos queden en la carpeta correcta de Drive.
7. Migrar los datos existentes de Google Sheets (si los hay) hacia PostgreSQL.
8. Entregar a un técnico de confianza para prueba en campo antes de un despliegue general.

---

## 7. Datos de referencia del proyecto anterior

- Spreadsheet ID original (Google Sheets): `1e9OkuOyPnbP3ERmhMnkB2qUaMVpDwNCj2mPaK0uDddM`
- ID de la plantilla Google Doc usada en la versión Apps Script: `1vhapCX8ErPeYDZjVDmn_ZF9gY6TnLMJ5`
- Nombre de la carpeta raíz en Drive: `CONTROL GENERACION`
