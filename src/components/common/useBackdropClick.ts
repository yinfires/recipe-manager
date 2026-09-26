import { MouseEventHandler, PointerEventHandler, useRef } from 'react';

interface BackdropClickHandlers {
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onPointerUp: PointerEventHandler<HTMLDivElement>;
  onClick: MouseEventHandler<HTMLDivElement>;
}

export function useBackdropClick(onBackdropClick: () => void): BackdropClickHandlers {
  const startedOnBackdrop = useRef(false);
  const endedOnBackdrop = useRef(false);

  return {
    onPointerDown: event => {
      startedOnBackdrop.current = event.target === event.currentTarget;
      endedOnBackdrop.current = false;
    },
    onPointerUp: event => {
      endedOnBackdrop.current = event.target === event.currentTarget;
    },
    onClick: event => {
      const isBackdropClick = startedOnBackdrop.current
        && endedOnBackdrop.current
        && event.target === event.currentTarget;
      startedOnBackdrop.current = false;
      endedOnBackdrop.current = false;

      if (isBackdropClick) onBackdropClick();
    }
  };
}
