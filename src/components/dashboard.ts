'use strict';

import moment from 'moment';
import cx from 'classnames';
import xs, {Stream} from 'xstream';
import dropRepeats from 'xstream/extra/dropRepeats';
import {svg, h, h3, div} from '@cycle/dom';
import {scaleTime, scaleLinear} from 'd3-scale';
import {area, line, curveBasis} from 'd3-shape';
import {BoundingBox, ComponentSources, AppSinks} from '../interfaces';

declare type ElementList = NodeListOf<HTMLElement>;

export default function Dashboard(sources: ComponentSources): AppSinks {
  const {props$, DOM} = sources;

  const margin = {top: 40, bottom: 20, right: 100, left: 0};

  const graphBounds$ = DOM.select('.dashboard-graph').elements()
    .compose(dropRepeats((a, b: ElementList) => b[0] && b[0].clientHeight))
    .map((el: ElementList) => el.length && el[0].getBoundingClientRect())
    .filter(v => v.height && v.width)
    .startWith({height: 0, width: 0});

  const days$ = props$
    .map(({selected, currencies}) => currencies[selected].days)
    .filter((v) => v.length)
    .startWith([{high: 0, low: 0, time: new Date()]);

  const scaleX$ = xs.combine(days$, graphBounds$)
    .map(([days, {width}]) => {
      const {time: earliest} = days.slice().shift() || {};
      const {time: latest} = days.slice().pop() || {};

      return scaleTime()
        .domain([convertDate(earliest), convertDate(latest)])
        .range([margin.left, width - margin.right]);
    });

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
        .range([height - margin.top, margin.bottom]);
    });

  const xAxis$ = xs.combine(scaleX$, days$)
    .map(([scaleX, days]) => {
      return h('g.x-axis', days.map((day, i) => {
        const date = convertDate(day.time);
        const x = scaleX(date);
        const y = 10;

        return h('g.axis-label', [
          h('text.date-text-label', {
            attrs: {x, y},
            style: {display: i % 2 === 0 ? 'static' : 'none'}
          }, moment(date).format('D MMM'))
        ]);
      });
    });

  const yAxis$ = xs.combine(scaleY$, days$)
    .map(([scaleY, days]) => {
      return scaleY.ticks(15)
        .map((value) => {
          return h('g.axis-label', [
            h('text', {
              attrs: {x: 10, y: (scaleY(value))}
            }, `$${(value / 1000).toFixed(1)}k`)
          ]);
        });
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
      return h('g.candlesticks', days.map(day => {
        const {high, low, open, close, time} = day;
        const pos = close > open;
        const x = scaleX(convertDate(time));
        const y1Wick = scaleY(high);
        const y2Wick = scaleY(low);
        const y1Body = scaleY(pos ? open : close);
        const y2Body = scaleY(pos ? close : open);

        return h('g', {attrs: {
          'data-date': convertDate(time).toString(),
          'data-price': `high ${high}, low ${low}, open ${open}, close ${close}`
        }}, [
          h('line.candlestick-wick', {
            attrs: {x1: x, x2: x, y1: y1Wick, y2: y2Wick}
          }),
          h('line.candlestick-body', {
            style: { stroke: pos ? 'green' : 'red' },
            attrs: { x1: x, x2: x, y1: y1Body, y2: y2Body}
          })
        ]);
      });
    });

  const vdom$ = xs.combine(graphBounds$, xAxis$, yAxis$, line$, candlesticks$)
        .map(([{height, width}, xAxis, yAxis, line, candlesticks]) => {
          console.log('height: ', height, 'width: ', width);
      return div('.dashboard', [
        svg('.dashboard-graph', {
          attrs: { viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'xMinYMin slice' }
        }, [
          h('g.y-axis', {style: {transform: `translateX(${width - 80}px)`}}, yAxis),
          h('g.x-axis', {style: {transform: `translateY(${height - 15}px)`}}, xAxis),
          candlesticks
          //h('g.line', line)
        ])
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
