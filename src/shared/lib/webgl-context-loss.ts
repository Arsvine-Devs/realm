export function listenForWebglContextLoss(
  canvas: HTMLCanvasElement,
  onContextLost: () => void,
) {
  let reported = false;

  const handleContextLost = (event: Event) => {
    event.preventDefault();
    if (reported) return;

    reported = true;
    onContextLost();
  };

  canvas.addEventListener('webglcontextlost', handleContextLost);

  return () => {
    canvas.removeEventListener('webglcontextlost', handleContextLost);
  };
}
