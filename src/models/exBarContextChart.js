
nv.models.exBarContextChart = function(options) {
  if (typeof options == "undefined") {
    options = {}
  }

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var timeserie = typeof options.timeserie == "undefined" ? false : options.timeserie
    , withContext = timeserie ? (typeof options.withContext == "undefined" ? true : options.withContext) : false
    , lines = nv.models.line()
    , bars = nv.models.exBar($.extend({}, options, {withCursor: false, withHorizontalCursor: false, showHorizontalCursorText: false}))
    , xAxis = nv.models.axis()
    , y1Axis = nv.models.axis()
    , y2Axis = nv.models.axis()
    , legend = nv.models.legend()
    , brush = d3.svg.brush()
    , state = { stacked: false }
    , delayed = true
    , delay = 1200
    , drawTime = 500
    , reduceXTicks = false // if false a tick will show for every data point
    , staggerLabels = false
    , rotateLabels = 0
    , interval = options.utc ? d3.time.day.utc : d3.time.day
    , controls = nv.models.legend()
    , showControls = (typeof options.showControls === "undefined") ? true : options.showControls
    , showDelayed = (typeof options.showDelayed === "undefined") ? true : options.showDelayed
    , showStacked = (typeof options.showStacked === "undefined") ? true : options.showStacked
    , controlWidth = function() { return showControls ? (90 * 2) : 0 }
    , cursorYValueFormat = function(value) { return value }
    , chartUnderControl;


  var margin = {top: 10, right: 30, bottom: 5, left: 60}
    , width = null
    , height2 = 50
    , getX = function(d) { return d.x }
    , getY = function(d) { return d.y }
    , color = nv.utils.defaultColor()
    , showLegend = true
    , extent
    , brushExtent = null
    , tooltips = true
    , dateFomatter = options.utc ? d3.time.format.utc('%d-%b-%y') : d3.time.format('%d-%b-%y')
    , tooltip = function(key, x, y, e, graph) {
        var xstr;
        if (timeserie) {
          xstr = x;
        } else {
          xstr = x;
        }
        var ystr = y;

        return '<h3>' + key + '</h3>' +
               '<p>' +  ystr + ' at ' + xstr + '</p>';
      }
    , x2
    , y3
    , y4
    , noData = "No Data Available."
    , dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'brush', 'stateChange', 'changeState')
    ;

    lines
      .interactive(false)
      ;
    xAxis
      .orient('bottom')
      .tickPadding(5)
      ;
    y1Axis
      .orient('left')
      ;
    y2Axis
      .orient('right')
      ;  
  
  //============================================================


  function chart(selection) {
    selection.each(function(data) {

      var chartToShowInContext = options.chartToShowInContext ? options.chartToShowInContext : 0
 
      data = data[chartToShowInContext]
      var seriesData = data ? data.series : [];
      //
      chart.update = function(updateDelay) {
        window.setTimeout(function() {
          container.transition().duration(updateDelay || 500).call(chart); 
        }, delayed ? 0 : 0);
      };
      chart.container = this;
      //
      bars.stacked(state.stacked);
      bars.delayed(false);
      bars.delay(0);
      bars.drawTime(0);

      var container = d3.select(this),
          that = this;

      var availableWidth = (width || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          availableHeight2 = height2 - margin.top - margin.bottom;

      if (availableWidth < 10 || availableHeight2 < 10) {
        return;
      }


      //------------------------------------------------------------
      // Display No Data message if there's nothing to show.

      if (!seriesData || !seriesData.length || !seriesData.filter(function(d) { return d.values.length }).length) {
        var noDataText = container.selectAll('.nv-noData').data([noData]);

        noDataText.enter().append('text')
          .attr('class', 'nvd3 nv-noData')
          .attr('dy', '-.7em')
          .style('text-anchor', 'middle');

        noDataText
          .attr('x', margin.left + availableWidth / 2)
          .attr('y', margin.top + availableHeight2 / 2)
          .text(function(d) { return d });

        return chart;
      } else {
        container.selectAll('.nv-noData').remove();
      }

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup Scales

      var dataForYAxis = seriesData.filter(function(d) { return /*!d.disabled && */(d.type == 'bar' || d.type == 'mark' || d.type == 'line') });
      var dataFory2Axis = seriesData.filter(function(d) { return /*!d.disabled && */d.type == 'line2' }); // removed the !d.disabled clause here to fix Issue #240


      x2 = bars.xScale();
      y3 = bars.yScale();
      y4 = lines.yScale(); 

      var series1 = dataForYAxis
        .map(function(d) {
          return d.values.map(function(d,i) {
            return { x: getX(d,i), y: getY(d,i) }
          })
        });

      var series2 = dataFory2Axis
        .map(function(d) {
          return d.values.map(function(d,i) {
            return { x: getX(d,i), y: getY(d,i) }
          })
        });
       
      x2.range([0, availableWidth]);        

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = container.selectAll('g.nv-wrap.nv-linePlusBar').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-linePlusBar').append('g');
      var g = wrap.select('g');
      
      var contextEnter = gEnter.append('g').attr('class', 'nv-context');
      contextEnter.append('g').attr('class', 'nv-x nv-axis');
      contextEnter.append('g').attr('class', 'nv-y1 nv-axis');
      contextEnter.append('g').attr('class', 'nv-y2 nv-axis');
      contextEnter.append('g').attr('class', 'nv-barsWrap');
      contextEnter.append('g').attr('class', 'nv-linesWrap');
      contextEnter.append('g').attr('class', 'nv-brushBackground');
      contextEnter.append('g').attr('class', 'nv-x nv-brush');

      //------------------------------------------------------------
      // Legend

      //------------------------------------------------------------
      // Controls

      if (showControls && (showStacked | showDelayed)) {
        var controlsData = [];
        if (showStacked) {
          controlsData.push({ key: 'Stacked', title: 'Stacked', disabled: !state.stacked });
        }
        if (showDelayed) {
          controlsData.push({ key: 'Delayed', title: 'Delayed', disabled: !delayed });
        }

        controls.width(controlWidth()).color(['#444', '#444', '#444']);
        g.select('.nv-controlsWrap')
            .datum(controlsData)
            .attr('transform', 'translate(0,' + (-margin.top) +')')
            .call(controls);
      }

      //------------------------------------------------------------


      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


      //------------------------------------------------------------
      // Context Components

  
      bars
        .width(availableWidth)
        .height(availableHeight2)
        .color(dataForYAxis.map(function(d,i) {
          return d.color || color(d, i);
        }));

      lines
        .width(availableWidth)
        .height(availableHeight2)
        .color(dataFory2Axis.map(function(d,i) {
          return d.color || color(d, i);
        }));

      var barsWrap = g.select('.nv-context .nv-barsWrap')
        .datum(dataForYAxis.length ? dataForYAxis : [{values:[]}]);

      var noLines = (typeof dataFory2Axis[0] == "undefined")
      var linesWrap = g.select('.nv-context .nv-linesWrap')
        .datum(noLines || dataFory2Axis[0].disabled ? [{values:[]}] : dataFory2Axis);
      

      var containerHeight=parseInt(container.style('height'))
      var translateY = containerHeight-height2-20
      if(options.contextAtTheTop) {
        translateY = 0
      }

      g.select('.nv-context')
          .attr('transform', 'translate(0,' + ( translateY - margin.bottom + margin.top) + ')')

      d3.transition(barsWrap).call(bars);
      d3.transition(linesWrap).call(lines);
   
       
      //------------------------------------------------------------
      // Setup Brush

      brush
        .x(x2)
        .on('brush', onBrush);

      if (brushExtent) {
        if (brushExtent[0] < x2.domain()[0])
          brushExtent[0] = x2.domain()[0];
        if (brushExtent[1] > x2.domain()[1])
          brushExtent[1] = x2.domain()[1];
        brush.extent(brushExtent);
      }

      var brushBG = g.select('.nv-brushBackground').selectAll('g')
          .data([brushExtent || brush.extent()])

      var brushBGenter = brushBG.enter()
          .append('g');

      brushBGenter.append('rect')
          .attr('class', 'left')
          .attr('x', 0)
          .attr('y', 0)
          .attr('height', availableHeight2);

      brushBGenter.append('rect')
          .attr('class', 'right')
          .attr('x', 0)
          .attr('y', 0)
          .attr('height', availableHeight2);

      var gBrush = g.select('.nv-x.nv-brush')
          .call(brush);
      gBrush.selectAll('rect')
          //.attr('y', -5)
          .attr('height', availableHeight2);
      gBrush.selectAll('.resize').append('path').attr('d', resizePath);        
      

      //------------------------------------------------------------

      var timeserie_ticks = function(start, stop, step) {
        //console.log('start, stop, step', start, stop, step);
        var cnt = interval.range(start, stop).length;
        step = Math.max(1, (cnt / (availableWidth / 100)));
        var ticks1 = [];
        var d1 = start;
        while (d1 <= stop) {
          d1 = interval.offset(d1, step);
          ticks1.push(d1);
        }
        //console.log('cnt, step, len', cnt, step, ticks1.length);
        return ticks1;
      }

      var timeserie_ticks2 = function(start, stop, step) {
        //console.log('start, stop, step', start, stop, step);
        var cnt = interval.range(start, stop).length;
        step = Math.max(1, (cnt / (availableWidth / 100)));
        var ticks1 = [];
        var d1 = start;
        while (d1 <= stop) {
          d1 = interval.offset(d1, step);
          ticks1.push(d1);
        }
        //console.log('cnt, step, len', cnt, step, ticks1.length);
        return ticks1;
      }

      //------------------------------------------------------------
      // Setup Secondary (Context) Axes

      xAxis.scale(x2);
      xAxis
        .tickSize(-availableHeight2, 0);

      if (timeserie) {
        xAxis.ticks(timeserie_ticks2);
      } else {          
        xAxis.ticks(availableWidth / 100);
      }

      g.select('.nv-context .nv-x.nv-axis')
        .attr('transform', 'translate(0,' + y3.range()[0] + ')');
      d3.transition(g.select('.nv-context .nv-x.nv-axis'))
        .call(xAxis);


      y1Axis
        .scale(y3)
        .ticks( availableHeight2 / 36 )
        .tickSize( -availableWidth, 0);

      g.select('.nv-context .nv-y1.nv-axis')
        .style('opacity', dataForYAxis.length ? 1 : 0)
        .attr('transform', 'translate(0,' + x2.range()[0] + ')');
          
      /* hide y1Axis 
      d3.transition(g.select('.nv-context .nv-y1.nv-axis'))
          .call(y1Axis);
      */

      y2Axis
        .scale(y4)
        .ticks( availableHeight2 / 36 )
        .tickSize(dataForYAxis.length ? 0 : -availableWidth, 0); // Show the y2 rules only if y1 has none

      g.select('.nv-context .nv-y2.nv-axis')
          .style('opacity', dataFory2Axis.length ? 1 : 0)
          .attr('transform', 'translate(' + x2.range()[1] + ',0)');

      /* hide y2Axis 
      d3.transition(g.select('.nv-context .nv-y2.nv-axis'))
          .call(y2Axis);
      */
    
      //------------------------------------------------------------

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------


      // Update chart from a state object passed to event handler
      dispatch.on('changeState', function(e) {

        if (typeof e.disabled !== 'undefined') {
          seriesData.forEach(function(series,i) {
            series.disabled = e.disabled[i];
          });

          state.disabled = e.disabled;
        }

        if (typeof e.stacked !== 'undefined') {
          multibar.stacked(e.stacked);
          state.stacked = e.stacked;
        }

        chart.update();
      });
      //============================================================


      //============================================================
      // Functions
      //------------------------------------------------------------

      // Taken from crossfilter (http://square.github.com/crossfilter/)
      function resizePath(d) {
        var e = +(d == 'e'),
            x = e ? 1 : -1,
            y = availableHeight2 / 3;
        return 'M' + (.5 * x) + ',' + y
            + 'A6,6 0 0 ' + e + ' ' + (6.5 * x) + ',' + (y + 6)
            + 'V' + (2 * y - 6)
            + 'A6,6 0 0 ' + e + ' ' + (.5 * x) + ',' + (2 * y)
            + 'Z'
            + 'M' + (2.5 * x) + ',' + (y + 8)
            + 'V' + (2 * y - 8)
            + 'M' + (4.5 * x) + ',' + (y + 8)
            + 'V' + (2 * y - 8);
      }


      function updateBrushBG() {
        if (!brush.empty()) brush.extent(brushExtent);
        brushBG
          .data([brush.empty() ? x2.domain() : brushExtent])
          .each(function(d,i) {
            var leftWidth = x2(d[0]) - x2.range()[0],
                rightWidth = x2.range()[1] - x2(d[1]);
            d3.select(this).select('.left')
              .attr('width',  leftWidth < 0 ? 0 : leftWidth);

            d3.select(this).select('.right')
              .attr('x', x2(d[1]))
              .attr('width', rightWidth < 0 ? 0 : rightWidth);
          });
      }


      function onBrush() {

        //console.log('onBrush ...');
        var bextent = brush.extent();
        brushExtent = brush.empty() ? null : brush.extent();
        extent = brush.empty() ? x2.domain() : brush.extent();
        dispatch.brush({extent: extent, brush: brush});

        updateBrushBG();

        //------------------------------------------------------------
        // Prepare Main (Focus) Bars and Lines


        $.each(chartUnderControl, function(index, chartToControl) {

          var elem = d3.select(".nv-linePlusBar"+chartToControl.chartID())
  
          var focusBarsWrap = elem.select('.nv-focus .nv-barsWrap')
              .datum(!chartToControl.dataForYAxis.length ? [{values:[]}] :
                chartToControl.dataForYAxis
                  .map(function(d,i) {
                    return {
                      key: d.key,
                      title: d.title,
                      elClass: d.elClass,
                      type: d.type,
                      color: d.color,
                      formatOptions: d.formatOptions,
                      hidden: d.hidden,
                      disabled: d.disabled,
                      series: d.series,
                      values: d.values.filter(function(d,i) {
                        return chartToControl.bars.x()(d,i) >= extent[0] && chartToControl.bars.x()(d,i) <= extent[1];
                      })
                    }
                  })
              );
          
          var focusLinesWrap = elem.select('.nv-focus .nv-linesWrap')
              .datum(noLines || dataFory2Axis[0].disabled ? [{values:[]}] :
                chartToControl.dataFory2Axis
                  .map(function(d,i) {
                    return {
                      key: d.key,
                      title: d.title,
                      elClass: d.elClass,
                      type: d.type,
                      color: d.color,
                      formatOptions: d.formatOptions,
                      hidden: d.hidden,
                      disabled: d.disabled,
                      series: d.series,
                      values: d.values.filter(function(d,i) {
                        return chartToControl.lines.x()(d,i) >= extent[0] && chartToControl.lines.x()(d,i) <= extent[1];
                      })
                    }
                  })
               );
                   
          //------------------------------------------------------------
          
          
          //------------------------------------------------------------
          // Update Main (Focus) X Axis

          if (chartToControl.dataForYAxis.length) {
            x = chartToControl.bars.xScale();
          } else {
            x = chartToControl.lines.xScale();
          }

          d3.transition(focusBarsWrap).call(chartToControl.bars);
          d3.transition(focusLinesWrap).call(chartToControl.lines);

          chartToControl.updateAxis()

        })
                
      }

      onBrush()
       
    });

    return chart;
  }

  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.dispatch = dispatch;
  chart.legend = legend;
  chart.lines = lines;
  chart.bars = bars;
  chart.xAxis = xAxis;
  chart.y1Axis = y1Axis;
  chart.y2Axis = y2Axis;
  chart.state = state;

  //TODO: consider rebinding x, y and some other stuff, and simply do soemthign lile bars.x(lines.x()), etc.
  //d3.rebind(chart, lines, 'x', 'y', 'size', 'xDomain', 'yDomain', 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi', 'id');

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = _;
    lines.x(_);
    bars.x(_);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = _;
    lines.y(_);
    bars.y(_);
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
    //
    bars.mainMargin(margin);
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height2;
    height2 = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    legend.color(color);
    return chart;
  };

  chart.tooltip = function(_) {
    if (!arguments.length) return tooltip;
    tooltip = _;
    return chart;
  };

  chart.tooltips = function(_) {
    if (!arguments.length) return tooltips;
    tooltips = _;
    return chart;
  };

  chart.tooltipContent = function(_) {
    if (!arguments.length) return tooltip;
    tooltip = _;
    return chart;
  };

  chart.noData = function(_) {
    if (!arguments.length) return noData;
    noData = _;
    return chart;
  };

  chart.brushExtent = function(_) {
    if (!arguments.length) return brushExtent;
    brushExtent = _;
    return chart;
  };

  chart.stacked = function(_) {
    if (!arguments.length) return state.stacked;
    state.stacked = _;
  }

  chart.delayed = function(_) {
    if (!arguments.length) return delayed;
    delayed = _;
  }

  chart.delay = function(_) {
    if (!arguments.length) return delay;
    delay = _;
    return chart;
  };

  chart.drawTime = function(_) {
    if (!arguments.length) return drawTime;
    drawTime = _;
    return chart;
  };

  chart.interval = function(_) {
    if (!arguments.length) return interval;
    interval = _;
    bars.interval(interval);
    return chart;
  };

  chart.extent = function(_) {
    if (!arguments.length) return extent;
    brush.extent(_);
    return chart;    
  }

   chart.cursorYValueFormat = function(_) {
    if (!arguments.length) return cursorYValueFormat;
    cursorYValueFormat = _;
    return chart;
  }; 

  chart.chartUnderControl = function(_) {
    if (!arguments.length) return chartUnderControl;
    chartUnderControl = _
    return chart
  }

  //============================================================


  return chart;
}
