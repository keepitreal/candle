'use strict';

import xs from 'xstream';
import cx from 'classnames';
import {div, span, input} from '@cycle/dom';
import dropRepeats from 'xstream/extra/dropRepeats';
import {ComponentSources, AppSinks} from '../interfaces';
import {requestHistorical} from '../requests/crypto';
import update from 'react-addons-update';

export default function Header(sources: ComponentSources): AppSinks {
  const state$ = sources.state$;

  const fetchHistorical$: Stream<RequestBody> = xs.of(requestHistorical('BTC'));

  const historical$: Stream<Reducer> = sources.HTTP.select('historical')
    .flatten()
    .map((res: any) => res.body.Data)
    .map<Reducer>((days: any) => (state: AppState) => {
      return update(state, {currencies: {[state.selected]: {days: {$set: days}}}});
    });

  const input$ = sources.DOM.select('.header-search');

  const inputChange$ = input$.events('keyup');

  const selecting$ = inputChange$
    .map(getKeycode)
    .filter((code) => code === 40 || code === 38)
    .fold(mapKeyCodeToDirection, -1);

  const searchTerm$ = inputChange$
    .map(({target: {value}}) => value)
    .startWith('');

  const suggestions$ = xs.combine(searchTerm$, state$)
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
      console.log(state);
      return update(state, {selected: {$set: suggestions[selecting].Name}});
    }))

  const vdom$ = xs.combine(searchTerm$, suggestions$, selecting$)
    .map(([searchTerm, suggestions, selecting]) => {
      return div('.header', [
        div('.header-title', 'CX'),
        div('.header-search-container', [
          input('.header-search', {attrs: {value: searchTerm, placeholder: 'Search by symbol or name'}}),
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
