# Productos privados: primera version

Modulo independiente del monitor de libros. No requiere APIs publicas: abre
paginas con Playwright y lee JSON-LD Product/Offer o el precio principal del DOM.

## Alcance y estado

La infraestructura y los adaptadores iniciales estan probados con paginas
simuladas. Falta validar y ajustar cada tienda con URLs reales del usuario.
No se promete compatibilidad universal: cambios de HTML, geolocalizacion,
variantes, vendedores y bloqueos pueden impedir una lectura verificable.

- Amazon: dominios amazon.com.mx y amazon.com; datos estructurados primero,
  DOM como respaldo. Sin moneda explicita, el respaldo DOM solo admite el sitio mexicano.
- Mercado Libre: dominios mexicanos www y articulo; datos estructurados y precio
  principal del DOM, sin usar precios tachados o de recomendaciones.
- Liverpool, Palacio de Hierro, Sears, Walmart Mexico, Sanborns, Coppel y Home Depot Mexico:
  primer adaptador generico de datos estructurados. Si faltan datos inequivocos,
  registra el fallo; no adivina selectores ni toma un precio de otro producto.
- Enlaces cortos, dominios no admitidos, HTTP y URLs con credenciales se rechazan.

## Separacion y privacidad

- Catalogo, URLs, objetivos, ofertas e historial: `data/products.db`.
- Reporte: `private-products/report.html`.
- Sesion del navegador: `private-products/browser-profile/`.
- `data/` y `private-products/` estan excluidos de Git.
- GitHub Pages sigue publicando solo `reports/`, que corresponde a libros.
- El servidor de productos escucha en `127.0.0.1:4174` y solo sirve el reporte.
  No expone SQLite, configuracion ni archivos del perfil.
- No hay notificaciones Telegram para productos en esta primera version.

Para mantener esta separacion utiliza `products:preview`, no un servidor generico
sobre la raiz del repositorio. Esta version es local: no incluye autenticacion
para acceso remoto ni cifrado de la base. No publiques `private-products/`.

## Agregar un producto

Desde la raiz, con Node y Playwright instalados:

```bash
npm run products:add -- --url "URL_DIRECTA_DEL_PRODUCTO" --name "Nombre" --category "Tecnologia" --target 1500 --currency MXN
npm run products:list
```

El objetivo es el precio unitario publicado, sin envio. `--target` es opcional;
la moneda por defecto es MXN. Puedes fijar `--seller "Vendedor"` y
`--variant "Negro 128 GB"`. Si la pagina no permite verificar esos datos,
la lectura se considera ambigua y no se guarda un precio nuevo.

Un producto puede tener varias ofertas en tiendas distintas. Para vincular otra
URL al ID que muestra `products:list`:

```bash
npm run products:add -- --product 1 --url "OTRA_URL_DEL_MISMO_PRODUCTO"
```

Con `--product` no se vuelven a indicar nombre, categoria, objetivo ni moneda.
El agrupamiento entre tiendas es explicito: no se unen productos automaticamente
por similitud de titulo.

## Consultar precios y ver el historico

```bash
npm run products:run
npm run products:preview
```

Abre `http://127.0.0.1:4174`. Para ver el navegador durante la lectura:

```bash
npm run products:run -- --manual
```

Si aparece una verificacion en una pagina y la terminal es interactiva, se puede
resolver manualmente y pulsar ENTER. No se eluden controles de acceso. Respuestas
HTTP 401, 403 o 429 se registran como bloqueos sin reintentos automaticos.
Las ofertas se consultan secuencialmente con una pausa entre lecturas.

Para reconstruir el reporte sin consultar tiendas:

```bash
npm run products:report
```

Cada intento registra su estado: correcto, no disponible, bloqueado, ambiguo o
error. Un fallo en una tienda no impide leer las restantes. Si alguna lectura
falla, `products:run` devuelve codigo 1 despues de guardar los resultados y
regenerar el reporte. Un fallo no borra ni reemplaza los precios anteriores.

Las graficas separan contextos de moneda, vendedor y variante. Las identidades
no verificadas se muestran como tales. El reporte distingue ultimo intento y
ultimo precio correcto, para no presentar un precio antiguo como lectura actual.
No se calculan cupones, membresias, promociones bancarias ni conversiones de
moneda. El envio publicado, cuando puede leerse, se muestra por separado y puede
depender del destino; confirma condiciones en la tienda antes de comprar.

El bloqueo `private-products/run.lock` impide dos consultas simultaneas. Tras una
interrupcion abrupta, comprueba que el proceso indicado dentro del archivo ya no
exista antes de retirar el bloqueo.

## Pruebas

```bash
npm run typecheck
npm test
npm run test:products:browser
```

Las pruebas usan bases temporales, URLs ficticias y HTML simulado. Comprueban
separacion de archivos, persistencia del historico, fallos parciales, precios
ambiguos, vendedor/variante, moneda, rutas privadas y vista movil/escritorio.
`test:browser` tambien incluye estas comprobaciones dentro del flujo existente.

Siguiente paso: probar 2-3 URLs reales elegidas por el usuario y ajustar el
adaptador correspondiente antes de programar consultas automaticas.
