// Created by Maxime Feyerick, assisted by Oscar Mauricio Agudelo, for Prof. Bart de Moor as material to be used with the course "Systeemtheorie en Regeltechniek"
// This script is tested with Highcharts 4.1.8

//TODO: use setData to update charts and improve performance (most important for output)

var bodePlot 	= 	null;
var bodeCharts	=	null;
var outputPlot 	=	null;
var outputChart	=	null;
var dynSys 		= 	null;
var noUnstablePoles = true;

var buttonSubmit		= null;
var checkBoxAutoScale 	= null;
var sliderAmplitude 	= null;
var sliderFrequency 	= null;
var sliderAmpVal		= 1;
var	sliderOmegaVal		= 1;

// the default transfer function
var tfNum		= [1, 2];
var tfDen		= [8, 3, 4];

// HighChart plot options
var outputChartOptions = {
							chart: {
								type: 'line'
							},

							title: {
								text: '',
								y: 0
							},

							xAxis: {
								type: 'linear',
								title: {
									text: 't (s)'
								}
							},
							yAxis: {
								startOnTick: false,
								minPadding: 0.01,
								endOnTick: false,
								maxPadding: 0.01,
								title: {
									text: ''
								},
								lineWidth: 1,
								gridLineWidth: 0,
								tickWidth: 1
							},
							legend: {
								enabled: false
							},
							credits: {
								enabled: false
							},
							tooltip: {
								crosshairs: [true, false],
								headerFormat: '<b> t: {point.x} <\b> <br>',
								pointFormat: '<b style="color:{series.color}> {series.name}: <\b> {point.y}',
								valueDecimals: 4
							}
						};

// Additional options to control the tooltip
var bodePlotChartOptions =	{ 
								tooltip: {
											enabled: false
										 }
							};

var inputFunction = function(t, mult, phaseShift ) 	{
		// default values for optional parameters
		if (typeof(mult)==='undefined') mult = 1;
		if (typeof(phaseShift)==='undefined') phaseShift = 0;
		
		return sliderAmpVal * mult * Math.sin(t*sliderOmegaVal + phaseShift); 
	};

// better performance than innerHTML, uses textContent or innerText according to browser support
function set_text_of_node(node, str)
{
	if ('textContent' in node) 
	{
		node.textContent = str;
	} 
	else 
	{
		node.innerText = str;
	}
}	

function setup()
{
	// Fill in the default transfer function in the input boxes as example
	var inputBoxNumerator = document.getElementById('input-numerator');
	var inputBoxDenominator = document.getElementById('input-denominator');
	var inputBoxValue = function(arr) 	{
											var returnStr = "";
											for (var i = 0; i < arr.length; i++)
											{
												returnStr += arr[i].toString() +  ( i==(arr.length - 1) ? "" : "," );
											}
											return returnStr;
										};
	inputBoxNumerator.value = inputBoxValue(tfNum);
	inputBoxDenominator.value = inputBoxValue(tfDen);
	
	// make math align left
	MathJax.Hub.Config(
	{
		displayAlign: "left",
		displayIndent: "1em"
	});
	
	update_tf(tfNum, tfDen);
	
	// set up global variables to identify the various elements
	bodePlot 	= 	document.getElementById('bode-plot-container');
	
	dynSys		=	control.system.tf(tfNum,tfDen);
	
	checkBoxAutoScale	=	document.getElementById('check-auto-scale');
	
	sliderAmplitude 	= 	document.getElementById('slider-amplitude');
	sliderFrequency		=   document.getElementById('slider-omega');
	
	buttonSubmit		=	document.getElementById('submit-button');
	
	// Add outputPlot container to HighChart plot options
	if( 'chart' in outputChartOptions)
	{
		outputChartOptions['chart']['renderTo'] = outputPlot;
	}
	else
	{
		outputChartOptions['chart'] = {renderTo: outputPlot};
	}
	
	
	// Attach event to button
	buttonSubmit.onclick = submit_transfer_function; 
	
	update_bode_plot();
	
	update_output_formulas(true);
	
	// make sliders - bode plot must be build before
	var bodeChartRange = bodeCharts[0].xAxis[0].getExtremes();
	build_sliders( [bodeChartRange.dataMin, bodeChartRange.dataMax] );
}

