'use strict';

import moment from 'moment';
import _ from 'lodash';
import cx from 'classnames';
import xs, {Stream} from 'xstream';
import update from 'react-addons-update';
import dropRepeats from 'xstream/extra/dropRepeats';
import sampleCombine from 'xstream/extra/sampleCombine';
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
  const cellWidth = 60;

  const margin = {top: 0, bottom: 20, right: 40, left: 10};

  const graph$ = DOM.select('.graph').elements()
    .compose(dropRepeats((a, b: ElementList) => b[0] && b[0].clientHeight));

  const graphBounds$ = graph$
    .map((el: ElementList) => el.length && el[0].getBoundingClientRect())
    .filter(v => v.height && v.width)
    .startWith({height: 0, width: 0, top: 0, left: 0});

  const days$ = xs.combine(props$, graphBounds$)
    .map(([{selected, currencies, dayOffset, period}, {width}]) => {
      const selected = currencies[selected];
      const days = selected.days;
      const len = days.length;
      const left = days.slice(len - period - 1 - dayOffset, len - 1 - dayOffset);

      return left;
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

  const guidelines$ = xs.combine(graphBounds$, days$, scaleX$, scaleY$)
    .map(([{width, height}, days, scaleX, scaleY]) => {
      const numLines = Math.floor(width / cellWidth);
      const lineInterval = Math.floor(days.length / numLines) || 1;
      const guidelines = [];

      for (let i = 0; i < days.length; i += lineInterval) {
        const day = days[i];
        const x = scaleX(convertDate(day.time));
        const line = h('line.tick', {attrs: {
          ['x1']: x,
          ['x2']: x,
          ['y1']: 0,
          ['y2']: height,
        }});

        guidelines.push(line);
      }

      return guidelines;
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

  const mousemove$ = DOM.select('.graph').events('mousemove')

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

  const mousedownStarted$ = DOM.select('.graph').events('mousedown')
    .map(ev => state => update(state, {dragging: {$set: true}, dragStart: {$set: ev.clientX}}));

  const mousedownEnded$ = DOM.select('.graph').events('mouseup')
    .map(() => state => update(state, {dragging: {$set: false}}));

  const mousedown$ = xs.merge(
    mousedownStarted$.map(() => true)
    mousedownEnded$.map(() => false)
  ).startWith(false);

  const updatePeriod$ = mousemove$
    .compose(sampleCombine(props$, days$))
    .filter(([,{dragging}]) => dragging)
    .compose(throttle(60))
    .map(([ev, props, days]) => state => {
      const direction = ev.clientX > props.dragStart ? ++state.dayOffset : --state.dayOffset;
      return update(state, {dayOffset: {$set: direction}, dragStart: {$set: ev.clientX}});
    });

    const vdom$ = xs.combine(
      graphBounds$,
      candlesticks$,
      guidelines$,
      guides$,
      mousedown$
    ).map(([{height, width}, candlesticks, guidelines, guides, mousedown]) => {
      const viewBox = `0 0 ${width + margin.right + margin.left} ${height + margin.top + margin.bottom}`;
      const className = cx({'graph-mousedown': mousedown, 'graph-container': true});

      return div('.graph-container', {props: {className}}, [
        svg('.graph', {
          attrs: {viewBox, preserveAspectRatio: 'xMinYMin slice'},
        }, [
          h('g.xGuides', guidelines),
          candlesticks,
          guides
        ])
      ]);
    });

  const sinks = {
    DOM: vdom$,
    onion: xs.merge(updatePeriod$, mousedownStarted$, mousedownEnded$)
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

function createLines(primary, secondary, days, scaleFn) {
  let lines = [];

  const {name: pName, dist: pDist} = primary;
  const {name: sName, dist: sDist} = secondary;

  days.forEach((day) => {
    const x = scaleFn(convertDate(day.time));
    const line = h('line.tick', {attrs: {
      [`${pName}1`]: x,
      [`${pName}2`]: x,
      [`${sName}1`]: 0,
      [`${sName}2`]: sDist,
    }});

    lines.push(line);
  });

//   for (let i = 0; i < (pDist / guideDist); i++) {
//     const variable = pDist - guideDist * i;
//     const line = h('line.tick', {attrs: {
//       [`${pName}1`]: variable,
//       [`${pName}2`]: variable,
//       [`${sName}1`]: 0,
//       [`${sName}2`]: sDist,
//     }});
// 
//     lines.push(line);
//   }

  return lines;
}
