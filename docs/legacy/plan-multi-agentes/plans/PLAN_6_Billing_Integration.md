# 💰 Plan de Integración de Pagos (PayPal) y Facturación

Este documento detalla la estrategia y fases para implementar la compra de créditos mediante PayPal en Securetag Agent.

## 📋 1. Selección de Integración: Standard vs Advanced

Antes de iniciar, aclaramos las diferencias para confirmar la elección:

*   **PayPal Standard (Recomendado - "PayPal Checkout")**:
    *   **Experiencia**: Muestra botones inteligentes (PayPal, Tarjeta de Débito/Crédito). Al pagar, abre una ventana emergente segura de PayPal.
    *   **Ventajas**: Implementación más rápida, menor carga de cumplimiento PCI (seguridad), soporta "Guest Checkout" (pagar con tarjeta sin cuenta PayPal).
    *   **Tecnología**: Usa el SDK moderno de JavaScript (`@paypal/react-paypal-js`).

*   **PayPal Advanced**:
    *   **Experiencia**: Campos de tarjeta de crédito integrados visualmente en tu propio formulario (Hosted Fields).
    *   **Ventajas**: Diseño 100% personalizado.
    *   **Desventajas**: Mayor complejidad técnica y requisitos de auditoría de seguridad.

**Decisión**: Procederemos con **PayPal Standard (Checkout)** utilizando `@paypal/react-paypal-js` y un backend en Node.js (Wasp Actions) para asegurar la transacción.

---

## 🏗️ Arquitectura de Datos y Sincronización

### Relación entre Bases de Datos
Es vital entender dónde vive el "Dinero" (Créditos) en nuestra arquitectura de contenedores separados.

*   **`opensaas-db` (Frontend/Gateway)**:
    *   **Rol**: Es la "Fuente de la Verdad" financiera.
    *   **Datos**: Almacena el saldo de créditos (`User.credits`), el historial de pagos (`Payment`) y el historial de consumo (`CreditUsage`).
    *   **Razón**: El usuario interactúa con esta interfaz para comprar y gestionar su cuenta.

*   **`securetag-db` (Backend Core)**:
    *   **Rol**: Motor de ejecución de seguridad.
    *   **Datos**: Almacena los resultados de escaneos, tenants y usuarios técnicos.
    *   **Relación**: No necesita saber cuántos créditos tiene el usuario. Solo recibe órdenes de escaneo.
    *   **Flujo**:
        1.  Usuario solicita escaneo en Frontend.
        2.  Wasp (Backend Frontend) verifica saldo en `opensaas-db`.
        3.  Si hay saldo, descuenta 1 crédito.
        4.  Wasp llama a la API del Backend Core (`securetag-app`) para iniciar el escaneo.
        5.  Si la API falla, Wasp devuelve el crédito (Rollback).

### Prevención de Doble Cobro (Idempotencia)
Para evitar cobrar dos veces por error (ej: click doble, timeout de red), implementaremos 3 capas de seguridad:

1.  **PayPal Deduplication**:
    *   PayPal evita duplicados si enviamos el mismo `invoice_id` (nuestro ID interno de transacción) en un lapso corto.

2.  **Verificación Atómica en Backend (Nuestra Lógica)**:
    *   Antes de capturar el pago (`captureOrder`), buscamos en nuestra tabla `Payment` si ese `paypalOrderId` ya fue procesado.
    *   Si ya existe con estado `COMPLETED`, devolvemos éxito al cliente pero **NO** sumamos créditos nuevamente.

3.  **Transacción de Base de Datos**:
    *   El registro del pago y el aumento de créditos ocurren en una sola transacción (`prisma.$transaction`). O pasan los dos, o no pasa ninguno.

---

## 🗓️ Fases de Implementación

### Fase 1: Arquitectura de Datos (Schema)
**Estado**: ✅ Completado

Necesitamos persistir las transacciones y el historial de uso de créditos en `opensaas-db`.

1.  **Modificar `schema.prisma`**:
    *   **Nuevo Modelo `Payment`**:
        *   `id`: UUID interno.
        *   `paypalOrderId`: ID único de PayPal (clave para evitar duplicados).
        *   `amount`: Monto cobrado.
        *   `currency`: Moneda (USD).
        *   `status`: PENDING, COMPLETED, FAILED.
        *   `creditsAmount`: Cantidad de créditos comprados.
    *   **Nuevo Modelo `CreditUsage`**:
        *   Registro de auditoría (Ledger) de cada crédito gastado o comprado.
        *   Tipos: `PURCHASE` (+), `SCAN` (-), `REFUND` (+), `BONUS` (+).
    *   **Actualizar Modelo `User`**:
        *   Relación `payments` y `creditUsages`.

