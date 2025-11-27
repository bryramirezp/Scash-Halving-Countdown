# Auditoría de Seguridad Frontend - Scash Halving Countdown

**Fecha de Auditoría:** 2024-11-27  
**Versión del Proyecto:** 0.0.1  
**Framework:** Astro 5.16.2

---

## Resumen Ejecutivo

Esta auditoría evalúa la seguridad del frontend de la aplicación Scash Halving Countdown. Se identificaron **8 vulnerabilidades** y **12 recomendaciones** de mejora siguiendo las mejores prácticas de OWASP y estándares de seguridad frontend.

### Calificación General: ⚠️ **MEDIA-BAJA**

**Puntos Fuertes:**
- Uso de `rel="noopener noreferrer"` en enlaces externos
- Validación básica de tipos TypeScript
- Sin dependencias críticas conocidas

**Áreas de Mejora Críticas:**
- Falta de Content Security Policy (CSP)
- Ausencia de headers de seguridad HTTP
- Manejo de errores expone información sensible
- Sin validación de entrada en API calls

---

## Vulnerabilidades Identificadas

### 🔴 CRÍTICAS

#### 1. **Falta de Content Security Policy (CSP)**
**Severidad:** CRÍTICA  
**Archivo:** `src/layouts/Layout.astro`

**Descripción:**
La aplicación no implementa Content Security Policy, lo que permite ataques XSS y carga de recursos no autorizados.

**Riesgo:**
- Ejecución de scripts maliciosos inyectados
- Carga de recursos desde dominios no autorizados
- Ataques de clickjacking

**Recomendación:**
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data:;
  connect-src 'self' https://scash.tv;
  frame-ancestors 'none';
">
```

**Prioridad:** ALTA

---

#### 2. **Falta de Headers de Seguridad HTTP**
**Severidad:** CRÍTICA  
**Archivo:** `astro.config.mjs`

**Descripción:**
No se configuran headers de seguridad HTTP como X-Frame-Options, X-Content-Type-Options, Referrer-Policy, etc.

**Riesgo:**
- Clickjacking attacks
- MIME type sniffing
- Fuga de información en referrers

**Recomendación:**
Configurar headers en el servidor o usar middleware de Astro:
```javascript
// astro.config.mjs
export default defineConfig({
  integrations: [
    // Agregar integración para headers de seguridad
  ],
  vite: {
    server: {
      headers: {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
      }
    }
  }
});
```

**Prioridad:** ALTA

---

#### 3. **Exposición de Información en Console Errors**
**Severidad:** MEDIA  
**Archivos:** `src/lib/api.ts`, `src/scripts/countdown-client.ts`

**Descripción:**
Los errores se loguean en console con información detallada que puede ser visible en producción.

**Código Problemático:**
```typescript
// src/lib/api.ts:26
console.error('Error fetching block count:', error);

