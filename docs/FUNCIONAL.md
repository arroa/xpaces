# Xpaces — Documento funcional

> Documento vivo. Describe **qué hace** el sistema desde el punto de vista del negocio y del usuario, no cómo está implementado técnicamente.
>
> Última actualización: junio 2026.

---

## 1. Visión general

**Xpaces** es una aplicación web para **gestionar visualmente la ocupación de puestos y salas** sobre planos de planta de edificios.

Cada cliente opera dentro de una **organización** (tenant). La jerarquía de datos es:

```
Organización
 └── Edificio(s)
      └── Planta(s)
           ├── Puestos (asignables a personas)
           └── Salas (capacidad y medios)
```

El usuario sube la imagen de la planta, coloca puestos y salas sobre el plano, y asigna personas con metadatos de negocio (grupo, equipo, empresa).

**URL de producción:** https://xpaces.besharpx.com

---

## 2. Actores y roles

| Rol | Descripción | Alcance |
|-----|-------------|---------|
| **Super admin** | Operador de la plataforma (Besharpx). Gestiona organizaciones y puede entrar al contexto de cualquier org. | Global |
| **Org admin** | Administrador de una organización. Configura edificios, plantas, layout y viewers. Edita asignaciones. | Una organización |
| **Viewer** | Usuario de solo lectura. Consulta plantas asignadas; no puede modificar datos. | Plantas concretas de su org |

### Reglas generales de permisos

- Un usuario solo accede si está registrado en Xpaces (`active: true`) y pasa la validación de acceso al iniciar sesión.
- **Org admin** y **super admin** ven y editan todo dentro de la organización en contexto.
- **Viewer** solo ve las plantas explícitamente asignadas. Sin plantas asignadas, ve una pantalla informativa (`/org/sin-plantas`).
- Las operaciones de escritura (crear edificios, editar layout, asignar puestos, gestionar viewers, etc.) están reservadas a **org admin** y **super admin**.

---

## 3. Autenticación y acceso

### Producción

- Autenticación con **Clerk** (email + OTP).
- Tras login, el sistema comprueba que el email exista como usuario activo en Xpaces.
- Si no existe o está inactivo → pantalla **Sin acceso** (`/sin-acceso`).

### Desarrollo local

- Variable `XSPACES_DEV_BYPASS=true` permite login simplificado sin OTP (solo en entorno no productivo).
- Script `npm run setup:admin` para crear el super admin inicial.

### Cierre de sesión

- Al cerrar sesión se muestra una breve pantalla de despedida antes de redirigir.

---

## 4. Super admin — Gestión de organizaciones

### Panel principal (`/dashboard`)

- Resumen global: número de organizaciones, edificios, plantas y viewers.
- Listado de organizaciones activas con:
  - Nombre y slug
  - Email del org admin
  - Estadísticas (edificios / plantas / viewers)
  - Fecha de alta

### Alta de organización

- Campos: **nombre** y **email del org admin** (nombre opcional).
- Se genera un **slug** único a partir del nombre.
- Se crea el usuario org admin en Clerk y en Xpaces.
- Un email no puede ser org admin activo de dos organizaciones distintas (salvo super admin).

### Edición de organización

- Cambiar nombre de la organización.
- Reasignar org admin por email (el anterior queda sin rol de admin en esa org).

### Acceso al contexto de una org

Desde la ficha de una organización el super admin puede operar como si fuera org admin:

- Edificios y plantas
- Layout de plantas
- **Consulta** de puestos (transversal por edificio)
- Gestión de viewers

En el header, el enlace **Consulta** aparece solo cuando navega **dentro del contexto** de una organización (`/admin/organizations/{id}/…`).

---

## 5. Org admin — Edificios y plantas

Ruta: `/org/buildings` (org admin) o `/admin/organizations/{id}/buildings` (super admin en contexto).

### Edificios

- **Crear** edificio (nombre).
- **Renombrar** edificio.
- **Eliminar** edificio → elimina en cascada todas sus plantas y datos asociados (puestos, salas, permisos de viewers sobre esas plantas, etc.). Requiere confirmación.

### Plantas

Cada planta pertenece a un edificio y define:

| Campo | Descripción |
|-------|-------------|
| Nombre | Identificador de la planta |
| Imagen | Plano subido a Cloudinary (con recorte opcional) |
| Total puestos | Entre 1 y 150 |
| Total salas | Entre 0 y 99 |

Al crear (o al cambiar totales) el sistema **genera automáticamente** los puestos (`P01`, `P02`…) y salas (`S01`, `S02`…) sin posición en el plano.

- **Editar** planta: nombre, imagen, totales (regenera puestos/salas si cambian los totales).
- **Eliminar** planta → borra puestos, salas y datos relacionados. Muestra resumen previo (puestos ocupados, etc.) antes de confirmar.

### Salas (modal)

Desde el listado de plantas, botón **Salas**:

