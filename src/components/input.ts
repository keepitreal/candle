import {input} from '@cycle/dom';
import xs from 'xstream';

export default function Input(sources) {
  const props$ = sources.Props;
  const assignValue$ = sources.Assign;

  const vtree$ = xs.combine(assignValue$, props$)
    .map(([value, props]) => xs.of([value, props]))
    .flatten()
    .map(([value, {className, placeholder, style}]) => {
      return input(className, {
        type: 'text',
        style,
        placeholder,
        hook: {
          insert: (vnode) => {vnode.elm.placeholder = placeholder;}
          postpatch: (vnode) => {vnode.elm.value = value;}
        }
      });
    })

  return {
    DOM: vtree$
  };
}


