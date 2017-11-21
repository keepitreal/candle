'use strict';

import moment from 'moment';
import cx from 'classnames';
import xs, {Stream} from 'xstream';
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

  const margin = {top: 40, bottom: 20, right: 20, left: 30};

  const graph$ = DOM.select('.graph').elements()
    .compose(dropRepeats((a, b: ElementList) => b[0] && b[0].clientHeight));

  const graphBounds$ = graph$
    .map((el: ElementList) => el.length && el[0].getBoundingClientRect())
    .filter(v => v.height && v.width)
    .startWith({height: 0, width: 0, top: 0, left: 0});

  const days$ = props$
    .map(({selected, currencies}) => currencies[selected].days)
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

  const xAxis$ = xs.combine(scaleX$, days$, graphBounds$)
    .map(([scaleX, days, {height, width]) => {
      const labels = days.map((day, i) => {
        const date = convertDate(day.time);
        const x = scaleX(date);
        const y = 20;

        return i % 2 === 0 ? h('text.axis-label', {
          attrs: {x, y},
          style: {display: i % 2 === 0 ? 'static' : 'none'}
        }, formatDate(date)) :
          h('line.tick', {attrs: {x1: x, x2: x, y1: -height, y2: -3}});
      });

      const border = h('line.border', {attrs: {
        x1: 0,
        x2: width - margin.left - 6,
        y1: 0,
        y2: 0
      }});

      return h('g.axis', {style: {transform: `translateY(${height}px)`}}, [border, ...labels]);
    });

  const yAxis$ = xs.combine(scaleY$, days$, graphBounds$)
    .map(([scaleY, days, {height, width}]) => {
      const numTicks = height / (width / days.length);
      const tickCoords = getAxisCoords(height, numTicks);
      const labels = tickCoords.map((coords, i) => {
        return i % 2 === 0 ?
          h('text.axis-label', {
            attrs: {x: -margin.right / 2, y: coords}
          }, toDollarThousands(scaleY.invert(coords))) :
          h('line.tick', {attrs: {x1: -width, x2: -30, y1: coords, y2: coords}});
      });

      const border = h('line.border.border-y', {attrs: {
        x1: -margin.right,
        x2: -margin.right,
        y1: 0,
        y2: height
      }});

      return h('g.axis', {style: {transform: `translateX(${width}px)`}}, [border, ...labels]);
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
    .flatten()
    .map(([ev, scaleX, scaleY, {top, left, height, width}, visible]) => {
      const x = ev.clientX - left;
      const y = ev.clientY - top;
      const price = toDollarThousands(scaleY.invert(y));
      const date = formatDate(scaleX.invert(x));
      const padding = 5;

      return visible ? h('g', [
        h('line.guideline.horiz', {attrs: {x1: x, x2: x, y1: 0, y2: height}}),
        h('line.guideline.vert', {attrs: {x1: 0, x2: width, y1: y: y2: y}}),
        h('rect.guideline-label', {attrs: {x: x - 28, y: height, height: 25, width: 56}}),
        h('rect.guideline-label', {attrs: {x: width - 70, y: y - 16, height: 25, width: 70}}),
        h('text.guideline-text.horiz', {attrs: {x, y: height + 17}}, date),
        h('text.guideline-text.vert', {attrs: {x: width - 53, y: y + 2}}, price)
      ]) : h('g');
    }).startWith(h('g'));

  const graphTools = GraphTools(sources);

  const vdom$ = xs.combine(graphBounds$, xAxis$, yAxis$, candlesticks$, guides$, graphTools.DOM)
    .map(([{height, width}, xAxis, yAxis, candlesticks, guides, graphToolsEl]) => {
      return div('.graph-container', [
        graphToolsEl,
        svg('.graph', {
          attrs: { viewBox: `0 0 
            ${width + margin.right + margin.left} 
            ${height + margin.top + margin.bottom}
          `, preserveAspectRatio: 'xMinYMin slice' }
        }, [yAxis, xAxis, candlesticks, guides])
      ]);
    });

  const sinks = {
    DOM: vdom$
  };

  return sinks;
}

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