/** Updates the formula of the Transfer Function under input.
 *	
 *	@param {Array} num -
 *	Array containing the coefficients of the numerator, highest degree first
 *
 *	@param {Array} den -
 *	Array containing the coefficients of the denominator, highest degree first
*/
function update_tf(num, den)
{
	
	var tfLatex		= " $$ H(s) = \\frac{";
	
	/**	Makes a in latex formatted polynomial
	 *
	 *	@param {Array} coeff -
	 *	Array containing the coefficients of the polynomial
	 *
	*/
	var makeLatexPolynom = function(coeff)
		{
			var returnString = "";

			for(var i = 0; i < coeff.length; i++)
			{
				// Add sign expect for highest degree
				if( i != 0 )
					returnString += (coeff[i] < 0) ? '' : '+';
				switch(coeff[i])
				{
					case 0:
						// If the coefficient is zero, remove the sign
						returnString = returnString.slice(0,-1);
						break;
					default:
						returnString += coeff[i];
					case 1:
					case -1:
						// Minus sign in case of -1
						returnString += ( coeff[i] == -1 ) ? '-' : '';
						var degree = coeff.length - i - 1;
						switch(degree)
						{
							case 1:
								returnString += "s";
								break;
							case 0:
								if( Math.abs(coeff[i]) == 1)
									returnString += "1";
								break;
							default:
								returnString += "s^{" + (degree) + "}";
						}
						break;
				}
				
			}
			//console.log("Made polynomial: " + returnString)
			return returnString;
		};
	
	tfLatex += makeLatexPolynom(num) + "}{" + makeLatexPolynom(den) + "} $$";
	
	// update Math
	var math = document.getElementById('tf-function')
	set_text_of_node(math,tfLatex);
	MathJax.Hub.Queue(["Typeset",MathJax.Hub,math]);
	
	// update MathJax 
	// this way is more efficient but it does not work if MathJax hasn't processed for the first time yet
	// var math = MathJax.Hub.getAllJax("tf-function")[0];
	//MathJax.Hub.Queue(["Text",math,tfLatex]);
}

function get_polar_gain( sys, freq)
{
	var tf_eval = sys.evalS( math.multiply(math.complex(0,1),freq));
	return tf_eval.toPolar();
}

/**	Generates an array of points to plot the output function
 *	
 *	@param {number} lowerBound -
 *	Where the x-value should start
 *
 *	@param {number} upperBound -
 *	Where the x-value should stop
 *
 *	@param {number} step -
 *	Distance between the x-values
 *
 *	@param {Polar Coord Complex Number} [gainPolar] -
 *	The complex Gain in polar notation.
 *
 *	@return {Array} -
 *	Array of (x,y) points 
 *	
 */
function generate_output_data(lowerBound, upperBound, step, gainPolar)
{
	if (typeof(gainPolar)==='undefined') gainPolar = 1;
	
	var ptList = [];
	
	// populate with x-values
	for(var i = lowerBound; i <= upperBound; i+= step)	ptList.push(math.round(i,4));
	
	// map function
	var outputVal = function(t_val)
	{
		return [t_val, inputFunction(t_val, gainPolar.r, gainPolar.phi) ];
	};
	
	// Apply map function on x-values by (x,y) points and return
	return ptList.map(outputVal);
	
}

