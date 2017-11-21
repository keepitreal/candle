'use strict';

import xs from 'xstream';
import cx from 'classnames';
import {div, span, input} from '@cycle/dom';
import dropRepeats from 'xstream/extra/dropRepeats';
import update from 'react-addons-update';
import {ComponentSources, AppSinks} from '../interfaces';
import {requestHistorical} from '../requests/crypto';
import Input from './input';

export default function Header(sources: ComponentSources): AppSinks {
  const state$ = sources.state$;

  const historical$: Stream<Reducer> = sources.HTTP.select('historical')
    .flatten()
    .map((res: any) => res.body.Data)
    .map<Reducer>((days: any) => (state: AppState) => {
      return update(state, {currencies: {[state.selected]: {days: {$set: days}}}});
    });

  const input$ = sources.DOM.select('.header-search');

  const inputChange$ = input$.events('keyup');
  const blur$ = xs.merge(
    input$.events('blur'),
    inputChange$.map(getKeycode).filter(code => code === 27 || code === 13)
  );

  const selecting$ = inputChange$
    .map(getKeycode)
    .filter((code) => code === 40 || code === 38)
    .fold(mapKeyCodeToDirection, -1);

  const searchTerm$ = inputChange$
    .map(({target: {value}}) => value)
    .startWith('');

  const onBlur$ = blur$.map(() => '').startWith('');

  const inputValue$ = xs.merge(searchTerm$, onBlur$).startWith('');

  const suggestions$ = xs.combine(inputValue$, state$)
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

  const selected$ = xs.combine(inputChange$, selecting$, suggestions$)
    .compose(dropRepeats(([{keyCode: a}], [{keyCode: b}]) => a === b))
    .filter(([{keyCode}]) => keyCode === 13)
    .map(([,selecting, suggestions]) => state => {
      return update(state, {selected: {$set: suggestions[selecting].Name}});
    }));

  // Input component allows for a controlled input
  const input = Input({
    Props: xs.of({
      className: '.header-search',
      placeholder: 'Search by Symbol or Name'
    }),
    Assign: inputValue$
  });

  const vdom$ = xs.combine(input.DOM, suggestions$, selecting$)
    .map(([inputDOM, suggestions, selecting]) => {
      return div('.header', [
        div('.header-title', 'CX'),
        div('.header-search-container', [
          inputDOM,
          suggestions.length ? div('.header-suggestions', suggestions.map((suggestion, i) => {
            return div('.suggestion', {
              style: {backgroundColor: i === selecting ? '#f0f0f0' : 'transparent'}
            }, suggestion.FullName);
          })) : span('.empty')
        ]),
        span()
      ]);
    });

  const sinks = {
    DOM: vdom$,
    onion: selected$
  };

  return sinks;
}

function mapKeyCodeToDirection(acc: number, keyCode: number): number {
  switch (keyCode) {
    case 40: // down
      return acc === 4 ? acc : acc + 1;
    case 38: // up
      return acc === 0 ? acc : acc - 1;
    default:
      return acc;
  }
}

function getKeycode(e: KeyboardEvent): number {
  e.preventDefault();
  return e.keyCode;
}