### Fase 2: Configuración de Entorno (Backend)
**Estado**: ✅ Completado

Preparar el servidor para comunicarse con PayPal de forma segura.

1.  **Credenciales PayPal Developer**:
    *   Obtener `CLIENT_ID` y `CLIENT_SECRET` de una App tipo "Merchant" en el Sandbox de PayPal.
2.  **Variables de Entorno**:
    *   Configurar `.env.server` con las credenciales.
3.  **Dependencias**:
    *   Instalar `@paypal/checkout-server-sdk` (o usar fetch directo a la API v2 de PayPal).

### Fase 3: Lógica de Servidor (Wasp Actions)
**Estado**: ✅ Completado

La seguridad es prioridad: nunca confiaremos en el cliente para definir montos.

1.  **Action `createPayPalOrder`**:
    *   Recibe el ID del paquete de créditos (ej: "pack_100").
    *   Calcula el precio en el servidor.
    *   Genera un registro `Payment` con estado `PENDING`.
    *   Llama a PayPal API para crear la orden.
    *   Retorna `orderId` al cliente.

2.  **Action `capturePayPalOrder`**:
    *   Recibe `orderId` desde el cliente (tras aprobación del usuario).
    *   **Check de Idempotencia**: Verifica si ya procesamos este pago.
    *   Llama a PayPal API para capturar fondos.
    *   **Transacción**:
        *   Actualiza `Payment` a `COMPLETED`.
        *   Incrementa `User.credits`.
        *   Crea registro `CreditUsage`.
    *   Retorna el nuevo saldo de créditos.

### Fase 4: Integración Frontend (BillingPage)
**Estado**: ✅ Completado

Reemplazar la página de precios estática con una interfaz dinámica.

1.  **Instalar SDK Cliente**: `npm install @paypal/react-paypal-js`.
2.  **Componente `PayPalButtonWrapper`**:
    *   Maneja el ciclo de vida de los botones de PayPal.
    *   Conecta con `createPayPalOrder` y `capturePayPalOrder`.
3.  **Página `BillingPage`**:
    *   Lista paquetes de créditos reales.
    *   Muestra el saldo actual del usuario.
    *   Abre modal de pago al seleccionar un paquete.

### Fase 5: Visualización de Historial
**Estado**: ✅ Completado

Dar transparencia al usuario sobre sus gastos.

1.  **Queries Wasp**:
    *   `getBillingHistory`: Lista pagos realizados.
    *   `getCreditUsageHistory`: Lista consumo de créditos (escaneos, compras).
2.  **UI de Tablas**:
    *   Mostrar fechas, montos y descripciones claras.


### Fase 6: Mejoras de diseño (BillingPage)
**Estado**:  Pendiente

#### Botones de pago con electric border
##### Documentacion reactbits
###### instalacion
npx shadcn@latest add @react-bits/ElectricBorder-TS-CSS

###### Usage

// CREDIT
// Component inspired by @BalintFerenczy on X
// https://codepen.io/BalintFerenczy/pen/KwdoyEN
  
import ElectricBorder from './ElectricBorder'

<ElectricBorder
  color="#7df9ff"
  speed={1}
  chaos={0.5}
  thickness={2}
  style={{ borderRadius: 16 }}
>
  <div>
    <p style={{ margin: '6px 0 0', opacity: 0.8 }}>
      A glowing, animated border wrapper.
    </p>
  </div>
</ElectricBorder>

###### Code

import React, { CSSProperties, PropsWithChildren, useEffect, useId, useLayoutEffect, useRef } from 'react';

import './ElectricBorder.css';

type ElectricBorderProps = PropsWithChildren<{
  color?: string;
  speed?: number;
  chaos?: number;
  thickness?: number;
  className?: string;
  style?: CSSProperties;
}>;