- Ver y editar **capacidad** y **medios** de cada sala.
- No cambia la posición en el plano (eso es en el layout).

### Indicadores en listado

- Por planta se muestra cuántos puestos tienen persona asignada.

---

## 6. Layout de planta — Puestos y asignaciones

Ruta: `/org/floors/{id}/layout` (o equivalente en contexto super admin).

### Vista del plano

- Imagen de fondo con puestos y salas superpuestos.
- **Org admin / super admin:** puede colocar, mover y asignar.
- **Viewer:** solo consulta (sin edición).

### Colocación en el plano

Las coordenadas de puestos y salas se guardan como **porcentaje del frame del plano** (la imagen del layout), no del viewport del navegador. Así la posición es la misma para org admin, viewer, sidebar visible u oculto, y distintos tamaños de pantalla.

- **Frame del plano:** rectángulo lógico de la imagen (object-contain dentro del área visible).
- **Espacio `image`:** coordenadas actuales (0–100 % sobre la imagen).
- **Espacio `container` (legacy):** coordenadas antiguas relativas al viewport; se migran automáticamente a `image` la primera vez que el org admin abre el layout.

Al colocar o mover un elemento, el puntero se traduce al frame del plano antes de persistir.

### Asignación de puestos

Al seleccionar un puesto:

| Campo | Uso |
|-------|-----|
| Persona | Nombre de quien ocupa el puesto. Si hay texto → estado **ocupado**; vacío → **disponible** |
| Grupo | Etiqueta organizativa |
| Equipo | Etiqueta de equipo |
| Empresa | Empresa asociada |

Los valores de grupo, equipo y empresa se acumulan en **catálogos** por organización para autocompletar en futuras asignaciones.

### Salas en el layout

- Solo se posicionan en el plano (capacidad y medios se editan en el modal de salas).

### Historial de asignaciones

Cada cambio relevante en un puesto genera un registro de historial con:

- Acción: asignar, liberar, mover, actualizar
- Datos del puesto en ese momento
- Usuario que realizó el cambio
- Fecha

> El historial de **puestos** sí se conserva. El de **viewers** no (ver sección 8).

---

## 7. Viewer — Mis plantas

### Entrada al sistema

Tras el login, el viewer **no pasa por el panel genérico**: va directo a **`/org/plantas`** (lista de plantas asignadas). Si no tiene ninguna, ve la pantalla **Sin plantas asignadas** (`/org/sin-plantas`).

### Lista de plantas (`/org/plantas`)

Tabla compacta con columnas:

| Edificio | Planta | Puestos | Salas | Acción |
|----------|--------|---------|-------|--------|
| … | … | total | total | **Ver planta** |

Solo muestra plantas explícitamente asignadas al viewer en su organización.

### Layout de planta

- Misma vista de plano que el org admin, pero **solo lectura** (`canWrite: false`).
- No ve el panel de puestos/salas flotantes (sin colocar).
- Puede seleccionar puestos y salas para consultar datos; no puede editar ni guardar.

### Navegación

- Header: enlace **Plantas** (no Panel ni Edificios).
- Logo lleva a `/org/plantas`.

---

## 8. Gestión de viewers

Ruta: `/org/viewers` o `/admin/organizations/{id}/viewers`.

### Listado (modo tabla)

| Columna | Contenido |
|---------|-----------|
| Email | Identificador de login |
| Nombre | Display name opcional |
| Plantas | Resumen (“3 plantas” / “Sin plantas”) |
| Acciones | **Permisos** · **Eliminar** |

Cabecera de la tabla: botón **Nuevo viewer**.

### Alta de viewer

Modal con:

- Email (obligatorio)
- Nombre (opcional)
- Plantas (opcional al crear; se pueden asignar después)

El sistema crea o reutiliza el usuario en Clerk. Si el email existía como viewer eliminado, **se reactiva** sin recuperar plantas anteriores.

### Permisos

Modal con árbol edificio → plantas. Guardar reemplaza el conjunto de plantas asignadas.

### Eliminación

- Confirmación explícita.
- El viewer queda **inactivo** y sin organización.
- Se **borran** sus permisos de planta.
- **No se conserva historial** de viewers ni de sus permisos pasados. Volver a darlo de alta empieza de cero.

### Restricciones

- No se puede dar de alta un viewer si el email pertenece **activamente** a otra organización.
- Un viewer eliminado puede volver a crearse en la misma u otra org (mismo registro de usuario, permisos nuevos).

---

## 9. Consulta de plantas (org admin / super admin)

Ruta: `/org/consulta` (org admin) o `/admin/organizations/{id}/consulta` (super admin en contexto).

Pantalla de **consulta transversal de puestos** dentro de un edificio. Complementa el layout (planta a planta) con una vista tabular searchable. **No** sustituye la consulta del viewer (sección 7).

### Acceso y navegación

