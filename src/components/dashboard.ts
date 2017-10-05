'use strict';

import xs, {Stream} from 'xstream';
import dropRepeats from 'xstream/extra/dropRepeats';
import {svg, h, h3, div} from '@cycle/dom';
import {createAxisGenerator} from 'd3-axis-hyperscript';
import {scaleTime, scaleLinear} from 'd3-scale';
import {area, line, curveBasis} from 'd3-shape';
import {BoundingBox, ComponentSources, AppSinks} from '../interfaces';

declare type ElementList = NodeListOf<HTMLElement>;

const axisGenerator: any = createAxisGenerator(h);

export default function Dashboard(sources: ComponentSources): AppSinks {
  const {props$, DOM} = sources;

  const graphBB$ = DOM.select('.dashboard-graph').elements()
    .compose(
      dropRepeats((a: ElementList, b: ElementList) => b.length === a.length)
    )
    .map((svgEl: ElementList) =>
      svgEl.length && svgEl[0].getBoundingClientRect()
    );

  const state$ = xs.combine(props$, graphBB$)
    .map(([{selected, currencies}, graphBB]: [any, any]) => {
      const {days} = currencies[selected];
      const {height = 0, width = 0} = graphBB;

      const daysByPrice = days
        .slice()
        .sort((a, b) => a.high > b.high);

      const {high = 0} = daysByPrice.pop() || {};
      const {low = 0} = daysByPrice.shift() || {};

      const buffer = ((low + high) / 2) * 0.10;

      const earliest = days.slice().shift() || {};
      const latest = days.slice().pop() || {};

      const scaleY = scaleLinear()
        .domain([(low - buffer), (high + buffer)])
        .range([0, height]);

      const scaleX = scaleTime()
        .domain([new Date(Math.round(earliest.time * 1000)), new Date(Math.round(latest.time * 1000))])
        .range([0, width]);

      return {scaleX, scaleY, days, height, width};
    });

  const xAxis$ = state$.map(({scaleX, days}) => {
    return scaleX.ticks(days.length)
      .map(scaleX)
      .map((value, index) => {
        const date = (days[index] && new Date(days[index].time * 1000)) || new Date();
        return h('g.axis-label', {}, [
          index % 2 === 0 ? h('text.date-text-label', {
            attrs: {x: value, y: 10}
          }, [`${date.getMonth()}/${date.getDate()}`]) : h('text', '')
        ]);
      });
    });

  const yAxis$ = state$.map(({scaleY, height}) => {
    return scaleY.ticks(10)
      .map((value) => {
        return h('g.axis-label', [
          h('text', {
            attrs: {x: 10, y: (height - scaleY(value))}
          }, `${value}`)
        ]);
      });
    });

  const lineFns$ = state$.map(({scaleX, scaleY}) => ({
      area: area()
        .x(d => scaleX(new Date(Math.round(d.time * 1000))))
        .y(d => scaleY(d.high)),
      line: line()
        .x(d => scaleX(new Date(Math.round(d.time * 1000))))
        .y(d => scaleY(d.high))
  }));

  const line$ = xs.combine(state$, lineFns$)
    .map(([{days}, {area, line}]) => {
      return h('g', [
        h('path.line', {attrs: {d: line(days)}})
      ])
    });

  const vdom$ = xs.combine(state$, xAxis$, yAxis$, line$)
    .map(([state, xAxis, yAxis, line]: [any, any, any, any]) => {
      const {height, width} = state;
      return div('.dashboard', [
        svg('.dashboard-graph', {
          attrs: { viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'xMinYMin slice' }
        }, [
          h('g.y-axis', {style: {transform: `translateX(${width - 50}px)`}}, yAxis),
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
