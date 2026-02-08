import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { cn } from '../../utils';

interface ScrambledTextProps {
  children: string;
  className?: string;
  radius?: number;
  duration?: number;
  speed?: number;
  scrambleChars?: string;
}

const ScrambledText: React.FC<ScrambledTextProps> = ({
  children,
  className,
  radius = 80,
  duration = 0.2,
  speed = 0.2,
  scrambleChars = '.:',
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const charsRef = useRef<HTMLSpanElement[]>([]);
  const originalChars = useRef<string[]>([]);

  useEffect(() => {
    if (!rootRef.current) return;

    // Split text
    const text = children;
    originalChars.current = text.split('');
    
    // Clear content and create spans
    rootRef.current.innerHTML = '';
    charsRef.current = [];
    
    originalChars.current.forEach((char) => {
      const span = document.createElement('span');
      span.textContent = char;
      span.style.display = 'inline-block';
      span.style.minWidth = char === ' ' ? '0.5em' : 'auto'; // Handle spaces
      span.dataset.original = char;
      // Add a class for potential styling
      span.classList.add('scramble-char');
      rootRef.current?.appendChild(span);
      charsRef.current.push(span);
    });

    const handleMove = (e: PointerEvent) => {
      charsRef.current.forEach((c) => {
        const rect = c.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;
        const dist = Math.hypot(dx, dy);

        if (dist < radius) {
          // Calculate dynamic duration based on distance
          // Closer = longer scramble
          const dynDuration = duration * (1 - dist / radius);
          
          // Create a proxy object to animate
          // We use a unique property on the element to avoid conflict, or just a standalone object if we manage references
          // But gsap.killTweensOf(c) works on the element.
          // To use killTweensOf(c), we should tween 'c' or a property of 'c'.
          // We can tween a dummy property on the DOM element object.
          
          const target = c as any;
          
          gsap.to(target, {
            overwrite: true,
            scrambleProgress: 1, // dummy property
            duration: dynDuration,
            ease: 'none',
            onUpdate: () => {
              // Randomly change character
              // Use speed to control frequency
              if (Math.random() < speed) {
                const randomChar = scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
                c.textContent = randomChar;
              }
            },
            onComplete: () => {
               c.textContent = c.dataset.original || '';
            }
          });
        }
      });
    };

    const handleLeave = () => {
        charsRef.current.forEach(c => {
            gsap.killTweensOf(c);
            c.textContent = c.dataset.original || '';
        });
    };

    const el = rootRef.current;
    // We attach to window/document if we want the effect to trigger when NEAR the element but not strictly inside it.
    // However, usually 'radius' implies a field around the text.
    // If we only listen on 'el', we miss the 'approach' phase unless 'el' is large.
    // But for a simple text block, listening on 'el' is safer for performance than window.
    // Let's stick to 'el' as per user code, but maybe add some padding if needed.
    // Actually, user code attached to 'el' (rootRef.current).
    el.addEventListener('pointermove', handleMove);
    el.addEventListener('pointerleave', handleLeave);

    return () => {
      el.removeEventListener('pointermove', handleMove);
      el.removeEventListener('pointerleave', handleLeave);
      gsap.killTweensOf(charsRef.current);
    };
  }, [children, radius, duration, speed, scrambleChars]);

  return (
    <span ref={rootRef} className={cn("inline-block", className)}>
      {children}
    </span>
  );
};

export default ScrambledText;
