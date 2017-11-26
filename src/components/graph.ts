'use strict';

import moment from 'moment';
import cx from 'classnames';
import xs, {Stream} from 'xstream';
import update from 'react-addons-update';
import dropRepeats from 'xstream/extra/dropRepeats';
import throttle from 'xstream/extra/throttle';
import {svg, h, h3, div} from '@cycle/dom';
import {scaleTime, scaleLinear} from 'd3-scale';
import {area, line, curveBasis} from 'd3-shape';
import {BoundingBox, ComponentSources, AppSinks} from '../interfaces';
import {toDollarThousands} from '../utils/conversions';
import {getCursorPos} from '../utils/events';
import GraphTools from './graph-tools';

declare type ElementList = NodeListOf<HTMLElement>;

export default function Graph(sources: ComponentSources): AppSinks {
  const {props$, DOM} = sources;

  const guideDist = 30;

  const margin = {top: 0, bottom: 20, right: 40, left: 10};

  const graph$ = DOM.select('.graph').elements()
    .compose(dropRepeats((a, b: ElementList) => b[0] && b[0].clientHeight));

  const graphBounds$ = graph$
    .map((el: ElementList) => el.length && el[0].getBoundingClientRect())
    .filter(v => v.height && v.width)
    .startWith({height: 0, width: 0, top: 0, left: 0});

  const days$ = props$
    .map(({selected, currencies, period}) => {
      const selected = currencies[selected];
      const days = selected.days;
      const len = days.length;
      return days.slice(length - period, length - 1);
    })
    .filter((v) => v.length)
    .startWith([{high: 0, low: 0, time: new Date()}]);

  const scaleX$ = xs.combine(days$, graphBounds$)
    .map(([days, {width}]) => {
      const {time: earliest} = days.slice().shift() || {};
      const {time: latest} = days.slice().pop() || {};

      return scaleTime()
        .domain([convertDate(earliest), convertDate(latest)])
        .range([margin.left, width - margin.left - margin.right]);
    }).startWith(x => x);

  const scaleY$ = xs.combine(days$, graphBounds$)
    .map(([days, {height}]) => {
      const daysByHigh = days.slice()
        .sort((a, b) => a.high > b.high);

      const daysByLow = days.slice()
        .sort((a, b) => a.low < b.low);

      const {high = 0} = daysByHigh.pop() || {};
      const {low = 0} = daysByLow.pop() || {};

      const buffer = ((low + high) / 2) * 0.10;

      return scaleLinear()
        .domain([(low - buffer), (high + buffer)])
        .range([height - margin.top - margin.bottom, margin.bottom]);
    }).startWith(x => x);

  const guidelines$ = graphBounds$.map(({width, height}) => {
    const xGuidelines = createLines(
      {name: 'x', dist: width},
      {name: 'y', dist: height},
      guideDist
    );
    const yGuidelines = createLines(
      {name: 'y', dist: height},
      {name: 'x', dist: width},
      guideDist
    );

    return {xGuidelines, yGuidelines};
  });

  const lineFns$ = xs.combine(scaleX$, scaleY$).map(([scaleX, scaleY]) => ({
    area: area()
    .x(d => scaleX(convertDate(d.time)))
    .y(d => scaleY(d.high)),
    line: line()
    .x(d => scaleX(convertDate(d.time)))
    .y(d => scaleY(d.high))
  }));

  const line$ = xs.combine(days$, lineFns$)
    .map(([days, {area, line: lineFn}]) => {
      return h('g', [
        h('path.line', {attrs: {d: lineFn(days)}})
      ]);
    });

  const candlesticks$ = xs.combine(days$, scaleX$, scaleY$)
    .map(([days, scaleX, scaleY]) => {
      return h('g.candlesticks', days.map(({high, low, open, close, time}) => {
        const pos = close > open;
        const x = scaleX(convertDate(time));
        const y1Wick = scaleY(high) || 0;
        const y2Wick = scaleY(low) || 0;
        const y1Body = scaleY(pos ? open : close) || 0;
        const y2Body = scaleY(pos ? close : open) || 0;

        return h('g', {attrs: {
          'data-date': convertDate(time).toString(),
          'data-price': `high ${high}, low ${low}, open ${open}, close ${close}`
        }}, [
          h('line.candlestick-wick', {
            attrs: {x1: x, x2: x, y1: y1Wick, y2: y2Wick}
          }),
          h('line.candlestick-body', {
            style: { stroke: pos ? '#00EE00' : '#FF3030' },
            attrs: { x1: x, x2: x, y1: y1Body, y2: y2Body}
          })
        ]);
      });
    }));

  // this could prob be smarter
  const guidesVisible$ = xs
    .merge(
      DOM.select('.graph').events('mouseover').take(1),
      DOM.select('.graph').events('mouseenter'),
      DOM.select('.graph').events('mouseleave')
    )
    .map(({type}) => ['mouseenter', 'mouseover'].indexOf(type) > -1)
    .startWith(false);

  const guides$ = DOM.select('.graph').events('mousemove')
    .map((ev) => xs.combine(xs.of(ev), scaleX$, scaleY$, graphBounds$, guidesVisible$))
    .compose(throttle(16))
    .flatten()
    .map(([ev, scaleX, scaleY, {top, left, height, width}, visible]) => {
      const x = ev.clientX - left - margin.left + margin.right;
      const y = ev.clientY - top + margin.top + margin.bottom;
      const price = toDollarThousands(scaleY.invert(y));
      const date = formatDate(scaleX.invert(x));
      const padding = 5;
      const label = {width: 70, height: 25};

      return visible ? h('g', [
        h('line.guideline.horiz', {attrs: {x1: x, x2: x, y1: 0, y2: height}}),
        h('line.guideline.vert', {attrs: {x1: 0, x2: width, y1: y: y2: y}}),
        h('rect.guideline-label.x', {attrs: {x: x - 28, y: height, height: label.height, width: label.width}}),
        h('rect.guideline-label.y', {attrs: {x: width - fontAdjust, y: y - 16, height: label.height, width: label.width}}),
        h('text.guideline-text.x', {attrs: {x, y: height + 17}}, date),
        h('text.guideline-text.y', {attrs: {x: width, y: y + 2}}, price)
      ]) : h('g');
    }).startWith(h('g'));

  const updatePeriod$ = DOM.select('.graph').events('mousewheel')
    .map(handleScroll)
    .compose(throttle(30))
    .map(ev => state => {
      const period = ev.deltaY > 0 ? ++state.period : --state.period;
      return update(state, {period: {$set: period}});
    });

  const graphTools = GraphTools(sources);

    const vdom$ = xs.combine(
      graphBounds$,
      guidelines$,
      candlesticks$,
      guides$,
      graphTools.DOM
    ).map(([{height, width}, {xGuidelines, yGuidelines}, candlesticks, guides, graphToolsEl]) => {
      return div('.graph-container', [
        svg('.graph', {
          attrs: { viewBox: `0 0 
          ${width + margin.right + margin.left} 
          ${height + margin.top + margin.bottom}
        `, preserveAspectRatio: 'xMinYMin slice' }
        }, [
          h('g.xGuides', xGuidelines),
          h('g.yGuides', yGuidelines),
          candlesticks, 
          guides
        ])
      ]);
    });

  const sinks = {
    DOM: vdom$,
    onion: updatePeriod$
  };

  return sinks;
}

const fontAdjust = 10 * 2;

function convertDate(d: number): Date {
  return new Date(Math.round(d * 1000));
}

function formatDate(d: Date): string {
  return moment(d).format('DD MMM');
}

function getAxisCoords(height: number, num: number): Array<number> {
  const coords = [];
  const incr = height / num;

  for (let i = 0; i < num; i++) {
    coords.push(i * incr);
  }

  return coords;
}

function handleScroll(ev) {
  ev.preventDefault();
  ev.stopPropagation();
  return ev;
}

function createLines(primary, secondary, guideDist) {
  let lines = [];

  const {name: pName, dist: pDist} = primary;
  const {name: sName, dist: sDist} = secondary;

  for (let i = 0; i < (pDist / guideDist); i++) {
    const variable = pDist - guideDist * i;
    const line = h('line.tick', {attrs: {
      [`${pName}1`]: variable,
      [`${pName}2`]: variable,
      [`${sName}1`]: 0,
      [`${sName}2`]: sDist,
    }});

    lines.push(line);
  }

  return lines;
}