// src/scripts/countdown-client.ts:45
console.error('Error refreshing block data:', error);
```

**Riesgo:**
- Exposición de estructura interna de la aplicación
- Información sobre endpoints y errores del servidor
- Ayuda a atacantes en reconnaissance

**Recomendación:**
```typescript
// En producción, usar logging estructurado sin detalles
if (import.meta.env.DEV) {
  console.error('Error fetching block count:', error);
} else {
  console.error('Error fetching block count');
  // Enviar a servicio de logging (Sentry, etc.)
}
```

**Prioridad:** MEDIA

---

### 🟡 MEDIAS

#### 4. **Falta de Validación de Respuesta de API**
**Severidad:** MEDIA  
**Archivo:** `src/lib/api.ts:23`

**Descripción:**
No se valida el formato ni el tipo de datos recibidos de la API externa.

**Código Problemático:**
```typescript
const data = await response.json();
return typeof data === 'number' ? data : parseInt(data, 10);
```

**Riesgo:**
- Inyección de datos maliciosos si la API es comprometida
- Errores de tipo que pueden causar comportamiento inesperado
- Posible XSS si los datos se renderizan sin sanitización

**Recomendación:**
```typescript
export async function getBlockCount(): Promise<number> {
  try {
    const response = await fetch(`${API_BASE}/api/getblockcount`, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Validación estricta
    if (typeof data !== 'number' && typeof data !== 'string') {
      throw new Error('Invalid response format');
    }
    
    const blockCount = typeof data === 'number' ? data : parseInt(data, 10);
    
    // Validar rango razonable
    if (isNaN(blockCount) || blockCount < 0 || blockCount > Number.MAX_SAFE_INTEGER) {
      throw new Error('Invalid block count value');
    }
    
    return blockCount;
  } catch (error) {
    console.error('Error fetching block count:', error);
    throw error;
  }
}
```

**Prioridad:** MEDIA

---

#### 5. **Falta de Rate Limiting en Cliente**
**Severidad:** MEDIA  
**Archivo:** `src/scripts/countdown-client.ts:70`

**Descripción:**
El script hace requests a la API cada 5 minutos sin límite de reintentos ni backoff exponencial.

**Riesgo:**
- Abuso de la API externa
- Posible bloqueo por parte del proveedor
- Consumo excesivo de recursos

**Recomendación:**
```typescript
let retryCount = 0;
const MAX_RETRIES = 3;
const BASE_DELAY = 5000; // 5 segundos

async function refreshBlockData() {
  try {
    const currentBlock = await getBlockCount();
    // ... resto del código
    retryCount = 0; // Reset en caso de éxito
  } catch (error) {
    retryCount++;
    if (retryCount < MAX_RETRIES) {
      const delay = BASE_DELAY * Math.pow(2, retryCount - 1); // Backoff exponencial
      setTimeout(() => refreshBlockData(), delay);
    } else {
      console.error('Max retries reached for block data refresh');
    }
  }
}
```

**Prioridad:** MEDIA

---

#### 6. **Falta de Sanitización en innerHTML/textContent**
**Severidad:** BAJA  
**Archivo:** `src/scripts/countdown-client.ts:19-22`

**Descripción:**
Aunque se usa `textContent` (correcto), no hay validación adicional de los valores antes de insertarlos.

**Riesgo:**
- Si hay un bug que permita inyección, no hay capa adicional de protección
- Valores inesperados pueden causar problemas de renderizado

**Recomendación:**
```typescript
function updateDisplay(seconds: number) {
  // Validar entrada
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
    seconds = 0;
  }
  
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  // Usar textContent (ya se hace, pero documentar)
  const daysEl = document.getElementById('days');
  if (daysEl) {
    daysEl.textContent = String(days).padStart(3, '0');
  }
  // ... resto
}
```

**Prioridad:** BAJA

---

#### 7. **Falta de HTTPS Enforcement**
**Severidad:** MEDIA  
**Archivo:** `src/lib/constants.ts:3`

**Descripción:**
La URL de la API usa HTTPS pero no hay validación que fuerce HTTPS en producción.

**Riesgo:**
- Posible downgrade a HTTP si hay configuración incorrecta
- Man-in-the-middle attacks

**Recomendación:**
```typescript
// src/lib/constants.ts
const API_BASE_RAW = 'https://scash.tv';

// Validar en producción
export const API_BASE = import.meta.env.PROD 
  ? API_BASE_RAW.replace(/^http:/, 'https:') // Forzar HTTPS
  : API_BASE_RAW;
```

**Prioridad:** MEDIA

---

#### 8. **Falta de Subresource Integrity (SRI) para Fuentes Externas**
**Severidad:** BAJA  
**Archivo:** `src/layouts/Layout.astro:30`

**Descripción:**
Las fuentes de Google Fonts se cargan sin SRI, lo que permite posibles ataques si el CDN es comprometido.

**Riesgo:**
- Inyección de código malicioso si Google Fonts es comprometido (bajo pero posible)

**Recomendación:**
```html
<link 
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" 
  rel="stylesheet"
  integrity="sha384-..." 
  crossorigin="anonymous"
