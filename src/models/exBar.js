
nv.models.exBar = function(timeserie) {

  //============================================================
  // Public Variables with Default Settings
  //------------------------------------------------------------

  var margin = {top: 0, right: 0, bottom: 0, left: 0}
    , width = 960
    , height = 500
    , x = timeserie ? d3.time.scale() : d3.scale.ordinal()
    , y = d3.scale.linear()
    , id = Math.floor(Math.random() * 10000) //Create semi-unique ID in case user doesn't select one
    , getX = function(d) { return d.x }
    , getY = function(d) { return d.y }
    , forceY = [0] // 0 is forced by default.. this makes sense for the majority of bar graphs... user can always do chart.forceY([]) to remove
    , clipEdge = true
    , stacked = false
    , color = nv.utils.defaultColor()
    , hideable = false
    , barColor = null // adding the ability to set the color for each rather than the whole group
    , disabled // used in conjunction with barColor to communicate from multiBarHorizontalChart what series are disabled
    , delayed = true
    , delay = 50000
    , drawTime = 50000
    , xDomain
    , yDomain
    , dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout')
    , interval = d3.time.day
    , dataMappedByX = {}
    ;

  var scatter = nv.models.scatter()
    , interpolate = "linear" // controls the line interpolation
    , defined = function(d,i) { return !isNaN(getY(d,i)) && getY(d,i) !== null } // allows a line to be not continuous when it is not defined
    , isArea = function(d) { return d.type == 'area' } // decides if a line is an area or just a line
    ;
    
  scatter
    .size(16) // default size
    .sizeDomain([16,256]) //set to speed up calculation, needs to be unset if there is a custom size accessor
    ;
  
  //============================================================


  //============================================================
  // Private Variables
  //------------------------------------------------------------

  var x0, y0 //used to store previous scales
      ;

  //============================================================

  //============================================================

  function getXPos(xval, bandWidth) {
    if (timeserie) {
      var xdomain = x.domain();
      var diff = interval.range(xdomain[0], xval).length;
      return (diff * bandWidth);
    } else {
      return x(xval)
    }
  }
  function chartBars(container, availableWidth, availableHeight, bandWidth, barWidth, data, dataBars) {

      //------------------------------------------------------------
      // Setup containers and skeleton of chart

      var wrap = container.selectAll('g.nv-wrap.nv-multibar').data([dataBars]);
      var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-multibar');
      var defsEnter = wrapEnter.append('defs');
      var gEnter = wrapEnter.append('g');
      var g = wrap.select('g')

      gEnter.append('g').attr('class', 'nv-groups');

      wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      //------------------------------------------------------------

      defsEnter.append('clipPath')
        .attr('id', 'nv-edge-clip-' + id)
        .append('rect');
      wrap.select('#nv-edge-clip-' + id + ' rect')
        .attr('width', availableWidth)
        .attr('height', availableHeight);

      g.attr('clip-path', clipEdge ? 'url(#nv-edge-clip-' + id + ')' : '');

      var groups = wrap.select('.nv-groups').selectAll('.nv-group')
        .data(function(d) { return d }, function(d) { return d.key });

      groups.enter().append('g')
        .style('stroke-opacity', 1)
        .style('fill-opacity', 1);

      if (delayed) {
        var delayPerBar = delay;
        var delayPerItem = 0;
        //if (typeof dataBars[0] != "undefined") {
          delayPerItem = delayPerBar / dataBars[0].values.length
        //}
        groups.exit()
          .selectAll('rect.nv-bar')
          .transition()
          .delay(function(d,i) { return i * delayPerItem })
            .attr('y', function(d) { return stacked ? y0(d.y0) : y0(0) })
            .attr('height', 0)
            .remove();
      } else {
        groups.exit()
          .selectAll('rect.nv-bar')
          .remove();
      }

      groups
        .attr('class', function(d,i) { 
          return 'nv-group nv-series-' + i  + ' ' + (typeof d.elClass != 'undefined' ? d.elClass : '')
        })
        .classed('hover', function(d) { return d.hover })
        .style('fill', function(d,i,j){ return color(d, i) })
        .style('stroke', function(d,i,j){ return color(d, i) });
      d3.transition(groups)
        .style('stroke-opacity', 1)
        .style('fill-opacity', 1/*.75*/);


      var bars = groups.selectAll('rect.nv-bar')
        .data(function(d) { return (hideable && !dataBars.length) ? hideable.values : d.values });

      bars.exit().remove();

      var barsEnter;
      if (delayed) {
        barsEnter = bars.enter().append('rect')
          .attr('class', function(d,i) { return getY(d,i) < 0 ? 'nv-bar negative' : 'nv-bar positive' })
          .attr('x', function(d,i,j) {
              if (timeserie) {
                return stacked ? 0 : /*x(getX(d,i)) + */(j * barWidth)
              } else {
                return stacked ? 0 : (j * x.rangeBand() / dataBars.length)
              }
          })
          .attr('y', function(d) { return y0(stacked ? d.y0 : 0) })
          .attr('height', 0)
          .attr('width', function(d,i,j) {
            if (timeserie) {
              return stacked ? bandWidth : barWidth
            } else {
              return x.rangeBand() / (stacked ? 1 : dataBars.length)
            }
          });
      } else {
        barsEnter = bars.enter().append('rect');
      }

      var getPosBars = function(d, i, j) {
        // TODO: Figure out why the value appears to be shifted
        //console.log('getPosBars ...', d, i, j);
        var pos;
        if (timeserie) {
          pos = [
            getXPos(getX(d,i), bandWidth) + (bandWidth * (stacked ? dataBars.length / 2 : d.series + .5) / dataBars.length), 
            y(getY(d,i) + (stacked ? d.y0 : 0))
          ];
        } else {
          pos = [
            getXPos(getX(d,i), bandWidth) + (x.rangeBand() * (stacked ? dataBars.length / 2 : d.series + .5) / dataBars.length),
            y(getY(d,i) + (stacked ? d.y0 : 0))
          ];
        }
        //console.log('pos', pos);
        return pos;
      }
      
      bars
        .style('fill', function(d,i,j){ return color(d, j, i);  })
        .style('stroke', function(d,i,j){ return color(d, j, i); })
        .on('mouseover', function(d,i,j) { //TODO: figure out why j works above, but not here
          d3.select(this).classed('hover', true);
          dispatch.elementMouseover({
            value: getY(d,i),
            point: d,
            data: data,
            dataMappedByX: dataMappedByX,
            series: data[d.series],
            pos: getPosBars(d, i, j),
            pointIndex: i,
            seriesIndex: d.series,
            e: d3.event
          });
        })
        .on('mouseout', function(d,i) {
          d3.select(this).classed('hover', false);
          dispatch.elementMouseout({
            value: getY(d,i),
            point: d,
            data: data,
            dataMappedByX: dataMappedByX,
            series: data[d.series],
            pointIndex: i,
            seriesIndex: d.series,
            e: d3.event
          });
        })
        .on('click', function(d,i,j) {
          dispatch.elementClick({
            value: getY(d,i),
            point: d,
            data: data,
            dataMappedByX: dataMappedByX,
            series: data[d.series],
            pos: getPosBars(d, i, j),
            pointIndex: i,
            seriesIndex: d.series,
            e: d3.event
          });
          d3.event.stopPropagation();
        })
        .on('dblclick', function(d,i,j) {
          dispatch.elementDblClick({
            value: getY(d,i),
            point: d,
            data: data,
            dataMappedByX: dataMappedByX,
            series: data[d.series],
            pos: getPosBars(d, i, j),
            pointIndex: i,
            seriesIndex: d.series,
            e: d3.event
          });
          d3.event.stopPropagation();
        });
      
      bars
        .attr('class', function(d,i) { return getY(d,i) < 0 ? 'nv-bar negative' : 'nv-bar positive'; })
        .attr('transform', function(d,i,j) { 
          return 'translate(' + getXPos(getX(d,i), bandWidth) + ',0)'; 
        })



      if (barColor) {
        if (!disabled) disabled = dataBars.map(function() { return true });
        bars
          //.style('fill', barColor)
          //.style('stroke', barColor)
          //.style('fill', function(d,i,j) { return d3.rgb(barColor(d,i)).darker(j).toString(); })
          //.style('stroke', function(d,i,j) { return d3.rgb(barColor(d,i)).darker(j).toString(); })
          .style('fill', function(d,i,j) { return d3.rgb(barColor(d,i)).darker(  disabled.map(function(d,i) { return i }).filter(function(d,i){ return !disabled[i]  })[j]   ).toString(); })
          .style('stroke', function(d,i,j) { return d3.rgb(barColor(d,i)).darker(  disabled.map(function(d,i) { return i }).filter(function(d,i){ return !disabled[i]  })[j]   ).toString(); });
      }

      if (stacked) {
        if (delayed) {
          bars.transition()
            .delay(function(d,i) { return i * delay / dataBars[0].values.length })
            .attr('y', function(d,i) {
              return y((stacked ? d.y1 : 0));
            })
            .attr('height', function(d,i) {
              return Math.max(Math.abs(y(d.y + (stacked ? d.y0 : 0)) - y((stacked ? d.y0 : 0))),1);
            })
            .attr('x', function(d,i,j) {
              if (timeserie) {
                return stacked ? 0 : (j * barWidth)
              } else {
                return stacked ? 0 : (d.series * x.rangeBand() / dataBars.length)
              }
            })
          .attr('width', function(d,i) {
            if (timeserie) {
              return stacked ? bandWidth : barWidth
            } else {
              return x.rangeBand() / (stacked ? 1 : dataBars.length)
            }                  
          });
        } else {
          bars
            .attr('y', function(d,i) {
              return y((stacked ? d.y1 : 0));
            })
            .attr('height', function(d,i) {
              return Math.max(Math.abs(y(d.y + (stacked ? d.y0 : 0)) - y((stacked ? d.y0 : 0))),1);
            })
            .attr('x', function(d,i,j) {
              if (timeserie) {
                return stacked ? 0 : (j * barWidth)
              } else {
                return stacked ? 0 : (d.series * x.rangeBand() / dataBars.length)
              }
            })
            .attr('width', function(d,i) {
              if (timeserie) {
                return stacked ? bandWidth : barWidth
              } else {
                return x.rangeBand() / (stacked ? 1 : dataBars.length)
              }
            });
        }
      } else {
        if (delayed) {
          //d3.transition(bars).duration(drawTime)
          bars.transition()
            .delay(function(d,i) { return i * delay/ dataBars[0].values.length })
              .attr('x', function(d,i,j) {
                if (timeserie) {
                  return stacked ? 0 : (j * barWidth)
                } else {
                  return stacked ? 0 : (d.series * x.rangeBand() / dataBars.length)
                }
              })
              .attr('width', function(d,i,j) {
                if (timeserie) {
                  return stacked ? bandWidth : barWidth
                } else {
                  return x.rangeBand() / (stacked ? 1 : dataBars.length)
                }
              })
              .attr('y', function(d,i) {
                return getY(d,i) < 0 ?
                        y(0) :
                        y(0) - y(getY(d,i)) < 1 ?
                          y(0) - 1 :
                        y(getY(d,i)) || 0;
              })
              .attr('height', function(d,i) {
                return Math.max(Math.abs(y(getY(d,i)) - y(0)),1) || 0;
              });
        } else {
        //d3.transition(bars).duration(drawTime)
          bars
            .attr('x', function(d,i,j) {
              if (timeserie) {
                return stacked ? 0 : (j * barWidth)
              } else {
                return stacked ? 0 : (d.series * x.rangeBand() / dataBars.length)
              }
            })
            .attr('width', function(d,i) {
              if (timeserie) {
                return stacked ? bandWidth : barWidth
              } else {
                return x.rangeBand() / (stacked ? 1 : dataBars.length)
              }
            })
            .attr('y', function(d,i) {
              return getY(d,i) < 0 ?
                y(0) :
                y(0) - y(getY(d,i)) < 1 ?
                  y(0) - 1 :
                y(getY(d,i)) || 0;
            })
            .attr('height', function(d,i) {
              return Math.max(Math.abs(y(getY(d,i)) - y(0)),1) || 0;
            });
        }
      }
  }

  function chartMarks(container, availableWidth, availableHeight, bandWidth, barWidth, data, dataMarks) {
    //console.log('chartMarks', data, dataMarks);
    //------------------------------------------------------------

    //------------------------------------------------------------
    // Setup containers and skeleton of chart

    var wrap = container.selectAll('g.nv-wrap.nv-mark').data([dataMarks]);
    var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-mark');
    var defsEnter = wrapEnter.append('defs');
    var gEnter = wrapEnter.append('g');
    var g = wrap.select('g')

    gEnter.append('g').attr('class', 'nv-groups');

    wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    //------------------------------------------------------------
    defsEnter.append('clipPath')
      .attr('id', 'nv-edge-clip-' + id)
      .append('rect');
    wrap.select('#nv-edge-clip-' + id + ' rect')
      .attr('width', availableWidth)
      .attr('height', availableHeight);

    g   .attr('clip-path', clipEdge ? 'url(#nv-edge-clip-' + id + ')' : '');

    var groups = wrap.select('.nv-groups').selectAll('.nv-group')
      .data(function(d) { return d }, function(d) { return d.key });
    groups.enter().append('g')
      .style('stroke-opacity', 1)
      .style('fill-opacity', 1);


    if (delay) {
      groups.exit()
        .selectAll('line.nv-mark')
        .transition()
        .delay(function(d,i) { return i * delay/ data[0].values.length })
          .attr('x1', 0)
          .attr('x2', function(d,i,j) {
            if (timeserie) {
              return bandWidth
            } else {
              return x.rangeBand()
            }
          })
          .attr('y1', y(0))
          .attr('y2', y(0))
          .remove();
      groups.exit()
        .transition()
        .delay(function(d) { return delay; })
        .remove();
    } else {
      groups.exit()
        .remove();
    }

    groups
        .attr('class', function(d,i) { 
          return 'nv-group nv-series-' + i  + ' ' + (typeof d.elClass != 'undefined' ? d.elClass : '')
        })
        .classed('hover', function(d) { return d.hover })
        .style('fill', function(d,i,j){ return color(d, i) })
        .style('stroke', function(d,i,j){ return color(d, i) });
    d3.transition(groups)
        .style('stroke-opacity', 1)
        .style('fill-opacity', 1/*.75*/);
    
      var lines = groups.selectAll('line.nv-mark')
          .data(function(d) { return (hideable && !dataMarks.length) ? hideable.values : d.values });

      lines.exit().remove();


      var linesEnter;
      if (delayed) {
        linesEnter = lines.enter().append('line')
          .attr('class', function(d,i,j) {
            return getY(d,i) < 0 ? 'nv-mark negative' : 'nv-line positive';
          })
          .attr('x1', function(d,i,j) {
              return 0;
          })
          .attr('x2', function(d,i,j) {
            if (timeserie) {
              return bandWidth
            } else {
              return x.rangeBand()
            }
          })
          .attr('y1', function(d,i) { return y(0); })
          .attr('y2', function(d,i) { return y(0); })
      } else {
        linesEnter = lines.enter().append('line')
      }
      
      var getPosMarks = function(d, i, j) {
        // TODO: Figure out why the value appears to be shifted
        var pos;
        if (timeserie) {
          pos = [
            getXPos(getX(d,i), bandWidth) + (bandWidth / 2), 
            y(getY(d,i) + ((stacked && false) ? d.y0 : 0))
          ];
        } else {
          //console.log('getPos ...', x(getX(d,i)), x.rangeBand(), xRangeBand);
          pos = [
            getXPos(getX(d,i), bandWidth) + (x.rangeBand() / 2),
            y(getY(d,i) + ((stacked && false) ? d.y0 : 0))
          ];
        }
        return pos;
      }

      lines
        .style('fill', function(d,i,j){ return color(d, d.series);  })
        .style('stroke', function(d,i,j){ return color(d, d.series); })
        .on('mouseover', function(d,i,j) { //TODO: figure out why j works above, but not here
          d3.select(this).classed('hover', true);
          dispatch.elementMouseover({
            value: getY(d,i),
            point: d,
            data: data,
            dataMappedByX: dataMappedByX,
            series: data[d.series],
            pos: getPosMarks(d, i, j),
            pointIndex: i,
            seriesIndex: d.series,
            e: d3.event
          });
        })
        .on('mouseout', function(d,i) {
          d3.select(this).classed('hover', false);
          dispatch.elementMouseout({
            value: getY(d,i),
            point: d,
            data: data,
            dataMappedByX: dataMappedByX,
            series: data[d.series],
            pointIndex: i,
            seriesIndex: d.series,
            e: d3.event
          });
        })
        .on('click', function(d,i) {
          dispatch.elementClick({
            value: getY(d,i),
            point: d,
            data: data,
            dataMappedByX: dataMappedByX,
            series: data[d.series],
            pos: getPosMarks(d, i, j),
            pointIndex: i,
            seriesIndex: d.series,
            e: d3.event
          });
          d3.event.stopPropagation();
        })
        .on('dblclick', function(d,i) {
          dispatch.elementDblClick({
            value: getY(d,i),
            point: d,
            data: data,
            dataMappedByX: dataMappedByX,
            series: data[d.series],
            pos: getPosMarks(d, i, j),
            pointIndex: i,
            seriesIndex: d.series,
            e: d3.event
          });
          d3.event.stopPropagation();
        });
      
      lines
        .attr('class', function(d,i,j) {
          var elClass = getY(d,i) < 0 ? 'nv-mark negative' : 'nv-mark positive';
          if (typeof dataMarks[j].elClass != "undefined") {
            elClass += ' ' + dataMarks[j].elClass;
          }
          return elClass;
        })
        .attr('transform', function(d,i,j) {
          return 'translate(' + getXPos(getX(d,i), bandWidth) + ',0)'; 
        })

    if (delayed) {
      lines.transition()
        .delay(function(d,i) { return i * delay / data[0].values.length })
        .attr('x1', function(d,i) {
          return 0;
        })
        .attr('x2', function(d,i,j) {
          if (timeserie) {
            return bandWidth
          } else {
            return x.rangeBand()
          }
        })
        .attr('stroke-width', 2)
        .attr('y1', function(d,i) {
          return y(getY(d,i));
        })
        .attr('y2', function(d,i) {
          return y(getY(d,i));
        })    
      } else {
        lines
          .attr('x1', function(d,i) {
            return 0;
          })
          .attr('x2', function(d,i,j) {
            if (timeserie) {
              return bandWidth
            } else {
              return x.rangeBand()
            }
          })
          .attr('stroke-width', 2)
          .attr('y1', function(d,i) {
            return y(getY(d,i));
          })
          .attr('y2', function(d,i) {
            return y(getY(d,i));
          })    
      }
  }

  function chartLines(container, availableWidth, availableHeight, bandWidth, barWidth, data, dataLines) {
    //console.log('chartMarks', data, dataMarks);
    //------------------------------------------------------------

    //------------------------------------------------------------
    // Setup containers and skeleton of chart

    var wrap = container.selectAll('g.nv-wrap.nv-line').data([dataLines]);
    var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-line');
    var defsEnter = wrapEnter.append('defs');
    var gEnter = wrapEnter.append('g');
    var g = wrap.select('g')

    gEnter.append('g').attr('class', 'nv-groups');
    gEnter.append('g').attr('class', 'nv-scatterWrap');

    wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    //------------------------------------------------------------
    /*
    scatter
      .width(availableWidth)
      .height(availableHeight)

    var scatterWrap = wrap.select('.nv-scatterWrap');
        //.datum(data); // Data automatically trickles down from the wrap

    d3.transition(scatterWrap).call(scatter);

    defsEnter.append('clipPath')
        .attr('id', 'nv-edge-clip-' + scatter.id())
      .append('rect');

    wrap.select('#nv-edge-clip-' + scatter.id() + ' rect')
        .attr('width', availableWidth)
        .attr('height', availableHeight);

    g   .attr('clip-path', clipEdge ? 'url(#nv-edge-clip-' + scatter.id() + ')' : '');
    scatterWrap
        .attr('clip-path', clipEdge ? 'url(#nv-edge-clip-' + scatter.id() + ')' : '');
    */



    var groups = wrap.select('.nv-groups').selectAll('.nv-group')
        .data(function(d) { return d }, function(d) { return d.key });
    groups.enter().append('g')
        .style('stroke-opacity', 1e-6)
        .style('fill-opacity', 1e-6);
    d3.transition(groups.exit())
        .style('stroke-opacity', 1e-6)
        .style('fill-opacity', 1e-6)
        .remove();
    groups
        .attr('class', function(d,i) { return 'nv-group nv-series-' + i })
        .classed('hover', function(d) { return d.hover })
        .style('fill', function(d,i){ return color(d, i) })
        .style('stroke', function(d,i){ return color(d, i)});
    d3.transition(groups)
        .style('stroke-opacity', 1)
        .style('fill-opacity', .5);



    var areaPaths = groups.selectAll('path.nv-area')
        .data(function(d) { return isArea(d) ? [d] : [] }); // this is done differently than lines because I need to check if series is an area
    areaPaths.enter().append('path')
        .attr('class', 'nv-area')
        .attr('d', function(d) {
          return d3.svg.area()
              .interpolate(interpolate)
              .defined(defined)
              .x(function(d,i) { return x0(getX(d,i)) })
              .y0(function(d,i) { return y0(getY(d,i)) })
              .y1(function(d,i) { return y0( y.domain()[0] <= 0 ? y.domain()[1] >= 0 ? 0 : y.domain()[1] : y.domain()[0] ) })
              //.y1(function(d,i) { return y0(0) }) //assuming 0 is within y domain.. may need to tweak this
              .apply(this, [d.values])
        });
    d3.transition(groups.exit().selectAll('path.nv-area'))
        .attr('d', function(d) {
          return d3.svg.area()
              .interpolate(interpolate)
              .defined(defined)
              .x(function(d,i) { return x(getX(d,i)) })
              .y0(function(d,i) { return y(getY(d,i)) })
              .y1(function(d,i) { return y( y.domain()[0] <= 0 ? y.domain()[1] >= 0 ? 0 : y.domain()[1] : y.domain()[0] ) })
              //.y1(function(d,i) { return y0(0) }) //assuming 0 is within y domain.. may need to tweak this
              .apply(this, [d.values])
        });
    d3.transition(areaPaths)
        .attr('d', function(d) {
          return d3.svg.area()
              .interpolate(interpolate)
              .defined(defined)
              .x(function(d,i) { return x(getX(d,i)) })
              .y0(function(d,i) { return y(getY(d,i)) })
              .y1(function(d,i) { return y( y.domain()[0] <= 0 ? y.domain()[1] >= 0 ? 0 : y.domain()[1] : y.domain()[0] ) })
              //.y1(function(d,i) { return y0(0) }) //assuming 0 is within y domain.. may need to tweak this
              .apply(this, [d.values])
        });



    var linePaths = groups.selectAll('path.nv-line')
        .data(function(d) { return [d.values] });
    linePaths.enter().append('path')
        .attr('class', 'nv-line')
        .attr('d',
          d3.svg.line()
            .interpolate(interpolate)
            .defined(defined)
            .x(function(d,i) { return x0(getX(d,i)) })
            .y(function(d,i) { return y0(getY(d,i)) })
        );
    d3.transition(groups.exit().selectAll('path.nv-line'))
        .attr('d',
          d3.svg.line()
            .interpolate(interpolate)
            .defined(defined)
            .x(function(d,i) { return x(getX(d,i)) })
            .y(function(d,i) { return y(getY(d,i)) })
        );
    d3.transition(linePaths)
        .attr('d',
          d3.svg.line()
            .interpolate(interpolate)
            .defined(defined)
            .x(function(d,i) { return x(getX(d,i)) })
            .y(function(d,i) { return y(getY(d,i)) })
        );



    //store old scales for use in transitions on update
    x0 = x.copy();
    y0 = y.copy();
  }

  function chart(selection) {
    selection.each(function(data) {
      var odata = data;
      //console.log('odata', odata);
      var availableWidth = width - margin.left - margin.right,
          availableHeight = height - margin.top - margin.bottom,
          container = d3.select(this);

      if(hideable && data.length) hideable = [{
        values: data[0].values.map(function(d) {
        return {
          x: d.x,
          y: 0,
          series: d.series,
          size: 0.01
        };}
      )}];

      //add series index to each data point for reference
      dataMappedByX = {};
      data = data.map(function(series, i) {
        series.values = series.values.map(function(point, j) {
          point.series = i;
          point.index = j;
          //
          var dx = getX(point);
          if (typeof dx != "undefined") {
            if (typeof dataMappedByX[dx] == "undefined") {
              dataMappedByX[dx] = {};
            }
            dataMappedByX[dx][i] = point;
          }          
          //
          return point;
        });
        return series;
      });

      var dataBars = data.filter(function(el, i, array) { return !el.hidden && !el.disabled && el.type == 'bar' });
      var dataMarks = data.filter(function(el, i, array) { return !el.hidden && !el.disabled && el.type == 'mark' });
      var dataLines = data.filter(function(el, i, array) { return !el.hidden && !el.disabled && el.type == 'line' });
      //console.log('data, dataBars, dataMarks', data, dataBars, dataMarks);

      if (stacked && dataBars.length > 0) {
        dataBars = d3.layout.stack()
          .offset('zero')
          .values(function(d){ return d.values })
          .y(getY)
          (!dataBars.length && hideable ? hideable : dataBars);
      }
      //console.log('after d3.layout.stack() - data, dataBars, dataMarks', data, dataBars, dataMarks);


      //------------------------------------------------------------
      // HACK for negative value stacking
      if (stacked) {
        data[0].values.map(function(d,i) {
          var posBase = 0, negBase = 0;
          data.map(function(d) {
            var f = d.values[i]
            if (typeof f != "undefined") {
              f.size = Math.abs(f.y);
              if (f.y<0)  {
                f.y1 = negBase;
                negBase = negBase - f.size;
              } else
              { 
                f.y1 = f.size + posBase;
                posBase = posBase + f.size;
              }
            }
          });
        });
      }

      //------------------------------------------------------------
      // Setup Scales

      // remap and flatten the data for use in calculating the scales' domains
      var seriesData = (xDomain && yDomain) ? [] : // if we know xDomain and yDomain, no need to calculate
        data.map(function(d) {
          return d.values.map(function(d,i) {
            //console.log('sd', d, i);
            return { 
              x: getX(d,i),
              y: getY(d,i), 
              y0: d.y0, 
              y1: d.y1 
            }
          })
        });

      //console.log('seriesData', seriesData);

      if (timeserie) {
        var minDate = d3.min(d3.merge(seriesData).map(function(d) { return interval(d.x) }));
        var maxDate = d3.max(d3.merge(seriesData).map(function(d) { return interval(d.x) }));
        maxDate = interval.offset(maxDate, 1);
        var timeRange = interval.range(minDate, maxDate);
        x.domain([minDate, maxDate]);
        //
        var maxElements = timeRange.length;
        //minDate = timeRange[0];
        //maxDate = timeRange[timeRange.length-1];
        var bandWidth = Math.ceil((availableWidth / maxElements));
        var barWidth = bandWidth / Math.max(dataBars.length, 1);
        //console.log('minDate, maxDate, maxElements', minDate, maxDate, maxElements);
        //console.log('availableWidth, bandWidth, barWidth', availableWidth, bandWidth, barWidth);
        //x.nice(interval);
        x.range([0, availableWidth]);
        //console.log(x(minDate), x(maxDate), x(interval.offset(minDate, 1)));
        //console.log(minDate.getTime(), maxDate.getTime(), interval.offset(minDate, 1).getTime());
      } else {
        x.domain(d3.merge(seriesData).map(function(d) { return d.x }))
        //x.domain(["02-Feb-12", "03-Feb-12", "04-Feb-12", "05-Feb-12", "06-Feb-12", "07-Feb-12", "08-Feb-12", "09-Feb-12", "10-Feb-12", "11-Feb-12"])
        x.rangeBands([0, availableWidth], .1);
      }

      y.domain(yDomain || d3.extent(d3.merge(seriesData).map(function(d, i, j) { return d.y + ((stacked && (typeof d.y0 != "undefined")) ? d.y0 : 0) }).concat(forceY)))
      y.range([availableHeight-3, 3]);

      //console.log('domain.y', y.domain());
      //console.log('x.domain()', x.domain());
      //console.log('x.range(), x.rangeBand()', x.range(), x.rangeBand());


      // If scale's domain don't have a range, slightly adjust to make one... so a chart can show a single data point
      if (x.domain()[0] === x.domain()[1] || y.domain()[0] === y.domain()[1]) singlePoint = true;
      if (x.domain()[0] === x.domain()[1])
        x.domain()[0] ?
            x.domain([x.domain()[0] - x.domain()[0] * 0.01, x.domain()[1] + x.domain()[1] * 0.01])
          : x.domain([-1,1]);

      if (y.domain()[0] === y.domain()[1])
        y.domain()[0] ?
            y.domain([y.domain()[0] + y.domain()[0] * 0.01, y.domain()[1] - y.domain()[1] * 0.01])
          : y.domain([-1,1]);


      x0 = x0 || x;
      y0 = y0 || y;

      //------------------------------------------------------------


      /*
      var maxElements = 0;
      for(var ei=0; ei<seriesData.length; ei+=1) {
          maxElements = Math.max(seriesData[ei].length, maxElements);
      }
      */
      
      // draw bars
      chartBars(container, availableWidth, availableHeight, bandWidth, barWidth, data, dataBars);

      // draw marks
      chartMarks(container, availableWidth, availableHeight, bandWidth, barWidth, data, dataMarks);

      // draw lines
      chartLines(container, availableWidth, availableHeight, bandWidth, barWidth, data, dataLines);

      //store old scales for use in transitions on update
      x0 = x.copy();
      y0 = y.copy();

    });

    return chart;
  }


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  chart.dispatch = dispatch;

  chart.x = function(_) {
    if (!arguments.length) return getX;
    getX = _;
    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    getY = _;
    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) return margin;
    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
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

  chart.xScale = function(_) {
    if (!arguments.length) return x;
    x = _;
    return chart;
  };

  chart.yScale = function(_) {
    if (!arguments.length) return y;
    y = _;
    return chart;
  };

  chart.xDomain = function(_) {
    if (!arguments.length) return xDomain;
    xDomain = _;
    return chart;
  };

  chart.yDomain = function(_) {
    if (!arguments.length) return yDomain;
    yDomain = _;
    return chart;
  };

  chart.forceY = function(_) {
    if (!arguments.length) return forceY;
    forceY = _;
    return chart;
  };

  chart.stacked = function(_) {
    if (!arguments.length) return stacked;
    stacked = _;
    return chart;
  };

  chart.clipEdge = function(_) {
    if (!arguments.length) return clipEdge;
    clipEdge = _;
    return chart;
  };

  chart.color = function(_) {
    if (!arguments.length) return color;
    color = nv.utils.getColor(_);
    return chart;
  };

  chart.barColor = function(_) {
    if (!arguments.length) return barColor;
    barColor = nv.utils.getColor(_);
    return chart;
  };

  chart.disabled = function(_) {
    if (!arguments.length) return disabled;
    disabled = _;
    return chart;
  };

  chart.id = function(_) {
    if (!arguments.length) return id;
    id = _;
    return chart;
  };

  chart.hideable = function(_) {
    if (!arguments.length) return hideable;
    hideable = _;
    return chart;
  };

  chart.delayed = function(_) {
    if (!arguments.length) return delayed;
    delayed = _;
    return chart;
  };

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
    return chart;
  };

  //============================================================


  return chart;
}