- Enlace **Consulta** en el header (org admin siempre; super admin solo dentro del contexto de una org).
- Al abrir, muestra capa de carga hasta que la pantalla está lista.

### Flujo de uso

1. **Seleccionar edificio** — botones en la parte superior. Al elegir uno, el sistema carga **todos los puestos de todas las plantas** de ese edificio (una sola carga por edificio).
2. **Filtrar** — los criterios se aplican **al instante en memoria** (sin nueva llamada al servidor):
   - Planta (todas o una concreta)
   - Persona (texto parcial, sin distinguir mayúsculas)
   - Grupo, Equipo, Empresa (select desde catálogos organizacionales)
3. **Limpiar** — restablece filtros; mantiene el edificio seleccionado.

### Tabla de resultados

Columnas (ordenables al hacer clic en la cabecera):

| Planta | Puesto | Estado | Grupo | Equipo | Persona | Empresa | Acción |
|--------|--------|--------|-------|--------|---------|---------|--------|

- **Estado:** Disponible u Ocupado (según si el puesto tiene persona asignada).
- **Orden por defecto:** Planta (ascendente), luego Puesto (ascendente).
- **Contador:** muestra cuántos puestos coinciden; si hay filtros activos, indica también el total del edificio (ej. «3 puestos de 45»).
- **Ver planta** — abre el layout de esa planta (con capa de carga al navegar).

### Comportamiento de la pantalla

- Título, filtros y barra **Resultados** permanecen fijos; **solo la tabla** hace scroll cuando hay muchos registros.
- Cabeceras de columnas visibles al desplazarse dentro de la tabla.
- Sin edificio seleccionado: mensaje «Selecciona un edificio para ver sus puestos».

### Permisos

- Solo **org admin** y **super admin** (con contexto de org).
- **Viewer** no tiene acceso a esta pantalla.

---

## 10. Catálogos organizacionales

Por organización se mantienen listas de valores usados en asignaciones:

- **Grupo**
- **Equipo**
- **Empresa**

Se alimentan automáticamente al asignar puestos. Facilitan la reutilización de valores en el editor de layout y en los filtros de **Consulta**.

---

## 11. Modelo de eliminación (borrado lógico)

| Entidad | Al eliminar |
|---------|-------------|
| Edificio | `active: false`; plantas hijas también |
| Planta | `active: false`; borra puestos, salas y accesos de viewers a esa planta |
| Viewer | `active: false`; `organizationId` vacío; borra permisos de planta |
| Organización | `active: false` (no aparece en listados) |

Los usuarios inactivos no pueden iniciar sesión.

---

## 12. Notificaciones y feedback en UI

### Toasts

- Mensajes breves (2 s por defecto) para acciones exitosas o errores (p. ej. gestión de viewers).

### Capas de carga (`LoadingOverlay`)

- Operaciones async relevantes: guardar, crear, eliminar, cargar edificio en Consulta, navegación desde **Gestionar**, **Ver planta** y enlace **Consulta** del header.

### Diálogos de confirmación

- Acciones destructivas (eliminar edificio, planta, viewer): modal con **Aplicar** / **Cancelar** (no `window.confirm`).

### Contraste y legibilidad

- Interfaz en tema oscuro con tokens de contraste mejorados (bordes, campos, tarjetas) para lectura prolongada en pantallas de administración.

---

## 13. Fuera de alcance / pendiente

Funcionalidad mencionada o prevista pero **no implementada** aún:

- **Consulta fase 2:** resaltar puesto(s) en el layout al abrir desde la tabla («Ver planta» con foco en el puesto filtrado)
- Exportación a **Excel**, **PDF** o **CSV** (desde Consulta o reportes)
- Consulta transversal para **viewers** (limitada a sus plantas asignadas)
- Historial o auditoría de **viewers**
- Recuperación automática de permisos al reactivar un viewer eliminado
- Gestión self-service de perfil de usuario
- Notificaciones por email a viewers al asignarles plantas

---

## 14. Glosario

| Término | Significado |
|---------|-------------|
| **Planta** | Piso de un edificio con plano imagen y conjunto de puestos/salas |
| **Puesto** | Posición individual asignable a una persona en el layout |
| **Sala** | Espacio de reunión con capacidad y flag de medios |
| **Viewer** | Usuario de solo lectura con acceso limitado por planta |
| **Consulta** | Pantalla tabular de puestos por edificio, con filtros combinables (solo org admin / super admin) |
| **Org admin** | Administrador de una organización cliente |
| **Super admin** | Administrador de la plataforma Xpaces |

---

## 15. Changelog del documento

| Fecha | Cambio |
|-------|--------|
| 2026-06 | Consulta de plantas (fase 1): filtros en memoria, tabla ordenable, scroll contenido; viewers por planta; toasts; coordenadas en espacio imagen; mejoras de contraste UX |
| 2026-06 | Versión inicial: roles, orgs, edificios, plantas, layout, viewers, catálogos, historial de puestos |
