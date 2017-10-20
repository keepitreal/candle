'use strict';

import xs from 'xstream';
import cx from 'classnames';
import {div, span, input} from '@cycle/dom';
import {ComponentSources, AppSinks} from '../interfaces';
import update from 'react-addons-update';

export default function Header(sources: ComponentSources): AppSinks {
  const props$ = sources.props$;

  const inputChange$ = sources.DOM.select('.header-search')
    .events('keyup');

  const selecting$ = inputChange$
    .map(({keyCode}) => keyCode)
    .filter((code) => code === 40 || code === 38)
    .fold(mapKeyCodeToDirection, -1);

  const searchTerm$ = inputChange$
    .map(({target: {value}}) => value)
    .startWith('');

  const suggestions$ = xs.combine(searchTerm$, props$)
    .map(([searchTerm, {coinlist, symbols}]) => {
      const term = searchTerm.toUpperCase();
      const suggestions = term.length > 1 ? 
        symbols.filter(symb => symb.indexOf(term.toUpperCase()) > -1) :
        [];

      return suggestions
        .reduce((prev, curr) => prev.concat([coinlist[curr]]), [])
        .sort((a, b) => parseInt(a.SortOrder) - parseInt(b.SortOrder))
        .slice(0, 5);
    });

  const vdom$ = xs.combine(suggestions$, selecting$).map(([suggestions, selecting]) => {
    return div('.header', [
      div('.header-title', 'CX'),
      div('.header-search-container', [
        input('.header-search'),
        suggestions.length ? div('.header-suggestions', suggestions.map((suggestion, i) => {
          return div('.suggestion', {
            style: {backgroundColor: i === selecting ? '#f0f0f0' : 'transparent'}
          }, suggestion.FullName);
        })) : span()
      ]),
      span()
    ]);
  });

  const sinks = {
    DOM: vdom$
  };

  return sinks;
}

function mapKeyCodeToDirection(acc: number, keyCode: number): number {
  switch (keyCode) {
    case 40: // down
      return acc + 1;
    case 38: // up
      return acc - 1;
  }
}
