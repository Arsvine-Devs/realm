export function resetTransitionSurface(wrapper: Pick<HTMLElement, 'style'>) {
  wrapper.style.opacity = '';
  wrapper.style.transform = '';
  wrapper.style.clipPath = '';
  wrapper.style.transition = '';
}
