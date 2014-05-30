
nv.models.exBarChart = function(options) {
  if (typeof options == "undefined") {
    options = {}
  }

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var timeserie = typeof options.timeserie == "undefined" ? false : options.timeserie
    , withContext = timeserie ? (typeof options.withContext == "undefined" ? true : options.withContext) : false
    , lines = nv.models.line()
    , lines2 = withContext ? nv.models.line() : undefined
    , bars = nv.models.exBar(options)
    , xAxis = nv.models.axis()
    , y1Axis = nv.models.axis()
    , y2Axis = nv.models.axis()
    , legend = nv.models.legend()
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
    , chartID = 0
    , dataForYAxis
    , dataForY2Axis
    , updateAxis
    , availableHeight
    , contextChart



    var margin = {top: 10, right: 30, bottom: 5, left: 60}
    , margin2 = {top: 0, right: 30, bottom: 20, left: 60}
    , width = null
    , height = null
    , getX = function(d) { return d.x }
    , getY = function(d) { return d.y }
    , color = nv.utils.defaultColor()
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
    , x
    , y1
    , y2
    , noData = "No Data Available."
    , dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'brush', 'stateChange', 'changeState')
    ;

  lines
    .clipEdge(true)
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


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var showTooltip = function(e, offsetElement) {
    //console.log('showTooltip', e, offsetElement);
    if (e.isFromArea) {
      //return;
      var left = e.pos[0]; // + ( offsetElement.offsetLeft || 0 ),
          top = e.pos[1] - 25; // + ( offsetElement.offsetTop || 0),
          x = e.xvalue;
          xformatted = xAxis.tickFormat()(x);
          d = e.dataMappedByX[x][e.seriesIndex];
          y = undefined;
          yformatted = undefined;
          if (typeof d !== "undefined") {
            y = bars.y()(d);
            yformatted = y1Axis.tickFormat()(y);
          }
          //
          e.chartID = chartID
          e.x = x;
          e.xformatted = xformatted;
          e.y = y;
          e.yformatted = yformatted;
          //
          var serieKey = (typeof e.series !== "undefined") ? e.series.key : "undefined";
          content = tooltip(serieKey, xformatted, yformatted, e, chart, options);
          if (typeof content !== "undefined") { 
            nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement, null, options);
          }
          return;
    }
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = bars.x()(e.point, e.pointIndex);
        xformatted = xAxis.tickFormat()(x),
        y = e.value,//(e.series.type == 'bar' ? y1Axis : y2Axis).tickFormat()(lines.y()(e.point, e.pointIndex)),
        yformatted = y;
        //
        e.chartID = chartID
        e.x = x;
        e.xformatted = xformatted;
        e.y = y;
        e.yformatted = yformatted;
        //
        content = tooltip(e.series.key, x, y, e, chart, options);
        if (typeof content !== "undefined") { 
          nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement, null, options);
        }
  };

  function calculateChartYPosition(availableHeight1, distanceBetweenCharts) {
      if(options.chartsHeight) {
        var sumOfpreviousCharts = 0
        for(var i=0; i < chartID;i++) {
          sumOfpreviousCharts += options.chartsHeight[i]
        }
        return sumOfpreviousCharts+chartID*distanceBetweenCharts
      } 
      return chartID*(availableHeight1+distanceBetweenCharts)
  }

  //------------------------------------------------------------

  function chart(selection) {
    selection.each(function(data) {
      data = data[chartID] 
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
      bars.delayed(delayed);
      bars.delay(delay);
      bars.drawTime(drawTime);
      bars.cursorYValueFormat(cursorYValueFormat);
      bars.chartID(chartID)

      var container = d3.select(this),
          that = this;

      var contextHeight = options.withContext ? contextChart.height(): 0

      var availableWidth = (width || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          availableHeight1 = ((height || parseInt(container.style('height')) || 400))
                             - margin.top - margin.bottom

          chart.availableHeight = availableHeight1

      if (availableWidth < 10 || availableHeight1 < 10) {
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
          .attr('y', margin.top + availableHeight1 / 2)
          .text(function(d) { return d });

        return chart;
      } else {
        container.selectAll('.nv-noData').remove();
      }

      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup Scales

      dataForYAxis = seriesData.filter(function(d) { return /*!d.disabled && */(d.type == 'bar' || d.type == 'mark' || d.type == 'line') });
      dataForY2Axis = seriesData.filter(function(d) { return /*!d.disabled && */d.type == 'line2' }); // removed the !d.disabled clause here to fix Issue #240

      chart.dataForYAxis = dataForYAxis
      chart.dataForY2Axis = dataForY2Axis

      x = bars.xScale();
      y1 = bars.yScale();
      y2 = lines.yScale();

      x.range([0, availableWidth]);        

      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = container.selectAll('g.nv-wrap.nv-linePlusBar'+chartID).data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-linePlusBar'+chartID).append('g');
      var g = wrap.select('g');

      gEnter.append('g').attr('class', 'nv-legendWrap');
      gEnter.append('g').attr('class', 'nv-controlsWrap');
      
      var focusEnter = gEnter.append('g').attr('class', 'nv-focus');
      focusEnter.append('g').attr('class', 'nv-x nv-axis');
      focusEnter.append('g').attr('class', 'nv-y1 nv-axis');
      focusEnter.append('g').attr('class', 'nv-y2 nv-axis');
      focusEnter.append('g').attr('class', 'nv-barsWrap');
      focusEnter.append('g').attr('class', 'nv-linesWrap');


      //------------------------------------------------------------
      // Legend
      var showLegend = (typeof options.showLegend == "undefined") ? true : options.showLegend[chartID]

      if (showLegend) {
        if (timeserie) {
          showStacked = false;
        }
        legend.width(availableWidth - controlWidth());
        var legendData = seriesData.filter(function(d) { return !d.hidden });
 
        g.select('.nv-legendWrap')
            .datum(legendData.map(function(series) {
              series.originalKey = series.originalKey === undefined ? series.key : series.originalKey;
              series.key = series.originalKey + (series.bar ? '' : '');
              return series;
            }))
          .call(legend);

        /*
        if ( margin.top != legend.height()) {
          margin.top = legend.height();
          availableHeight1 = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom - contextHeight
          chart.availableHeight = availableHeight1
        }*/

        g.select('.nv-legendWrap')
            .attr('transform', 'translate(' + controlWidth() + ',' + (-legend.height()) +')');
      }

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
            .attr('transform', 'translate(0,' + (-controls.height()-10) +')')
            .call(controls);
    
      }

      //------------------------------------------------------------


      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      bars
        .width(availableWidth)
        .height(availableHeight1)
        .color(dataForYAxis.map(function(d,i) {
          return d.color || color(d, i);
        }));

      lines
        .width(availableWidth)
        .height(availableHeight1)
        .color(dataForY2Axis.map(function(d,i) {
          return d.color || color(d, i);
        }));

      var barsWrap = g.select('.nv-focus .nv-barsWrap')
          .datum(dataForYAxis.length ? dataForYAxis : [{values:[]}]);

      var noLines = (typeof dataForY2Axis[0] == "undefined")
      var linesWrap = g.select('.nv-focus .nv-linesWrap')
          .datum(noLines || dataForY2Axis[0].disabled ? [{values:[]}] : dataForY2Axis);
      
      /* 
      Translate chart vertically. Useful for the multi-chart implementation
      */
      var distanceBetweenCharts = options.distanceBetweenCharts ? options.distanceBetweenCharts : 50
      var translateY = calculateChartYPosition(availableHeight1, distanceBetweenCharts)
       //TODO move to options?
      if(options.withContext && options.contextAtTheTop) { 
        translateY += contextChart.height()
      }

      container.select('.nv-linePlusBar'+chartID)
          .attr('transform', 'translate('+margin.left+',' + (  translateY + margin.top) + ')')
      
      d3.transition(barsWrap).call(bars);
      d3.transition(linesWrap).call(lines);

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


      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

      legend.dispatch.on('legendClick', function(d,i) { 

        if(typeof options.onlyOneSeriesEnabled !== "undefined" && options.onlyOneSeriesEnabled[chartID]) {
            if(d.disabled) {
              seriesData.forEach(function(oneSeries, index) {
                if(index != i) {
                      oneSeries.disabled = true
                }
              });
              d.disabled = false
            }
        } else {
    
            d.disabled = !d.disabled;

            if (!seriesData.filter(function(d) { return !d.disabled }).length) {
              seriesData.map(function(d) {
                d.disabled = false;
                wrap.selectAll('.nv-series').classed('disabled', false);
                return d;
              });
            }
        }

        chart.update();
        if(withContext) {
          contextChart.update()
        }
      });

      controls.dispatch.on('legendClick', function(d,i) {
        d.disabled = !d.disabled;
        switch (d.key) {
          case 'Stacked':
            state.stacked = !state.stacked;
            bars.stacked(state.stacked);
            if (withContext) {
              //bars2.stacked(state.stacked);
            }
            break;
          case 'Delayed':
            delayed = !delayed;
            bars.delayed(delayed);
            if (withContext) {
              //bars2.stacked(state.stacked);
            }
            break;
        }

        state.stacked = bars.stacked();
        dispatch.stateChange(state);
        chart.update();
      });

      tooltips = (typeof options.showTooltip === "undefined") ? true : options.showTooltip[chartID]

      dispatch.on('tooltipShow', function(e) {
        dispatch.tooltipHide(e);
        if (tooltips) showTooltip(e, that.parentNode);
      });

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

      function initAxis(extent) {
        if (typeof extent == "undefined") {
          extent = x.domain();
        }
        //------------------------------------------------------------
        // Update Main (Focus) X Axis

        if (dataForYAxis.length) {
          x = bars.xScale();
        } else {
          x = lines.xScale();
        }

        // Setup Axes

        xAxis.showMaxMin(timeserie);
        xAxis
          .scale(x)
          .tickSize(-availableHeight1, 0);
        if (timeserie) {
          xAxis.ticks(timeserie_ticks, 1)
        } else {
          xAxis.tickValues(function() {
            var n = Math.max(1, Math.round(x.domain().length / (availableWidth / 30))); 
            return x.domain().filter(function(d, i) {
              return (i % n == 0); 
            });
          });
        }

        g.select('.nv-focus .nv-x.nv-axis')
          .attr('transform', 'translate(0,' + /*y1.range()[0]*/availableHeight1 + ')');

        var hideXaxis = (typeof options.hideXaxis === "undefined") ? false : options.hideXaxis[chartID]

        if(!hideXaxis) {
          d3.transition(g.select('.nv-x.nv-axis'))
            .call(xAxis)
        }

        var xTicks = g.select('.nv-x.nv-axis > g').selectAll('g');

        xTicks
            .selectAll('line, text')
            .style('opacity', 1)

        if (staggerLabels) {
            var getTranslate = function(x,y) {
                return "translate(" + x + "," + y + ")";
            };

            var staggerUp = 5, staggerDown = 17;  //pixels to stagger by
            // Issue #140
            xTicks
              .selectAll("text")
              .attr('transform', function(d,i,j) { 
                  return  getTranslate(0, (j % 2 == 0 ? staggerUp : staggerDown));
                });

            var totalInBetweenTicks = d3.selectAll(".nv-x.nv-axis .nv-wrap g g text")[0].length;
            g.selectAll(".nv-x.nv-axis .nv-axisMaxMin text")
              .attr("transform", function(d,i) {
                  return getTranslate(0, (i === 0 || totalInBetweenTicks % 2 !== 0) ? staggerDown : staggerUp);
              });
        }


        if (reduceXTicks)
          xTicks
            .filter(function(d,i) {
                return i % Math.ceil(data[0].values.length / (availableWidth / 100)) !== 0;
              })
            .selectAll('text, line')
            .style('opacity', 0);

        if(rotateLabels)
          xTicks
            .selectAll('text')
            .attr('transform', 'rotate(' + rotateLabels + ' 0,0)')
            .attr('text-anchor200', rotateLabels > 0 ? 'start' : 'end');
        
        g.select('.nv-x.nv-axis').selectAll('g.nv-axisMaxMin text')
            .style('opacity', 1);
                
        //------------------------------------------------------------
        // Setup and Update Main (Focus) Y Axes
        
        y1Axis
          .scale(y1)
          .ticks( availableHeight1 / 36 )
          .tickSize(-availableWidth, 0);

        g.select('.nv-focus .nv-y1.nv-axis')
          .style('opacity', dataForYAxis.length ? 1 : 0);


        y2Axis
          .scale(y2)
          .ticks( availableHeight1 / 36 )
          .tickSize(dataForYAxis.length ? 0 : -availableWidth, 0); // Show the y2 rules only if y1 has none

        g.select('.nv-focus .nv-y2.nv-axis')
          .style('opacity', dataForY2Axis.length ? 1 : 0)
          .attr('transform', 'translate(' + x.range()[0] + ',0)');        

        var hideYaxis = (typeof options.hideYaxis === "undefined") ? false : options.hideYaxis[chartID]

        if(!hideYaxis) {
          d3.transition(g.select('.nv-focus .nv-y1.nv-axis'))
              .call(y1Axis);
          d3.transition(g.select('.nv-focus .nv-y2.nv-axis'))
              .call(y2Axis);
        }

      }


      updateAxis = initAxis

      bars
        .width(availableWidth)
        .height(availableHeight1)
        .color(dataForYAxis.map(function(d,i) {
          return d.color || color(d, i);
        }));


      lines
        .width(availableWidth)
        .height(availableHeight1)
        .color(dataForY2Axis.map(function(d,i) {
          return d.color || color(d, i);
        }));

        if(!withContext) {
          if (dataForYAxis.length) {
            x = bars.xScale();
          } else {
            x = lines.xScale();
          }
          initAxis()
        }
  
    });

    return chart;
  }


  //============================================================
  // Event Handling/Dispatching (out of chart's scope)
  //------------------------------------------------------------

  lines.dispatch.on('elementMouseover.tooltip', function(e) {
    e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
    dispatch.tooltipShow(e);
  });

  lines.dispatch.on('elementMouseout.tooltip', function(e) {
    dispatch.tooltipHide(e);
  });

  bars.dispatch.on('elementMouseover.tooltip', function(e) {
    e.pos = [e.pos[0] +  margin.left, e.pos[1] + margin.top];
    dispatch.tooltipShow(e);
  });

  bars.dispatch.on('elementMouseout.tooltip', function(e) {
    dispatch.tooltipHide(e);
  });

  dispatch.on('tooltipHide', function() {
    if (tooltips) nv.tooltip.cleanup();
  });

  //============================================================


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
  chart.state = state

  d3.rebind(chart, lines, 'defined', 'size', 'clipVoronoi', 'interpolate');
  //TODO: consider rebinding x, y and some other stuff, and simply do soemthign lile bars.x(lines.x()), etc.
  //d3.rebind(chart, lines, 'x', 'y', 'size', 'xDomain', 'yDomain', 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi', 'id');

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = _;
    lines.x(_);
    bars.x(_);
    return chart;
  };

  chart.updateAxis = function() {
    updateAxis()
  }

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

  chart.chartID = function(_) {
    if (!arguments.length) return chartID;
    chartID = _;
    return chart;
  };  

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return chart;
  };

  chart.contextChart = function(_) {
    if (!arguments.length) return contextChart;
    contextChart = _;
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

  chart.xAxisTickFormat = function(_) {
      if (!arguments.length) return xAxis.tickFormat;
      xAxis.tickFormat(_)
      return chart
  };

  chart.y1AxisTickFormat = function(_) {
      if (!arguments.length) return y1Axis.tickFormat;
      y1Axis.tickFormat(_)
      return chart
  }; 

  chart.y2AxisTickFormat = function(_) {
      if (!arguments.length) return y2Axis.tickFormat;
      y2Axis.tickFormat(_)
      return chart
  };

  chart.getClass = function(_) {
    if (!arguments.length) return bars.getClass();
    bars.getClass(_)
    return chart;
  };  


  //============================================================


  return chart;
}