function update_output_plot()
{	
	// Calculate the step and range according to frequency (nyquist-shannon sampling theorem)
	var lowBound = 0;
	// 50 steps in one period
	var step = (Math.PI*2)/sliderOmegaVal/40;
	// 5 periods long
	var highBound = (Math.PI*2)/sliderOmegaVal*5;
	//  round to second most significant number so we get a domain that changes step-wise so the user notices change in frequency
	var posFirstSignificantNb = math.ceil(math.abs(math.log(highBound,10))) * ( (highBound < 1)? -1:1);
	highBound = math.floor(highBound*math.pow(10,-(posFirstSignificantNb - 1))) * math.pow(10,posFirstSignificantNb - 1);
	
	if(noUnstablePoles)
	{
		//Hide eventual message over bode plot
		document.getElementById("output-plot-no-ss").style.visibility = "hidden";
		
		var seriesChartOptions = {
								series:	[
											{
												name: 'input',
												data: generate_output_data(lowBound, highBound, step),
												animation: false
											},
											{
												name: 'output',
												data: generate_output_data(lowBound, highBound, step, get_polar_gain(dynSys, sliderOmegaVal)),
												animation: false
											}
										]
							 };
	
	}
	else
	{
		//draw an empty output
		var seriesChartOptions = { series: [] };
	
		//show message over output plot
		document.getElementById("output-plot-no-ss").style.visibility = "visible";
	}

	if (checkBoxAutoScale.checked)
	{
		var yScaleOptions = {
								yAxis: 	{
											min: null,
											max: null
										}
		};
	}
	else
	{
		var yScaleOptions =	{
								yAxis:	{
											min: -2*sliderAmpVal,
											max:  2*sliderAmpVal
										}	
							};
	}
	
	var finalChartOptions = [outputChartOptions, seriesChartOptions,yScaleOptions].reduce(recursiveExtend);
	
	// Update function appears slower or no real gain, and there is no implementation for auto-scale checkbox yet if uncommenting this code
	// if(!outputChart)
	// {
		outputChart = new Highcharts.Chart(finalChartOptions);
	// }
	// else for(var i = 0; i < seriesChartOptions.series.length; i++)	
	// {
			// outputChart.series[i].update(seriesChartOptions.series[i]);
	// };
	return outputChart;
}

function recursiveExtend(target, source) {
    for (var prop in source) {
        if (prop in target && ( target[prop] && (target[prop].toString() === '[object Object]') )) {
            recursiveExtend(target[prop], source[prop]);
        } else {
            target[prop] = source[prop];
        }
    }
    return target;
}

function areAllNumbers( chkArray )
{
	var allNumbers = true;
	for(var i = 0; ((i < chkArray.length) && allNumbers); i++)
	{
		allNumbers = allNumbers && !(isNaN(chkArray[i]));
	}
	return allNumbers;
}

function  update_bode_plot()
{
	// workaround for bug in lib: first clear container, than fill it up.
	// otherwise a new plot is created beneath the old one
	while (bodePlot.firstChild) {
		bodePlot.removeChild(bodePlot.firstChild);
	}
	
	// populate bode plot, without the automatic syncing because we are going to define our own
	bodeCharts = control.plot.bode(bodePlot, dynSys, undefined, true);
	
	//New sync function  that will highlight the frequency when mouse is not on chart
	var sync = function(e)
			{
				var point = null;
				
				bodeCharts.forEach(function(chart) {
					e = chart.pointer.normalize(e);
					
					if( !point)
					{
						// The x and y elements of this point contains coordinates of the data 
						// plotX and plotY are the true relative coordinates.
						point = chart.series[0].searchPoint(e, true);
	
					}
					else
					{
						// If point is already defined, use it's index to get exactly the same point in the other graph.
						// Otherwise (using assignment above) there is a small error
						point = chart.series[0].data[point.index];
					}
					
					// if it's a valid point corresponding to one on the plot
					if (point) {
						point.onMouseOver();
						chart.tooltip.refresh(point);
						chart.xAxis[0].drawCrosshair(e, point);
					}

					// Change the reset function to a function highlighting the current frequency
					chart.pointer.reset = update_bode_tooltip;
                });
			};
	
	// Attach the new sync to the mousemove event handler
	for(var i = 0; i < bodePlot.children.length; i++)
	{ 
		bodePlot.children[i].onmousemove = sync;
	}
	
	update_bode_tooltip();
}

function update_bode_tooltip()
{
	
	if(bodeCharts)
	{
		var i = null;
		
		bodeCharts.forEach(function(graph) {
			if(!i)
			{
				// get point-index we want to select
				i = find_point_in_chart_series(sliderOmegaVal, graph.series[0].data);
			}
			
			// get the point on the actual graph
			var newPoint = graph.series[0].data[i];
			
			// fire MouseOver event for this point like we are really selecting this point
			newPoint.onMouseOver();
			
			//display tooltip around this point
			graph.tooltip.refresh(newPoint);
			
			//draw crosshair
			graph.xAxis[0].drawCrosshair(null, newPoint);
		});
	}
}

