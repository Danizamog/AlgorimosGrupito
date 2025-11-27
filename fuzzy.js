// Fuzzy Logic System Implementation - Enhanced Version
class FuzzyInferenceSystem {
    constructor(name = 'fuzzy_system') {
        this.name = name;
        this.type = 'mamdani';
        this.andMethod = 'min';
        this.orMethod = 'max';
        this.defuzzMethod = 'centroid';
        this.impMethod = 'min';
        this.aggMethod = 'max';
        this.inputs = [];
        this.outputs = [];
        this.rules = [];
    }

    addInputVariable(name, range = [0, 10]) {
        const variable = {
            name: name,
            range: range,
            membershipFunctions: [],
            value: (range[0] + range[1]) / 2
        };
        this.inputs.push(variable);
        return variable;
    }

    addOutputVariable(name, range = [0, 10]) {
        const variable = {
            name: name,
            range: range,
            membershipFunctions: [],
            value: 0
        };
        this.outputs.push(variable);
        return variable;
    }

    addMembershipFunction(variable, name, type, params) {
        const mf = {
            name: name,
            type: type,
            params: params
        };
        variable.membershipFunctions.push(mf);
        return mf;
    }

    removeMembershipFunction(variable, mfName) {
        variable.membershipFunctions = variable.membershipFunctions.filter(mf => mf.name !== mfName);
    }

    addRule(antecedent, consequent, weight = 1) {
        const rule = {
            antecedent: antecedent,
            consequent: consequent,
            weight: weight
        };
        this.rules.push(rule);
        return rule;
    }

    removeRule(ruleIndex) {
        this.rules.splice(ruleIndex, 1);
    }

    calculateMembership(x, mf) {
        switch (mf.type) {
            case 'trimf':
                return this.trimf(x, mf.params[0], mf.params[1], mf.params[2]);
            case 'trapmf':
                return this.trapmf(x, mf.params[0], mf.params[1], mf.params[2], mf.params[3]);
            case 'gaussmf':
                return this.gaussmf(x, mf.params[0], mf.params[1]);
            case 'gbellmf':
                return this.gbellmf(x, mf.params[0], mf.params[1], mf.params[2]);
            case 'sigmf':
                return this.sigmf(x, mf.params[0], mf.params[1]);
            default:
                return 0;
        }
    }

    trimf(x, a, b, c) {
        if (x <= a || x >= c) return 0;
        if (x === b) return 1;
        if (x < b) return (x - a) / (b - a);
        return (c - x) / (c - b);
    }

    trapmf(x, a, b, c, d) {
        if (x <= a || x >= d) return 0;
        if (x >= b && x <= c) return 1;
        if (x > a && x < b) return (x - a) / (b - a);
        if (x > c && x < d) return (d - x) / (d - c);
        return 0;
    }

    gaussmf(x, mean, sigma) {
        return Math.exp(-Math.pow((x - mean) / sigma, 2) / 2);
    }

    gbellmf(x, a, b, c) {
        return 1 / (1 + Math.pow(Math.abs((x - c) / a), 2 * b));
    }

    sigmf(x, a, c) {
        return 1 / (1 + Math.exp(-a * (x - c)));
    }

    fuzzify(variable, value) {
        const memberships = {};
        const details = [];
        variable.membershipFunctions.forEach((mf) => {
            const degree = this.calculateMembership(value, mf);
            memberships[mf.name] = degree;
            if (degree > 0.01) {
                details.push({
                    name: mf.name,
                    degree: degree
                });
            }
        });
        return { memberships, details };
    }

    evaluate(inputValues) {
        const results = {};
        const details = {
            inputs: {},
            rules: [],
            outputs: {}
        };

        for (const output of this.outputs) {
            results[output.name] = 0;
            details.outputs[output.name] = [];
        }

        for (const input of this.inputs) {
            input.value = inputValues[input.name] || input.range[0];
            details.inputs[input.name] = this.fuzzify(input, input.value);
        }

        for (let ruleIndex = 0; ruleIndex < this.rules.length; ruleIndex++) {
            const rule = this.rules[ruleIndex];
            let antecedentValue = this.evaluateAntecedent(rule.antecedent);
            antecedentValue *= rule.weight;

            details.rules.push({
                index: ruleIndex,
                antecedent: rule.antecedent,
                consequent: rule.consequent,
                activation: antecedentValue
            });

            for (const consequence of rule.consequent) {
                const outputName = consequence[0];
                const mfName = consequence[1];
                const outputVar = this.outputs.find(o => o.name === outputName);
                const mf = outputVar.membershipFunctions.find(m => m.name === mfName);

                if (!details.outputs[outputName]) {
                    details.outputs[outputName] = [];
                }

                details.outputs[outputName].push({
                    mfName: mfName,
                    activation: antecedentValue
                });
            }
        }

        for (const output of this.outputs) {
            output.value = this.defuzzify(output, details.outputs[output.name]);
            results[output.name] = output.value;
        }

        return { results, details };
    }

    evaluateAntecedent(antecedent) {
        let result = 1;
        let operator = 'and';

        for (const term of antecedent) {
            const inputName = term[0];
            const mfName = term[1];
            const op = term[2] || 'and';

            const inputVar = this.inputs.find(i => i.name === inputName);
            const mf = inputVar.membershipFunctions.find(m => m.name === mfName);
            const degree = this.calculateMembership(inputVar.value, mf);

            if (operator === 'and') {
                result = Math.min(result, degree);
            } else if (operator === 'or') {
                result = Math.max(result, degree);
            }

            operator = op;
        }

        return result;
    }

    defuzzify(variable, ruleOutputs) {
        let numerator = 0;
        let denominator = 0;

        const resolution = 100;
        const step = (variable.range[1] - variable.range[0]) / resolution;

        for (let i = 0; i <= resolution; i++) {
            const x = variable.range[0] + i * step;
            let membershipDegree = 0;

            for (const ruleOutput of ruleOutputs) {
                const mf = variable.membershipFunctions.find(m => m.name === ruleOutput.mfName);
                const mfDegree = this.calculateMembership(x, mf);
                const clipped = Math.min(mfDegree, ruleOutput.activation);
                membershipDegree = Math.max(membershipDegree, clipped);
            }

            numerator += x * membershipDegree;
            denominator += membershipDegree;
        }

        return denominator === 0 ? variable.range[0] : numerator / denominator;
    }

    findActiveMemberships(variable, value, threshold = 0.01) {
        return variable.membershipFunctions
            .map(mf => ({
                name: mf.name,
                degree: this.calculateMembership(value, mf)
            }))
            .filter(m => m.degree >= threshold);
    }

    generateSurfaceData(inputX, inputY, output, resolution = 20) {
        const step = (inputX.range[1] - inputX.range[0]) / resolution;
        const step2 = (inputY.range[1] - inputY.range[0]) / resolution;

        const xValues = [];
        const yValues = [];
        const zValues = [];

        for (let i = 0; i <= resolution; i++) {
            const x = inputX.range[0] + i * step;
            xValues.push(x);

            yValues.push([]);
            zValues.push([]);

            for (let j = 0; j <= resolution; j++) {
                const y = inputY.range[0] + j * step2;

                if (i === 0) yValues[i].push(y);

                const result = this.evaluate({
                    [inputX.name]: x,
                    [inputY.name]: y
                });

                zValues[i].push(result.results[output.name]);
            }
        }

        return { x: xValues, y: yValues[0], z: zValues };
    }
}

