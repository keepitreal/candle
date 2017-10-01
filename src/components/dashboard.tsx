'use strict';

import xs, {Stream} from 'xstream';
import dropRepeats from 'xstream/extra/dropRepeats';
import {scaleTime, scaleLinear} from 'd3-scale';
import {svg, h, h3, div} from '@cycle/dom';
import {createAxisGenerator} from 'd3-axis-hyperscript';
import {ComponentSources, AppSinks} from '../app';
import {BoundingBox} from '../interfaces';

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

      const {open: highestOpen = 0, close: highestClose = 0} = days
        .slice()
        .sort((a, b) => a.high > b.high)
        .pop() || {};

      const earliestDay = days.slice().pop() || new Date();
  console.log(highestOpen, height);
      const scaleY = scaleLinear()
        .domain([0, highestOpen])
        .range([0, height]);

      const scaleX = scaleTime()
        .domain([new Date(Math.round(earliestDay.time * 1000)), new Date()])
        .range([0, width]);

      return {scaleX, scaleY, days, height, width};
    });

  const xAxis$ = state$.map(({scaleX, days}) => {
    return scaleX.ticks(days.length)
      .map(scaleX)
      .map((value, index) => {
        const date = (days[index] && new Date(days[index].time * 1000)) || new Date();
        return h('g.date-label', {}, [
          index % 2 === 0 ? h('text.date-text-label', {
            attrs: {x: value, y: 10}
          }, [`${date.getMonth()}/${date.getDate()}`]) : h('text', '')
        ]);
      });
    });

  const yAxis$ = state$.map(({scaleY, height}) => {
    return scaleY.ticks(10)
      .map((value) => {
        console.log(scaleY(value));
        return h('g.y-axis-label', [
          h('text', {
            attrs: {x: 10, y: (height - scaleY(value))}
          }, `${value}`)
        ]);
      });
    });

  const vdom$ = xs.combine(state$, xAxis$, yAxis$)
    .map(([state, xAxis, yAxis]: [any, any, any]) => {
      const {height, width} = state;
      return div('.dashboard', [
        svg('.dashboard-graph', {
          attrs: { viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'xMinYMin slice' }
        }, [
          h('g.y-axis', {style: {transform: `translateX(${width - 50}px)`}}, yAxis),
          h('g.x-axis', {style: {transform: `translateY(${height - 10}px)`}}, xAxis)
        ])
      ]);
    });

  const sinks = {
    DOM: vdom$
  };

  return sinks;
}
