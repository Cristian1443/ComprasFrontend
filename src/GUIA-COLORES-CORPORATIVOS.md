# 🎨 Guía de Colores Corporativos - Invest in Bogotá
## Sistema de Diseño para Power Apps

---

## 📋 Paleta de Colores Principal

### 🔴 Rojo Ladrillo (Color Principal)
**HEX:** `#E84922`  
**Uso:** Acciones principales, botones CTA, elementos destacados, navegación activa

**Variantes:**
- **Hover:** `#C73D1C`
- **Claro:** `#FEF2F0` (fondos sutiles)
- **Texto:** `#7A2311` (texto sobre fondos claros)

**Aplicaciones:**
- ✅ Botones primarios ("Nueva Solicitud", "Enviar", "Guardar")
- ✅ Items activos en navegación
- ✅ Bordes de secciones importantes
- ✅ Tabs activos
- ✅ Focus en inputs y campos de formulario
- ✅ Iconos de acciones principales

---

### 🟣 Violeta Noche (Sidebar y Estructura)
**HEX:** `#3D2B86`  
**Uso:** Sidebar, navegación lateral, encabezados estructurales

**Variantes:**
- **Hover:** `#2E1F63`
- **Border:** `#6B5BB3`

**Aplicaciones:**
- ✅ Fondo del sidebar
- ✅ Encabezados de secciones principales
- ✅ Elementos de navegación estructural

---

### 🔵 Azul Cielo (Acento Informativo)
**HEX:** `#00A9E0`  
**Uso:** Elementos informativos, acentos secundarios, íconos de información

**Variantes:**
- **Hover:** `#0088B3`
- **Claro:** `#E6F7FC` (fondos sutiles)

**Aplicaciones:**
- ✅ Badges informativos
- ✅ Iconos de ayuda
- ✅ Links secundarios
- ✅ Avatares de usuario (opcional)

---

## 🎯 Jerarquía de Uso

### Nivel 1 - Acciones Principales
**Color:** Rojo Ladrillo `#E84922`
- Botones de acción principal
- CTAs (Call to Action)
- Elementos interactivos primarios

### Nivel 2 - Navegación y Estructura
**Color:** Violeta Noche `#3D2B86`
- Sidebar y menús
- Encabezados de página
- Estructura de navegación

### Nivel 3 - Información y Soporte
**Color:** Azul Cielo `#00A9E0`
- Elementos informativos
- Ayudas y tooltips
- Badges secundarios

---

## 📊 Estados de Solicitudes

### Pendiente Jurídica
- **Fondo:** `#FEF3C7` (Amarillo claro)
- **Texto:** `#92400E` (Marrón oscuro)
- **Borde:** `#FCD34D` (Amarillo)

### Pendiente Financiera
- **Fondo:** `#DBEAFE` (Azul claro)
- **Texto:** `#1E40AF` (Azul oscuro)
- **Borde:** `#93C5FD` (Azul)

### Aprobado
- **Fondo:** `#D1FAE5` (Verde claro)
- **Texto:** `#065F46` (Verde oscuro)
- **Borde:** `#6EE7B7` (Verde)

### Rechazado
- **Fondo:** `#FEE2E2` (Rojo claro)
- **Texto:** `#991B1B` (Rojo oscuro)
- **Borde:** `#FCA5A5` (Rojo)

### En Revisión
- **Fondo:** `#FFEDD5` (Naranja claro)
- **Texto:** `#9A3412` (Naranja oscuro)
- **Borde:** `#FDBA74` (Naranja)

### Finalizado
- **Fondo:** `#E9D5FF` (Púrpura claro)
- **Texto:** `#6B21A8` (Púrpura oscuro)
- **Borde:** `#C084FC` (Púrpura)

---

## 🖌️ Guías de Aplicación

### Botones

#### Botón Primario (Acción Principal)
```tsx
backgroundColor: '#E84922'
hover: '#C73D1C'
color: '#FFFFFF'
```

#### Botón Secundario (Acción Alternativa)
```tsx
backgroundColor: 'transparent'
border: '2px solid #E84922'
color: '#E84922'
hover: background '#FEF2F0'
```

#### Botón Terciario (Acción Suave)
```tsx
backgroundColor: '#F3F4F6'
color: '#374151'
hover: '#E5E7EB'
```

### Formularios

#### Focus State
```tsx
borderColor: '#E84922'
outlineColor: '#E84922'
```

#### Modo Solo Lectura
```tsx
backgroundColor: '#F3F4F6'
opacity: 0.85
pointerEvents: 'none'
```

### Tipografía
**Fuente Principal:** `Gabarito, sans-serif`

---

## ✅ Checklist de Implementación

- [x] Color primario rojo ladrillo en botones principales
- [x] Sidebar violeta noche
- [x] Navegación activa en rojo
- [x] Focus de inputs en rojo
- [x] Tabs activos en rojo
- [x] Badges de estado con colores semánticos
- [x] Modo solo lectura con fondo gris
- [x] Botones hover con variante oscura

---

## 🚫 Evitar

- ❌ NO usar azul `#00A9E0` para acciones principales
- ❌ NO usar múltiples colores primarios en un mismo componente
- ❌ NO usar colores de estado para otros propósitos
- ❌ NO combinar más de 3 colores en una vista

---

## 📱 Power Apps Considerations

- Todos los colores son compatibles con Power Apps
- Los estilos inline aseguran consistencia en Teams
- Gabarito es una fuente web-safe con fallback a sans-serif
- Los hover states funcionan en navegadores modernos
- Los colores cumplen con WCAG AA para accesibilidad

---

**Última actualización:** Febrero 2026  
**Versión:** 1.0  
**Mantenido por:** Equipo de Desarrollo Invest in Bogotá
