'use client';

import { forwardRef, useEffect, useRef, useState } from 'react';
import TextType from './TextType';

const AnimatedTextarea = forwardRef(function AnimatedTextarea(
  { value, placeholder, typingTexts, onFocus, onBlur, ...props },
  ref
) {
  const [focused, setFocused] = useState(false);
  const fieldRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.1);
    }, { threshold: 0.1 });
    observer.observe(field);
    return () => observer.disconnect();
  }, []);

  const hasValue = String(value ?? '').length > 0;
  const showAnimation = visible && !focused && !hasValue && Array.isArray(typingTexts) && typingTexts.some((text) => String(text).length > 0);

  return (
    <div ref={fieldRef} className="composer-field" data-typing-placeholder={showAnimation ? 'true' : 'false'}>
      <textarea
        {...props}
        ref={ref}
        value={value}
        placeholder={placeholder}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
      />
      {showAnimation && (
        <span className="composer-placeholder-overlay" aria-hidden="true">
          <TextType
            as="span"
            text={typingTexts}
            typingSpeed={75}
            pauseDuration={1500}
            deletingSpeed={50}
            deleteMode="backspace"
            typeEffect="fade"
            mistakes={0.2}
            cursorStyle="bar"
            cursorGlide
            showCursor
            className="composer-placeholder-text"
          />
        </span>
      )}
    </div>
  );
});

AnimatedTextarea.displayName = 'AnimatedTextarea';

export default AnimatedTextarea;