const ElectricBorder: React.FC<ElectricBorderProps> = ({
  children,
  color = '#5227FF',
  speed = 1,
  chaos = 1,
  thickness = 2,
  className,
  style
}: ElectricBorderProps) => {
  const rawId = useId().replace(/[:]/g, '');
  const filterId = `turbulent-displace-${rawId}`;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const strokeRef = useRef<HTMLDivElement | null>(null);

  const updateAnim = () => {
    const svg = svgRef.current;
    const host = rootRef.current;
    if (!svg || !host) return;

    if (strokeRef.current) {
      strokeRef.current.style.filter = `url(#${filterId})`;
    }

    const width = Math.max(1, Math.round(host.clientWidth || host.getBoundingClientRect().width || 0));
    const height = Math.max(1, Math.round(host.clientHeight || host.getBoundingClientRect().height || 0));

    const dyAnims = Array.from(svg.querySelectorAll<SVGAnimateElement>('feOffset > animate[attributeName="dy"]'));
    if (dyAnims.length >= 2) {
      dyAnims[0].setAttribute('values', `${height}; 0`);
      dyAnims[1].setAttribute('values', `0; -${height}`);
    }

    const dxAnims = Array.from(svg.querySelectorAll<SVGAnimateElement>('feOffset > animate[attributeName="dx"]'));
    if (dxAnims.length >= 2) {
      dxAnims[0].setAttribute('values', `${width}; 0`);
      dxAnims[1].setAttribute('values', `0; -${width}`);
    }

    const baseDur = 6;
    const dur = Math.max(0.001, baseDur / (speed || 1));
    [...dyAnims, ...dxAnims].forEach(a => a.setAttribute('dur', `${dur}s`));

    const disp = svg.querySelector('feDisplacementMap');
    if (disp) disp.setAttribute('scale', String(30 * (chaos || 1)));

    const filterEl = svg.querySelector<SVGFilterElement>(`#${CSS.escape(filterId)}`);
    if (filterEl) {
      filterEl.setAttribute('x', '-200%');
      filterEl.setAttribute('y', '-200%');
      filterEl.setAttribute('width', '500%');
      filterEl.setAttribute('height', '500%');
    }

    requestAnimationFrame(() => {
      [...dyAnims, ...dxAnims].forEach((a: any) => {
        if (typeof a.beginElement === 'function') {
          try {
            a.beginElement();
          } catch {}
        }
      });
    });
  };

  useEffect(() => {
    updateAnim();
  }, [speed, chaos]);

  useLayoutEffect(() => {
    if (!rootRef.current) return;
    const ro = new ResizeObserver(() => updateAnim());
    ro.observe(rootRef.current);
    updateAnim();
    return () => ro.disconnect();
  }, []);

  const vars: CSSProperties = {
    ['--electric-border-color' as any]: color,
    ['--eb-border-width' as any]: `${thickness}px`
  };

  return (
    <div ref={rootRef} className={`electric-border ${className ?? ''}`} style={{ ...vars, ...style }}>
      <svg ref={svgRef} className="eb-svg" aria-hidden focusable="false">
        <defs>
          <filter id={filterId} colorInterpolationFilters="sRGB" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise1" seed="1" />
            <feOffset in="noise1" dx="0" dy="0" result="offsetNoise1">
              <animate attributeName="dy" values="700; 0" dur="6s" repeatCount="indefinite" calcMode="linear" />
            </feOffset>

            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise2" seed="1" />
            <feOffset in="noise2" dx="0" dy="0" result="offsetNoise2">
              <animate attributeName="dy" values="0; -700" dur="6s" repeatCount="indefinite" calcMode="linear" />
            </feOffset>

            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise1" seed="2" />
            <feOffset in="noise1" dx="0" dy="0" result="offsetNoise3">
              <animate attributeName="dx" values="490; 0" dur="6s" repeatCount="indefinite" calcMode="linear" />
            </feOffset>

            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise2" seed="2" />
            <feOffset in="noise2" dx="0" dy="0" result="offsetNoise4">
              <animate attributeName="dx" values="0; -490" dur="6s" repeatCount="indefinite" calcMode="linear" />
            </feOffset>

            <feComposite in="offsetNoise1" in2="offsetNoise2" result="part1" />
            <feComposite in="offsetNoise3" in2="offsetNoise4" result="part2" />
            <feBlend in="part1" in2="part2" mode="color-dodge" result="combinedNoise" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="combinedNoise"
              scale="30"
              xChannelSelector="R"
              yChannelSelector="B"
            />
          </filter>
        </defs>
      </svg>

      <div className="eb-layers">
        <div ref={strokeRef} className="eb-stroke" />
        <div className="eb-glow-1" />
        <div className="eb-glow-2" />
        <div className="eb-background-glow" />
      </div>

      <div className="eb-content">{children}</div>
    </div>
  );
};

export default ElectricBorder;


---


#### Fondo antigravity o Laser Flow
##### Documentacion reactbits
###### instalacion
npx shadcn@latest add @react-bits/Antigravity-TS-CSS

###### Usage

import Antigravity from './Antigravity';

