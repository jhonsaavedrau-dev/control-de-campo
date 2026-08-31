# Bitácora — la conexión con la hoja de la planta

Lo que hay que saber para trabajar sobre esto sin volver a descubrirlo.
Escrito el 31 de agosto de 2026.

---

## Qué hace

La generación de la Extractora La Paz vivía en una hoja de Google que
alguien tenía que abrir. Ahora el sistema la lee solo y la enseña en
**Operación**: horómetro, diésel, GLP y kilovatios.

La hoja **no se toca**. El turno la sigue llenando igual; el sistema solo
lee, con permiso `drive.readonly`.

| De dónde sale | A dónde va |
|---|---|
| Registro hora a hora | `registros_operacion` |
| Cierre de las 24:00 | `generacion_diaria` |
| Horómetros creíbles | `lecturas_horometro` |
| Tanque y facturado | `consumo_planta` |
| Cada corrida | `sincronizaciones` |

---

## Lo que costó entender de la hoja

Cuatro cosas que no son evidentes y que, mal entendidas, dan cifras
falsas con toda la seguridad del mundo. Las cuatro están comprobadas
contra algo independiente, no deducidas.

### 1. No anota consumos: anota contadores acumulados

El consumo del día es la **diferencia** contra el cierre anterior del
mismo equipo.

> Comprobado contra su propia pestaña «BD Consolidados»: la diferencia
> del contador de diésel del C18 da 513, 512, 469 y 499 galones del 14 al
> 20 de agosto — exactamente lo que ellos reportan.

### 2. El C15 marca litros; el C18, galones

La misma columna no significa lo mismo en todas las filas.

> La hoja lleva aparte el nivel del tanque. `C18 + C15/3,785` da el
> tanque **al galón** los once días en que los dos anduvieron: 641, 721,
> 672, 676, 795. En galones se pasaría al doble todos los días.

Sin corregirlo, el C15 aparentaba gastar 45 gln/h en vez de 12. Vive en
`CONTADOR_EN_LITROS`, en `lib/sincronizar.ts`.

### 3. Los tres CAT 3412 comparten UN medidor de GLP

El turno anota su lectura en la fila del equipo que le toca.

> Solo un tercio de los días trae lectura; la del #1 aparece con el mismo
> valor que la del #3; y la diferencia del contador del #3 ella sola da
> el consumo de toda la planta que PBI factura.

Por eso el GLP va **por bloque y no por equipo**. Repartido daba 37,6
kWh/kg en una máquina y 1,2 en otra: ruido con aspecto de medida. Junto
da 2,8, que es lo que da un motor de gas.

### 4. La cifra de diésel de la hoja es la del tanque, no la del motor

> La columna de diésel de «BD Consolidados» es idéntica a la pestaña «BD
> Diesel» —el nivel del tanque— en 139 de 149 días.

Son dos magnitudes distintas: lo que quemó ese motor y lo que salió de la
planta. La del tanque es siempre mayor. Se guardan las dos, cada una en
su sitio, y en la gráfica van juntas: línea sólida los contadores,
punteada el tanque.

### Y el factor del GLP

PBI mide en m³ y el cliente cobra en kg. El factor se **midió**, no se
sacó de una tabla: la razón entre los kg facturados y los m³ del contador
da **2,19** en todos los días comparados, sin desviarse.

---

## Cada cuánto se actualiza

**La garantía: nunca ves datos con más de diez minutos.** No la da ningún
reloj de fuera —ninguno gratis promete la hora— sino la propia pantalla:

- **Al abrirla**, si la hoja lleva más de diez minutos sin traerse, se
  trae. El que mira es el que dispara.
- **Cada diez minutos** mientras siga abierta. Se para si la pestaña se
  esconde y se pone al día al volver.

Preguntar sale casi gratis: primero se consulta la fecha de modificación
de la hoja, y si no se ha tocado la corrida acaba en **tres décimas de
segundo** en vez de trece.

Dos relojes de fondo, que **no son la garantía** y no hay que confiarles
nada:

- **Vercel**, una vez al día a las 6 a.m. de Colombia. Es lo único que
  permite el plan Hobby.
- **GitHub Actions**, cada hora. Solo sirve para que quien abra la página
  después de un fin de semana se la encuentre cargada. Se probó con
  `*/10` y en 33 minutos no disparó ni una vez: GitHub trata las tareas
  programadas como «cuando pueda».

---

## Cómo se comprueba

```bash
npm run migraciones   # qué falta poner en Supabase
npm run datos         # qué hay en la base y las últimas corridas
npm run comprobar     # cruza el GLP contra lo que PBI factura
npm run unidades      # en qué unidad marca el contador de cada equipo
npm run sincronizar   # en seco; añade -- --escribir para guardar
```

`npm run comprobar` es el que avisa si la hoja cambió de forma: compara
los kilos y los kWh del bloque de GLP contra la propia hoja de PBI. Si el
mes en curso deja de ir al 100%, el sincronizador se quedó atrás.

`npm run unidades` es lo primero que hay que correr **cuando entren las
otras cinco plantas**. Si a algún equipo le sale una tasa rara de consumo
por hora, lo que se cambia es la tabla `CONTADOR_EN_LITROS`, no la cifra.

---

## Cómo se publica

Vercel **no está atado a git**. Empujar a GitHub no publica nada:

```bash
npx vercel --prod --yes --force
```

- **`sistema-completo`** es la rama donde vive el sistema. Es la que se
  despliega.
- **`main`** está muy por detrás a propósito y solo lleva
  `.github/workflows/sincronizar.yml`, porque GitHub únicamente programa
  tareas desde la rama por defecto.

Las variables sensibles de Vercel salen como `[SENSITIVE]` en
`vercel env pull`: no se pueden leer. Para comprobar algo que dependa de
una hay que generarla de nuevo y ponerla en los dos sitios.

---

## Decisiones de la pantalla, y por qué

- **El diésel y el GLP no se suman nunca.** Se miden y se cobran en
  unidades distintas; un total mezclado no significaría nada.
- **Los equipos van en fichas, no en tabla.** Siete columnas en un
  teléfono de 375 px o se salen por el lado o no se leen.
- **Se distingue «cero» de «no se sabe».** El C15 no tiene contador de
  energía: un 0 kWh junto a dos mil galones haría pensar que gastó
  combustible sin generar nada.
- **No hay botón de traer la hoja.** Un botón que hace lo que ya pasa
  solo no es un atajo, es una duda.
- **Cada suma dice de cuándo es.** «2.330 h» sin periodo no significa
  nada.
- **Un día que no se puede creer queda sin cifra, no en cero.** Una
  lectura que faltó o un día que arrastra al anterior se señalan; hay un
  contador de «días con algo que mirar».

---

## Lo que queda pendiente

- **Las otras cinco plantas.** Tienen su propio registro. Al traerlas:
  correr `npm run unidades`, revisar `EQUIPOS_DE_LA_HOJA` y
  `COMBUSTIBLE_DE_LA_HOJA`, y avisar si alguna comparte medidor como los
  3412.
- **Avisar al turno** de que no use *Actualizar* en el formulario del
  Excel hasta que se arregle el desajuste de columnas de sus macros: es
  lo que corrompió 225 filas.
- **Nombres de aceite duplicados** en el catálogo: `hdax`/`HDAX`,
  `chevron 15w-40`/`Chevron 15w40`, `MOBIL 15W40`/`15W41`.
- **El aceite de las otras plantas** (137 filas) espera a que sus equipos
  existan en el sistema.
- Si algún día hace falta que se actualice cada diez minutos **también
  cuando nadie mira**, la única vía real es subir Vercel a Pro.
