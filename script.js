const MODE_DRAW = 1;
const MODE_SELECT = 2;
const MODE_MOVE = 3;
const MODE_ERASE = 4;
let mode = MODE_DRAW;

const canvas = document.getElementById('myCanvas');
const canvas_context = canvas.getContext('2d');
let buttonIsDown = false;
let isSelecting = false;
let isErasing = false;
const eraseCircleRadius = 30;
const selectedStrokes = [];
let currentColor = '#000000';
const selectionRect = {};
const arrayOfStrokes = [];
let stroke = [];
const eraseCircle = { x: 0, y: 0 };

function eraseStrokesInCircle(x, y) {
	for (let i = arrayOfStrokes.length - 1; i >= 0; i--) {
		const stroke = arrayOfStrokes[i];
		for (let j = stroke.length - 1; j >= 0; j--) {
			const point = stroke[j];
			const distance = Math.sqrt(
				Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2),
			);
			if (distance <= eraseCircleRadius) {
				arrayOfStrokes.splice(i, 1);
				break;
			}
		}
	}
	redraw();
}

function mouseDownHandler(e) {
	const canvas_rectangle = canvas.getBoundingClientRect();
	const event_x = e.clientX - canvas_rectangle.left;
	const event_y = e.clientY - canvas_rectangle.top;
	let lastMouseX = event_x;
	let lastMouseY = event_y;
	buttonIsDown = true;

	switch (mode) {
		case MODE_DRAW:
			deselect();
			isDrawing = true;
			isMoving = false;
			isSelecting = false;
			stroke = [];
			stroke.push({ x: event_x, y: event_y, color: currentColor });
			break;

		case MODE_SELECT:
			if (e.button === 1) {
				deselect();
			}
			isSelecting = true;
			selectionRect.startX = event_x;
			selectionRect.startY = event_y;
			selectionRect.endX = event_x;
			selectionRect.endY = event_y;
			break;

		case MODE_ERASE:
			deselect();
			isMoving = false;
			isErasing = true;
			eraseCircle.x = event_x;
			eraseCircle.y = event_y;
			eraseStrokesInCircle(event_x, event_y);
			redraw();
			break;

		case MODE_MOVE:
			break;
	}

	mouse_previous_x = event_x;
	mouse_previous_y = event_y;
}

function mouseMoveHandler(e) {
	const canvas_rectangle = canvas.getBoundingClientRect();
	const event_x = e.clientX - canvas_rectangle.left;
	const event_y = e.clientY - canvas_rectangle.top;

	switch (mode) {
		case MODE_DRAW:
			if (buttonIsDown) {
				stroke.push({ x: event_x, y: event_y, color: currentColor });
				redraw();
			}
			break;

		case MODE_ERASE:
			isErasing = true;
			eraseCircle.x = event_x;
			eraseCircle.y = event_y;
			if (buttonIsDown) {
				eraseStrokesInCircle(event_x, event_y);
			}
			redraw();
			break;

		case MODE_SELECT:
			if (isSelecting) {
				selectionRect.endX = event_x;
				selectionRect.endY = event_y;
				redraw();
			}
			break;

		case MODE_MOVE:
			if (buttonIsDown && selectedStrokes.length > 0) {
				moveSelectedStrokes(
					event_x - mouse_previous_x,
					event_y - mouse_previous_y,
				);
				redraw();
			}
			break;
	}

	if (!isSelecting) {
		redraw();
	}
	mouse_previous_x = event_x;
	mouse_previous_y = event_y;
}

function mouseUpHandler(e) {
	buttonIsDown = false;
	const canvas_rectangle = canvas.getBoundingClientRect();
	const event_x = e.clientX - canvas_rectangle.left;
	const event_y = e.clientY - canvas_rectangle.top;

	switch (mode) {
		case MODE_DRAW:
			if (stroke.length > 2) {
				arrayOfStrokes.push(stroke);
			}
			stroke = [];
			break;

		case MODE_SELECT:
			if (isSelecting) {
				selectStrokesInRectangle();
				isSelecting = false;
			}
			break;

		case MODE_MOVE:
			break;
	}

	if (isErasing) {
		isErasing = false;
		redraw();
	}

	if (mode !== MODE_ERASE && mode !== MODE_DRAW) {
		redraw();
	}

	mouse_previous_x = event_x;
	mouse_previous_y = event_y;
}