/>
```

**Nota:** SRI para Google Fonts es complejo porque el hash cambia. Alternativa: self-host las fuentes.

**Prioridad:** BAJA

---

## Recomendaciones Adicionales

### 🔵 Mejoras de Seguridad

#### 9. **Implementar Error Boundaries**
Agregar manejo de errores a nivel de componente para prevenir crashes completos.

#### 10. **Agregar Timeout a Fetch Requests**
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos

const response = await fetch(url, {
  signal: controller.signal,
  // ...
});
clearTimeout(timeoutId);
```

#### 11. **Implementar CORS Correctamente**
Si se agrega backend, configurar CORS apropiadamente.

#### 12. **Agregar .env.example**
Crear archivo de ejemplo para variables de entorno sin exponer valores reales.

#### 13. **Implementar Security.txt**
Agregar archivo `/security.txt` o `/.well-known/security.txt` con información de contacto para reportar vulnerabilidades.

#### 14. **Agregar HSTS Header**
Si se despliega con HTTPS, agregar Strict-Transport-Security header.

#### 15. **Validar Dependencias Regularmente**
```bash
npm audit
npm audit fix
```

#### 16. **Implementar CSP Reporting**
Configurar endpoint para reportar violaciones de CSP.

#### 17. **Agregar Nonce a Scripts Inline**
Si se mantienen scripts inline, usar nonces para CSP.

#### 18. **Implementar Feature Policy / Permissions Policy**
Restringir features del navegador que no se necesitan.

#### 19. **Agregar Validación de Tipos en Runtime**
Considerar usar librerías como Zod para validación runtime.

#### 20. **Implementar Logging Estructurado**
Usar servicio de logging (Sentry, LogRocket) en lugar de console.log.

---

## Checklist de Implementación

### Prioridad Alta (Implementar Inmediatamente)
- [ ] Agregar Content Security Policy
- [ ] Configurar headers de seguridad HTTP
- [ ] Validar respuestas de API
- [ ] Ocultar errores detallados en producción

### Prioridad Media (Implementar Pronto)
- [ ] Agregar rate limiting y retry logic
- [ ] Forzar HTTPS en producción
- [ ] Agregar timeouts a fetch requests
- [ ] Implementar error boundaries

### Prioridad Baja (Mejoras Futuras)
- [ ] Self-host Google Fonts o agregar SRI
- [ ] Agregar security.txt
- [ ] Implementar CSP reporting
- [ ] Agregar validación runtime con Zod

---

## Herramientas Recomendadas

### Análisis Estático
- **ESLint Security Plugin:** `npm install --save-dev eslint-plugin-security`
- **npm audit:** `npm audit` (ya disponible)
- **Snyk:** `npm install -g snyk && snyk test`

### Testing de Seguridad
- **OWASP ZAP:** Para testing de vulnerabilidades
- **Mozilla Observatory:** Para análisis de headers de seguridad
- **Security Headers:** https://securityheaders.com/

### Monitoreo
- **Sentry:** Para error tracking y security monitoring
- **Content Security Policy Reporter:** Para monitorear violaciones de CSP

---

## Referencias

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [HTTP Security Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)
- [Astro Security Best Practices](https://docs.astro.build/en/guides/security/)

---

## Conclusión

El proyecto tiene una base sólida pero requiere mejoras críticas en seguridad, especialmente en la implementación de CSP y headers de seguridad HTTP. Las vulnerabilidades identificadas son principalmente de tipo "defense in depth" y no representan riesgos inmediatos críticos, pero deben ser abordadas antes de un despliegue a producción.

**Próximos Pasos:**
1. Implementar CSP y headers de seguridad (Prioridad Alta)
2. Mejorar validación de datos de API (Prioridad Alta)
3. Configurar logging apropiado para producción (Prioridad Media)
4. Establecer proceso de auditoría regular (Ongoing)

---

**Auditoría realizada por:** AI Security Analyst  
**Contacto para reportar vulnerabilidades:** [Configurar según política de seguridad]

