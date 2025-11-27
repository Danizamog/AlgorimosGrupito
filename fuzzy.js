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
        if (x < a || x > d) return 0;
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
        if (!ruleOutputs || ruleOutputs.length === 0) {
            return variable.range[0] + (variable.range[1] - variable.range[0]) / 2;
        }

        // MATLAB-style centroid defuzzification
        // Verificar si hay una sola regla dominante (activación > 0.9)
        const dominantRule = ruleOutputs.find(r => r.activation > 0.9);
        if (dominantRule && ruleOutputs.filter(r => r.activation > 0.1).length === 1) {
            const mf = variable.membershipFunctions.find(m => m.name === dominantRule.mfName);
            
            if (mf && mf.type === 'trapmf' && mf.params.length === 4) {
                const [a, b, c, d] = mf.params;
                
                // Fórmula del centroide para trapmf según MATLAB:
                const areaLeft = (b - a) / 2;
                const centroidLeft = a + (b - a) / 3;
                const momentLeft = areaLeft * centroidLeft;
                
                const areaCenter = (c - b);
                const centroidCenter = (b + c) / 2;
                const momentCenter = areaCenter * centroidCenter;
                
                const areaRight = (d - c) / 2;
                const centroidRight = c + (d - c) / 3;
                const momentRight = areaRight * centroidRight;
                
                const totalArea = areaLeft + areaCenter + areaRight;
                const totalMoment = momentLeft + momentCenter + momentRight;
                
                const result = totalArea > 0 ? totalMoment / totalArea : (b + c) / 2;
                return Math.max(variable.range[0], Math.min(variable.range[1], result));
            }
        }

        // Fallback: integración numérica para múltiples reglas
        let numerator = 0;
        let denominator = 0;

        const resolution = 1000;
        const step = (variable.range[1] - variable.range[0]) / resolution;

        for (let i = 0; i <= resolution; i++) {
            const x = variable.range[0] + i * step;
            let membershipDegree = 0;

            for (const ruleOutput of ruleOutputs) {
                const mf = variable.membershipFunctions.find(m => m.name === ruleOutput.mfName);
                if (!mf) continue;
                const mfDegree = this.calculateMembership(x, mf);
                const clipped = Math.min(mfDegree, ruleOutput.activation);
                membershipDegree = Math.max(membershipDegree, clipped);
            }

            numerator += x * membershipDegree;
            denominator += membershipDegree;
        }

        const result = denominator === 0 ? (variable.range[0] + variable.range[1]) / 2 : numerator / denominator;
        return result;
    }    findActiveMemberships(variable, value, threshold = 0.01) {
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

                // Crear objeto con todos los valores de entrada
                const inputValues = {};
                this.inputs.forEach(input => {
                    if (input === inputX) {
                        inputValues[input.name] = x;
                    } else if (input === inputY) {
                        inputValues[input.name] = y;
                    } else {
                        // Usar el valor medio para las otras entradas
                        inputValues[input.name] = (input.range[0] + input.range[1]) / 2;
                    }
                });

                const result = this.evaluate(inputValues);
                zValues[i].push(result.results[output.name] || 0);
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
let feditingRuleIndex = null; // Para saber si estamos editando una regla

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

    // Add input variable: Interes (Interest/Engagement)
    const temp = fcurrentFIS.addInputVariable('Interes', [0, 100]);
    fcurrentFIS.addMembershipFunction(temp, 'Malo', 'trapmf', [0, 0, 20, 40]);
    fcurrentFIS.addMembershipFunction(temp, 'Medio', 'trapmf', [30, 45, 55, 70]);
    fcurrentFIS.addMembershipFunction(temp, 'Bueno', 'trapmf', [60, 80, 100, 100]);

    // Add input variable: Aula (Classroom/Environment)
    const humidity = fcurrentFIS.addInputVariable('Aula', [0, 100]);
    fcurrentFIS.addMembershipFunction(humidity, 'Mala', 'trapmf', [0, 0, 25, 45]);
    fcurrentFIS.addMembershipFunction(humidity, 'Buena', 'trapmf', [55, 75, 100, 100]);
    fcurrentFIS.addMembershipFunction(humidity, 'Media', 'trapmf', [35, 45, 55, 65]);

    // Add input variable: Profesor (Teacher Quality)
    const humidit = fcurrentFIS.addInputVariable('Profesor', [0, 100]);
    fcurrentFIS.addMembershipFunction(humidit, 'Mala', 'trapmf', [0, 0, 30, 50]);
    fcurrentFIS.addMembershipFunction(humidit, 'Buena', 'trapmf', [50, 70, 100, 100]);
    fcurrentFIS.addMembershipFunction(humidit, 'Media', 'trapmf', [40, 50, 60, 70]);

    // Add output variable: Nota (Grade)
    const fanSpeed = fcurrentFIS.addOutputVariable('Nota', [0, 100]);
    fcurrentFIS.addMembershipFunction(fanSpeed, 'Mala', 'trapmf', [0, 0, 30, 50]);
    fcurrentFIS.addMembershipFunction(fanSpeed, 'Buena', 'trapmf', [75, 82, 100, 100]);
    fcurrentFIS.addMembershipFunction(fanSpeed, 'Media', 'trapmf', [40, 45, 55, 60]);

    // Add 27 fuzzy rules (3^3 = 27 combinations)
    // Rules structure: IF Interes IS X AND Aula IS Y AND Profesor IS Z THEN Nota IS W
    const rules = [
        // Interes=Malo
        { antecedent: [['Interes', 'Malo'], ['Aula', 'Mala'], ['Profesor', 'Mala']], consequent: [['Nota', 'Mala']], weight: 1 },
        { antecedent: [['Interes', 'Malo'], ['Aula', 'Mala'], ['Profesor', 'Buena']], consequent: [['Nota', 'Mala']], weight: 1 },
        { antecedent: [['Interes', 'Malo'], ['Aula', 'Mala'], ['Profesor', 'Media']], consequent: [['Nota', 'Mala']], weight: 1 },
        { antecedent: [['Interes', 'Malo'], ['Aula', 'Buena'], ['Profesor', 'Mala']], consequent: [['Nota', 'Mala']], weight: 1 },
        { antecedent: [['Interes', 'Malo'], ['Aula', 'Buena'], ['Profesor', 'Buena']], consequent: [['Nota', 'Media']], weight: 1 },
        { antecedent: [['Interes', 'Malo'], ['Aula', 'Buena'], ['Profesor', 'Media']], consequent: [['Nota', 'Mala']], weight: 1 },
        { antecedent: [['Interes', 'Malo'], ['Aula', 'Media'], ['Profesor', 'Mala']], consequent: [['Nota', 'Mala']], weight: 1 },
        { antecedent: [['Interes', 'Malo'], ['Aula', 'Media'], ['Profesor', 'Buena']], consequent: [['Nota', 'Media']], weight: 1 },
        { antecedent: [['Interes', 'Malo'], ['Aula', 'Media'], ['Profesor', 'Media']], consequent: [['Nota', 'Mala']], weight: 1 },
        // Interes=Medio
        { antecedent: [['Interes', 'Medio'], ['Aula', 'Mala'], ['Profesor', 'Mala']], consequent: [['Nota', 'Mala']], weight: 1 },
        { antecedent: [['Interes', 'Medio'], ['Aula', 'Mala'], ['Profesor', 'Buena']], consequent: [['Nota', 'Media']], weight: 1 },
        { antecedent: [['Interes', 'Medio'], ['Aula', 'Mala'], ['Profesor', 'Media']], consequent: [['Nota', 'Media']], weight: 1 },
        { antecedent: [['Interes', 'Medio'], ['Aula', 'Buena'], ['Profesor', 'Mala']], consequent: [['Nota', 'Media']], weight: 1 },
        { antecedent: [['Interes', 'Medio'], ['Aula', 'Buena'], ['Profesor', 'Buena']], consequent: [['Nota', 'Buena']], weight: 1 },
        { antecedent: [['Interes', 'Medio'], ['Aula', 'Buena'], ['Profesor', 'Media']], consequent: [['Nota', 'Media']], weight: 1 },
        { antecedent: [['Interes', 'Medio'], ['Aula', 'Media'], ['Profesor', 'Mala']], consequent: [['Nota', 'Media']], weight: 1 },
        { antecedent: [['Interes', 'Medio'], ['Aula', 'Media'], ['Profesor', 'Buena']], consequent: [['Nota', 'Buena']], weight: 1 },
        { antecedent: [['Interes', 'Medio'], ['Aula', 'Media'], ['Profesor', 'Media']], consequent: [['Nota', 'Media']], weight: 1 },
        // Interes=Bueno
        { antecedent: [['Interes', 'Bueno'], ['Aula', 'Mala'], ['Profesor', 'Mala']], consequent: [['Nota', 'Media']], weight: 1 },
        { antecedent: [['Interes', 'Bueno'], ['Aula', 'Mala'], ['Profesor', 'Buena']], consequent: [['Nota', 'Buena']], weight: 1 },
        { antecedent: [['Interes', 'Bueno'], ['Aula', 'Mala'], ['Profesor', 'Media']], consequent: [['Nota', 'Buena']], weight: 1 },
        { antecedent: [['Interes', 'Bueno'], ['Aula', 'Buena'], ['Profesor', 'Mala']], consequent: [['Nota', 'Buena']], weight: 1 },
        { antecedent: [['Interes', 'Bueno'], ['Aula', 'Buena'], ['Profesor', 'Buena']], consequent: [['Nota', 'Buena']], weight: 1 },
        { antecedent: [['Interes', 'Bueno'], ['Aula', 'Buena'], ['Profesor', 'Media']], consequent: [['Nota', 'Buena']], weight: 1 },
        { antecedent: [['Interes', 'Bueno'], ['Aula', 'Media'], ['Profesor', 'Mala']], consequent: [['Nota', 'Buena']], weight: 1 },
        { antecedent: [['Interes', 'Bueno'], ['Aula', 'Media'], ['Profesor', 'Buena']], consequent: [['Nota', 'Buena']], weight: 1 },
        { antecedent: [['Interes', 'Bueno'], ['Aula', 'Media'], ['Profesor', 'Media']], consequent: [['Nota', 'Buena']], weight: 1 }
    ];

    // Add all rules to FIS
    rules.forEach(rule => {
        fcurrentFIS.addRule(rule.antecedent, rule.consequent, rule.weight);
    });

    fselectedVariable = temp;
    fupdateFISEditor();
    fupdateMembershipFunctionEditor();
    fsetStatus(`Fuzzy Logic System Ready - ${fcurrentFIS.rules.length} rules loaded`);
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

        if (mf.type === 'trapmf' && mf.params.length === 3) {
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
    
    if (mf.type === 'trapmf' && mf.params.length === 3) {
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
    if (mf.type === 'trapmf' && mf.params.length === 3) {
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
        'trapmf': 'Triangular: [left, peak, right]',
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
        fcurrentFIS.addMembershipFunction(variable, 'low', 'trapmf', [minVal, minVal, minVal + step]);
        fcurrentFIS.addMembershipFunction(variable, 'medium', 'trapmf', [minVal + step * 0.5, minVal + step * 1.5, minVal + step * 2.5]);
        fcurrentFIS.addMembershipFunction(variable, 'high', 'trapmf', [minVal + step * 2, maxVal, maxVal]);

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
        case 'trapmf':
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
    try {
        const inputValues = {};
        fcurrentFIS.inputs.forEach(inputVar => {
            const inputEl = document.getElementById(`finput_${inputVar.name}`);
            if (!inputEl) {
                fshowNotification(`Input element not found: finput_${inputVar.name}`);
                return;
            }
            const value = parseFloat(inputEl.value);
            if (isNaN(value)) {
                inputValues[inputVar.name] = (inputVar.range[0] + inputVar.range[1]) / 2;
            } else {
                inputValues[inputVar.name] = value;
            }
        });

        const evaluationResult = fcurrentFIS.evaluate(inputValues);
        const results = evaluationResult.results;
        const details = evaluationResult.details;

        const resultsDiv = document.getElementById('fevaluatorResults');
        if (!resultsDiv) {
            fshowNotification('Results container not found');
            return;
        }
        resultsDiv.innerHTML = '';

        Object.keys(results).forEach(outputName => {
            const div = document.createElement('div');
            div.className = 'fevaluator-result';
            div.style.marginBottom = '6px';
            div.style.padding = '8px';
            div.style.backgroundColor = '#e3f2fd';
            div.style.borderRadius = '4px';
            div.style.fontWeight = 'bold';
            div.innerHTML = `<strong>${outputName}:</strong> <span style="color: #0078d4; font-size: 14px;">${results[outputName].toFixed(2)}</span>`;
            resultsDiv.appendChild(div);
        });

        const detailsDiv = document.getElementById('fevaluatorDetails');
        if (!detailsDiv) {
            fshowNotification('Details container not found');
            return;
        }
        detailsDiv.innerHTML = '<h5 style="margin-top: 0;">Análisis Detallado:</h5>';

        const inputDetails = document.createElement('div');
        inputDetails.className = 'feval-detail-section';
        inputDetails.style.marginBottom = '12px';
        inputDetails.innerHTML = '<h5 style="margin: 0 0 6px 0; font-size: 12px;">Membresías de Entrada:</h5>';

        Object.keys(details.inputs).forEach(inputName => {
            const mfDetails = details.inputs[inputName].details;
            const detailText = mfDetails.length > 0 
                ? mfDetails.map(d => `${d.name}: ${d.degree.toFixed(3)}`).join(', ')
                : '(ninguna con activación)';
            const p = document.createElement('p');
            p.className = 'feval-membership';
            p.style.margin = '4px 0';
            p.style.fontSize = '11px';
            p.textContent = `${inputName}: ${detailText}`;
            inputDetails.appendChild(p);
        });

        detailsDiv.appendChild(inputDetails);

        // Draw membership plots for each output
        Object.keys(results).forEach(outputName => {
            const outputVar = fcurrentFIS.outputs.find(o => o.name === outputName);
            if (!outputVar) return;

            const outContainer = document.createElement('div');
            outContainer.style.marginBottom = '12px';
            
            const chartDiv = document.createElement('div');
            chartDiv.id = `feval_chart_${outputName}`;
            chartDiv.style.width = '100%';
            chartDiv.style.height = '180px';
            chartDiv.style.marginBottom = '8px';
            outContainer.appendChild(chartDiv);

            detailsDiv.appendChild(outContainer);

            // Build x range
            const xs = [];
            const res = 80;
            const step = (outputVar.range[1] - outputVar.range[0]) / res;
            for (let i = 0; i <= res; i++) {
                xs.push(outputVar.range[0] + i * step);
            }

            // For each MF, compute original and clipped
            const traces = [];
            const colors = ['#0072BD', '#D95319', '#EDB120', '#7E2F8E', '#77AC30', '#4DBEEE', '#A2142F'];
            const actList = details.outputs[outputName] || [];

            outputVar.membershipFunctions.forEach((mf, mi) => {
                const yOrig = xs.map(x => fcurrentFIS.calculateMembership(x, mf));
                const mfAct = (actList.find(a => a.mfName === mf.name) || { activation: 0 }).activation || 0;
                const yClipped = yOrig.map(v => Math.min(v, mfAct));

                traces.push({
                    x: xs,
                    y: yOrig,
                    name: `${mf.name}`,
                    line: { color: colors[mi % colors.length], width: 2 },
                    hoverinfo: 'none'
                });

                const hexColor = colors[mi % colors.length];
                const rgbaColor = `rgba(${parseInt(hexColor.substr(1,2), 16)}, ${parseInt(hexColor.substr(3,2), 16)}, ${parseInt(hexColor.substr(5,2), 16)}, 0.3)`;

                traces.push({
                    x: xs,
                    y: yClipped,
                    name: `${mf.name} (clipped)`,
                    fill: 'tozeroy',
                    fillcolor: rgbaColor,
                    line: { color: colors[mi % colors.length], width: 1 },
                    hovertemplate: `${mf.name}: %{y:.3f}<extra></extra>`
                });
            });

            // Vertical line at defuzzified result
            const defVal = results[outputName];
            traces.push({
                x: [defVal, defVal],
                y: [0, 1],
                mode: 'lines',
                line: { color: '#111', width: 2, dash: 'dash' },
                name: 'Defuzzificado'
            });

            const layout = {
                title: `${outputName} = ${defVal.toFixed(2)}`,
                xaxis: { title: outputName },
                yaxis: { range: [0, 1.05] },
                showlegend: true,
                margin: { t: 30, b: 40, l: 50, r: 20 },
                height: 200
            };

            try {
                Plotly.newPlot(chartDiv, traces, layout, { responsive: true, displayModeBar: false });
            } catch (e) {
                console.error('Error en gráfico:', e);
            }
        });

        fshowNotification('✓ FIS evaluado correctamente');
    } catch (err) {
        console.error('Error en fevaluateFIS:', err);
        fshowNotification('Error al evaluar: ' + err.message);
    }
}

function fresetEvaluator() {
    fcurrentFIS.inputs.forEach(inputVar => {
        document.getElementById(`finput_${inputVar.name}`).value = (inputVar.range[0] + inputVar.range[1]) / 2;
    });
    document.getElementById('fevaluatorResults').innerHTML = '';
    document.getElementById('fevaluatorDetails').innerHTML = '';
}

function fopenRuleEditor() {
    feditingRuleIndex = null; // Reset editing mode
    fupdateRuleList();
    
    // Reset button text
    const addButton = document.querySelector('#fruleBuilder .ftoolbar-btn');
    if (addButton) {
        addButton.innerHTML = '<span class="icon">➕</span> Add Rule';
        addButton.onclick = () => faddRuleFromBuilder();
    }
    
    openModal('fruleEditorModal');
}

function fcloseRuleEditor() {
    closeModal('fruleEditorModal');
    feditingRuleIndex = null;
}

function fresetRuleBuilder() {
    feditingRuleIndex = null;
    
    // Reset all inputs to defaults
    const numInputs = fcurrentFIS.inputs.length;
    const numOutputs = fcurrentFIS.outputs.length;

    for (let i = 0; i < numInputs; i++) {
        const inputSelect = document.getElementById('fruleInput' + i);
        if (inputSelect && fcurrentFIS.inputs[i]) {
            inputSelect.value = fcurrentFIS.inputs[i].name;
        }
    }

    for (let i = 0; i < numOutputs; i++) {
        const outputSelect = document.getElementById('fruleOutput' + i);
        if (outputSelect && fcurrentFIS.outputs[i]) {
            outputSelect.value = fcurrentFIS.outputs[i].name;
        }
    }

    const weightInput = document.getElementById('fruleWeight');
    if (weightInput) {
        weightInput.value = '1';
    }

    fupdateRuleMFDropdowns();

    // Reset button text
    const addButton = document.querySelector('#fruleBuilder .ftoolbar-btn');
    if (addButton) {
        addButton.innerHTML = '<span class="icon">➕</span> Add Rule';
        addButton.onclick = () => faddRuleFromBuilder();
    }

    fshowNotification('Rule builder reset');
}

function fupdateRuleList() {
    const ruleList = document.getElementById('fruleList');
    const ruleCount = document.getElementById('fruleCount');
    
    ruleList.innerHTML = '';
    if (ruleCount) ruleCount.textContent = fcurrentFIS.rules.length;

    if (fcurrentFIS.rules.length === 0) {
        ruleList.innerHTML = '<p style="color: var(--text-medium); padding: 12px; text-align: center;">No rules defined yet</p>';
        fupdateRuleBuilderSelects();
        return;
    }

    fcurrentFIS.rules.forEach((rule, index) => {
        const div = document.createElement('div');
        div.className = 'frule-item';
        
        // Format antecedent with operators
        let antText = '';
        rule.antecedent.forEach((term, idx) => {
            if (idx > 0) {
                const operator = term[2] ? term[2].toUpperCase() : 'AND';
                antText += ` ${operator} `;
            }
            antText += `${term[0]} is ${term[1]}`;
        });
        
        // Format consequent
        let consText = '';
        rule.consequent.forEach((cons, idx) => {
            if (idx > 0) {
                const operator = cons[2] ? cons[2].toUpperCase() : 'AND';
                consText += ` ${operator} `;
            }
            consText += `${cons[0]} is ${cons[1]}`;
        });
        
        const weightText = rule.weight !== 1 ? ` (weight: ${rule.weight})` : '';
        
        div.innerHTML = `
            <div class="frule-text">
                <strong>Rule ${index + 1}:</strong> IF ${antText} THEN ${consText}${weightText}
            </div>
            <div class="frule-controls">
                <button onclick="feditRule(${index})" style="background: #0078d4;">✏️ Edit</button>
                <button onclick="fremoveRule(${index})" style="background: #d83b01;">🗑️ Remove</button>
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

    // Update rule list with activation bars
    const ruleList = document.getElementById('fruleViewerList');
    if (ruleList) {
        ruleList.innerHTML = '';
        details.rules.forEach((rule, idx) => {
            const div = document.createElement('div');
            div.className = 'frule-list-item';
            div.style.marginBottom = '6px';
            div.style.padding = '6px';
            div.style.backgroundColor = '#f9f9f9';
            div.style.borderRadius = '3px';
            div.style.border = '1px solid #e0e0e0';
            
            let antText = '';
            rule.antecedent.forEach((term, i) => {
                if (i > 0) antText += ' AND ';
                antText += `${term[0]} is ${term[1]}`;
            });
            
            const activationPercent = (rule.activation * 100).toFixed(1);
            const barColor = rule.activation > 0.5 ? '#4CAF50' : rule.activation > 0.2 ? '#FFC107' : '#999';
            
            div.innerHTML = `
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
                    <strong style="min-width: 40px; color: #0078d4; font-size: 11px;">R${idx + 1}</strong>
                    <div style="font-size: 10px; color: #666; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${antText}</div>
                    <span style="font-weight: bold; min-width: 30px; text-align: right; color: ${barColor}; font-size: 11px;">${activationPercent}%</span>
                </div>
                <div style="width: 100%; height: 5px; background: #e0e0e0; border-radius: 2px; overflow: hidden;">
                    <div style="height: 100%; width: ${rule.activation * 100}%; background: ${barColor}; transition: width 0.2s;"></div>
                </div>
            `;
            ruleList.appendChild(div);
        });
    }

    // Build main activation bar chart
    const chartDiv = document.getElementById('fruleViewerChart');
    if (!chartDiv) {
        console.warn('fruleViewerChart element not found');
        return;
    }

    if (details.rules.length === 0) {
        chartDiv.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No rules to display</p>';
        return;
    }

    const ruleLabels = details.rules.map((_, i) => `R${i + 1}`);
    const ruleActivations = details.rules.map(r => r.activation);
    const colors = ruleActivations.map(act => 
        act > 0.7 ? 'rgba(76, 175, 80, 0.8)' : 
        act > 0.4 ? 'rgba(33, 150, 243, 0.8)' : 
        act > 0.1 ? 'rgba(255, 193, 7, 0.8)' : 
        'rgba(189, 189, 189, 0.5)'
    );

    const barTrace = {
        x: ruleLabels,
        y: ruleActivations,
        type: 'bar',
        marker: { color: colors, line: { color: '#333', width: 1 } },
        hovertemplate: '%{x}<br>Activation: %{y:.3f}<extra></extra>',
        name: 'Rule Activation'
    };

    const layout = {
        title: { text: 'Activación de Reglas', font: { size: 14, color: '#333' } },
        xaxis: { 
            title: 'Reglas',
            tickangle: 0,
            showgrid: false
        },
        yaxis: { 
            title: 'Fuerza de Activación',
            range: [0, 1.05],
            gridcolor: '#e8e8e8'
        },
        margin: { t: 40, r: 20, b: 40, l: 60 },
        plot_bgcolor: '#fafafa',
        paper_bgcolor: '#fff',
        showlegend: false,
        hovermode: 'closest'
    };

    try {
        // First purge the chart
        Plotly.purge(chartDiv);
        // Then plot
        Plotly.newPlot(chartDiv, [barTrace], layout, { responsive: true, displayModeBar: false });
    } catch (err) {
        console.error('Error plotting rules:', err);
        chartDiv.innerHTML = '<p style="color: red;">Error en gráfico de reglas: ' + err.message + '</p>';
    }
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
    const ruleBuilder = document.getElementById('fruleBuilder');
    if (!ruleBuilder) return;

    // Limpiar el constructor de reglas existente
    ruleBuilder.innerHTML = '';

    // Crear dinámicamente los selectores según el número de variables de entrada
    const numInputs = fcurrentFIS.inputs.length;
    const numOutputs = fcurrentFIS.outputs.length;

    if (numInputs === 0) {
        ruleBuilder.innerHTML = '<p style="color: var(--text-medium); padding: 12px;">No input variables defined. Add input variables first.</p>';
        return;
    }

    // Crear regla IF con todas las variables de entrada
    let ruleHTML = '';
    
    for (let i = 0; i < numInputs; i++) {
        if (i === 0) {
            ruleHTML += '<div class="frule-part"><span>IF</span> ';
        } else {
            ruleHTML += '<div class="frule-part"><select id="fruleConnector_' + i + '" class="fform-select" style="width: 60px;"><option value="and">AND</option><option value="or">OR</option></select> ';
        }
        ruleHTML += '<select id="fruleInput' + i + '" class="fform-select" onchange="fupdateRuleMFDropdowns()"></select>';
        ruleHTML += '<span>IS</span>';
        ruleHTML += '<select id="fruleMF' + i + '" class="fform-select"></select>';
        ruleHTML += '</div>';
    }

    // Agregar THEN con variables de salida
    for (let i = 0; i < numOutputs; i++) {
        if (i === 0) {
            ruleHTML += '<div class="frule-part"><span>THEN</span> ';
        } else {
            ruleHTML += '<div class="frule-part"><select id="fruleOutputConnector_' + i + '" class="fform-select" style="width: 60px;"><option value="and">AND</option><option value="or">OR</option></select> ';
        }
        ruleHTML += '<select id="fruleOutput' + i + '" class="fform-select" onchange="fupdateRuleMFDropdowns()"></select>';
        ruleHTML += '<span>IS</span>';
        ruleHTML += '<select id="fruleOutputMF' + i + '" class="fform-select"></select>';
        ruleHTML += '</div>';
    }

    // Peso de la regla
    ruleHTML += '<div class="frule-part"><span>Weight:</span><input type="number" id="fruleWeight" class="fform-input" value="1" min="0" max="1" step="0.1" style="width: 80px;"></div>';

    // Botón para agregar
    ruleHTML += '<button class="ftoolbar-btn" onclick="faddRuleFromBuilder()" style="width: 100%; margin-top: 12px;"><span class="icon">➕</span> Add Rule</button>';

    ruleBuilder.innerHTML = ruleHTML;

    // Poblar los selectores de variables
    fcurrentFIS.inputs.forEach((input, idx) => {
        const select = document.getElementById('fruleInput' + idx);
        if (select) {
            select.innerHTML = '';
            fcurrentFIS.inputs.forEach(i => {
                const opt = document.createElement('option');
                opt.value = i.name;
                opt.textContent = i.name;
                select.appendChild(opt);
            });
        }
    });

    fcurrentFIS.outputs.forEach((output, idx) => {
        const select = document.getElementById('fruleOutput' + idx);
        if (select) {
            select.innerHTML = '';
            fcurrentFIS.outputs.forEach(o => {
                const opt = document.createElement('option');
                opt.value = o.name;
                opt.textContent = o.name;
                select.appendChild(opt);
            });
        }
    });

    fupdateRuleMFDropdowns();
}

function fupdateRuleMFDropdowns() {
    const numInputs = fcurrentFIS.inputs.length;
    const numOutputs = fcurrentFIS.outputs.length;

    // Actualizar MF dropdowns para todas las entradas
    for (let i = 0; i < numInputs; i++) {
        const inputSelect = document.getElementById('fruleInput' + i);
        const mfSelect = document.getElementById('fruleMF' + i);
        
        if (inputSelect && mfSelect) {
            const varName = inputSelect.value;
            const variable = fcurrentFIS.inputs.find(v => v.name === varName);
            
            mfSelect.innerHTML = '';
            if (variable) {
                variable.membershipFunctions.forEach(mf => {
                    const opt = document.createElement('option');
                    opt.value = mf.name;
                    opt.textContent = mf.name;
                    mfSelect.appendChild(opt);
                });
            }
        }
    }

    // Actualizar MF dropdowns para todas las salidas
    for (let i = 0; i < numOutputs; i++) {
        const outputSelect = document.getElementById('fruleOutput' + i);
        const mfSelect = document.getElementById('fruleOutputMF' + i);
        
        if (outputSelect && mfSelect) {
            const varName = outputSelect.value;
            const variable = fcurrentFIS.outputs.find(v => v.name === varName);
            
            mfSelect.innerHTML = '';
            if (variable) {
                variable.membershipFunctions.forEach(mf => {
                    const opt = document.createElement('option');
                    opt.value = mf.name;
                    opt.textContent = mf.name;
                    mfSelect.appendChild(opt);
                });
            }
        }
    }
}

function faddRuleFromBuilder() {
    const numInputs = fcurrentFIS.inputs.length;
    const numOutputs = fcurrentFIS.outputs.length;
    const weight = parseFloat(document.getElementById('fruleWeight').value) || 1;

    // Construir antecedente dinámicamente
    const antecedent = [];
    for (let i = 0; i < numInputs; i++) {
        const inputSelect = document.getElementById('fruleInput' + i);
        const mfSelect = document.getElementById('fruleMF' + i);
        
        if (inputSelect && mfSelect) {
            const input = inputSelect.value;
            const mf = mfSelect.value;
            
            if (i === 0) {
                antecedent.push([input, mf]);
            } else {
                const connector = document.getElementById('fruleConnector_' + i);
                const conn = connector ? connector.value : 'and';
                antecedent.push([input, mf, conn]);
            }
        }
    }

    // Construir consecuente dinámicamente
    const consequent = [];
    for (let i = 0; i < numOutputs; i++) {
        const outputSelect = document.getElementById('fruleOutput' + i);
        const mfSelect = document.getElementById('fruleOutputMF' + i);
        
        if (outputSelect && mfSelect) {
            const output = outputSelect.value;
            const mf = mfSelect.value;
            
            if (i === 0) {
                consequent.push([output, mf]);
            } else {
                const connector = document.getElementById('fruleOutputConnector_' + i);
                const conn = connector ? connector.value : 'and';
                consequent.push([output, mf, conn]);
            }
        }
    }

    if (antecedent.length === 0 || consequent.length === 0) {
        fshowNotification('Please configure all rule parts');
        return;
    }

    // Si estamos editando una regla existente
    if (feditingRuleIndex !== null) {
        fcurrentFIS.rules[feditingRuleIndex] = {
            antecedent: antecedent,
            consequent: consequent,
            weight: weight
        };
        fupdateRuleList();
        fshowNotification(`Rule ${feditingRuleIndex + 1} updated successfully`);
        feditingRuleIndex = null;
        
        // Resetear el botón a "Add Rule"
        const addButton = document.querySelector('#fruleBuilder .ftoolbar-btn');
        if (addButton) {
            addButton.innerHTML = '<span class="icon">➕</span> Add Rule';
            addButton.onclick = () => faddRuleFromBuilder();
        }
    } else {
        // Agregar nueva regla
        fcurrentFIS.addRule(antecedent, consequent, weight);
        fupdateRuleList();
        fshowNotification(`Rule added successfully (Total rules: ${fcurrentFIS.rules.length})`);
    }
}

function feditRule(index) {
    feditingRuleIndex = index;
    const rule = fcurrentFIS.rules[index];
    
    if (!rule) {
        fshowNotification('Rule not found');
        return;
    }

    // Cargar los valores de la regla en el builder
    const numInputs = fcurrentFIS.inputs.length;
    const numOutputs = fcurrentFIS.outputs.length;

    // Set antecedent values
    for (let i = 0; i < numInputs && i < rule.antecedent.length; i++) {
        const inputSelect = document.getElementById('fruleInput' + i);
        const mfSelect = document.getElementById('fruleMF' + i);
        
        if (inputSelect && mfSelect) {
            inputSelect.value = rule.antecedent[i][0];
            fupdateRuleMFDropdowns();
            mfSelect.value = rule.antecedent[i][1];
        }
        
        if (i > 0) {
            const connectorSelect = document.getElementById('fruleConnector_' + i);
            if (connectorSelect && rule.antecedent[i][2]) {
                connectorSelect.value = rule.antecedent[i][2];
            }
        }
    }

    // Set consequent values
    for (let i = 0; i < numOutputs && i < rule.consequent.length; i++) {
        const outputSelect = document.getElementById('fruleOutput' + i);
        const mfSelect = document.getElementById('fruleOutputMF' + i);
        
        if (outputSelect && mfSelect) {
            outputSelect.value = rule.consequent[i][0];
            fupdateRuleMFDropdowns();
            mfSelect.value = rule.consequent[i][1];
        }
        
        if (i > 0) {
            const connectorSelect = document.getElementById('fruleOutputConnector_' + i);
            if (connectorSelect && rule.consequent[i][2]) {
                connectorSelect.value = rule.consequent[i][2];
            }
        }
    }

    // Set weight
    const weightInput = document.getElementById('fruleWeight');
    if (weightInput) {
        weightInput.value = rule.weight || 1;
    }

    // Change button text to "Update Rule"
    const addButton = document.querySelector('#fruleBuilder .ftoolbar-btn');
    if (addButton) {
        addButton.innerHTML = '<span class="icon">✏️</span> Update Rule';
        addButton.onclick = () => fupdateRuleFromBuilder();
    }

    fshowNotification(`Editing Rule ${index + 1}. Click "Update Rule" to save changes.`);
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

    // Inicializar selects
    const inputXSelect = document.getElementById('fsurfaceInputX');
    const inputYSelect = document.getElementById('fsurfaceInputY');
    const outputSelect = document.getElementById('fsurfaceOutput');
    
    inputXSelect.innerHTML = '';
    inputYSelect.innerHTML = '';
    outputSelect.innerHTML = '';
    
    fcurrentFIS.inputs.forEach(input => {
        const opt1 = document.createElement('option');
        opt1.value = input.name;
        opt1.textContent = input.name;
        inputXSelect.appendChild(opt1);
        
        const opt2 = document.createElement('option');
        opt2.value = input.name;
        opt2.textContent = input.name;
        inputYSelect.appendChild(opt2);
    });
    
    fcurrentFIS.outputs.forEach(output => {
        const opt = document.createElement('option');
        opt.value = output.name;
        opt.textContent = output.name;
        outputSelect.appendChild(opt);
    });
    
    // Set defaults
    if (fcurrentFIS.inputs.length >= 2) {
        inputXSelect.value = fcurrentFIS.inputs[0].name;
        inputYSelect.value = fcurrentFIS.inputs[1].name;
    }
    if (fcurrentFIS.outputs.length > 0) {
        outputSelect.value = fcurrentFIS.outputs[0].name;
    }
    
    // Colormap default
    document.getElementById('fsurfaceColormap').value = 'Viridis';
    document.getElementById('fsurfaceResolution').value = 20;
    
    openModal('fsurfaceViewer');
    
    // Esperar a que el modal se renderice antes de dibujar
    setTimeout(() => {
        fupdateSurfaceViewOptions();
        
        // Agregar listener para redimensionamiento
        const modal = document.getElementById('fsurfaceViewer');
        window.addEventListener('resize', fupdateSurfaceViewOptions);
    }, 100);
}

function fcloseSurfaceViewer() {
    closeModal('fsurfaceViewer');
    window.removeEventListener('resize', fupdateSurfaceViewOptions);
}function fupdateSurfaceViewOptions() {
    const inputXName = document.getElementById('fsurfaceInputX').value;
    const inputYName = document.getElementById('fsurfaceInputY').value;
    const outputName = document.getElementById('fsurfaceOutput').value;
    const colormap = document.getElementById('fsurfaceColormap').value;
    const resolution = parseInt(document.getElementById('fsurfaceResolution').value);
    
    // Update resolution label
    document.getElementById('fsurfaceResolutionLabel').textContent = resolution + ' pts';
    
    const inputX = fcurrentFIS.inputs.find(i => i.name === inputXName);
    const inputY = fcurrentFIS.inputs.find(i => i.name === inputYName);
    const output = fcurrentFIS.outputs.find(o => o.name === outputName);
    
    if (!inputX || !inputY || !output) {
        fshowNotification('Invalid variable selection');
        return;
    }
    
    // Generate surface data
    const surfaceData = fcurrentFIS.generateSurfaceData(inputX, inputY, output, resolution);

    const trace = {
        z: surfaceData.z,
        x: surfaceData.x,
        y: surfaceData.y,
        type: 'surface',
        colorscale: colormap,
        showscale: true,
        colorbar: {
            title: output.name,
            thickness: 20,
            len: 0.7,
            tickfont: { size: 10 }
        },
        hovertemplate: `${inputXName}: %{x:.2f}<br>${inputYName}: %{y:.2f}<br>${output.name}: %{z:.2f}<extra></extra>`
    };

    const surfaceChart = document.getElementById('fsurfaceChart');
    if (!surfaceChart) {
        fshowNotification('Surface chart element not found');
        return;
    }

    try {
        // Calcular dimensiones reales del contenedor gráfica
        let chartWidth = surfaceChart.offsetWidth;
        let chartHeight = surfaceChart.offsetHeight;
        
        // Si las dimensiones son 0, usar valores por defecto
        if (chartWidth <= 0) chartWidth = 800;
        if (chartHeight <= 0) chartHeight = 600;

        const layout = {
            title: {
                text: `${output.name} = f(${inputXName}, ${inputYName})`,
                font: { size: 16, color: '#222' }
            },
            scene: {
                xaxis: { 
                    title: inputXName,
                    backgroundcolor: 'rgb(240, 240, 240)',
                    gridcolor: '#ddd',
                    showbackground: true,
                    type: 'linear'
                },
                yaxis: { 
                    title: inputYName,
                    backgroundcolor: 'rgb(240, 240, 240)',
                    gridcolor: '#ddd',
                    showbackground: true,
                    type: 'linear'
                },
                zaxis: { 
                    title: output.name,
                    backgroundcolor: 'rgb(240, 240, 240)',
                    gridcolor: '#ddd',
                    showbackground: true,
                    type: 'linear'
                },
                camera: {
                    eye: { x: 1.5, y: 1.5, z: 1.3 }
                }
            },
            width: chartWidth,
            height: chartHeight,
            margin: { l: 60, r: 60, b: 60, t: 60 },
            paper_bgcolor: '#fff',
            responsive: false,
            autosize: false
        };
        
        const config = {
            responsive: false, 
            displayModeBar: true, 
            displaylogo: false,
            modeBarButtonsToRemove: ['lasso2d', 'select2d']
        };
        
        Plotly.purge(surfaceChart);
        Plotly.newPlot(surfaceChart, [trace], layout, config);
        fshowNotification(`✓ Surface actualizada: ${colormap}`);
    } catch (err) {
        console.error('Surface plotting exception', err);
        fshowNotification('Error al generar superficie');
    }
}

function fcloseSurfaceViewer() {
    closeModal('fsurfaceViewer');
    window.removeEventListener('resize', fupdateSurfaceViewOptions);
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
        const varType = fcurrentFIS.inputs.includes(fselectedVariable) ? 'Input' : 'Output';
        const mfList = fselectedVariable.membershipFunctions.map(m => m.name).join(', ');
        infoDiv.innerHTML = `
            <div><strong>Name:</strong> ${fselectedVariable.name}</div>
            <div><strong>Type:</strong> ${varType} Variable</div>
            <div><strong>Range:</strong> [${fselectedVariable.range[0]}, ${fselectedVariable.range[1]}]</div>
            <div><strong>MF Count:</strong> ${fselectedVariable.membershipFunctions.length}</div>
            <div style="font-size: 11px; color: #666; margin-top: 6px; padding-top: 6px; border-top: 1px solid #ddd;">
                <strong>Functions:</strong> ${mfList || 'None'}
            </div>
        `;
    } else {
        infoDiv.innerHTML = '<div style="color: var(--text-medium);">No variable selected. Click on a variable to view details.</div>';
    }
}

function fupdateFISProperties() {
    const propsDiv = document.getElementById('ffisProperties');
    if (!propsDiv) return;
    
    const inputVarsList = fcurrentFIS.inputs.map(i => i.name).join(', ') || 'None';
    const outputVarsList = fcurrentFIS.outputs.map(o => o.name).join(', ') || 'None';
    
    propsDiv.innerHTML = `
        <div style="background: #f5f5f5; padding: 8px; border-radius: 4px; margin-bottom: 8px;">
            <div><strong>FIS Name:</strong> ${fcurrentFIS.name}</div>
            <div><strong>Type:</strong> ${fcurrentFIS.type.charAt(0).toUpperCase() + fcurrentFIS.type.slice(1)}</div>
        </div>
        <div style="background: #f5f5f5; padding: 8px; border-radius: 4px; margin-bottom: 8px;">
            <div><strong>Inference:</strong> ${fcurrentFIS.andMethod}/${fcurrentFIS.orMethod}</div>
            <div><strong>Defuzzification:</strong> ${fcurrentFIS.defuzzMethod}</div>
            <div><strong>Implication:</strong> ${fcurrentFIS.impMethod}</div>
            <div><strong>Aggregation:</strong> ${fcurrentFIS.aggMethod}</div>
        </div>
        <div style="background: #f5f5f5; padding: 8px; border-radius: 4px; margin-bottom: 8px;">
            <div><strong>🔢 Inputs:</strong> ${fcurrentFIS.inputs.length} variables</div>
            <div style="font-size: 11px; color: #666; margin-top: 4px;">${inputVarsList}</div>
        </div>
        <div style="background: #f5f5f5; padding: 8px; border-radius: 4px; margin-bottom: 8px;">
            <div><strong>📤 Outputs:</strong> ${fcurrentFIS.outputs.length} variables</div>
            <div style="font-size: 11px; color: #666; margin-top: 4px;">${outputVarsList}</div>
        </div>
        <div style="background: #e3f2fd; padding: 8px; border-radius: 4px; border-left: 4px solid #0078d4;">
            <div><strong>📋 Rules:</strong> ${fcurrentFIS.rules.length} rules loaded</div>
        </div>
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

// ======== EXPORT/IMPORT FIS ========

// ======== VALIDATE FIS ========

// ======== ANALYZE COVERAGE ========

document.addEventListener('DOMContentLoaded', function() {
    finitializeApp();
});