canvas.addEventListener('mousedown', mouseDownHandler);
canvas.addEventListener('mouseup', mouseUpHandler);
canvas.addEventListener('mousemove', mouseMoveHandler);

function drawStroke(s) {
	if (s.length !== 0) {
		canvas_context.beginPath();
		for (let i = 0; i < s.length; ++i) {
			const x = s[i].x;
			const y = s[i].y;
			const color = s[i].color;
			canvas_context.strokeStyle = color;
			if (i === 0) {
				canvas_context.moveTo(x, y);
			} else {
				canvas_context.lineTo(x, y);
			}
		}
		canvas_context.stroke();
	}
}

const redraw = () => {
	canvas_context.clearRect(0, 0, canvas.width, canvas.height);

	canvas_context.strokeStyle = '#000000';
	for (let i = 0; i < arrayOfStrokes.length; ++i) {
		drawStroke(arrayOfStrokes[i]);
	}

	if (buttonIsDown) {
		canvas_context.strokeStyle = currentColor;
		drawStroke(stroke);
	}

	if (isSelecting) {
		canvas_context.strokeStyle = 'black';
		canvas_context.fillStyle = 'transparent';
		canvas_context.beginPath();
		canvas_context.rect(
			selectionRect.startX,
			selectionRect.startY,
			selectionRect.endX - selectionRect.startX,
			selectionRect.endY - selectionRect.startY,
		);
		canvas_context.fill();
		canvas_context.stroke();
	}

	if (isErasing) {
		drawEraseCircle();
	}

	drawSelectedStrokes();
};

const drawEraseCircle = () => {
	canvas_context.strokeStyle = 'black';
	canvas_context.beginPath();
	canvas_context.arc(
		eraseCircle.x,
		eraseCircle.y,
		eraseCircleRadius,
		0,
		2 * Math.PI,
	);
	canvas_context.stroke();
};

redraw();

const setMode = (m) => {
	mode = m;
	isErasing = m === MODE_ERASE;
	redraw();
};

function selectStrokesInRectangle() {
	selectedStrokes.length = 0;
	for (let i = 0; i < arrayOfStrokes.length; ++i) {
		const stroke = arrayOfStrokes[i];
		let fullyInside = true;
		for (let j = 0; j < stroke.length; j++) {
			const point = stroke[j];
			if (
				point.x < selectionRect.startX ||
				point.x > selectionRect.endX ||
				point.y < selectionRect.startY ||
				point.y > selectionRect.endY
			) {
				fullyInside = false;
				break;
			}
		}
		if (fullyInside) {
			selectedStrokes.push(stroke);
		}
	}
	redraw();
}

function drawSelectedStrokes() {
	if (selectedStrokes.length > 0) {
		for (let i = 0; i < selectedStrokes.length; ++i) {
			canvas_context.strokeStyle = selectedStrokes[i][0].color;
			canvas_context.shadowColor = 'black';
			canvas_context.shadowBlur = 10;
			drawStroke(selectedStrokes[i]);
			canvas_context.shadowBlur = 0;
		}
	}
}

function moveSelectedStrokes(dx, dy) {
	if (selectedStrokes.length > 0) {
		for (let i = 0; i < selectedStrokes.length; i++) {
			const stk = selectedStrokes[i];
			for (let j = 0; j < stk.length; j++) {
				stk[j].x += dx;
				stk[j].y += dy;
			}
		}
	}
}

function deselect() {
	selectedStrokes.length = 0;
	redraw();
}

function clearButtonHandler() {
	arrayOfStrokes.length = 0;
	selectedStrokes.length = 0;
	redraw();
}

function setColor(color) {
	currentColor = color;
}
