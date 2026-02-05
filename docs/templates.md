# Plantillas de WhatsApp (Twilio)

Este documento describe las plantillas usadas por el sistema, sus identificadores y ejemplos de payload para envío mediante la API de Twilio o el endpoint interno.

---

## 1) `subscription_reminder_3days`

- Content Template SID: `HX5087e5a665544471a058eec56fb37431`
- Idioma: Spanish
- Estado: Approved
- Tipo de contenido: Text
- Última actualización: 2026-01-30

Contenido (ejemplo aprobado):

*Hola {{1}},*

Este es un recordatorio de que su suscripción {{2}} vence el {{3}}.
Monto mensual: {{4}}.

Por favor programe su pago para evitar la suspensión del servicio.

---

### Parámetros esperados

- `{{1}}` — nombre completo del cliente (ej: "Edgarlis")
- `{{2}}` — identificador o nombre del plan/servicio (ej: "KIT982M928G43JT")
- `{{3}}` — fecha de corte (formato `YYYY-MM-DD`) (ej: "2026-02-08")
- `{{4}}` — monto mensual (ej: "$50")

### Ejemplo `contentVariables` (para `contentSid`)

{
  "1": "Edgarlis",
  "2": "KIT982M928G43JT",
  "3": "2026-02-08",
  "4": "$50"
}

### Ejemplo con Twilio SDK (usando `contentSid`)

```ts
const message = await client.messages.create({
  from: 'whatsapp:+584223552626',
  to: 'whatsapp:+584161005606',
  contentSid: 'HX5087e5a665544471a058eec56fb37431',
  contentVariables: JSON.stringify({ "1":"Edgarlis", "2":"KIT...", "3":"2026-02-08", "4":"$50" })
});
```

### Uso con el endpoint interno

- Endpoint: `POST /notifications/send/:clientId?template=subscription_reminder_3days`
- Comportamiento: el endpoint obtiene el documento del cliente en Firestore (`clients/:clientId`), construye los parámetros usando el `template.mapper` y envía la plantilla (por SID cuando esté disponible). También registra la notificación en la colección `notifications`.

Ejemplo: si el documento cliente tiene los campos:

```
{
  nombre: "Edgarlis",
  apellido: "González",
  billingDate: "2026-02-08",
  plan: "KIT982M928G43JT",
  amount: "$50",
  telefono: "+584161005606"
}
```

El `template.mapper` genera: `['Edgarlis González', 'KIT982M928G43JT', '2026-02-08', '$50']` y enviará `contentVariables` con esos valores.

---

## Nuevo: `subscription_cutoff_day`

- Content Template SID: `HX161c1caf98ea4a08e94e5a92a23d4203`
- Idioma: Spanish
- Estado: Approved
- Tipo de contenido: Text
- Última actualización: 2026-01-30

Contenido (ejemplo aprobado):

*Hola {{1}},* hoy es el día de corte {{2}} para su suscripción {{3}}.

Su servicio será suspendido a las 9:00PM si existe deuda.

Monto mensual: {{4}}.
Deuda actual: {{5}}.

¡Gracias por tu Atención!

---

### Parámetros esperados

- `{{1}}` — nombre completo del cliente (ej: "Edgarlis González")
- `{{2}}` — fecha de corte (formato `YYYY-MM-DD`) (ej: "2026-02-08")
- `{{3}}` — plan/identificador del servicio (ej: "KIT982M928G43JT")
- `{{4}}` — monto mensual (ej: "$50")
- `{{5}}` — deuda actual (ej: "$10")

### Ejemplo `contentVariables` (para `contentSid`)

{
  "1": "Edgarlis González",
  "2": "2026-02-08",
  "3": "KIT982M928G43JT",
  "4": "$50",
  "5": "$10"
}

### Uso con el endpoint interno

- Endpoint: `POST /notifications/send/:clientId?template=subscription_cutoff_day`
- Comportamiento: el endpoint obtiene el documento del cliente en Firestore (`clients/:clientId`), construye los parámetros usando el `template.mapper` y envía la plantilla por SID preferentemente, registrando la notificación.