<div style={{ width: '100%', height: '400px', position: 'relative' }}>
  <Antigravity
    count={300}
    magnetRadius={6}
    ringRadius={7}
    waveSpeed={0.4}
    waveAmplitude={1}
    particleSize={1.5}
    lerpSpeed={0.05}
    color={'#FF9FFC'}
    autoAnimate={true}
    particleVariance={1}
  />
</div>
  

###### Code


import { Canvas, useFrame, useThree } from '@react-three/fiber';
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';

interface AntigravityProps {
  count?: number;
  magnetRadius?: number;
  ringRadius?: number;
  waveSpeed?: number;
  waveAmplitude?: number;
  particleSize?: number;
  lerpSpeed?: number;
  color?: string;
  autoAnimate?: boolean;
  particleVariance?: number;
  rotationSpeed?: number;
  depthFactor?: number;
  pulseSpeed?: number;
  particleShape?: 'capsule' | 'sphere' | 'box' | 'tetrahedron';
  fieldStrength?: number;
}

const AntigravityInner: React.FC<AntigravityProps> = ({
  count = 300,
  magnetRadius = 10,
  ringRadius = 10,
  waveSpeed = 0.4,
  waveAmplitude = 1,
  particleSize = 2,
  lerpSpeed = 0.1,
  color = '#FF9FFC',
  autoAnimate = false,
  particleVariance = 1,
  rotationSpeed = 0,
  depthFactor = 1,
  pulseSpeed = 3,
  particleShape = 'capsule',
  fieldStrength = 10
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { viewport } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const lastMousePos = useRef({ x: 0, y: 0 });
  const lastMouseMoveTime = useRef(0);
  const virtualMouse = useRef({ x: 0, y: 0 });

  const particles = useMemo(() => {
    const temp = [];
    const width = viewport.width || 100;
    const height = viewport.height || 100;

    for (let i = 0; i < count; i++) {
      const t = Math.random() * 100;
      const factor = 20 + Math.random() * 100;
      const speed = 0.01 + Math.random() / 200;
      const xFactor = -50 + Math.random() * 100;
      const yFactor = -50 + Math.random() * 100;
      const zFactor = -50 + Math.random() * 100;

      const x = (Math.random() - 0.5) * width;
      const y = (Math.random() - 0.5) * height;
      const z = (Math.random() - 0.5) * 20;

      const randomRadiusOffset = (Math.random() - 0.5) * 2;

      temp.push({
        t,
        factor,
        speed,
        xFactor,
        yFactor,
        zFactor,
        mx: x,
        my: y,
        mz: z,
        cx: x,
        cy: y,
        cz: z,
        vx: 0,
        vy: 0,
        vz: 0,
        randomRadiusOffset
      });
    }
    return temp;
  }, [count, viewport.width, viewport.height]);

  useFrame(state => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const { viewport: v, pointer: m } = state;

    const mouseDist = Math.sqrt(Math.pow(m.x - lastMousePos.current.x, 2) + Math.pow(m.y - lastMousePos.current.y, 2));

    if (mouseDist > 0.001) {
      lastMouseMoveTime.current = Date.now();
      lastMousePos.current = { x: m.x, y: m.y };
    }

    let destX = (m.x * v.width) / 2;
    let destY = (m.y * v.height) / 2;

    if (autoAnimate && Date.now() - lastMouseMoveTime.current > 2000) {
      const time = state.clock.getElapsedTime();
      destX = Math.sin(time * 0.5) * (v.width / 4);
      destY = Math.cos(time * 0.5 * 2) * (v.height / 4);
    }

    const smoothFactor = 0.05;
    virtualMouse.current.x += (destX - virtualMouse.current.x) * smoothFactor;
    virtualMouse.current.y += (destY - virtualMouse.current.y) * smoothFactor;

    const targetX = virtualMouse.current.x;
    const targetY = virtualMouse.current.y;

    const globalRotation = state.clock.getElapsedTime() * rotationSpeed;

    particles.forEach((particle, i) => {
      let { t, speed, mx, my, mz, cz, randomRadiusOffset } = particle;

      t = particle.t += speed / 2;

      const projectionFactor = 1 - cz / 50;
      const projectedTargetX = targetX * projectionFactor;
      const projectedTargetY = targetY * projectionFactor;

      const dx = mx - projectedTargetX;
      const dy = my - projectedTargetY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let targetPos = { x: mx, y: my, z: mz * depthFactor };

      if (dist < magnetRadius) {
        const angle = Math.atan2(dy, dx) + globalRotation;

        const wave = Math.sin(t * waveSpeed + angle) * (0.5 * waveAmplitude);
        const deviation = randomRadiusOffset * (5 / (fieldStrength + 0.1));

        const currentRingRadius = ringRadius + wave + deviation;

        targetPos.x = projectedTargetX + currentRingRadius * Math.cos(angle);
        targetPos.y = projectedTargetY + currentRingRadius * Math.sin(angle);
        targetPos.z = mz * depthFactor + Math.sin(t) * (1 * waveAmplitude * depthFactor);
      }

      particle.cx += (targetPos.x - particle.cx) * lerpSpeed;
      particle.cy += (targetPos.y - particle.cy) * lerpSpeed;
      particle.cz += (targetPos.z - particle.cz) * lerpSpeed;

      dummy.position.set(particle.cx, particle.cy, particle.cz);

      dummy.lookAt(projectedTargetX, projectedTargetY, particle.cz);
      dummy.rotateX(Math.PI / 2);

      const currentDistToMouse = Math.sqrt(
        Math.pow(particle.cx - projectedTargetX, 2) + Math.pow(particle.cy - projectedTargetY, 2)
      );

      const distFromRing = Math.abs(currentDistToMouse - ringRadius);
      let scaleFactor = 1 - distFromRing / 10;

      scaleFactor = Math.max(0, Math.min(1, scaleFactor));

      const finalScale = scaleFactor * (0.8 + Math.sin(t * pulseSpeed) * 0.2 * particleVariance) * particleSize;
      dummy.scale.set(finalScale, finalScale, finalScale);

      dummy.updateMatrix();

      mesh.setMatrixAt(i, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      {particleShape === 'capsule' && <capsuleGeometry args={[0.1, 0.4, 4, 8]} />}
      {particleShape === 'sphere' && <sphereGeometry args={[0.2, 16, 16]} />}
      {particleShape === 'box' && <boxGeometry args={[0.3, 0.3, 0.3]} />}
      {particleShape === 'tetrahedron' && <tetrahedronGeometry args={[0.3]} />}
      <meshBasicMaterial color={color} />
    </instancedMesh>
  );
};

const Antigravity: React.FC<AntigravityProps> = props => {
  return (
    <Canvas camera={{ position: [0, 0, 50], fov: 35 }}>
      <AntigravityInner {...props} />
    </Canvas>
  );
};

export default Antigravity;

----



### Fase 7: Integridad de Datos y Sincronización
**Estado**: ✅ Completado

Garantizar que el saldo de créditos sea consistente entre el Frontend (Wasp) y el Backend (Securetag Agent).

1.  **Mecanismo de Auto-Corrección**:
    *   Implementado en `getSastDashboard`: Al cargar el dashboard, si `Frontend.credits != Backend.credits`, el Frontend impone su valor.
2.  **Sincronización en Tiempo Real**:
    *   Implementado en `capturePayPalOrder`: Al comprar créditos, se actualiza inmediatamente el Backend.
3.  **Seguridad**:
    *   Uso de `X-SecureTag-System-Secret` para autenticar peticiones de sincronización (Server-to-Server) sin exponer permisos al cliente.




## 🛡️ Checklist de Seguridad y Validación
*   [x] Verificar que el monto a cobrar coincida con el paquete seleccionado en el backend.
*   [x] Asegurar que los créditos solo se sumen si PayPal confirma `status: COMPLETED`.
*   [x] Manejar casos de error (fondos insuficientes, cierre de ventana).
*   [x] Probar flujo completo en PayPal Sandbox.
*   [x] Validar que un doble submit no duplique créditos (Test de Idempotencia implementado en backend).

## 🧪 Guía de Pruebas (Sandbox)

Para probar el flujo de pagos, es necesario usar cuentas de prueba dedicadas ("Sandbox Accounts"), no tu cuenta real ni la cuenta de desarrollador.

1.  **Acceder a Cuentas de Prueba**:
    *   Ir a [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/).
    *   Navegar a **Testing Tools** > **Sandbox Accounts**.
2.  **Identificar Cuenta "Personal" (Comprador)**:
    *   Busca una cuenta con el tipo `PERSONAL` (usualmente creada por defecto, ej: `sb-47x...@personal.example.com`).
    *   Haz clic en los tres puntos (...) > **View/Edit account** para ver el **Email** y la **System Generated Password**.
3.  **Realizar Pago**:
    *   En Securetag, inicia el flujo de compra.
    *   Cuando se abra la ventana de PayPal, usa el email y contraseña de la cuenta "Personal".
    *   **Importante**: Usa una ventana de incógnito si tienes la sesión de Developer abierta en el mismo navegador para evitar conflictos de cookies.