function submit_transfer_function()
{
	var arrayNumerator 		= document.getElementById('input-numerator').value.toString().split(/[,;:]+/);
	var arrayDenominator	= document.getElementById('input-denominator').value.toString().split(/[,;:]+/);
	
	// Remove possible empty string element on end
	if(arrayDenominator[arrayDenominator.length - 1] == "")
		arrayDenominator.pop();
	if(arrayNumerator[arrayNumerator.length -1] == "")
		arrayNumerator.pop();
	
	// Remove possible leading zeros
	while(arrayNumerator[0]=="0")
		arrayNumerator.shift();
	while(arrayDenominator[0]=="0")
		arrayDenominator.shift();
	
	// check for mistakes
	if( (arrayNumerator.length == 0) || (arrayDenominator.length==0) )
		{alert("Please fill in a transfer function. One or more boxes is empty.");return;}
	if( !(areAllNumbers(arrayNumerator) && areAllNumbers(arrayDenominator)) )
		{alert("Please fill in a correct transfer function according to the given syntax");return}
	if(arrayDenominator.length == 1 && arrayDenominator[0] == "0")
		{alert("Please do not devide by zero");return;}
	if(arrayDenominator.length < arrayNumerator.length)
		{alert("The order of the denominator should be greater than the order of the numerator.");return;}
	
	// convert array to numbers
	arrayNumerator		= arrayNumerator.map( function(el) { return parseFloat(el);});
	arrayDenominator	= arrayDenominator.map( function(el) { return parseFloat(el);});
	
	// Update everything
	dynSys		=	control.system.tf(arrayNumerator,arrayDenominator);
	
	// Check on unstable poles
	var poles = dynSys.getPoles();
	
	noUnstablePoles = true;
	for( var i = 0; (i < poles.length) && noUnstablePoles; i++)
	{
			if(math.complex(poles[i]).re >=0)
			{
				noUnstablePoles = false;
				alert("This transfer function contains poles in the right-half plane and/or poles on the imaginary axis.  This application only computes the output signal for stable systems.  Keep in mind that for unstable systems the transient response never dies out, and the output of the system goes to infinity.");
			}
	}
	
	update_tf(arrayNumerator, arrayDenominator);
	update_bode_plot();
	update_output_plot();
	update_output_formulas(false);
	
	// change the range from the sliders according to new plot
	var bodeChartRange = bodeCharts[0].xAxis[0].getExtremes();
	build_sliders( [bodeChartRange.dataMin, bodeChartRange.dataMax] );
}

/** Returns the index of the point closest to the given x-value
 *
 * @param{number} x_val - The abscis on the x-axis for which a point as close as possible has to be found
 *
 * @param{Array<Point>} data - the set of data in which the point has to be found
 *
 * @returns{number} index - the index in data of the closest point
 */
function find_point_in_chart_series(x_val, data) 
{
	var prev_distance = Infinity;
	var i = 0;
	// loop through data as long as distance to point is decreasing
	for(i = 0; i < data.length ; i++ )
	{
		var current_distance =  Math.abs(data[i].x - x_val);
		
		if(current_distance > prev_distance)
			break;
		else
			prev_distance = current_distance;
	}
	
	return i - 1;
}

function update_output_formulas(first_load)
{
	//if(typeof(first_load)==undefined) console.warn("update_output_formulas: first_load argument is undefined")
		
	var get_output_formulas = function(withLatexDolars) {
			if (typeof(withLatexDolars)==='undefined') withLatexDolars = true;
			var latexDolars = function() { return withLatexDolars? "$$" : ""};
			
			// Fill in the Latex
			var nb_print = function(nb)	{
												switch(nb)
												{
													case -1:
														return "-";
													case 1:
														return "";
													default:
														return nb;
												}
										};
			var latexSine = function(amp,phaseSft) 	{
														return "" + nb_print(amp) + "\sin{(" + nb_print(sliderOmegaVal) + "t" +
															( (phaseSft == 0)? "" : 
																( ( (phaseSft < 0)? "" : "+") + phaseSft) ) 
															+ ")}" ;
													};
			var inputFormulaLatexStr= latexDolars() + "u(t) = " + latexSine(sliderAmpVal, 0) + latexDolars();
			
			var polarGain = get_polar_gain(dynSys, sliderOmegaVal);
			var outputFormulaLatexStr =  latexDolars() + 
											(
												(noUnstablePoles)?
													("y(t) = " + latexSine( (sliderAmpVal*polarGain.r).toFixed(2), polarGain.phi.toFixed(2)) ):"None" 
											)
										+ latexDolars();
			
			return [inputFormulaLatexStr, outputFormulaLatexStr]
		};


	if(first_load)
	{
		var outputFormulas = get_output_formulas();
	}
	else
	{
		var outputFormulas = get_output_formulas(false);
		
		var mathInput = MathJax.Hub.getAllJax("output-input-formula")[0];
		MathJax.Hub.Queue(["Text", mathInput, outputFormulas[0]]);
		
		var mathOutput = MathJax.Hub.getAllJax("output-output-formula")[0];
		MathJax.Hub.Queue(["Text", mathOutput, outputFormulas[1]]);
	}
}

