# 🐟 BLUEMARKET — PROMPT MAESTRO DE ARQUITECTURA Y STACK

> Versión unificada. Combina reglas de arquitectura modular + stack tecnológico 100% gratuito.
> Este prompt debe incluirse al inicio de cada sesión de desarrollo con IA.

---

## PARTE 1 — STACK TECNOLÓGICO 100% GRATUITO

Toda la aplicación BlueMarket debe construirse exclusivamente con herramientas que tengan **free tier permanente o plan gratuito suficiente para producción inicial**.

| Capa | Herramienta | Límite gratuito |
|---|---|---|
| Frontend + Hosting | Next.js + Vercel | Ilimitado (proyectos personales) |
| Base de datos | Supabase | 500 MB + 50.000 usuarios auth |
| IA texto/chat | Gemini 2.0 Flash API | 1.500 req/día |
| IA visión/fotos | Gemini Vision API | Incluido en Gemini |
| IA imágenes | Hugging Face (Stable Diffusion) | Rate-limited, gratis |
| IA voz (STT) | Whisper en HF Spaces | Self-hosted gratis |
| CDN imágenes | Cloudinary | 25 GB storage |
| WhatsApp | Meta WhatsApp Cloud API | 1.000 conversaciones/mes |
| Email transaccional | Resend | 3.000 emails/mes |
| QR codes | librería `qrcode` (Python/Node) | Ilimitado |
| PDF / etiquetas | `reportlab` (Python) | Ilimitado |
| Cron jobs / CI | GitHub Actions | 2.000 min/mes |
| Caché / Redis | Upstash Redis | 10.000 req/día |
| Orquestación IA | Cohere / LangChain free | Free tier |

**Regla de stack:** Antes de incorporar cualquier servicio nuevo, verificar que tenga free tier permanente. Nunca introducir dependencias de pago sin aprobación explícita.

---

## PARTE 2 — ARQUITECTURA MODULAR OBLIGATORIA

### Objetivo
BlueMarket debe construirse de forma **modular, escalable y fácil de mantener**.
La IA NO debe concentrar múltiples funcionalidades en un único archivo.
La prioridad es facilitar futuras modificaciones, correcciones y ampliaciones.

---

### Regla 1 — Portales separados

Cada portal es un módulo independiente con su propia estructura:

- `/portal-cliente` — Pescadería / negocio
- `/portal-consumidor` — Cliente final
- `/portal-repartidor` — Delivery
- `/portal-developer` — Administración del sistema / SaaS

---

### Regla 2 — Una pantalla = un archivo

Cada pantalla importante tiene su propio archivo HTML/JSX. Nunca combinar módulos completos en una sola página.

```
productos.html | clientes.html | pedidos.html
estadisticas.html | configuracion.html | mapa.html
```

---

### Regla 3 — HTML, CSS y JS completamente separados

Prohibido colocar cientos de líneas de CSS y JavaScript dentro del mismo HTML.
Cada capa va en su propio archivo.

---

### Regla 4 — Componentes reutilizables

Crear y reutilizar componentes globales:

```
/components
  header.js
  sidebar.js
  bottom-navigation.js
  modal.js
  toast.js
  card.js
  table.js
  chart.js
  map.js
```

---

### Regla 5 — Módulos funcionales independientes

Cada dominio de negocio es un módulo aislado:

```
/modules
  productos/
  clientes/
  pedidos/
  repartidores/
  cuenta-corriente/
  suscripciones/
  iuc/
  business-score/
  fidelizacion/
  catalogo-ia/
```

---

### Regla 6 — Límite de líneas por archivo

- Ideal: **300 líneas máximo**
- Máximo permitido: **500 líneas**
- Si un archivo supera ese tamaño → dividir en componentes o submodulos

---

## PARTE 3 — ESTRUCTURA DE CARPETAS

```
/src
  /pages
    /cliente
      dashboard.html
      productos.html
      clientes.html
      pedidos.html
      estadisticas.html
      configuracion.html
    /consumidor
      inicio.html
      catalogo.html
      carrito.html
      checkout.html
    /repartidor
      inicio.html
      pedidos.html
      mapa.html
    /developer
      dashboard.html
      empresas.html
      suscripciones.html
      iuc.html
      catalogo-global.html
      telemetria.html
      tickets.html
      roadmap.html

  /components
    header.js | sidebar.js | modal.js | toast.js
    card.js | table.js | chart.js | map.js

  /modules
    productos/ | clientes/ | pedidos/
    repartidores/ | cuenta-corriente/
    suscripciones/ | iuc/ | business-score/
    fidelizacion/ | catalogo-ia/

  /models
    empresa.js | usuario.js | cliente.js
    producto.js | pedido.js | repartidor.js
    suscripcion.js | fidelizacion.js
    iuc.js | business-score.js

  /ia
    ia-fidelizacion.js
    ia-recompra.js
    ia-abandono.js
    ia-catalogo.js
    ia-promociones.js
    ia-business-score.js
    ia-iuc.js

  /styles
    global.css
    variables.css
    components.css
    [modulo].css (uno por módulo)

  /utils
    api.js | auth.js | helpers.js | constants.js
```

---

## PARTE 4 — REGLAS DE CONDUCTA PARA LA IA

1. **Nunca generar un archivo único gigante.** Si el código crece, dividir.
2. **Siempre preguntar a qué módulo pertenece** el cambio antes de codificar.
3. **Tocar solo el archivo correspondiente** al módulo en cuestión. No modificar otros.
4. **Verificar que el servicio sea gratuito** antes de recomendarlo.
5. **Nombrar archivos en kebab-case** (`lista-pedidos.js`, no `ListaPedidos.js` para archivos que no sean componentes React).
6. **Documentar brevemente** cada función nueva (una línea de comentario es suficiente).
7. **Confirmar estructura antes de escribir código** cuando se inicia un módulo nuevo.

---

## PARTE 5 — RESULTADO ESPERADO

BlueMarket debe poder **crecer durante años** sin generar archivos imposibles de mantener.

✅ Más archivos pequeños y organizados  
✅ Menos archivos enormes y complejos  
✅ Costo de infraestructura inicial: $0  
✅ Cada developer trabaja en su módulo sin romper el resto  
✅ La IA solo toca lo que se le pide  

---

*Prompt Maestro BlueMarket v1.0 — generado el 01/06/2026*
