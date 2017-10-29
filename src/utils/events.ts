export function getCursorPos(ev: MouseEvent): Offset {
  const {top, left} = getOffset(ev.target);

  return {
    x: ev.clientX - left,
    y: ev.clientY - top
  };
}

export function getOffset(el: Element): Offset {
  let left = 0;
  let top = 0;

  while (el) {
    const {left: offsetLeft, top: offsetTop} = el.getBoundingClientRect();

    left += offsetLeft - el.scrollLeft;
    top += offsetTop - el.scrollTop;
    el = el.offsetParent;
  }

  return {top, left};
}

interface Offset {
  top: number;
  left: number;
}
