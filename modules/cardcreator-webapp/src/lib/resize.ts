/**
 * Resize handles for panels - pure vanilla DOM.
 */
export function initResize(): void {
  document
    .querySelectorAll<HTMLElement>('.resize-handle')
    .forEach((handle) => {
      const isHorizontal =
        handle.classList.contains('horizontal');
      let startPos = 0;
      let startSize = 0;
      let target: HTMLElement | null = null;

      const onMove = (e: MouseEvent) => {
        if (!target) return;
        const delta = isHorizontal
          ? e.clientX - startPos
          : e.clientY - startPos;
        const newSize = Math.max(150, startSize + delta);
        target.style[
          isHorizontal ? 'width' : 'height'
        ] = `${newSize}px`;
        target.style.flex = 'none';
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      handle.addEventListener('mousedown', (e) => {
        target =
          handle.previousElementSibling as HTMLElement;
        if (!target) return;
        startPos = isHorizontal ? e.clientX : e.clientY;
        startSize = isHorizontal
          ? target.offsetWidth
          : target.offsetHeight;
        document.body.style.cursor = isHorizontal
          ? 'col-resize'
          : 'row-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    });
}
