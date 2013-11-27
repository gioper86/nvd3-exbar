nv.models.exBarMultiChart = function(options) {
  if (typeof options == "undefined") {
    options = {}
  }

  var mainChart = nv.models.exBarChart(options),
  contextChart = nv.models.exBarContextChart(options);

  var width, 
  height = null,
  contextHeight = 50,
  margin = {top: 10, right: 30, bottom: 20, left: 60},
  delayed

  function chart(selection) {
  	
    chart.container = this;

    mainChart.chartID(0)
    if(height) { mainChart.height(height) }
    mainChart.contextHeight(contextHeight)

    contextChart.height(contextHeight)
    contextChart.chartUnderControl(mainChart);


    /*contextChart.chartID(1)
  	contextChart.height(500/2)*/

    mainChart(selection)
  	contextChart(selection)

    console.log(mainChart.dataForYAxis)
  }

  //============================================================


  //============================================================
  // Expose Public Variables
  //------------------------------------------------------------

  // expose chart's sub-components
  

  chart.update = function() {
  	mainChart.update()
  	contextChart.update()
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

    contextChart.getX = _;
    contextChart.lines.x(_);
    contextChart.bars.x(_);

    return chart;
  };

  chart.y = function(_) {
    if (!arguments.length) return getY;
    mainChart.getY = _;
    mainChart.lines.y(_);
    mainChart.y(_);

    contextChart.getY = _;
    contextChart.lines.y(_);
    contextChart.bars.y(_);

    return chart;
  };

  chart.margin = function(_) {
    if (!arguments.length) return mainChart.bars.margin;
    

    margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
    margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
    margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
    margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
    //
    mainChart.bars.mainMargin(margin);
    contextChart.bars.mainMargin(margin)

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
    contextChart.legend.color(color);
    return chart;
  };

  chart.showLegend = function(_) {
    if (!arguments.length) return showLegend;
    mainChart.showLegend = _;
    contextChart.showLegend = _;
    return chart;
  };

  chart.showControls = function(_) {
    if (!arguments.length) return mainChart.showControls;
    mainChart.showControls = _;
    contextChart.showControls = _;
    return chart;
  };

  chart.showStacked = function(_) {
    if (!arguments.length) return mainChart.showStacked;
    
    mainChart.showStacked = _;
    contextChart.showStacked = _;

    return chart;
  };

  chart.showDelayed = function(_) {
    if (!arguments.length) return mainChart.showDelayed;

    mainChart.showDelayed = _;
    contextChart.showDelayed = _;

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
    contextChart.noData = _;
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
    contextChart.state.stacked = _;
    return chart;
  }

  chart.delayed = function(_) {
    if (!arguments.length) return mainChart.delayed;
    mainChart.delayed = _;
    contextChart.delayed = _;
  }

  chart.delay = function(_) {
    if (!arguments.length) return mainChart.delay;
    mainChart.delay = _;
    contextChart.delay = _;
    return chart;
  };

  chart.drawTime = function(_) {
    if (!arguments.length) return mainChart.drawTime;
    mainChart.drawTime = _;
    contextChart.drawTime = _;
    return chart;
  };

  chart.interval = function(_) {
    if (!arguments.length) return mainChart.interval;
    mainChart.bars.interval(_);
    contextChart.bars.interval(_);
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
    contextChart.cursorYValueFormat(_);
    return chart;
  }; 


  chart.xAxisTickFormat = function(_) {
    if (!arguments.length) return mainChart.xAxis.tickFormat;
    mainChart.xAxis.tickFormat(_)
    contextChart.xAxis.tickFormat(_)
    return chart;
  }

  //============================================================

  return chart; 

}