let fcurrentFIS = new FuzzyInferenceSystem('temperature_control');
let fselectedVariable = null;
let fselectedMF = null;
let fdraggablePoints = [];
let fcurrentDraggedPoint = null;
let fselectedRuleViewerIndex = null;

// Utility: global hex->rgba helper (used by multiple viewers)
function hexToRgba(hex, alpha = 0.25) {
    const h = hex.replace('#', '');
    const bigint = parseInt(h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function finitializeApp() {
    // Clear existing data
    fcurrentFIS.inputs = [];
    fcurrentFIS.outputs = [];
    fcurrentFIS.rules = [];

    // Add input variable: Temperature
    const temp = fcurrentFIS.addInputVariable('temperature', [0, 100]);
    fcurrentFIS.addMembershipFunction(temp, 'cold', 'trimf', [0, 0, 30]);
    fcurrentFIS.addMembershipFunction(temp, 'warm', 'trimf', [20, 50, 80]);
    fcurrentFIS.addMembershipFunction(temp, 'hot', 'trimf', [70, 100, 100]);

    // Add input variable: Humidity
    const humidity = fcurrentFIS.addInputVariable('humidity', [0, 100]);
    fcurrentFIS.addMembershipFunction(humidity, 'low', 'trimf', [0, 0, 40]);
    fcurrentFIS.addMembershipFunction(humidity, 'medium', 'trimf', [30, 50, 70]);
    fcurrentFIS.addMembershipFunction(humidity, 'high', 'trimf', [60, 100, 100]);

    // Add output variable: Fan Speed
    const fanSpeed = fcurrentFIS.addOutputVariable('fan_speed', [0, 100]);
    fcurrentFIS.addMembershipFunction(fanSpeed, 'slow', 'trimf', [0, 0, 33]);
    fcurrentFIS.addMembershipFunction(fanSpeed, 'medium', 'trimf', [20, 50, 80]);
    fcurrentFIS.addMembershipFunction(fanSpeed, 'fast', 'trimf', [67, 100, 100]);

    // Add sample rules
    fcurrentFIS.addRule(
        [['temperature', 'hot'], ['humidity', 'high', 'and']],
        [['fan_speed', 'fast']],
        1
    );

    fcurrentFIS.addRule(
        [['temperature', 'warm'], ['humidity', 'medium', 'and']],
        [['fan_speed', 'medium']],
        1
    );

    fcurrentFIS.addRule(
        [['temperature', 'cold'], ['humidity', 'low', 'and']],
        [['fan_speed', 'slow']],
        1
    );

    fselectedVariable = temp;
    fupdateFISEditor();
    fupdateMembershipFunctionEditor();
    fsetStatus('Fuzzy Logic System Ready - Click on variables to edit');
}

function fupdateFISEditor() {
    const inputVars = document.getElementById('finputVariables');
    const outputVars = document.getElementById('foutputVariables');

    inputVars.innerHTML = '';
    outputVars.innerHTML = '';

    fcurrentFIS.inputs.forEach((variable, index) => {
        const item = document.createElement('div');
        item.className = 'fvariable-item' + (fselectedVariable === variable ? ' selected' : '');
        item.textContent = `${variable.name} [${variable.range[0]}, ${variable.range[1]}]`;
        item.onclick = () => fselectVariable(variable, 'input');
        inputVars.appendChild(item);
    });

    fcurrentFIS.outputs.forEach((variable, index) => {
        const item = document.createElement('div');
        item.className = 'fvariable-item' + (fselectedVariable === variable ? ' selected' : '');
        item.textContent = `${variable.name} [${variable.range[0]}, ${variable.range[1]}]`;
        item.onclick = () => fselectVariable(variable, 'output');
        outputVars.appendChild(item);
    });

    fupdateCurrentVariableInfo();
    fupdateFISProperties();
}

function fupdateMembershipFunctionEditor() {
    const variableSelect = document.getElementById('fvariableSelect');
    variableSelect.innerHTML = '';

    fcurrentFIS.inputs.forEach(variable => {
        const option = document.createElement('option');
        option.value = variable.name + '_input';
        option.textContent = variable.name + ' (Input)';
        variableSelect.appendChild(option);
    });

    fcurrentFIS.outputs.forEach(variable => {
        const option = document.createElement('option');
        option.value = variable.name + '_output';
        option.textContent = variable.name + ' (Output)';
        variableSelect.appendChild(option);
    });

    if (fcurrentFIS.inputs.length > 0 && !fselectedVariable) {
        fselectedVariable = fcurrentFIS.inputs[0];
    }

    if (fselectedVariable) {
        const varType = fselectedVariable === fcurrentFIS.inputs.find(v => v === fselectedVariable) ? '_input' : '_output';
        variableSelect.value = fselectedVariable.name + varType;
    }

    fupdateMFChart();
    fupdateMFList();
}

function fupdateVariableRangeInputs() {
    if (fselectedVariable) {
        document.getElementById('frangeMin').value = fselectedVariable.range[0];
        document.getElementById('frangeMax').value = fselectedVariable.range[1];
    }
}

function fupdateVariableRange() {
    if (!fselectedVariable) return;

    const min = parseFloat(document.getElementById('frangeMin').value);
    const max = parseFloat(document.getElementById('frangeMax').value);

    if (min >= max) {
        fshowNotification('Error: Min must be less than Max');
        return;
    }

    const oldRange = [...fselectedVariable.range];
    fselectedVariable.range = [min, max];
    
    // Auto-ajustar MFs al nuevo rango
    fadjustMFsForRangeChange(fselectedVariable, oldRange, [min, max]);
    
    fupdateMFChart();
    fupdateFISEditor();
    fshowNotification(`Rango actualizado a [${min}, ${max}] - MFs ajustadas automáticamente`);
}

function fupdateMFChart() {
    if (!fselectedVariable) return;

    const mfChart = document.getElementById('fmfChart');
    document.getElementById('fmf-current-var').textContent = fselectedVariable.name;

    const traces = [];
    const colors = ['#0072BD', '#D95319', '#EDB120', '#7E2F8E', '#77AC30', '#4DBEEE', '#A2142F'];

    function hexToRgba(hex, alpha = 0.25) {
        const h = hex.replace('#', '');
        const bigint = parseInt(h, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    fselectedVariable.membershipFunctions.forEach((mf, index) => {
        const xValues = [];
        const yValues = [];
        const step = (fselectedVariable.range[1] - fselectedVariable.range[0]) / 100;

        for (let i = 0; i <= 100; i++) {
            const x = fselectedVariable.range[0] + i * step;
            const y = fcurrentFIS.calculateMembership(x, mf);
            xValues.push(parseFloat(x.toFixed(2)));
            yValues.push(parseFloat(y.toFixed(3)));
        }

        traces.push({
            x: xValues,
            y: yValues,
            name: mf.name,
            mode: 'lines',
            line: {
                color: colors[index % colors.length],
                width: 3,
                shape: 'spline'
            },
            fill: 'tozeroy',
            fillcolor: hexToRgba(colors[index % colors.length], 0.12),
            hovertemplate: `<b>%{text}</b><br>X: %{x:.2f}<br>μ: %{y:.3f}<extra></extra>`,
            text: Array(xValues.length).fill(mf.name)
        });
    });

    const layout = {
        title: {
            text: `${fselectedVariable.name} - Funciones de Membresía`,
            font: { size: 14, color: '#333', family: 'Segoe UI' }
        },
        xaxis: {
            range: [fselectedVariable.range[0], fselectedVariable.range[1]],
            title: { text: fselectedVariable.name, font: { size: 12 } },
            gridcolor: '#e8e8e8',
            showgrid: true,
            zeroline: false,
            showline: true,
            linewidth: 2,
            linecolor: '#333'
        },
        yaxis: {
            range: [-0.05, 1.15],
            title: { text: 'Grado de Membresía', font: { size: 12 } },
            gridcolor: '#e8e8e8',
            showgrid: true,
            zeroline: false,
            showline: true,
            linewidth: 2,
            linecolor: '#333'
        },
        margin: { t: 50, r: 30, b: 60, l: 70 },
        showlegend: true,
        legend: { 
            x: 0.02, 
            y: 0.98, 
            bgcolor: 'rgba(255,255,255,0.98)',
            bordercolor: '#ccc',
            borderwidth: 1
        },
        plot_bgcolor: '#fafafa',
        paper_bgcolor: '#fff',
        hovermode: 'closest',
        hoverlabel: { bgcolor: '#111', font: { color: '#fff' } },
        autosize: true
    };

    const config = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d', 'autoScale2d']
    };

    Plotly.newPlot(mfChart, traces, layout, config).then(() => {
        // Improve hover feedback: show coordinates in status bar
        try {
            mfChart.on('plotly_hover', (data) => {
                if (data && data.points && data.points[0]) {
                    const pt = data.points[0];
                    const x = pt.x;
                    const y = pt.y;
                    const msg = `${fselectedVariable.name} = ${x.toFixed(2)} | μ = ${y.toFixed(3)}`;
                    const coord = `X: ${x.toFixed(2)}, μ: ${y.toFixed(3)}`;
                    const msgEl = document.getElementById('fstatusMessage');
                    const coordEl = document.getElementById('fcoordInfo');
                    if (msgEl) msgEl.textContent = msg;
                    if (coordEl) coordEl.textContent = coord;
                }
            });

            mfChart.on('plotly_unhover', () => {
                const msgEl = document.getElementById('fstatusMessage');
                const coordEl = document.getElementById('fcoordInfo');
                if (msgEl) msgEl.textContent = 'Hover over the plot to see coordinates';
                if (coordEl) coordEl.textContent = 'X: N/A, Y: N/A';
            });
        } catch (e) {
            // ignore if Plotly events not supported in older builds
        }
    });
    
    setTimeout(() => {
        fmakePointsDraggable();
    }, 100);
}

function fmakePointsDraggable() {
    const overlay = document.getElementById('fmfPointsOverlay');
    overlay.innerHTML = '';
    fdraggablePoints = [];

    if (!fselectedVariable) return;

    const mfChart = document.getElementById('fmfChart');
    if (!mfChart || !mfChart._fullLayout) return;

    const fullLayout = mfChart._fullLayout;
    const xAxis = fullLayout.xaxis;
    const yAxis = fullLayout.yaxis;
    const plotArea = fullLayout.plot;

    if (!plotArea) return;

    const colors = ['#0072BD', '#D95319', '#EDB120', '#7E2F8E', '#77AC30', '#4DBEEE', '#A2142F'];
    const [min, max] = fselectedVariable.range;

    fselectedVariable.membershipFunctions.forEach((mf, mfIndex) => {
        const color = colors[mfIndex % colors.length];
        let paramPositions = [];

        if (mf.type === 'trimf' && mf.params.length === 3) {
            paramPositions = [
                { x: mf.params[0], y: 0, label: 'izq' },
                { x: mf.params[1], y: 1, label: 'pico' },
                { x: mf.params[2], y: 0, label: 'der' }
            ];
        } else if (mf.type === 'trapmf' && mf.params.length === 4) {
            paramPositions = [
                { x: mf.params[0], y: 0, label: 'a' },
                { x: mf.params[1], y: 1, label: 'b' },
                { x: mf.params[2], y: 1, label: 'c' },
                { x: mf.params[3], y: 0, label: 'd' }
            ];
        } else if (mf.type === 'gaussmf' && mf.params.length === 2) {
            // Parameters are [mean, sigma]
            const mean = mf.params[0];
            const sigma = Math.abs(mf.params[1]) || ((fselectedVariable.range[1] - fselectedVariable.range[0]) / 10);
            paramPositions = [
                { x: mean - sigma, y: 0.6, label: 'σ-' },
                { x: mean, y: 1, label: 'μ' },
                { x: mean + sigma, y: 0.6, label: 'σ+' }
            ];
        } else if (mf.type === 'gbellmf' && mf.params.length === 3) {
            paramPositions = [
                { x: mf.params[2] - mf.params[0]/2, y: 0.5, label: 'a' },
                { x: mf.params[2], y: 1, label: 'c' },
                { x: mf.params[2] + mf.params[0]/2, y: 0.5, label: 'a' }
            ];
        } else if (mf.type === 'sigmf' && mf.params.length === 2) {
            paramPositions = [{ x: mf.params[1], y: 0.5, label: 'c' }];
        }

        paramPositions.forEach((pos, paramIndex) => {
            const xPixel = xAxis.l2p(pos.x);
            const yPixel = yAxis.l2p(pos.y);

            if (isNaN(xPixel) || isNaN(yPixel)) return;

            const point = document.createElement('div');
            point.className = 'fdraggable-point';
            point.style.left = (plotArea.x[0] + xPixel) + 'px';
            point.style.top = (plotArea.y[0] + yPixel) + 'px';
            point.style.backgroundColor = color;
            point.style.pointerEvents = 'all';
            point.dataset.mfIndex = mfIndex;
            point.dataset.paramIndex = paramIndex;
            point.dataset.mfName = mf.name;
            point.dataset.mfType = mf.type;
            point.title = `${mf.name} - ${pos.label}: ${pos.x.toFixed(2)}`;

            const label = document.createElement('div');
            label.className = 'fpoint-label';
            label.textContent = `${pos.x.toFixed(1)}`;
            point.appendChild(label);

            // Use pointer events for broader device support and more reliable dragging
            point.addEventListener('pointerdown', fstartDrag);
            // pointer events for touch and pen
            point.addEventListener('pointerdown', fstartDrag);
            point.addEventListener('mouseenter', () => {
                point.style.transform = 'translate(-50%, -50%) scale(1.5)';
            });
            point.addEventListener('mouseleave', () => {
                if (point !== fcurrentDraggedPoint) {
                    point.style.transform = 'translate(-50%, -50%) scale(1)';
                }
            });

            overlay.appendChild(point);
            fdraggablePoints.push(point);
        });
    });
}

function fstartDrag(e) {
    // Pointer-based dragging for better device compatibility
    e.preventDefault();
    e.stopPropagation();

    fcurrentDraggedPoint = e.currentTarget.closest('.fdraggable-point') || e.target.closest('.fdraggable-point');
    if (!fcurrentDraggedPoint) return;

    const pointerId = e.pointerId;
    fcurrentDraggedPoint.setPointerCapture && fcurrentDraggedPoint.setPointerCapture(pointerId);
    fcurrentDraggedPoint.style.transform = 'translate(-50%, -50%) scale(1.8)';
    fcurrentDraggedPoint.classList.add('dragging');

    const mfIndex = parseInt(fcurrentDraggedPoint.dataset.mfIndex);
    const paramIndex = parseInt(fcurrentDraggedPoint.dataset.paramIndex);
    const mfChart = document.getElementById('fmfChart');
    const fullLayout = mfChart && mfChart._fullLayout ? mfChart._fullLayout : null;
    const xAxis = fullLayout ? fullLayout.xaxis : null;

    const [min, max] = fselectedVariable.range;
    const dragStartX = e.clientX;
    const mf = fselectedVariable.membershipFunctions[mfIndex];
    const dragStartValue = mf.params[paramIndex];

    function handlePointerMove(moveEvent) {
        if (moveEvent.pointerId !== pointerId) return;
        const deltaPixels = moveEvent.clientX - dragStartX;
        const pixelWidth = xAxis ? (xAxis.l2p(max) - xAxis.l2p(min)) : (document.getElementById('fmfChart').clientWidth || (max - min));
        if (!pixelWidth) return;

        const deltaValue = (deltaPixels / pixelWidth) * (max - min);
        let newX = dragStartValue + deltaValue;
        newX = Math.max(min, Math.min(max, newX));
        newX = parseFloat(newX.toFixed(2));

        // Validación: evitar sobreposición según tipo de MF
        if (!fvalidateAndApplyParameter(mf, paramIndex, newX)) {
            return; // No actualizar si hay conflicto
        }

        mf.params[paramIndex] = newX;
        fupdateParameterDisplay();

        // Actualizar etiqueta del punto durante drag sin redibujar todo constantemente
        const label = fcurrentDraggedPoint.querySelector('.fpoint-label');
        if (label) {
            label.textContent = `${newX.toFixed(1)}`;
        }

        // Throttle heavy redraws: update positions but avoid full Plotly redraw on every move
        // We'll update overlay positions here; final redraw happens on pointerup
        const chart = document.getElementById('fmfChart');
        if (chart && chart._fullLayout) {
            const px = xAxis.l2p(newX);
            const plotArea = chart._fullLayout.plot;
            if (typeof px === 'number' && plotArea) {
                fcurrentDraggedPoint.style.left = (plotArea.x[0] + px) + 'px';
            }
        }
    }

    function handlePointerUp(upEvent) {
        if (upEvent.pointerId !== pointerId) return;
        try {
            fcurrentDraggedPoint.releasePointerCapture && fcurrentDraggedPoint.releasePointerCapture(pointerId);
        } catch (err) {}
        fcurrentDraggedPoint.style.transform = 'translate(-50%, -50%) scale(1)';
        fcurrentDraggedPoint.classList.remove('dragging');
        fcurrentDraggedPoint = null;
        // Redibujar la gráfica final con los nuevos parámetros
        fupdateMFChart();
        fshowNotification(`Parámetro actualizado: ${dragStartValue.toFixed(2)} → ${mf.params[paramIndex].toFixed(2)}`);
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
    }

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
}

function fvalidateAndApplyParameter(mf, paramIndex, newValue) {
    const [minRange, maxRange] = fselectedVariable.range;
    
    // Asegurar que el valor está en rango
    if (newValue < minRange || newValue > maxRange) {
        return false;
    }
    
    // Validación según tipo de función con tolerancia mínima
    const MIN_TOLERANCE = 0.01;
    
    if (mf.type === 'trimf' && mf.params.length === 3) {
        // Validar orden: a ≤ b ≤ c
        if (paramIndex === 0) {
            if (newValue > mf.params[1] - MIN_TOLERANCE) return false; // a no puede ser ≥ b
        } else if (paramIndex === 1) {
            if (newValue < mf.params[0] + MIN_TOLERANCE || newValue > mf.params[2] - MIN_TOLERANCE) return false; // b entre a y c
        } else if (paramIndex === 2) {
            if (newValue < mf.params[1] + MIN_TOLERANCE) return false; // c no puede ser ≤ b
        }
    } else if (mf.type === 'trapmf' && mf.params.length === 4) {
        // Validar orden: a ≤ b ≤ c ≤ d
        if (paramIndex === 0) {
            if (newValue > mf.params[1] - MIN_TOLERANCE) return false;
        } else if (paramIndex === 1) {
            if (newValue < mf.params[0] + MIN_TOLERANCE || newValue > mf.params[2] - MIN_TOLERANCE) return false;
        } else if (paramIndex === 2) {
            if (newValue < mf.params[1] + MIN_TOLERANCE || newValue > mf.params[3] - MIN_TOLERANCE) return false;
        } else if (paramIndex === 3) {
            if (newValue < mf.params[2] + MIN_TOLERANCE) return false;
        }
    }
    
    return true;
}

function fadjustMFsForRangeChange(variable, oldRange, newRange) {
    // Escalar todos los parámetros cuando cambia el rango
    const scaleFactor = (newRange[1] - newRange[0]) / (oldRange[1] - oldRange[0]);
    const translateFactor = newRange[0] - (oldRange[0] * scaleFactor);
    
    variable.membershipFunctions.forEach(mf => {
        mf.params = mf.params.map(p => {
            let adjusted = (p - oldRange[0]) * scaleFactor + newRange[0];
            return parseFloat(adjusted.toFixed(2));
        });
        
        // Normalizar para asegurar validez
        fnormalizeMFParameters(mf, variable);
    });
    
    fupdateMFChart();
    fshowNotification(`Funciones de membresía escaladas al nuevo rango [${newRange[0]}, ${newRange[1]}]`);
}

function fnormalizeMFParameters(mf, variable) {
    // Normalizar parámetros para asegurar validez después de cambio de rango
    const [minRange, maxRange] = variable.range;
    
    mf.params = mf.params.map((p, i) => {
        let normalized = Math.max(minRange, Math.min(maxRange, p));
        return parseFloat(normalized.toFixed(2));
    });
    
    // Corregir orden de parámetros si es necesario
    if (mf.type === 'trimf' && mf.params.length === 3) {
        mf.params.sort((a, b) => a - b);
    } else if (mf.type === 'trapmf' && mf.params.length === 4) {
        mf.params.sort((a, b) => a - b);
    }
}

function fupdateParameterDisplay() {
    if (fselectedVariable && fselectedMF) {
        document.getElementById('fmfName').value = fselectedMF.name;
        document.getElementById('fmfType').value = fselectedMF.type;
        document.getElementById('fmfParams').value = JSON.stringify(fselectedMF.params);
        
        // Mostrar descripción de parámetros
        fupdateParamHelp();
    }
}

function fupdateMFList() {
    const mfList = document.getElementById('fmfList');
    mfList.innerHTML = '';

    if (!fselectedVariable) return;

    fselectedVariable.membershipFunctions.forEach((mf, index) => {
        const item = document.createElement('div');
        item.className = 'fmf-list-item' + (fselectedMF === mf ? ' selected' : '');
        item.innerHTML = `<strong>${mf.name}</strong><br><small>${mf.type}(${mf.params.join(', ')})</small>`;
        item.onclick = () => fselectMF(mf);
        mfList.appendChild(item);
    });
}

function fselectMF(mf) {
    fselectedMF = mf;
    fupdateParameterDisplay();
    fupdateMFList();
    fsetStatus(`Selected membership function: ${mf.name}`);
}

function fupdateParamHelp() {
    const help = document.getElementById('fparamHelp');
    if (!fselectedMF) {
        help.textContent = 'Select a membership function';
        return;
    }

    const helpTexts = {
        'trimf': 'Triangular: [left, peak, right]',
        'trapmf': 'Trapezoidal: [left, bottom-left, bottom-right, right]',
        'gaussmf': 'Gaussian: [mean, sigma]',
        'gbellmf': 'Bell: [width, slope, center]',
        'sigmf': 'Sigmoidal: [slope, center]'
    };

    help.textContent = helpTexts[fselectedMF.type] || 'No help available';
}

function fopenFIS() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                fcurrentFIS = Object.assign(new FuzzyInferenceSystem(), data);
                fupdateFISEditor();
                fupdateMembershipFunctionEditor();
                fsetStatus('FIS loaded successfully');
                fshowNotification('FIS loaded from file');
            } catch (err) {
                fshowNotification('Error loading FIS file');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function fsaveFIS() {
    const dataStr = JSON.stringify(fcurrentFIS, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fcurrentFIS.name}.json`;
    link.click();
    URL.revokeObjectURL(url);
    fshowNotification('FIS saved to file');
}

function faddVariable(type) {
    const name = prompt(`Enter ${type} variable name:`);
    if (name && name.trim()) {
        const min = prompt('Enter minimum value (default 0):', '0');
        const max = prompt('Enter maximum value (default 100):', '100');

        const minVal = parseFloat(min) || 0;
        const maxVal = parseFloat(max) || 100;

        let variable;
        if (type === 'input') {
            variable = fcurrentFIS.addInputVariable(name, [minVal, maxVal]);
        } else {
            variable = fcurrentFIS.addOutputVariable(name, [minVal, maxVal]);
        }

        // Add 3 default membership functions
        const step = (maxVal - minVal) / 3;
        fcurrentFIS.addMembershipFunction(variable, 'low', 'trimf', [minVal, minVal, minVal + step]);
        fcurrentFIS.addMembershipFunction(variable, 'medium', 'trimf', [minVal + step * 0.5, minVal + step * 1.5, minVal + step * 2.5]);
        fcurrentFIS.addMembershipFunction(variable, 'high', 'trimf', [minVal + step * 2, maxVal, maxVal]);

        fselectedVariable = variable;
        fupdateFISEditor();
        fupdateMembershipFunctionEditor();
        fshowNotification(`Added ${type} variable: ${name}`);
    }
}

function fselectVariable(variable, type) {
    fselectedVariable = variable;
    fselectedMF = null;
    fupdateFISEditor();
    fupdateMembershipFunctionEditor();
    fsetStatus(`Selected variable: ${variable.name}`);
}

function fchangeVariable() {
    const varName = document.getElementById('fvariableSelect').value.replace('_input', '').replace('_output', '');
    fselectedVariable = [...fcurrentFIS.inputs, ...fcurrentFIS.outputs].find(v => v.name === varName);
    fselectedMF = null;
    fupdateMFChart();
    fupdateMFList();
    fupdateVariableRangeInputs();
    fsetStatus(`Changed to variable: ${fselectedVariable.name}`);
}

function fchangeMFType() {
    const mfType = document.getElementById('fmfType').value;
    switch (mfType) {
        case 'trimf':
            document.getElementById('fmfParams').value = '[0, 5, 10]';
            break;
        case 'trapmf':
            document.getElementById('fmfParams').value = '[0, 2, 8, 10]';
            break;
        case 'gaussmf':
            document.getElementById('fmfParams').value = '[5, 2]';
            break;
        case 'gbellmf':
            document.getElementById('fmfParams').value = '[2, 3, 5]';
            break;
        case 'sigmf':
            document.getElementById('fmfParams').value = '[1, 5]';
            break;
    }
    fupdateParamHelp();
}

function faddMembershipFunction() {
    if (!fselectedVariable) {
        fshowNotification('Please select a variable first');
        return;
    }

    const name = document.getElementById('fmfName').value;
    const type = document.getElementById('fmfType').value;
    let params;

    try {
        params = JSON.parse(document.getElementById('fmfParams').value);
    } catch (e) {
        fshowNotification('Invalid parameters format');
        return;
    }

    if (typeof params !== 'object' || !Array.isArray(params)) {
        fshowNotification('Parameters must be an array');
        return;
    }

    if (fselectedVariable.membershipFunctions.some(mf => mf.name === name)) {
        fshowNotification('MF name already exists');
        return;
    }

    fcurrentFIS.addMembershipFunction(fselectedVariable, name, type, params);
    fupdateMFChart();
    fupdateMFList();
    fshowNotification(`Added membership function '${name}'`);
}

function fupdateMembershipFunction() {
    if (!fselectedVariable || !fselectedMF) {
        fshowNotification('Please select a membership function first');
        return;
    }

    const name = document.getElementById('fmfName').value;
    const type = document.getElementById('fmfType').value;
    let params;

    try {
        params = JSON.parse(document.getElementById('fmfParams').value);
    } catch (e) {
        fshowNotification('Invalid parameters format');
        return;
    }

    fselectedMF.name = name;
    fselectedMF.type = type;
    fselectedMF.params = params;

    fupdateMFChart();
    fupdateMFList();
    fshowNotification('Membership function updated');
}

function fremoveMembershipFunction() {
    if (!fselectedVariable || !fselectedMF) {
        fshowNotification('Please select a membership function first');
        return;
    }

    const name = fselectedMF.name;
    if (confirm(`Remove membership function '${name}'?`)) {
        fcurrentFIS.removeMembershipFunction(fselectedVariable, name);
        fselectedMF = null;
        fupdateMFChart();
        fupdateMFList();
        fshowNotification(`Removed membership function '${name}'`);
    }
}

function fclearAllMFs() {
    if (!fselectedVariable) {
        fshowNotification('Please select a variable first');
        return;
    }

    if (confirm(`Remove all MFs from ${fselectedVariable.name}?`)) {
        fselectedVariable.membershipFunctions = [];
        fselectedMF = null;
        fupdateMFChart();
        fupdateMFList();
        fshowNotification('All membership functions cleared');
    }
}

function fopenEvaluator() {
    if (fcurrentFIS.inputs.length === 0 || fcurrentFIS.outputs.length === 0) {
        fshowNotification('Please add at least one input and one output variable');
        return;
    }

    fupdateEvaluator();
    openModal('fevaluatorModal');
}

function fcloseEvaluator() {
    closeModal('fevaluatorModal');
}

function fupdateEvaluator() {
    const evaluatorInputs = document.getElementById('fevaluatorInputs');
    evaluatorInputs.innerHTML = '';

    fcurrentFIS.inputs.forEach(inputVar => {
        const div = document.createElement('div');
        div.className = 'fevaluator-input';
        div.innerHTML = `
            <label>${inputVar.name} [${inputVar.range[0]}, ${inputVar.range[1]}]:</label>
            <input type="number" id="finput_${inputVar.name}" value="${(inputVar.range[0] + inputVar.range[1]) / 2}" 
                   min="${inputVar.range[0]}" max="${inputVar.range[1]}" step="0.1">
        `;
        evaluatorInputs.appendChild(div);
    });

    document.getElementById('fevaluatorResults').innerHTML = '';
    document.getElementById('fevaluatorDetails').innerHTML = '';
}

function fevaluateFIS() {
    const inputValues = {};
    fcurrentFIS.inputs.forEach(inputVar => {
        const value = parseFloat(document.getElementById(`finput_${inputVar.name}`).value);
        inputValues[inputVar.name] = value;
    });

    const evaluationResult = fcurrentFIS.evaluate(inputValues);
    const results = evaluationResult.results;
    const details = evaluationResult.details;

    const resultsDiv = document.getElementById('fevaluatorResults');
    resultsDiv.innerHTML = '';

    Object.keys(results).forEach(outputName => {
        const div = document.createElement('div');
        div.className = 'fevaluator-result';
        div.innerHTML = `<strong>${outputName}:</strong> ${results[outputName].toFixed(2)}`;
        resultsDiv.appendChild(div);
    });

    const detailsDiv = document.getElementById('fevaluatorDetails');
    detailsDiv.innerHTML = '<h5>Detailed Analysis:</h5>';

    const inputDetails = document.createElement('div');
    inputDetails.className = 'feval-detail-section';
    inputDetails.innerHTML = '<h5>Input Memberships:</h5>';

    Object.keys(details.inputs).forEach(inputName => {
        const mfDetails = details.inputs[inputName].details;
        const detailText = mfDetails.map(d => `${d.name}: ${d.degree.toFixed(3)}`).join(', ');
        const p = document.createElement('p');
        p.className = 'feval-membership';
        p.textContent = `${inputName}: ${detailText}`;
        inputDetails.appendChild(p);
    });

    detailsDiv.appendChild(inputDetails);
    // Additionally, for each output, draw a small membership plot showing clipped activations and defuzzified value
    Object.keys(results).forEach(outputName => {
        const outputVar = fcurrentFIS.outputs.find(o => o.name === outputName);
        if (!outputVar) return;
        const outContainer = document.createElement('div');
        outContainer.className = 'feval-output-chart';
        outContainer.style.width = '100%';
        outContainer.style.height = '220px';
        outContainer.style.marginTop = '8px';
        const chartId = `feval_chart_${outputName}`;
        const chartDiv = document.createElement('div');
        chartDiv.id = chartId;
        chartDiv.style.width = '100%';
        chartDiv.style.height = '220px';
        outContainer.appendChild(chartDiv);
        detailsDiv.appendChild(outContainer);

        // Build x range
        const xs = [];
        const res = 80;
        const step = (outputVar.range[1] - outputVar.range[0]) / res;
        for (let i = 0; i <= res; i++) xs.push(outputVar.range[0] + i * step);

        // For each MF, compute original mf(x) and clipped by activation
        const traces = [];
        const colors = ['#0072BD', '#D95319', '#EDB120', '#7E2F8E', '#77AC30', '#4DBEEE', '#A2142F'];
        const actList = details.outputs[outputName] || [];
        outContainer.insertBefore(document.createElement('hr'), chartDiv);

        outputVar.membershipFunctions.forEach((mf, mi) => {
            const yOrig = xs.map(x => fcurrentFIS.calculateMembership(x, mf));
            const mfAct = (actList.find(a => a.mfName === mf.name) || { activation: 0 }).activation || 0;
            const yClipped = yOrig.map(v => Math.min(v, mfAct));

            traces.push({ x: xs, y: yOrig, name: `${mf.name}`, line: { color: colors[mi % colors.length], width: 2, shape: 'spline' }, hoverinfo: 'none' });
            traces.push({ x: xs, y: yClipped, name: `${mf.name} (clipped)`, fill: 'tozeroy', fillcolor: `${hexToRgba(colors[mi % colors.length], 0.25)}`, line: { color: colors[mi % colors.length], width: 1 }, hovertemplate: `${mf.name}: %{y:.3f}<extra></extra>` });
        });

        // Vertical line at defuzzified result
        const defVal = results[outputName];
        traces.push({ x: [defVal, defVal], y: [0, 1], mode: 'lines', line: { color: '#111', width: 2, dash: 'dash' }, name: 'Defuzzified' });

        const layout = { title: `Output: ${outputName} (defuzzified: ${defVal.toFixed(2)})`, xaxis: { title: outputName }, yaxis: { range: [0, 1.05] }, showlegend: true, margin: { t: 40 } };

        Plotly.newPlot(chartDiv, traces, layout, { responsive: true, displayModeBar: false });
    });

    fshowNotification('FIS evaluated successfully');
}

function fresetEvaluator() {
    fcurrentFIS.inputs.forEach(inputVar => {
        document.getElementById(`finput_${inputVar.name}`).value = (inputVar.range[0] + inputVar.range[1]) / 2;
    });
    document.getElementById('fevaluatorResults').innerHTML = '';
    document.getElementById('fevaluatorDetails').innerHTML = '';
}

function fopenRuleEditor() {
    fupdateRuleList();
    openModal('fruleEditorModal');
}

function fcloseRuleEditor() {
    closeModal('fruleEditorModal');
}

function fupdateRuleList() {
    const ruleList = document.getElementById('fruleList');
    ruleList.innerHTML = '';

    fcurrentFIS.rules.forEach((rule, index) => {
        const div = document.createElement('div');
        div.className = 'frule-item';
        const antText = rule.antecedent.map(t => `${t[0]} is ${t[1]}`).join(' and ');
        const consText = rule.consequent.map(c => `${c[0]} is ${c[1]}`).join(' and ');
        div.innerHTML = `
            <div class="frule-text">Rule ${index + 1}: IF ${antText} THEN ${consText}</div>
            <div class="frule-controls">
                <button onclick="fremoveRule(${index})">Remove</button>
            </div>
        `;
        ruleList.appendChild(div);
    });

    fupdateRuleBuilderSelects();
}

function fupdateRuleViewer() {
    // Read slider values
    const inputValues = {};
    fcurrentFIS.inputs.forEach(inputVar => {
        const el = document.getElementById(`fiv_${inputVar.name}`);
        const val = el ? parseFloat(el.value) : inputVar.value || (inputVar.range[0] + inputVar.range[1]) / 2;
        inputValues[inputVar.name] = val;
    });

    // Evaluate FIS with these inputs
    const evaluation = fcurrentFIS.evaluate(inputValues);
    const details = evaluation.details;

    // Build rule activation bar chart
    const ruleActivations = details.rules.map(r => ({ idx: r.index + 1, text: `Rule ${r.index + 1}`, activation: r.activation }));
    const chartDiv = document.getElementById('fruleViewerChart');
    if (!chartDiv) return;

    const barTrace = {
        x: ruleActivations.map(r => r.text),
        y: ruleActivations.map(r => r.activation),
        type: 'bar',
        marker: { color: ruleActivations.map((_, i) => `rgba(${50 + i*30 % 200}, ${100 + i*20 % 150}, ${150 + i*10 % 100}, 0.8)`) },
        hovertemplate: '%{x}<br>Activation: %{y:.3f}<extra></extra>'
    };

    const layout = {
        title: 'Activación de Reglas',
        xaxis: { tickangle: -45 },
        yaxis: { title: 'Activación', range: [0, 1.05] },
        margin: { t: 40, b: 140 }
    };

    // Also add traces for input membership degrees as small markers (one per input variable)
    const inputTraces = [];
    let offset = 0;
    fcurrentFIS.inputs.forEach((inputVar, vi) => {
        const memberships = fcurrentFIS.fuzzify(inputVar, inputValues[inputVar.name]).details;
        memberships.forEach(m => {
            inputTraces.push({
                x: [m.name + ' (' + inputVar.name + ')'],
                y: [m.degree],
                type: 'bar',
                name: `${inputVar.name}: ${m.name}`,
                marker: { opacity: 0.85 },
                hovertemplate: `${inputVar.name} / ${m.name}<br>μ = %{y:.3f}<extra></extra>`
            });
        });
        offset += 1;
    });

    // Compose combined figure: rules bar + inputs stacked below using subplot-like approach via domain
    // Simpler: draw rules first, then draw input-degree bars in stacked layout by concatenating traces and adjusting layout barmode
    const combinedTraces = [barTrace].concat(inputTraces);
    const combinedLayout = Object.assign({}, layout, { barmode: 'group', showlegend: false });

    Plotly.react(chartDiv, combinedTraces, combinedLayout, { responsive: true });
}

// --- Modal helpers ---
function openModal(id) {
    const modal = document.getElementById(id);
    const backdrop = document.getElementById('fmodalBackdrop');
    if (!modal) return;
    // show backdrop
    if (backdrop) {
        backdrop.style.display = 'block';
        setTimeout(() => backdrop.style.opacity = '1', 10);
    }
    modal.style.display = 'flex';
    // add active class for CSS transitions
    modal.classList.add('active');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    const backdrop = document.getElementById('fmodalBackdrop');
    if (!modal) return;
    modal.classList.remove('active');
    modal.style.display = 'none';
    if (backdrop) {
        backdrop.style.opacity = '0';
        setTimeout(() => backdrop.style.display = 'none', 250);
    }
}

function fcloseAllModals() {
    // Close any known modals
    const ids = ['fruleEditorModal', 'fruleViewer', 'fsurfaceViewer', 'fevaluatorModal'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.remove('active');
            el.style.display = 'none';
        }
    });
    const backdrop = document.getElementById('fmodalBackdrop');
    if (backdrop) {
        backdrop.style.opacity = '0';
        setTimeout(() => backdrop.style.display = 'none', 250);
    }
}

function fupdateRuleBuilderSelects() {
    const selects = [
        'fruleInput1', 'fruleMF1',
        'fruleInput2', 'fruleMF2',
        'fruleOutput', 'fruleOutputMF'
    ];

    document.getElementById('fruleInput1').innerHTML = '';
    document.getElementById('fruleInput2').innerHTML = '';
    document.getElementById('fruleOutput').innerHTML = '';

    fcurrentFIS.inputs.forEach(input => {
        const opt1 = document.createElement('option');
        opt1.value = input.name;
        opt1.textContent = input.name;
        document.getElementById('fruleInput1').appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = input.name;
        opt2.textContent = input.name;
        document.getElementById('fruleInput2').appendChild(opt2);
    });

    fcurrentFIS.outputs.forEach(output => {
        const opt = document.createElement('option');
        opt.value = output.name;
        opt.textContent = output.name;
        document.getElementById('fruleOutput').appendChild(opt);
    });

    fupdateRuleMFDropdowns();
}

function fupdateRuleMFDropdowns() {
    const input1 = document.getElementById('fruleInput1').value;
    const input2 = document.getElementById('fruleInput2').value;
    const output = document.getElementById('fruleOutput').value;

    const updateMFSelect = (selectId, varName) => {
        const select = document.getElementById(selectId);
        const allVars = [...fcurrentFIS.inputs, ...fcurrentFIS.outputs];
        const variable = allVars.find(v => v.name === varName);
        select.innerHTML = '';
        if (variable) {
            variable.membershipFunctions.forEach(mf => {
                const opt = document.createElement('option');
                opt.value = mf.name;
                opt.textContent = mf.name;
                select.appendChild(opt);
            });
        }
    };

    updateMFSelect('fruleMF1', input1);
    updateMFSelect('fruleMF2', input2);
    updateMFSelect('fruleOutputMF', output);
}

function faddRuleFromBuilder() {
    const input1 = document.getElementById('fruleInput1').value;
    const mf1 = document.getElementById('fruleMF1').value;
    const connector = document.getElementById('fruleConnector').value;
    const input2 = document.getElementById('fruleInput2').value;
    const mf2 = document.getElementById('fruleMF2').value;
    const output = document.getElementById('fruleOutput').value;
    const outputMF = document.getElementById('fruleOutputMF').value;
    const weight = parseFloat(document.getElementById('fruleWeight').value) || 1;

    const antecedent = [
        [input1, mf1],
        [input2, mf2, connector]
    ];

    const consequent = [
        [output, outputMF]
    ];

    fcurrentFIS.addRule(antecedent, consequent, weight);
    fupdateRuleList();
    fshowNotification('Rule added successfully');
}

function fremoveRule(index) {
    fcurrentFIS.removeRule(index);
    fupdateRuleList();
    fshowNotification('Rule removed');
}

function fshowSurfaceViewer() {
    if (fcurrentFIS.inputs.length < 2) {
        fshowNotification('Need at least 2 input variables for surface view');
        return;
    }

    const inputX = fcurrentFIS.inputs[0];
    const inputY = fcurrentFIS.inputs[1];
    const output = fcurrentFIS.outputs[0];

    const surfaceData = fcurrentFIS.generateSurfaceData(inputX, inputY, output);

    const trace = {
        z: surfaceData.z,
        x: surfaceData.x,
        y: surfaceData.y,
        type: 'surface',
        colorscale: 'Viridis'
    };

    const layout = {
        title: `Surface: ${output.name} vs ${inputX.name} and ${inputY.name}`,
        scene: {
            xaxis: { title: inputX.name },
            yaxis: { title: inputY.name },
            zaxis: { title: output.name }
        }
    };

    const surfaceChart = document.getElementById('fsurfaceChart');
    if (!surfaceChart) {
        fshowNotification('Surface chart element not found');
        return;
    }

    try {
        // Plot and then open modal. Use promise to ensure Plotly finishes or fails gracefully.
        Plotly.newPlot(surfaceChart, [trace], layout).then(() => {
            openModal('fsurfaceViewer');
        }).catch(err => {
            console.error('Plotly surface error', err);
            fshowNotification('Error al dibujar la superficie (ver consola)');
            // still try to open modal so user can inspect
            openModal('fsurfaceViewer');
        });
    } catch (err) {
        console.error('Surface plotting exception', err);
        fshowNotification('Excepción al generar la superficie');
    }
}

function fcloseSurfaceViewer() {
    closeModal('fsurfaceViewer');
}

function fshowRuleViewer() {
    fsetStatus('Rule viewer opened');
    // build input controls dynamically
    const controls = document.getElementById('finputControls');
    controls.innerHTML = '';
    fcurrentFIS.inputs.forEach(inputVar => {
        const wrapper = document.createElement('div');
        wrapper.className = 'frule-input-control';
        wrapper.innerHTML = `
            <label style="font-weight:600; font-size:12px;">${inputVar.name} [${inputVar.range[0]}, ${inputVar.range[1]}]</label>
            <input type="range" min="${inputVar.range[0]}" max="${inputVar.range[1]}" step="0.1" value="${inputVar.value || (inputVar.range[0]+inputVar.range[1])/2}" id="fiv_${inputVar.name}">
            <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-medium);">
                <span id="fiv_${inputVar.name}_val">${inputVar.value || (inputVar.range[0]+inputVar.range[1])/2}</span>
            </div>
        `;
        controls.appendChild(wrapper);
        const slider = wrapper.querySelector('input');
        slider.addEventListener('input', () => {
            document.getElementById(`fiv_${inputVar.name}_val`).textContent = slider.value;
        });
    });

    // build rule list
    const list = document.getElementById('fruleViewerList');
    if (list) list.innerHTML = '';
    fcurrentFIS.rules.forEach((rule, i) => {
        const div = document.createElement('div');
        div.className = 'frule-list-item' + (fselectedRuleViewerIndex === i ? ' selected' : '');
        const ant = rule.antecedent.map(t => `${t[0]} is ${t[1]}`).join(' AND ');
        const cons = rule.consequent.map(c => `${c[0]} is ${c[1]}`).join(', ');
        div.innerHTML = `<strong>Rule ${i+1}</strong><br><small style="font-size:11px; color:var(--text-medium);">IF ${ant} THEN ${cons}</small>`;
        div.onclick = () => { fselectedRuleViewerIndex = i; document.querySelectorAll('.frule-list-item').forEach(el=>el.classList.remove('selected')); div.classList.add('selected'); fupdateRuleViewer(); };
        if (list) list.appendChild(div);
    });

    // initial render
    fupdateRuleViewer();
    openModal('fruleViewer');
}

function fcloseRuleViewer() {
    closeModal('fruleViewer');
}

function fupdateCurrentVariableInfo() {
    const infoDiv = document.getElementById('fcurrentVariableInfo');
    if (fselectedVariable) {
        infoDiv.innerHTML = `
            <div><strong>Name:</strong> ${fselectedVariable.name}</div>
            <div><strong>Range:</strong> [${fselectedVariable.range[0]}, ${fselectedVariable.range[1]}]</div>
            <div><strong>MF Count:</strong> ${fselectedVariable.membershipFunctions.length}</div>
        `;
    } else {
        infoDiv.innerHTML = '<div>No variable selected</div>';
    }
}

function fupdateFISProperties() {
    const propsDiv = document.getElementById('ffisProperties');
    if (!propsDiv) return; // Defensive: evitar excepción si el contenedor no existe
    propsDiv.innerHTML = `
        <div><strong>Nombre:</strong> ${fcurrentFIS.name}</div>
        <div><strong>Tipo:</strong> ${fcurrentFIS.type}</div>
        <div><strong>AND:</strong> ${fcurrentFIS.andMethod}</div>
        <div><strong>Defuzz:</strong> ${fcurrentFIS.defuzzMethod}</div>
        <div><strong>Reglas:</strong> ${fcurrentFIS.rules.length}</div>
        <div><strong>Entradas:</strong> ${fcurrentFIS.inputs.length}</div>
        <div><strong>Salidas:</strong> ${fcurrentFIS.outputs.length}</div>
    `;
}

function fsetStatus(message) {
    // Evitar sobrescribir todo el footer; actualizar solo el mensaje visible
    const msgEl = document.getElementById('fstatusMessage');
    if (msgEl) {
        msgEl.textContent = message;
    } else {
        // Fallback: si no existe, actualizar el status bar completo
        const bar = document.getElementById('fstatusBar');
        if (bar) bar.textContent = message;
    }
}

function fshowNotification(message) {
    let notification = document.querySelector('.fnotification');
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'fnotification';
        document.body.appendChild(notification);
    }

    notification.textContent = message;
    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// Play button for Rule Viewer - cycles through input values to show rule activations
let fplayRuleViewerRunning = false;
function fplayRuleViewer() {
    if (fplayRuleViewerRunning) {
        fplayRuleViewerRunning = false;
        return;
    }
    
    fplayRuleViewerRunning = true;
    fsetStatus('Playing Rule Viewer animation...');
    
    const animationSpeed = 100; // ms between updates
    let step = 0;
    
    function animate() {
        if (!fplayRuleViewerRunning) {
            fsetStatus('Animation stopped');
            return;
        }
        
        // Vary first input through its range sinusoidally
        if (fcurrentFIS.inputs.length > 0) {
            const firstInput = fcurrentFIS.inputs[0];
            const range = firstInput.range[1] - firstInput.range[0];
            const mid = (firstInput.range[0] + firstInput.range[1]) / 2;
            const newVal = mid + (range / 2) * Math.sin((step / 20) * Math.PI);
            const slider = document.getElementById(`fiv_${firstInput.name}`);
            if (slider) {
                slider.value = newVal;
                document.getElementById(`fiv_${firstInput.name}_val`).textContent = newVal.toFixed(2);
            }
        }
        
        fupdateRuleViewer();
        step++;
        
        if (step > 40) {
            fplayRuleViewerRunning = false;
            fsetStatus('Animation finished');
            return;
        }
        
        setTimeout(animate, animationSpeed);
    }
    
    animate();
}

document.addEventListener('DOMContentLoaded', function() {
    finitializeApp();
});
