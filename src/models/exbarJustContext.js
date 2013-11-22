
nv.models.exBarJustContextChart = function(options, chartsList) {
  if (typeof options == "undefined") {
    options = {}
  }

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var timeserie = typeof options.timeserie == "undefined" ? false : options.timeserie
    , withContext = timeserie ? (typeof options.withContext == "undefined" ? true : options.withContext) : false
    , lines2 = nv.models.line()
    , bars2 = nv.models.exBar($.extend({}, options, {withCursor: false, withHorizontalCursor: false, showHorizontalCursorText: false}))
    , x2Axis = nv.models.axis()
    , y3Axis = nv.models.axis()
    , y4Axis = nv.models.axis()
    , brush = d3.svg.brush()
    , state = { stacked: false }
    , delayed = true
    , delay = 1200
    , drawTime = 500
    , reduceXTicks = false // if false a tick will show for every data point
    , staggerLabels = false
    , rotateLabels = 0
    , interval = d3.time.day
    , controls = nv.models.legend()
    , showControls = (typeof options.showControls === "undefined") ? true : options.showControls
    , showDelayed = (typeof options.showDelayed === "undefined") ? true : options.showDelayed
    , showStacked = (typeof options.showStacked === "undefined") ? true : options.showStacked
    , controlWidth = function() { return showControls ? (90 * 2) : 0 }
    , cursorYValueFormat = function(value) { return value };

  var margin = {top: 10, right: 30, bottom: 5, left: 60}
    , margin2 = {top: 0, right: 30, bottom: 20, left: 60}
    , width = null
    , height = null
    , height2 = 50
    , getX = function(d) { return d.x }
    , getY = function(d) { return d.y }
    , color = nv.utils.defaultColor()
    , showLegend = true
    , extent
    , brushExtent = null
    , tooltips = true
    , dateFomatter = d3.time.format('%d-%b-%y')
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
    , x2
    , y1
    , y2
    , y3
    , y4
    , noData = "No Data Available."
    , dispatch = d3.dispatch('tooltipShow', 'tooltipHide', 'brush', 'stateChange', 'changeState')
    ;


    lines2
      .interactive(false)
      ;
    x2Axis
      .orient('bottom')
      .tickPadding(5)
      ;
    y3Axis
      .orient('left')
      ;
    y4Axis
      .orient('right')
      ;  
  
  
  //============================================================


  //============================================================
  // Private Variables
  //------------------------------------------------------------



  //------------------------------------------------------------

  function chart(selection) {
    selection.each(function(data) {
      var seriesData = data ? data.series : [];
      //
      chart.update = function(updateDelay) {
        window.setTimeout(function() {
          container.transition().duration(updateDelay || 500).call(chart); 
        }, delayed ? 0 : 0);
      };
      chart.container = this;
      //
      bars2.stacked(state.stacked);
      bars2.delayed(false);
      bars2.delay(0);
      bars2.drawTime(0);

      var container = d3.select(this),
          that = this;

      var availableWidth = (width || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          availableHeight1 = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom - height2,
          availableHeight2 = height2 - margin2.top - margin2.bottom;

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

      var dataForYAxis = seriesData.filter(function(d) { return /*!d.disabled && */(d.type == 'bar' || d.type == 'mark' || d.type == 'line') });
      var dataForY2Axis = seriesData.filter(function(d) { return /*!d.disabled && */d.type == 'line2' }); // removed the !d.disabled clause here to fix Issue #240
      
      x2 = bars2.xScale();
      y3 = bars2.yScale();
      y4 = lines2.yScale();        

      var series1 = dataForYAxis
        .map(function(d) {
          return d.values.map(function(d,i) {
            return { x: getX(d,i), y: getY(d,i) }
          })
        });

      var series2 = dataForY2Axis
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

      bars2
        .width(availableWidth)
        .height(availableHeight2)
        .color(dataForYAxis.map(function(d,i) {
          return d.color || color(d, i);
        }));

      lines2
        .width(availableWidth)
        .height(availableHeight2)
        .color(dataForY2Axis.map(function(d,i) {
          return d.color || color(d, i);
        }));

      var bars2Wrap = g.select('.nv-context .nv-barsWrap')
        .datum(dataForYAxis.length ? dataForYAxis : [{values:[]}]);

      var noLines = (typeof dataForY2Axis[0] == "undefined")
      var lines2Wrap = g.select('.nv-context .nv-linesWrap')
        .datum(noLines || dataForY2Axis[0].disabled ? [{values:[]}] : dataForY2Axis);
          
      g.select('.nv-context')
          .attr('transform', 'translate(0,' + ( availableHeight1 + margin.bottom + margin2.top) + ')')

      d3.transition(bars2Wrap).call(bars2);
      d3.transition(lines2Wrap).call(lines2);
        
      //------------------------------------------------------------



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

        x2Axis.scale(x2);
        x2Axis
          .tickSize(-availableHeight2, 0);

        if (timeserie) {
          x2Axis.ticks(timeserie_ticks2);
        } else {          
          x2Axis.ticks(availableWidth / 100);
        }
        x2Axis.showMaxMin(timeserie);

        //x2Axis.ticks(interval.range, 1);                      

        g.select('.nv-context .nv-x.nv-axis')
          .attr('transform', 'translate(0,' + y3.range()[0] + ')');
        d3.transition(g.select('.nv-context .nv-x.nv-axis'))
          .call(x2Axis);


        y3Axis
          .scale(y3)
          .ticks( availableHeight2 / 36 )
          .tickSize( -availableWidth, 0);

        g.select('.nv-context .nv-y1.nv-axis')
          .style('opacity', dataForYAxis.length ? 1 : 0)
          .attr('transform', 'translate(0,' + x2.range()[0] + ')');
            
        /* hide y3Axis 
        d3.transition(g.select('.nv-context .nv-y1.nv-axis'))
            .call(y3Axis);
        */

        y4Axis
          .scale(y4)
          .ticks( availableHeight2 / 36 )
          .tickSize(dataForYAxis.length ? 0 : -availableWidth, 0); // Show the y2 rules only if y1 has none

        g.select('.nv-context .nv-y2.nv-axis')
            .style('opacity', dataForY2Axis.length ? 1 : 0)
            .attr('transform', 'translate(' + x2.range()[1] + ',0)');
      
      //------------------------------------------------------------

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

/*
      legend.dispatch.on('legendClick', function(d,i) { 
        d.disabled = !d.disabled;

        if (!seriesData.filter(function(d) { return !d.disabled }).length) {
          seriesData.map(function(d) {
            d.disabled = false;
            wrap.selectAll('.nv-series').classed('disabled', false);
            return d;
          });
        }

        chart.update();
      });

      controls.dispatch.on('legendClick', function(d,i) {
        d.disabled = !d.disabled;
        switch (d.key) {
          case 'Stacked':
            state.stacked = !state.stacked;
            if (withContext) {
              bars2.stacked(state.stacked);
            }
            break;
          case 'Delayed':
            delayed = !delayed;
            if (withContext) {
              bars2.stacked(state.stacked);
            }
            break;
        }

        state.stacked = bars.stacked();
        dispatch.stateChange(state);

        chart.update();
      });

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
*/
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

      var y1=[]
      var y2=[]
      for(var c=0;c<chartsList.length;c++) {
        y1[c] = chartsList[c].bars.yScale();
        y2[c] = chartsList[c].lines.yScale();
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

      function initAxis(extent,chartIndex) {

        if (typeof extent == "undefined") {
          extent = x.domain();
        }
        //------------------------------------------------------------
        // Update Main (Focus) X Axis

        if (dataForYAxis.length) {
          x = chartsList[chartIndex].bars.xScale();
        } else {
          x = chartsList[chartIndex].lines.xScale();
        }

        // Setup Axes

        chartsList[chartIndex].xAxis.showMaxMin(timeserie);
        chartsList[chartIndex].xAxis
          .scale(x)
          .tickSize(-chartsList[chartIndex].availableHeight1, 0);
        if (timeserie) {
          chartsList[chartIndex].xAxis.ticks(timeserie_ticks, 1)
        } else {
          chartsList[chartIndex].xAxis.tickValues(function() {
            var n = Math.max(1, Math.round(x.domain().length / (availableWidth / 30))); 
            return x.domain().filter(function(d, i) {
              return (i % n == 0); 
            });
          });
        }
        /*
        xAxis
          .tickFormat(bars.xScale().tickFormat());
        */
        //console.log('x.domain before: : ', x.domain());
        //console.log('extent', extent);
        if (timeserie) {
          //xAxis.domain([extent[0], extent[1]]);
        } else {
          //xAxis.domain([Math.ceil(extent[0]), Math.floor(extent[1])]);
          //xAxis.domain([extent[0], extent[1]]);
        }
        //console.log('x.domain after: : ', x.domain());

        var elem = d3.select("#"+ chartsList[chartIndex].container.id)

        elem.select('.nv-focus .nv-x.nv-axis')
          .attr('transform', 'translate(0,' + /*y1.range()[0]*/chartsList[chartIndex].availableHeight1 + ')');

        d3.transition(elem.select('.nv-x.nv-axis'))
          .call(chartsList[chartIndex].xAxis);

        var xTicks = elem.select('.nv-x.nv-axis > g').selectAll('g');

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
            elem.selectAll(".nv-x.nv-axis .nv-axisMaxMin text")
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
        
        elem.select('.nv-x.nv-axis').selectAll('g.nv-axisMaxMin text')
            .style('opacity', 1);
                
        //------------------------------------------------------------
        // Setup and Update Main (Focus) Y Axes

        chartsList[chartIndex].y1Axis
          .scale(y1[chartIndex])
          .ticks( chartsList[chartIndex].availableHeight1 / 36 )
          .tickSize(-chartsList[chartIndex].availableWidth, 0);

        elem.select('.nv-focus .nv-y1.nv-axis')
          .style('opacity', dataForYAxis.length ? 1 : 0);


        chartsList[chartIndex].y2Axis
          .scale(y2[chartIndex])
          .ticks( chartsList[chartIndex].availableHeight1 / 36 )
          .tickSize(dataForYAxis.length ? 0 : -chartsList[chartIndex].availableWidth, 0); // Show the y2 rules only if y1 has none

        elem.select('.nv-focus .nv-y2.nv-axis')
          .style('opacity', dataForY2Axis.length ? 1 : 0)
          .attr('transform', 'translate(' + x.range()[1] + ',0)');

        d3.transition(elem.select('.nv-focus .nv-y1.nv-axis'))
            .call(chartsList[chartIndex].y1Axis);
        d3.transition(elem.select('.nv-focus .nv-y2.nv-axis'))
            .call(chartsList[chartIndex].y2Axis);  

      }

      function onBrush() {
        for(var c=0;c<chartsList.length;c++) {
            //console.log('onBrush ...');
            var bextent = brush.extent();
            brushExtent = brush.empty() ? null : brush.extent();
            extent = brush.empty() ? x2.domain() : brush.extent();
            dispatch.brush({extent: extent, brush: brush});

            updateBrushBG();

            //console.log('onBrush - extent', extent);

            //

            //------------------------------------------------------------
            // Prepare Main (Focus) Bars and Lines

            var elem = d3.select("#"+ chartsList[c].container.id)
            var elemData = elem.data()[0].series
            
            var focusBarsWrap = elem.select('.nv-focus .nv-barsWrap')
                .datum(!elemData.length ? [{values:[]}] :
                  elemData
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
                            return chartsList[c].x()(d,i) >= extent[0] && chartsList[c].x()(d,i) <= extent[1];
                        })
                      }
                    })
                );
            
            var focusLinesWrap = elem.select('.nv-focus .nv-linesWrap')
                .datum(noLines || dataForY2Axis[0].disabled ? [{values:[]}] :
                  dataForY2Axis
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
                          return lines.x()(d,i) >= extent[0] && lines.x()(d,i) <= extent[1];
                        })
                      }
                    })
                 );
                     
            //------------------------------------------------------------
            
            
            //------------------------------------------------------------
            // Update Main (Focus) X Axis

            if (dataForYAxis.length) {
              x = chartsList[c].bars.xScale();
            } else {
              x = chartsList[c].lines.xScale();
            }

            d3.transition(focusBarsWrap).call(chartsList[c].bars);
            d3.transition(focusLinesWrap).call(chartsList[c].lines);

            initAxis(extent,c)
            
            //------------------------------------------------------------
            // Update Main (Focus) Bars and Lines

            //------------------------------------------------------------
        }
      }

      //============================================================

      onBrush();

    });

    return chart;
  }



  //============================================================


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  chart.dispatch = dispatch;
  chart.lines2 = lines2;
  chart.bars2 = bars2;
  chart.x2Axis = x2Axis;
  chart.y3Axis = y3Axis;
  chart.y4Axis = y4Axis;

  //TODO: consider rebinding x, y and some other stuff, and simply do soemthign lile bars.x(lines.x()), etc.
  //d3.rebind(chart, lines, 'x', 'y', 'size', 'xDomain', 'yDomain', 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi', 'id');

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = _;
    lines2.x(_);
    bars2.x(_);
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = _;
    lines2.y(_);
    bars2.y(_);

    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
    //
    bars2.mainMargin(margin);
    return chart;
  };

  chart.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return chart;
  };

  chart.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    legend.color(color);
    return chart;
  };

  chart.showLegend = function(_) {
    if (!arguments.length) return showLegend;
    showLegend = _;
    return chart;
  };

  chart.showControls = function(_) {
    if (!arguments.length) return showControls;
    showControls = _;
    return chart;
  };

  chart.showStacked = function(_) {
    if (!arguments.length) return showStacked;
    showStacked = _;
    return chart;
  };

  chart.showDelayed = function(_) {
    if (!arguments.length) return showDelayed;
    showDelayed = _;
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
    if (typeof bars2 != "undefined") {
      bars2.interval(interval);
    }
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

  //============================================================


  return chart;
}
