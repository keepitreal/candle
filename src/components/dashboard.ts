'use strict';

import xs, {Stream} from 'xstream';
import dropRepeats from 'xstream/extra/dropRepeats';
import {svg, h, h3, div} from '@cycle/dom';
import {scaleTime, scaleLinear} from 'd3-scale';
import {area, line, curveBasis} from 'd3-shape';
import {BoundingBox, ComponentSources, AppSinks} from '../interfaces';

declare type ElementList = NodeListOf<HTMLElement>;

export default function Dashboard(sources: ComponentSources): AppSinks {
  const {props$, DOM} = sources;

  const margin = {top: 60, bottom: 20, right: 100, left: 30};

  const graphBounds$ = DOM.select('.dashboard-graph').elements()
    .compose(dropRepeats((a, b: ElementList) => b[0] && b[0].clientHeight))
    .map((el: ElementList) => el.length && el[0].getBoundingClientRect())
    .filter(v => v.height && v.width)
    .startWith({height: 0, width: 0});

  const days$ = props$
    .map(({selected, currencies}) => {
      return (currencies[selected] && currencies[selected].days) || [];
    })
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
      const daysByPrice = days
        .slice()
        .sort((a, b) => a.high > b.high);

      const {high = 0} = daysByPrice.pop() || {};
      const {low = 0} = daysByPrice.shift() || {};

      const buffer = ((low + high) / 2) * 0.10;

      return scaleLinear()
        .domain([(low - buffer), (high + buffer)])
        .range([margin.bottom, height - margin.top]);
    });

  const xAxis$ = xs.combine(scaleX$, days$)
    .map(([scaleX, days]) => {
      return scaleX.ticks(days.length)
        .map(scaleX)
        .map((value, index) => {
          const date = (days[index] && convertDate(days[index].time)) || new Date();
          return h('g.axis-label', {}, [
            index % 2 !== 0 ? h('text.date-text-label', {
              attrs: {x: value, y: 10}
            }, [`${date.getMonth()}/${date.getDate()}`]) : h('text', '')
          ]);
        });
    });

  const yAxis$ = xs.combine(scaleY$, graphBounds$)
    .map(([scaleY, {height}]) => {
      return scaleY.ticks(10)
        .map((value) => {
          return h('g.axis-label', [
            h('text', {
              attrs: {x: 10, y: (height - scaleY(value))}
            }, `${value}`)
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
    .map(([days, {area, line}]) => {
      return h('g', [
        h('path.line', {attrs: {d: line(days)}})
      ]);
    });

  const vdom$ = xs.combine(graphBounds$, xAxis$, yAxis$, line$)
    .map(([{height, width}, xAxis, yAxis, line]: [any, any, any, any]) => {
      return div('.dashboard', [
        svg('.dashboard-graph', {
          attrs: { viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'xMinYMin slice' }
        }, [
          h('g.y-axis', {style: {transform: `translateX(${width - 80}px)`}}, [
            h('text.axis-legend', {attrs: {x: 10, y: margin.top / 2 + 20, height: 16}}, '$'),
            ...yAxis
          ]),
          h('g.x-axis', {style: {transform: `translateY(${height - 10}px)`}}, xAxis),
          h('g.line', line)
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