Ejemplo: si el documento cliente contiene `billingDate`, `plan`, `amount` y `debt`, el `template.mapper` construirá el array adecuado con esos valores.

---

## Nuevo: `subscription_suspended_notice`

- Content Template SID: `HX1e01bf6da9e13d7b4ba90a78a9c1fdad`
- Idioma: Spanish
- Estado: Approved
- Tipo de contenido: Text
- Última actualización: 2026-01-30

Contenido (ejemplo aprobado):

*Hola {{1}},* su suscripción {{2}} ha sido suspendida por falta de pago.

Para reactivar el servicio, por favor contacte a soporte o realice el pago pendiente.

---

### Parámetros esperados

- `{{1}}` — nombre completo del cliente (ej: "Edgarlis González")
- `{{2}}` — identificador o nombre del plan/servicio (ej: "KIT982M928G43JT")

### Ejemplo `contentVariables` (para `contentSid`)

{
  "1": "Edgarlis González",
  "2": "KIT982M928G43JT"
}

### Uso con el endpoint interno

- Endpoint: `POST /notifications/send/:clientId?template=subscription_suspended_notice`
- Comportamiento: el endpoint obtiene el documento del cliente en Firestore, construye los parámetros usando el `template.mapper` y envía la plantilla por SID preferentemente, registrando la notificación.


## 2) Plantillas usadas por el cron (esquema esperado)

El `cron` de facturación actualmente hace referencia a nombres lógicos: `REMINDER_3_DAYS`, `DUE_TODAY`, `SUSPENDED_NOTICE`.

Estas entradas están pensadas como alias lógicos; para cada una debe definirse en `src/modules/notifications/template.mapper.ts` la información real de plantilla (SID/Name, idioma y `buildParams`).

Ejemplo recomendado para mapear (plantilla hipotética):

- `REMINDER_3_DAYS` — se puede mapear a `subscription_reminder_3days` o a otra plantilla específica para recordatorio.
- `DUE_TODAY` — plantilla que notifica que hoy vence la suscripción; parámetros típicos: nombre, plan, fecha.
- `SUSPENDED_NOTICE` — plantilla que notifica suspensión; parámetros típicos: nombre, plan, fecha de suspensión, contacto de soporte.

Para cada una, añade una entrada en `template.mapper.ts` con la `templateSid` y `buildParams` que extraigan los campos necesarios del documento `clients`.

---

## 3) Componentes especiales (headers, imágenes, botones)

- Si la plantilla usa `header` con media, el `send` debe incluir la URL o `media` apropiado en `components` (cuando se usa `content.template`).
- Si la plantilla incluye botones interactivos, `components` debe incluir parámetros de tipo `payload` o `text` según lo aprobado.

Ejemplo de `content` cuando no se usa SID:

```json
{
  "content": [
    {
      "type": "template",
      "template": {
        "name": "template_name",
        "language": { "code": "es" },
        "components": [
          { "type": "header", "parameters": [ { "type": "image", "image": { "url": "https://..." } } ] },
          { "type": "body", "parameters": [ { "type": "text", "text": "Edgarlis" } ] },
          { "type": "button", "subtype": "quick_reply", "parameters": [ { "type": "payload", "payload": "PAYLOAD" } ] }
        ]
      }
    }
  ]
}
```

---

## 4) Cómo añadir una nueva plantilla al sistema

1. Añade la entrada en `src/modules/notifications/template.mapper.ts` con `templateSid` (preferible), `language` y `buildParams` que extraiga y formatee los datos desde el documento `clients`.
2. Si la plantilla requiere campos nuevos en `clients`, actualiza el modelo y el proceso de creación/actualización de clientes para incluirlos.
3. Añade un ejemplo en este documento (`docs/templates.md`) y, opcionalmente, tests que verifiquen `buildParams` para distintos casos.

---

Si quieres, puedo: 1) extraer automáticamente la lista de plantillas desde la API de Twilio y pre-llenar `template.mapper`, o 2) añadir validaciones que rechacen envíos si faltan parámetros en el documento `clients`.
