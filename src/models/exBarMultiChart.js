nv.models.exBarMultiChart = function(options) {
  if (typeof options == "undefined") {
    options = {}
  }

  var mainChart = nv.models.exBarChart(options),
  contextChart = options.withContext ? nv.models.exBarContextChart(options) : null

  var width, 
  height = null,
  contextHeight = 50,
  margin = {top: 10, right: 30, bottom: 20, left: 60},
  contextMargin = {top: 10, right: 30, bottom: 5, left: 60},
  delayed

  function chart(selection) {
  	

    //mainChart.chartID(0)

    if(options.withContext) { 
      contextChart.chartUnderControl(mainChart) 
      mainChart.contextChart(contextChart)
    }

    mainChart(selection)

    if(options.withContext) { contextChart(selection) }
  }

  //============================================================


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  

  chart.update = function() {
  	mainChart.update()
  	if(options.withContext) { contextChart.update() }
	  return chart
  }


  chart.dispatch = mainChart.dispatch;
  chart.legend = mainChart.legend;
  chart.lines = mainChart.lines;
  chart.lines2 = mainChart.lines2;
  chart.bars = mainChart.bars;
  chart.xAxis = mainChart.xAxis;
  chart.y1Axis = mainChart.y1Axis;
  chart.y2Axis = mainChart.y2Axis;
  chart.mainChart = mainChart;
  chart.contextChart = contextChart;

  chart.x = function(_) {
    if (!arguments.length) return getX;
    mainChart.getX = _;
    mainChart.lines.x(_);
    mainChart.bars.x(_);

    if(options.withContext) {
      contextChart.getX = _;
      contextChart.lines.x(_);
      contextChart.bars.x(_);
    }

    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    mainChart.getY = _;
    mainChart.lines.y(_);
    mainChart.y(_);

    if(options.withContext) {
      contextChart.getY = _;
      contextChart.lines.y(_);
      contextChart.bars.y(_);
    }

    return chart;
  };

  chart.mainChartMargin = function(_) {
    if (!arguments.length) return margin;

    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;

    mainChart.margin(margin)
    return chart;
  };


  chart.contextChartMargin = function(_) {
    if (!arguments.length) return contextMargin;
    
    contextMargin.top    = typeof _.top    != 'undefined' ? _.top    : contextMargin.top;
    contextMargin.right  = typeof _.right  != 'undefined' ? _.right  : contextMargin.right;
    contextMargin.bottom = typeof _.bottom != 'undefined' ? _.bottom : contextMargin.bottom;
    contextMargin.left   = typeof _.left   != 'undefined' ? _.left   : contextMargin.left;
    
    if (options.withContext) { 
      contextChart.margin(contextMargin)
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
    mainChart.legend.color(color);
    if(options.withContext) { contextChart.legend.color(color); }
    return chart;
  };

  chart.tooltip = function(_) {
    if (!arguments.length) return mainChart.tooltip;
    mainChart.tooltip = _;
    return chart;
  };

  chart.tooltips = function(_) {
    if (!arguments.length) return mainChart.tooltips;
    mainChart.tooltips = _;
    return chart;
  };

  chart.tooltipContent = function(_) {
    if (!arguments.length) return mainChart.tooltip;
    mainChart.tooltip = _;
    return chart;
  };

  chart.noData = function(_) {
    if (!arguments.length) return mainChart.noData;
    mainChart.noData = _;
    if(options.withContext) { contextChart.noData = _; }
    return chart;
  };

  chart.brushExtent = function(_) {
    if (!arguments.length) return contextChart.brushExtent;
    contextChart.brushExtent = _;
    return chart;
  };

  chart.stacked = function(_) {
    if (!arguments.length) return mainChart.state.stacked;
    mainChart.state.stacked = _;
    if(options.withContext) { contextChart.state.stacked = _; }
    return chart;
  }

  chart.delayed = function(_) {
    if (!arguments.length) return mainChart.delayed;
    mainChart.delayed = _;
    if(options.withContext) { contextChart.delayed = _; }
  }

  chart.delay = function(_) {
    if (!arguments.length) return mainChart.delay;
    mainChart.delay = _;
    if(options.withContext) { contextChart.delay = _; }
    return chart;
  };

  chart.drawTime = function(_) {
    if (!arguments.length) return mainChart.drawTime;
    mainChart.drawTime = _;
    if(options.withContext) { contextChart.drawTime = _; }
    return chart;
  };

  chart.interval = function(_) {
    if (!arguments.length) return mainChart.interval;
    mainChart.bars.interval(_);
    if(options.withContext) { contextChart.bars.interval(_); }
    return chart;
  };

  chart.extent = function(_) {
    if (!arguments.length) return contextChart.extent;
    contextChart.brush.extent(_);
    return chart;    
  }

  chart.cursorYValueFormat = function(_) {
    if (!arguments.length) return mainChart.cursorYValueFormat;
    mainChart.cursorYValueFormat(_);
    if(options.withContext) { contextChart.cursorYValueFormat(_); }
    return chart;
  }; 


  chart.xAxisTickFormat = function(_) {
    if (!arguments.length) return mainChart.xAxis.tickFormat;
    mainChart.xAxis.tickFormat(_)
    if(options.withContext) { contextChart.xAxis.tickFormat(_) }
    return chart;
  }

  //============================================================

  return chart; 

}