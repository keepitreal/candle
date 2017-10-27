'use strict';

import xs from 'xstream';
import cx from 'classnames';
import {div, span, input} from '@cycle/dom';
import {ComponentSources, AppSinks} from '../interfaces';
import {requestHistorical} from '../requests/crypto';
import update from 'react-addons-update';

export default function Header(sources: ComponentSources): AppSinks {
  const props$ = sources.props$;

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
    .map(v => s => update(s, {searchTerm: {$set: v}}));

  const escapeSearch$ = input$.events('blur')
    .map(v => s => update(s, {searchTerm: {$set: ''}}));

  const suggestions$ = xs.combine(props$)
    .map(([{coinlist, searchTerm, symbols}]) => {
      const term = searchTerm.toUpperCase();
      const suggestions = term.length > 1 ? 
        symbols.filter(symb => symb.indexOf(term.toUpperCase()) > -1) :
        [];

      return suggestions
        .reduce((prev, curr) => prev.concat([coinlist[curr]]), [])
        .sort((a, b) => parseInt(a.SortOrder) - parseInt(b.SortOrder))
        .slice(0, 5);
    });

  const select$ = xs.combine(inputChange$, selecting$, suggestions$)
    .filter(([{keyCode}]) => keyCode === 13)
    .startWith(0)

  const vdom$ = xs.combine(props$, suggestions$, selecting$, select$)
    .map(([{searchTerm}, suggestions, selecting, select]) => {
      return div('.header', [
        div('.header-title', 'CX'),
        div('.header-search-container', [
          input('.header-search', {attrs:{value: searchTerm, placeholder: 'Search by symbol or name'}}),
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
    HTTP: fetchHistorical$,
    onion: xs.merge(historical$, searchTerm$, escapeSearch$)
  };

  return sinks;
}

function mapKeyCodeToDirection(acc: number, keyCode: number): number {
  switch (keyCode) {
    case 40: // down
      return acc === 4 ? acc : acc + 1;
    case 38: // up
      return acc === 0 ? acc : acc - 1;
  }
}

function getKeycode(e) {
  e.preventDefault();
  return e.keyCode;
}
