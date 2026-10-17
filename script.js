
const expressionDisplay = document.getElementById("expression");
const resultDisplay = document.getElementById("result");
const buttons = document.querySelector(".buttons");

let expression = "";
let justCalculated = false;
let hasError = false;

// Convert internal operators into display symbols
function formatExpression(value) {
    return value
        .replace(/\*/g, " × ")
        .replace(/\//g, " ÷ ")
        .replace(/\+/g, " + ")
        .replace(/-/g, " − ")
        .replace(/%/g, "%");
}

// Format decimal results without floating-point noise
function formatNumber(number) {
    if (!Number.isFinite(number)) {
        throw new Error("Invalid result");
    }

    if (Math.abs(number) > 1e15) {
        return number.toExponential(6);
    }

    return String(Number(number.toPrecision(12)));
}

// Safely tokenize and evaluate arithmetic expressions.
// No eval() or Function() is used.
function calculate(input) {
    const tokens = input.match(
        /(?:\d+\.?\d*|\.\d+)|[+\-*/%]/g
    );

    if (!tokens || tokens.join("") !== input) {
        throw new Error("Invalid expression");
    }

    let position = 0;

    function parseUnary() {
        const token = tokens[position];

        if (token === "+") {
            position++;
            return parseUnary();
        }

        if (token === "-") {
            position++;
            return -parseUnary();
        }

        return parsePrimary();
    }

    function parsePrimary() {
        const token = tokens[position];

        if (!token || !/^(?:\d+\.?\d*|\.\d+)$/.test(token)) {
            throw new Error("Expected a number");
        }

        position++;
        let value = Number(token);

        // Percentage: 50% becomes 0.5
        while (tokens[position] === "%") {
            value /= 100;
            position++;
        }

        return value;
    }

    function parseTerm() {
        let value = parseUnary();

        while (
            tokens[position] === "*" ||
            tokens[position] === "/"
        ) {
            const operator = tokens[position++];
            const right = parseUnary();

            if (operator === "/" && right === 0) {
                throw new Error("Cannot divide by zero");
            }

            value = operator === "*"
                ? value * right
                : value / right;
        }

        return value;
    }

    function parseExpression() {
        let value = parseTerm();

        while (
            tokens[position] === "+" ||
            tokens[position] === "-"
        ) {
            const operator = tokens[position++];
            const right = parseTerm();

            value = operator === "+"
                ? value + right
                : value - right;
        }

        return value;
    }

    const answer = parseExpression();

    if (position !== tokens.length || !Number.isFinite(answer)) {
        throw new Error("Invalid expression");
    }

    return answer;
}

// Update the screen and show a live result
function updateDisplay() {
    expressionDisplay.textContent =
        expression ? formatExpression(expression) : "0";

    if (!expression) {
        resultDisplay.textContent = "0";
        hasError = false;
        return;
    }

    try {
        const answer = calculate(expression);
        resultDisplay.textContent = formatNumber(answer);
        hasError = false;
    } catch {
        resultDisplay.textContent = "—";
        hasError = true;
    }
}

// Add a number or arithmetic operator
function appendValue(value) {
    if (justCalculated) {
        if (/[0-9.]/.test(value)) {
            expression = "";
        }

        justCalculated = false;
    }

    // Prevent consecutive operators
    if (/[+\-*/]/.test(value)) {
        if (!expression && value !== "-") return;

        if (/[+\-*/]$/.test(expression)) {
            expression = expression.slice(0, -1);
        }

        expression += value;
        updateDisplay();
        return;
    }

    // Prevent leading zeros such as 0007
    if (/^\d$/.test(value)) {
        const match = expression.match(/(?:^|[+\-*/])(-?\d*\.?\d*)$/);
        const currentNumber = match ? match[1] : "";

        if (currentNumber === "0") {
            expression = expression.slice(0, -1) + value;
            updateDisplay();
            return;
        }

        if (currentNumber === "-0") {
            expression = expression.slice(0, -1) + value;
            updateDisplay();
            return;
        }
    }

    expression += value;
    updateDisplay();
}

// Add a decimal point to the current number
function addDecimal() {
    if (justCalculated) {
        expression = "";
        justCalculated = false;
    }

    const match = expression.match(/(?:^|[+\-*/])(-?\d*\.?\d*)$/);
    const currentNumber = match ? match[1] : "";

    if (currentNumber.includes(".")) return;

    if (!currentNumber || currentNumber === "-") {
        expression += "0.";
    } else {
        expression += ".";
    }

    updateDisplay();
}

// Clear the entire calculation
function clearCalculator() {
    expression = "";
    justCalculated = false;
    hasError = false;
    updateDisplay();
}

// Delete the last character
function deleteLast() {
    if (justCalculated) {
        clearCalculator();
        return;
    }

    expression = expression.slice(0, -1);
    updateDisplay();
}

// Add percentage to the current number
function addPercent() {
    if (justCalculated) {
        expression = resultDisplay.textContent;
        justCalculated = false;
    }

    if (/[0-9]$/.test(expression)) {
        expression += "%";
        updateDisplay();
    }
}

// Toggle the sign of the current number
function toggleSign() {
    if (justCalculated) {
        expression = resultDisplay.textContent;
        justCalculated = false;
    }

    const match = expression.match(/(?:^|[+*/-])(\d*\.?\d+)%?$/);

    if (!match) return;

    const number = match[1];
    const start = expression.length - match[0].length;
    const prefix = expression.slice(0, start);

    // If the number follows + or -, preserve the binary operator.
    // A minus directly before the number is toggled.
    if (prefix.endsWith("-")) {
        expression = prefix.slice(0, -1) + number;
    } else {
        expression = prefix + "-" + number;
    }

    updateDisplay();
}

// Calculate and keep the answer
function calculateResult() {
    if (!expression) return;

    try {
        const answer = calculate(expression);

        expression = formatNumber(answer);
        expressionDisplay.textContent = "Result";
        resultDisplay.textContent = expression;

        justCalculated = true;
        hasError = false;
    } catch {
        expressionDisplay.textContent = "Calculation error";
        resultDisplay.textContent = "Error";
        hasError = true;
        justCalculated = true;
    }
}

// Handle all calculator button clicks
buttons.addEventListener("click", event => {
    const button = event.target.closest("button");

    if (!button) return;

    if (button.dataset.value !== undefined) {
        appendValue(button.dataset.value);
        return;
    }

    switch (button.dataset.action) {
        case "clear":
            clearCalculator();
            break;
        case "delete":
            deleteLast();
            break;
        case "decimal":
            addDecimal();
            break;
        case "percent":
            addPercent();
            break;
        case "sign":
            toggleSign();
            break;
        case "equals":
            calculateResult();
            break;
    }
});

// Keyboard support
document.addEventListener("keydown", event => {
    const key = event.key;

    if (/^\d$/.test(key)) {
        appendValue(key);
    } else if (key === ".") {
        addDecimal();
    } else if (["+", "-", "*", "/"].includes(key)) {
        appendValue(key);
    } else if (key === "%") {
        addPercent();
    } else if (key === "Enter" || key === "=") {
        event.preventDefault();
        calculateResult();
    } else if (key === "Backspace") {
        deleteLast();
    } else if (key === "Escape" || key === "Delete") {
        clearCalculator();
    }
});

// Initial screen
updateDisplay();
