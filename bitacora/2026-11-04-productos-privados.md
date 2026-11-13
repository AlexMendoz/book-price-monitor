# Inicio del modulo privado de productos - 2026-11-04

## Solicitud

Crear una lista privada de productos variados de Amazon, Mercado Libre y tiendas
departamentales, separada de libros, partiendo de que no hay APIs publicas.

## Primera implementacion

- Modulo `src/products/` sin importar servicios, esquema ni base de libros.
- SQLite independiente `data/products.db`, catalogo producto/oferta e intentos
  historicos con una observacion por oferta y ejecucion.
- Alta por URL, agrupacion explicita de ofertas y objetivo por producto/moneda.
- Lectura Playwright: JSON-LD primero; perfiles DOM iniciales para Amazon/ML.
- No se usan APIs de tienda, endpoints privados ni mecanismos de evasion.
- Moneda/precio ausentes, multiples ofertas y vendedor/variante no verificables
  producen errores o ambiguedad, no precios inventados.
- Bloqueos y falta de disponibilidad no borran precios anteriores; otras ofertas
  continúan procesandose. Se distingue ultimo intento de ultimo precio correcto.
- Reporte HTML/SVG autocontenido y privado, con busqueda/categoria, historial
  separado por moneda/vendedor/variante, precio objetivo sin envio y registro
  de intentos. Sin imagenes, fuentes ni scripts externos.
- Servidor local 127.0.0.1:4174 que sirve unicamente el reporte.
- Perfil de navegador, reporte y base excluidos de Git. No se agregaron enlaces
  al menu publico ni cambios a los jobs de libros o al despliegue de Pages.
- Comandos products:add, products:list, products:run, products:report,
  products:preview y test:products:browser.

## Validacion y limites

TypeScript correcto. Suite de 23 pruebas correcta, incluidas cinco nuevas pruebas
funcionales de productos. Chromium valida tres fixtures de extraccion, bloqueos,
ambiguedad y reporte en 1280/390 px; las rutas de base/configuracion/perfil
responden 404. Los tests verifican que archivos de libros permanezcan intactos.

Se recibieron seis URLs reales y se registraron solo en la base privada local.
Una consulta por oferta produjo dos lecturas correctas (Amazon y Home Depot),
una lectura ambigua de Amazon por multiples precios principales, un bloqueo
HTTP 403 de Liverpool y dos paginas de Liverpool sin datos Product en JSON-LD.
No se reintentaron bloqueos ni se guardaron precios para lecturas fallidas.
Las URLs y los precios personales no se incluyen en esta bitacora publica.
Se admitio Home Depot, se corrigio la identidad ASIN en rutas moviles de Amazon
y se agrego validacion de SKU para los enlaces con variante seleccionada.
Se quitaron parametros publicitarios de Amazon conservando ASIN y th=1;
los parametros skuid/color/size de Liverpool permanecieron intactos.
Typecheck, npm test y pruebas locales de navegador validan el modulo; la
compatibilidad general de cada tienda sigue pendiente, especialmente Liverpool.
No se han programado consultas, enviado notificaciones o publicado informacion
de productos. El catalogo privado no cuenta aun con edicion,
baja o autenticacion remota; se priorizo el circuito alta/lectura/historico local.

Uso y limitaciones: `docs/productos-privados.md`.
