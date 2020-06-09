var points = []
var error = false
var slider = null
var input = null

function onTfChange() {
	// Create transfer function
	let  tf = input.value()
	tf = "G(w)=" + tf.replace(/s/g, '(i*w)')

	// Try to parse
	let G
	try {
		G = math.evaluate(tf)
		G(0)
	} catch(e) {
		error = true
		redraw()
		return
	}
	error = false

	// Calc points
	let w = 0
	let step = 0.01
	points = []
	while (w < 100) {
		const point = G(w)
		points.push([point.re, point.im])
		w += step
		step *= 1.1
	}

	// Scale
	// TODO: Doesn't work well with plots comming from or going to infinity
	//const maxX = math.max(points.map(([x, y]) => math.abs(x)))
	//const maxY = math.max(points.map(([x, y]) => math.abs(y)))
	//const factor = 0.95 * math.min(width / (2 * maxX), height / (2 * maxY))
	//points = points.map(([x, y]) => [x*factor, y*factor])

	const factor = slider ? slider.value()**2 : 500
	points = points.map(([x, y]) => [x*factor, y*factor])

	// And draw!
	redraw()
}

function setup() {
	// Setup canvas
	createCanvas(800, 800)

	// Setup DOM
	const defaultValue = "(s-2)/((s+3)(s+1))"
	input = createInput(defaultValue)
	input.input(onTfChange)
	input.position(10, 20)
	onTfChange()

	slider = createSlider(1, 100, 22)
	slider.input(onTfChange)
	slider.position(10, 50)

	noLoop()
}

function draw() {
	// Setup and set origin to canvas center
	clear()
	smooth()
	textFont('Helvetica')
	textSize(16)
	translate(width / 2, height / 2)

	// Draw axes
	stroke(0, 0, 0)
	fill(0, 0, 0)
	line(-width/2, 0, width/2, 0)
	line(0, -height/2, 0, height/2)
	textAlign(LEFT, TOP)
	text('Im', 5, -height/2)
	textAlign(RIGHT, BOTTOM)
	text('Re', width/2, 0)

	// Error message
	if (error || points.length < 3) {
		textAlign(CENTER, BOTTOM)
		stroke(0, 0, 0)
		fill(200, 0, 0)
		text("Invalid transfer function", 0, 0)
	}

	// Draw plot
	scale(1, -1)
	stroke(200, 0, 0)
	noFill()
	beginShape()
	for (let [x, y] of points) {
		vertex(x, y)
	}
	endShape()

	// Draw direction
	const midIdx = math.round(points.length / 2)
	const [x1, y1] = points[midIdx]
	const [x2, y2] = points[midIdx+1]
	const alpha = math.atan((y2-y1) / (x2-x1))
	translate(x1, y1)
	rotate(alpha - 0.5*PI)

	fill(200, 0, 0)
	beginShape()
	vertex(-10, 0)
	vertex(10, 0)
	vertex(10, 0)
	vertex(0, 10)
	endShape()
}
