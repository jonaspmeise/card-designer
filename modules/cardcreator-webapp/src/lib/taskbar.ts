/**
 * Taskbar - vertical navigation with off-canvas sidebar.
 */
export function initTaskbar(): void {
  const sidebar = document.getElementById('sidebar')!;
  const panels = sidebar.querySelectorAll('.panel');
  const buttons =
    document.querySelectorAll<HTMLButtonElement>(
      '.taskbar-btn',
    );

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const panelId = btn.dataset.panel;
      const isActive = btn.classList.contains('active');

      // Toggle same panel = close sidebar
      if (isActive) {
        btn.classList.remove('active');
        sidebar.hidden = true;
        return;
      }

      // Switch panels
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      sidebar.hidden = false;

      panels.forEach((p) => {
        (p as HTMLElement).hidden =
          p.id !== `panel-${panelId}`;
      });
    });
  });
}
