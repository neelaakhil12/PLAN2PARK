import React, { useEffect, useRef, useState } from 'react';

/**
 * ScrollReveal Wrapper Component
 * Triggers a smooth reveal transition when the element enters the viewport.
 * 
 * Props:
 *   - direction: 'up' | 'down' | 'left' | 'right' | 'fade'
 *   - delay: animation delay in ms (for sequential stagger)
 *   - duration: transition duration in ms
 *   - distance: offset distance in px for translation
 *   - className: custom CSS classes
 */
const ScrollReveal = ({
  children,
  direction = 'up',
  delay = 0,
  duration = 800,
  distance = 40,
  className = "",
}) => {
  const ref = useRef(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.05,
        rootMargin: '0px 0px -40px 0px', // trigger slightly before entering view
      }
    );

    const el = ref.current;
    if (el) {
      observer.observe(el);
    }

    return () => {
      if (el) {
        observer.unobserve(el);
      }
    };
  }, []);

  const getTransform = () => {
    if (revealed) return 'translate(0, 0)';
    switch (direction) {
      case 'up': return `translateY(${distance}px)`;
      case 'down': return `translateY(-${distance}px)`;
      case 'left': return `translateX(${distance}px)`;
      case 'right': return `translateX(-${distance}px)`;
      default: return 'none';
    }
  };

  const style = {
    opacity: revealed ? 1 : 0,
    transform: getTransform(),
    transition: `opacity ${duration}ms cubic-bezier(0.25, 1, 0.5, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.25, 1, 0.5, 1) ${delay}ms`,
  };

  return (
    <div ref={ref} style={style} className={className}>
      {children}
    </div>
  );
};

export default ScrollReveal;
