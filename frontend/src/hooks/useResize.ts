import { useState, useEffect, useRef } from 'react';

type ResizeDirection = 'horizontal' | 'vertical';

export const useResize = (
  defaultSize: number,
  min: number,
  max: number,
  direction: ResizeDirection = 'horizontal'
) => {
  const [size, setSize] = useState(defaultSize);
  const isResizing = useRef(false);
  const startPos = useRef(0);
  const startSize = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    isResizing.current = true;
    startPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
    startSize.current = size;
    e.preventDefault();
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const delta =
        direction === 'horizontal'
          ? e.clientX - startPos.current
          : e.clientY - startPos.current;
      setSize(Math.min(max, Math.max(min, startSize.current + delta)));
    };

    const onMouseUp = () => {
      isResizing.current = false;
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [min, max, direction, size]);

  return { size, onMouseDown };
};