function get_output_formulas(withLatexDollars)
{
	if (typeof(withLatexDollars)==='undefined') withLatexDollars = true;
	var latexDollars = function() { return withLatexDollars? "$$" : ""};
	
	// Fill in the Latex
	var nb_print = function(nb)	{
										switch(nb)
										{
											case -1:
												return "-";
											case 1:
												return "";
											default:
												return nb;
										}
								};
	var latexSine = function(amp,phaseSft) 	{
												return "" + nb_print(amp) + "\sin{(" + nb_print(sliderOmegaVal) + "t" +
													( (phaseSft == 0)? "" : 
														( ( (phaseSft < 0)? "" : "+") + phaseSft) ) 
													+ ")}" ;
											};
	var inputFormulaLatexStr= latexDollars() + "u(t) = " + latexSine(sliderAmpVal, 0) + latexDollars();
	
	var polarGain = get_polar_gain(dynSys, sliderOmegaVal);
	var outputFormulaLatexStr =  latexDollars() +
									(
										(noUnstablePoles)?
											("y(t) = " + latexSine( (sliderAmpVal*polarGain.r).toFixed(2), polarGain.phi.toFixed(2)) ):"None" 
									)
								+ latexDollars();
	
	return [inputFormulaLatexStr, outputFormulaLatexStr]
}

function build_sliders(omega_range)
{
	// Destroy old sliders if necessary
	if(sliderAmplitude.noUiSlider)
		sliderAmplitude.noUiSlider.destroy();
	if(sliderFrequency.noUiSlider)
		sliderFrequency.noUiSlider.destroy();
	
	// create the sliders
	noUiSlider.create(sliderAmplitude, 
	{
		start: [ sliderAmpVal ],
		step: 0.01,
		pips: 
		{
			mode: 'count',
			values: 5,
			density: 5
		},
		range: 
		{
			'min': [  0 ],
			'max': [ 10 ]
		}
	});
	noUiSlider.create(sliderFrequency, 
	{
		start: [ math.log(sliderOmegaVal,10) ],
		step: 0.01,
		pips: 
		{
			mode: 'count',
			density: 10,
			values:	 5,
			format: 
			{
				to: function ( value ) {
					return math.round(math.pow(10,value),4);
					},
				// from: function ( value ) {
					// return value.replace(',-', '');
					// }
			}
		},
		range: 
		{
			// log scale
			'min': [ math.log(omega_range[0],10) ],
			'max': [ math.log(omega_range[1],10) ]
		}
	});
	
	// Attach necessary events
	sliderAmplitude.noUiSlider.on('update', function ( values, handle )
		{
			sliderAmpVal = parseFloat(values[handle]);
			document.getElementById('amplitude-value').innerHTML = values[handle];
			update_bode_tooltip();
			update_output_plot();
		});
	sliderAmplitude.noUiSlider.on('set', function()
		{
			update_output_formulas(false);
		});
	sliderFrequency.noUiSlider.on('update', function ( values, handle )
		{
			sliderOmegaVal = math.round(math.pow(10,parseFloat(values[handle])),3);
			// logarithmic
			document.getElementById('omega-value').innerHTML = sliderOmegaVal;
			update_bode_tooltip();
			update_output_plot();
		});
	sliderFrequency.noUiSlider.on('set', function()
	{
		update_output_formulas(false);
	});
}

window.onload = setup;