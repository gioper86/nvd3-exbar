
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
    , bars2 = withContext ? nv.models.exBar(options) : undefined
    , xAxis = nv.models.axis()
    , x2Axis = withContext ? nv.models.axis() : undefined
    , y1Axis = nv.models.axis()
    , y2Axis = nv.models.axis()
    , y3Axis = withContext ? nv.models.axis() : undefined
    , y4Axis = withContext ? nv.models.axis() : undefined
    , legend = nv.models.legend()
    , brush = withContext ? d3.svg.brush() : undefined
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
    ;

  var margin = {top: 10, right: 30, bottom: 5, left: 60}
    , margin2 = {top: 0, right: 30, bottom: 20, left: 60}
    , width = null
    , height = null
    , height2 = withContext ? 50 : 0
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
          xstr = dateFomatter(getX(e.point));
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
  if (withContext) {
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
  }
  
  //============================================================


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var showTooltip = function(e, offsetElement) {
    //console.log('showTooltip', e, offsetElement);
    if (e.isFromArea) {
      return;
      var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
          top = e.pos[1] + ( offsetElement.offsetTop || 0),
          x = xAxis.tickFormat()(bars.x()(e.point, e.pointIndex)),
          y = yAxis.tickFormat()(bars.y()(e.point, e.pointIndex)),
          content = 'tooltip'//tooltip(e.series.key, x, y, e, chart);
      nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
      return;
    }
    var left = e.pos[0] + ( offsetElement.offsetLeft || 0 ),
        top = e.pos[1] + ( offsetElement.offsetTop || 0),
        x = xAxis.tickFormat()(bars.x()(e.point, e.pointIndex)),
        y = e.value,//(e.series.type == 'bar' ? y1Axis : y2Axis).tickFormat()(lines.y()(e.point, e.pointIndex)),
        content = tooltip(e.series.key, x, y, e, chart);

    nv.tooltip.show([left, top], content, e.value < 0 ? 'n' : 's', null, offsetElement);
  };

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
      bars.stacked(state.stacked);
      bars.delayed(delayed);
      bars.delay(delay);
      bars.drawTime(drawTime);
      if (withContext) {
        bars2.stacked(state.stacked);
        bars2.delayed(false);
        bars2.delay(0);
        bars2.drawTime(0);
      }

      var container = d3.select(this),
          that = this;

      var availableWidth = (width || parseInt(container.style('width')) || 960)
                             - margin.left - margin.right,
          availableHeight1 = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom - height2,
          availableHeight2 = height2 - margin2.top - margin2.bottom;

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

      var dataForYAxis = seriesData.filter(function(d) { return !d.disabled && (d.type == 'bar' || d.type == 'mark' || d.type == 'line') });
      var dataForY2Axis = seriesData.filter(function(d) { return !d.disabled && d.type == 'line2' }); // removed the !d.disabled clause here to fix Issue #240

      x = bars.xScale();
      y1 = bars.yScale();
      y2 = lines.yScale();
      if (withContext) {
        x2 = x2Axis.scale();
        y3 = bars2.yScale();
        y4 = lines2.yScale();        
      }

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

      if (withContext) {
        if (timeserie) {
          x2.domain(d3.extent(d3.merge(series1.concat(series2)), function(d) { return d.x } ))
        } else {
          x2.domain(d3.merge(series1.concat(series2)), function(d) { return d.x } )
        }
        x.range([0, availableWidth]);        
        x2.range([0, availableWidth]);        
      } else {
        if (timeserie) {
          x.domain(d3.extent(d3.merge(series1.concat(series2)), function(d) { return d.x } ))
        } else {
          x.domain(d3.merge(series1.concat(series2)), function(d) { return d.x } )
        }
        x.range([0, availableWidth]);        
      }


      //------------------------------------------------------------


      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = container.selectAll('g.nv-wrap.nv-linePlusBar').data([data]);
      var gEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-linePlusBar').append('g');
      var g = wrap.select('g');

      gEnter.append('g').attr('class', 'nv-legendWrap');
      gEnter.append('g').attr('class', 'nv-controlsWrap');
      
      var focusEnter = gEnter.append('g').attr('class', 'nv-focus');
      focusEnter.append('g').attr('class', 'nv-x nv-axis');
      focusEnter.append('g').attr('class', 'nv-y1 nv-axis');
      focusEnter.append('g').attr('class', 'nv-y2 nv-axis');
      focusEnter.append('g').attr('class', 'nv-barsWrap');
      focusEnter.append('g').attr('class', 'nv-linesWrap');

      if (withContext) {
        var contextEnter = gEnter.append('g').attr('class', 'nv-context');
        contextEnter.append('g').attr('class', 'nv-x nv-axis');
        contextEnter.append('g').attr('class', 'nv-y1 nv-axis');
        contextEnter.append('g').attr('class', 'nv-y2 nv-axis');
        contextEnter.append('g').attr('class', 'nv-barsWrap');
        contextEnter.append('g').attr('class', 'nv-linesWrap');
        contextEnter.append('g').attr('class', 'nv-brushBackground');
        contextEnter.append('g').attr('class', 'nv-x nv-brush');
      }


      //------------------------------------------------------------


      //------------------------------------------------------------
      // Legend

      if (showLegend) {
        legend.width(availableWidth - controlWidth());
        var legendData = seriesData.filter(function(d) { return !d.hidden });
 
        g.select('.nv-legendWrap')
            .datum(legendData.map(function(series) {
              series.originalKey = series.originalKey === undefined ? series.key : series.originalKey;
              series.key = series.originalKey + (series.bar ? '' : '');
              return series;
            }))
          .call(legend);

        if ( margin.top != legend.height()) {
          margin.top = legend.height();
          availableHeight1 = (height || parseInt(container.style('height')) || 400)
                             - margin.top - margin.bottom - height2;
        }

        g.select('.nv-legendWrap')
            .attr('transform', 'translate(' + controlWidth() + ',' + (-margin.top) +')');
      }

      //------------------------------------------------------------
      // Controls

      if (timeserie && options.forceArea(data.series)) {
        showStacked = false;
      }
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

      if (withContext) {
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
      } else {
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
            
        d3.transition(barsWrap).call(bars);
        d3.transition(linesWrap).call(lines);
      }
        

      //------------------------------------------------------------



      //------------------------------------------------------------
      // Setup Brush

      if (withContext) {
        brush
          .x(x2)
          .on('brush', onBrush);

        if (brushExtent) {
          brushExtent = [Math.max(brushExtent[0], x2.domain()[0]), Math.min(brushExtent[1], x2.domain()[1])]
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
      }

      //------------------------------------------------------------

      //------------------------------------------------------------
      // Setup Secondary (Context) Axes

      if (withContext) {
        x2Axis
          .ticks( availableWidth / 100 )
          .tickSize(-availableHeight2, 0);

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

        /* hide y4Axis 
        d3.transition(g.select('.nv-context .nv-y2.nv-axis'))
            .call(y4Axis);
        */
      }
      //------------------------------------------------------------

      //============================================================
      // Event Handling/Dispatching (in chart's scope)
      //------------------------------------------------------------

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
            bars.stacked(state.stacked);
            if (withContext) {
              bars2.stacked(state.stacked);
            }
            break;
          case 'Delayed':
            delayed = !delayed;
            bars.delayed(delayed);
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
          //xAxis.ticks(interval.range, 1);
          xAxis.ticks(availableWidth / 100)
        } else {
          xAxis.ticks(availableWidth / 100)
        }
        /*
        xAxis
          .tickFormat(bars.xScale().tickFormat());
        */
        //console.log('x.domain before: : ', x.domain());
        //console.log('extent', extent);
        if (timeserie) {
          xAxis.domain([extent[0], extent[1]]);
        } else {
          //xAxis.domain([Math.ceil(extent[0]), Math.floor(extent[1])]);
          //xAxis.domain([extent[0], extent[1]]);
        }
        //console.log('x.domain after: : ', x.domain());

        g.select('.nv-focus .nv-x.nv-axis')
          .attr('transform', 'translate(0,' + /*y1.range()[0]*/availableHeight1 + ')');

        d3.transition(g.select('.nv-x.nv-axis'))
          .call(xAxis);

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
          .attr('transform', 'translate(' + x.range()[1] + ',0)');

        d3.transition(g.select('.nv-focus .nv-y1.nv-axis'))
            .call(y1Axis);
        d3.transition(g.select('.nv-focus .nv-y2.nv-axis'))
            .call(y2Axis);

      }

      function onBrush() {
        //console.log('onBrush ...');
        var bextent = brush.extent();
        brushExtent = brush.empty() ? null : brush.extent();
        extent = brush.empty() ? x2.domain() : brush.extent();
        dispatch.brush({extent: extent, brush: brush});

        updateBrushBG();

        //

        //------------------------------------------------------------
        // Prepare Main (Focus) Bars and Lines

        var focusBarsWrap = g.select('.nv-focus .nv-barsWrap')
            .datum(!dataForYAxis.length ? [{values:[]}] :
              dataForYAxis
                .map(function(d,i) {
                  return {
                    key: d.key,
                    title: d.title,
                    elClass: d.elClass,
                    type: d.type,
                    color: d.color,
                    formatOptions: d.formatOptions,
                    values: d.values.filter(function(d,i) {
                      return bars.x()(d,i) >= extent[0] && bars.x()(d,i) <= extent[1];
                    })
                  }
                })
            );
        
        var focusLinesWrap = g.select('.nv-focus .nv-linesWrap')
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
          x = bars.xScale();
        } else {
          x = lines.xScale();
        }

        d3.transition(focusBarsWrap).call(bars);
        d3.transition(focusLinesWrap).call(lines);

        initAxis(extent)
        
        //------------------------------------------------------------
        // Update Main (Focus) Bars and Lines

        //------------------------------------------------------------
      }

      //============================================================

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

      if (withContext) {       
        onBrush();
      } else {
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
  chart.lines2 = lines2;
  chart.bars = bars;
  chart.bars2 = bars2;
  chart.xAxis = xAxis;
  chart.x2Axis = x2Axis;
  chart.y1Axis = y1Axis;
  chart.y2Axis = y2Axis;
  chart.y3Axis = y3Axis;
  chart.y4Axis = y4Axis;

  d3.rebind(chart, lines, 'defined', 'size', 'clipVoronoi', 'interpolate');
  //TODO: consider rebinding x, y and some other stuff, and simply do soemthign lile bars.x(lines.x()), etc.
  //d3.rebind(chart, lines, 'x', 'y', 'size', 'xDomain', 'yDomain', 'forceX', 'forceY', 'interactive', 'clipEdge', 'clipVoronoi', 'id');

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = _;
    lines.x(_);
    bars.x(_);
    if (withContext) {
      lines2.x(_);
      bars2.x(_);
    }
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = _;
    lines.y(_);
    bars.y(_);
    if (withContext) {
      lines2.y(_);
      bars2.y(_);
    }
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
    if (typeof bars2 !== "undefined") {
      bars.mainMargin(margin);
    }
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
    bars.interval(interval);
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

  //============================================================


  return chart;
}
