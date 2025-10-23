/* ===== VARIABLES GLOBALES ===== */
let nodes = [], edges = [], selectedNode = null, draggingNode = null, nodeCounter = 1;
let nodeColor = "#00f7ff", edgeColor = "#00f7ff", activeMatrix = null, lastHMap = null, lastCriticalEdges = null, lastOptimalPath = null;
let showCriticalPath = true, showOptimalPath = true; // Controles de visualización
let isJohnsonMode = false; // Nuevo: Estado del modo

/* ===== REFERENCIAS DOM ===== */
const canvas = document.getElementById('canvas'), svg = canvas.querySelector('svg');
const menuToggle = document.getElementById('menuToggle'), menuContent = document.getElementById('menuContent');
// Topbar controls
const edgeTypeSelect = document.getElementById('edgeType');
const edgeTypeDropdown = document.getElementById('edgeTypeDropdown');
const edgeTypeMenu = document.getElementById('edgeTypeMenu');
const edgeTypeLabel = document.getElementById('edgeTypeLabel');
// Colors dropdown
const colorsDropdown = document.getElementById('colorsDropdown');
const colorsMenu = document.getElementById('colorsMenu');
// Analysis dropdown
const analysisDropdown = document.getElementById('analysisDropdown');
const analysisMenu = document.getElementById('analysisMenu');
const analysisJohnson = document.getElementById('analysisJohnson');
const assignMaxBtn = document.getElementById('assignMaxBtn');
const assignMinBtn = document.getElementById('assignMinBtn');
// Assignment modal
const assignmentModal = document.getElementById('assignmentModal');
const assignmentBody = document.getElementById('assignmentBody');
const closeAssignment = document.getElementById('closeAssignment');
const assignmentCloseBtn = document.getElementById('assignmentCloseBtn');

/* ===== FUNCIONALIDAD DE ALTERNANCIA DE MODO ===== */
document.getElementById('toggleMode').addEventListener('click', toggleMode);

function toggleMode() {
    isJohnsonMode = !isJohnsonMode;
    const modeButton = document.getElementById('toggleMode');
    
    if (isJohnsonMode) {
        modeButton.textContent = '🔄 Modo: Johnson';
        modeButton.classList.add('johnson-mode');
        activateJohnsonMode();
    } else {
        modeButton.textContent = '🔄 Modo: Normal';
        modeButton.classList.remove('johnson-mode');
        deactivateJohnsonMode();
    }
}

function activateJohnsonMode() {
    // Eliminar bucles existentes
    const loops = edges.filter(e => e.from === e.to);
    loops.forEach(loop => {
        edges = edges.filter(e => e.id !== loop.id);
        svg.querySelector(`[data-id="${loop.id}"]`)?.remove();
        document.querySelectorAll(`.edge-label[data-from="${loop.from}"][data-to="${loop.to}"]`).forEach(el => el.remove());
    });
    
    // Eliminar aristas bidireccionales existentes
    const bidirectionalPairs = [];
    edges.forEach(e1 => {
        edges.forEach(e2 => {
            if (e1.from === e2.to && e1.to === e2.from && e1.id !== e2.id) {
                if (!bidirectionalPairs.some(p => p.includes(e1.id) && p.includes(e2.id))) {
                    bidirectionalPairs.push([e1.id, e2.id]);
                }
            }
        });
    });
    
    bidirectionalPairs.forEach(pair => {
        // Mantener solo la primera arista y eliminar la segunda
        edges = edges.filter(e => e.id !== pair[1]);
        svg.querySelector(`[data-id="${pair[1]}"]`)?.remove();
    });
    
    updateEdges();
    
    // Mostrar mensaje informativo
    showModeNotification("Modo Johnson activado: Se han eliminado bucles y aristas bidireccionales");
}

function deactivateJohnsonMode() {
    // Limpiar cualquier análisis Johnson activo
    lastHMap = null;
    lastCriticalEdges = null;
    lastOptimalPath = null;
    
    // Limpiar elementos visuales del análisis
    document.querySelectorAll('.h-badge, .h-edge-badge, .info-banner, .bottom-banner, .path-controls').forEach(el => el.remove());
    
    // Restaurar colores normales de las aristas
    svg.querySelectorAll('path').forEach(p => {
        p.style.stroke = edgeColor;
        p.style.filter = '';
        p.style.strokeWidth = '3';
    });
    
    // Restaurar contenido normal de los nodos
    nodes.forEach(n => {
        const el = document.querySelector(`.node[data-id="${n.id}"]`);
        if (el) {
            el.innerHTML = `<div class="node-label">${n.label}</div>`;
        }
    });
    
    showModeNotification("Modo Normal activado: Todas las operaciones están permitidas");
}

function showModeNotification(message) {
    // Eliminar notificaciones anteriores
    document.querySelectorAll('.mode-notification').forEach(el => el.remove());
    
    const notification = document.createElement('div');
    notification.className = 'mode-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

/* ===== UTILIDADES DE VALIDACIÓN ===== */
function promptForWeight(message, defaultValue = '1') {
    while (true) {
        const raw = prompt(message, defaultValue);
        if (raw === null) return null; // cancelado
        const val = Number(raw);
        // Permitir negativos si está en modo asignación
        if (window.isAssignmentMode) {
            if (Number.isFinite(val)) return val;
            alert('Peso inválido. Debe ser numérico.');
        } else {
            if (Number.isFinite(val) && val >= 0) return val;
            alert('Peso inválido. Debe ser un número no negativo.');
        }
    }
}

/* ===== MENÚ (legacy sidebar, si existe) ===== */
if (menuToggle && menuContent) {
    menuToggle.addEventListener('click', () => menuContent.classList.toggle('show'));
    document.addEventListener('click', e => {
        if (!e.target.closest('.menu') && menuContent.classList.contains('show')) menuContent.classList.remove('show');
    });
}

/* ===== TOPBAR: EDGE TYPE DROPDOWN ===== */
function updateEdgeTypeUI(val){
    if (!edgeTypeSelect) return;
    edgeTypeSelect.value = val;
    if (edgeTypeLabel) edgeTypeLabel.textContent = (val === 'directed') ? 'Dirigida' : 'No Dirigida';
}
if (edgeTypeSelect) {
    // Init label from current select value
    updateEdgeTypeUI(edgeTypeSelect.value || 'directed');
    // Reflect changes if select changes programáticamente
    edgeTypeSelect.addEventListener('change', (e)=> updateEdgeTypeUI(e.target.value));
}
if (edgeTypeDropdown && edgeTypeMenu) {
    edgeTypeDropdown.addEventListener('click', (e)=>{
        e.stopPropagation();
        edgeTypeMenu.classList.toggle('show');
    });
    document.querySelectorAll('.edge-type-option').forEach(btn => {
        btn.addEventListener('click', ()=>{
            const val = btn.dataset.value === 'undirected' ? 'undirected' : 'directed';
            updateEdgeTypeUI(val);
            edgeTypeMenu.classList.remove('show');
        });
    });
    document.addEventListener('click', (e)=>{
        if (!e.target.closest('.dropdown')) edgeTypeMenu.classList.remove('show');
    });
}

/* ===== TOPBAR: COLORS DROPDOWN ===== */
if (colorsDropdown && colorsMenu) {
    colorsDropdown.addEventListener('click', (e)=>{
        e.stopPropagation();
        colorsMenu.classList.toggle('show');
    });
    document.addEventListener('click', (e)=>{
        if (!e.target.closest('.dropdown')) colorsMenu.classList.remove('show');
    });
}

/* ===== ANALYSIS DROPDOWN ===== */
if (analysisDropdown && analysisMenu) {
    analysisDropdown.addEventListener('click', (e)=>{
        e.stopPropagation();
        analysisMenu.classList.toggle('show');
    });
    document.addEventListener('click', (e)=>{
        if (!e.target.closest('.dropdown')) analysisMenu.classList.remove('show');
    });
}
if (analysisJohnson) {
    analysisJohnson.addEventListener('click', ()=>{
        analysisMenu?.classList.remove('show');
        johnsonCriticalPath();
    });
}

/* ===== ASSIGNMENT (HUNGARIAN) ===== */
function openAssignmentModal() { if (assignmentModal) assignmentModal.style.display = 'block'; }
function closeAssignmentModal() { if (assignmentModal) assignmentModal.style.display = 'none'; }
closeAssignment?.addEventListener('click', closeAssignmentModal);
assignmentCloseBtn?.addEventListener('click', closeAssignmentModal);

function buildMatrixSets() {
    // Derive rows = nodes con salidas, cols = nodes con entradas (ignorar bucles)
    const outSet = new Set(), inSet = new Set();
    edges.forEach(e => { if (e.from !== e.to) { outSet.add(e.from); inSet.add(e.to); } });
    let rowNodes = nodes.filter(n => outSet.has(n.id));
    let colNodes = nodes.filter(n => inSet.has(n.id));
    // Fallback si no hay aristas: usar todos los nodos
    if (rowNodes.length === 0) rowNodes = [...nodes];
    if (colNodes.length === 0) colNodes = [...nodes];
    return { rowNodes, colNodes };
}

function buildMatrix() {
    const { rowNodes, colNodes } = buildMatrixSets();
    const n = Math.max(rowNodes.length, colNodes.length);
    // map from from-to to weight
    const weightMap = new Map();
    let maxVal = 0;
    edges.forEach(e => {
        if (e.from !== undefined && e.to !== undefined && e.from !== e.to) {
            const w = Number(e.weight) || 0;
            weightMap.set(`${e.from}-${e.to}`, w);
            if (w > maxVal) maxVal = w;
        }
    });
    // benefits matrix (0 for missing)
    const M = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => {
        const r = rowNodes[i]?.id; const c = colNodes[j]?.id;
        if (r==null || c==null) return 0;
        return weightMap.get(`${r}-${c}`) ?? 0;
    }));
    // existence matrix
    const E = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => {
        const r = rowNodes[i]?.id; const c = colNodes[j]?.id;
        if (r==null || c==null) return false;
        return weightMap.has(`${r}-${c}`);
    }));
    const rowNames = rowNodes.map(n=>n.label);
    const colNames = colNodes.map(n=>n.label);
    // pad names if needed
    for (let i=rowNames.length;i<n;i++) rowNames.push(`EXTRA`);
    for (let j=colNames.length;j<n;j++) colNames.push(`EXTRA`);
    return { M, E, rowNames, colNames, maxVal };
}

// Hungarian algorithm for minimization
function hungarian(costs) {
    const n = costs.length; const m = costs[0].length; const N = Math.max(n,m);
    // pad to square
    const a = Array.from({length:N}, (_,i)=>Array.from({length:N},(_,j)=> (i<n&&j<m)?costs[i][j]:0));
    // subtract row minima
    for (let i=0;i<N;i++) { let min = Math.min(...a[i]); for (let j=0;j<N;j++) a[i][j]-=min; }
    // subtract column minima
    for (let j=0;j<N;j++) { let min=Infinity; for (let i=0;i<N;i++) min=Math.min(min,a[i][j]); for (let i=0;i<N;i++) a[i][j]-=min; }
    // cover zeros and adjust
    const INF=1e9; const rowCover=new Array(N).fill(false), colCover=new Array(N).fill(false);
    const star = Array.from({length:N},()=>new Array(N).fill(false));
    const prime = Array.from({length:N},()=>new Array(N).fill(false));
    // initial star zeros (one per row if possible)
    for (let i=0;i<N;i++) {
        for (let j=0;j<N;j++) if (a[i][j]===0 && !rowCover[i] && !colCover[j]) { star[i][j]=true; rowCover[i]=colCover[j]=true; }
    }
    rowCover.fill(false); colCover.fill(false);
    const findStarInCol = (j)=>{ for (let i=0;i<N;i++) if (star[i][j]) return i; return -1; };
    const findStarInRow = (i)=>{ for (let j=0;j<N;j++) if (star[i][j]) return j; return -1; };
    const findPrimeInRow = (i)=>{ for (let j=0;j<N;j++) if (prime[i][j]) return j; return -1; };
    while (true) {
        // cover columns with starred zeros
        for (let i=0;i<N;i++) for (let j=0;j<N;j++) if (star[i][j]) colCover[j]=true;
        let coveredCols = colCover.reduce((s,v)=>s+(v?1:0),0);
        if (coveredCols===N) break;
        // find a noncovered zero and prime it
        while (true) {
            let zRow=-1,zCol=-1;
            for (let i=0;i<N;i++) if (!rowCover[i]) {
                for (let j=0;j<N;j++) if (!colCover[j] && a[i][j]===0) { zRow=i; zCol=j; break; }
                if (zRow!==-1) break;
            }
            if (zRow===-1) {
                // adjust matrix
                let min=INF; for (let i=0;i<N;i++) if (!rowCover[i]) for (let j=0;j<N;j++) if (!colCover[j]) min=Math.min(min,a[i][j]);
                for (let i=0;i<N;i++) if (rowCover[i]) for (let j=0;j<N;j++) a[i][j]+=min;
                for (let j=0;j<N;j++) if (!colCover[j]) for (let i=0;i<N;i++) a[i][j]-=min;
            } else {
                prime[zRow][zCol]=true;
                const starCol = findStarInRow(zRow);
                if (starCol!==-1) {
                    rowCover[zRow]=true; colCover[starCol]=false;
                } else {
                    // augmenting path
                    let path=[{r:zRow,c:zCol}];
                    while (true) {
                        const r = findStarInCol(path[path.length-1].c);
                        if (r===-1) break;
                        path.push({r, c: path[path.length-1].c});
                        const c = findPrimeInRow(r);
                        path.push({r, c});
                    }
                    // flip stars
                    for (const p of path) star[p.r][p.c] = !star[p.r][p.c];
                    // clear covers and primes
                    rowCover.fill(false); colCover.fill(false);
                    for (let i=0;i<N;i++) for (let j=0;j<N;j++) prime[i][j]=false;
                    break;
                }
            }
        }
    }
    // extract assignment and cost
    const assign = new Array(N).fill(-1);
    for (let i=0;i<N;i++) for (let j=0;j<N;j++) if (star[i][j]) assign[i]=j;
    return assign.slice(0, costs.length).map((j,i)=> ({row:i, col:j}));
}

function runAssignment(mode) {
    const { M, E, rowNames, colNames, maxVal } = buildMatrix();
    const n = M.length;
    let C;
    if (mode === 'max') {
        // Maximizar: transformar a minimización
        const base = Math.max(1, maxVal);
        C = M.map(row => row.map(v => base - v));
    } else {
        // Minimizar: penalizar celdas sin arista
        const BIG = (maxVal || 1) * 10 + 1;
        C = M.map((row, i) => row.map((v, j) => E[i][j] ? v : BIG));
    }
    const assignment = hungarian(C);

    // Calcular total y pares asignados
    let total = 0;
    const pairs = [];
    assignment.forEach(({ row, col }) => {
        if (col >= 0 && col < colNames.length && row < rowNames.length) {
            total += M[row][col];
            pairs.push({ from: rowNames[row], to: colNames[col], value: M[row][col] });
        }
    });

    // Mostrar matriz y resultado
    let html = `<div class="assignment-summary"><b>Resultado de Asignación (${mode === 'max' ? 'Máxima' : 'Mínima'}):</b> <span class="assignment-total">${total}</span></div>`;
    html += `<div class="assignment-grid" style="grid-template-columns: 140px repeat(${n}, 1fr)">`;
    html += `<div></div>`;
    for (let j = 0; j < n; j++) html += `<div class="header">${colNames[j]}</div>`;
    for (let i = 0; i < n; i++) {
        html += `<div class="header">${rowNames[i]}</div>`;
        for (let j = 0; j < n; j++) {
            const isAssigned = assignment.some(a => a.row === i && a.col === j);
            const cls = isAssigned ? 'assignment-cell selected' : 'assignment-cell';
            html += `<div class="${cls}">${M[i][j]}</div>`;
        }
    }
    html += `</div>`;
    if (pairs.length) {
        html += `<div class="assignment-pairs"><b>Pares óptimos:</b>` +
            pairs.map(p => `<div class="pair"><span class="k">${p.from}</span> → <span class="k">${p.to}</span> <span class="v">(${p.value})</span></div>`).join('') +
            `</div>`;
    }
    assignmentBody.innerHTML = html;
    openAssignmentModal();
}

/* ===== COLORES ===== */
document.getElementById('nodeColor').addEventListener('change', e => {
    nodeColor = e.target.value;
    nodes.forEach(n => {
        const el = document.querySelector(`.node[data-id="${n.id}"]`);
        if (el) el.style.background = `radial-gradient(circle, ${nodeColor}, var(--accent))`;
    });
});
document.getElementById('edgeColor').addEventListener('change', e => {
    edgeColor = e.target.value;
    svg.querySelectorAll('path').forEach(p => p.setAttribute('stroke', edgeColor));
    svg.querySelectorAll('.arrow-marker polygon').forEach(p => p.setAttribute('fill', edgeColor));
});

/* ===== CREAR NODO ===== */
canvas.addEventListener('click', e => {
    if (['canvas','grid','svg'].includes(e.target.id) || e.target.classList.contains('grid')) {
        const rect = canvas.getBoundingClientRect();
        addNode(e.clientX - rect.left, e.clientY - rect.top);
    }
});
function addNode(x, y) {
    const node = { id: nodeCounter, x, y, label: `N${nodeCounter}` };
    nodes.push(node);
    const nodeEl = document.createElement('div');
    nodeEl.className = 'node'; nodeEl.dataset.id = nodeCounter;
    nodeEl.style.left = `${x - 25}px`; nodeEl.style.top = `${y - 25}px`;
    nodeEl.style.background = `radial-gradient(circle, ${nodeColor}, var(--accent))`;
    nodeEl.textContent = node.label;
    canvas.appendChild(nodeEl);
    nodeCounter++;
}

/* ===== CONECTAR NODOS ===== */
canvas.addEventListener('dblclick', e => {
    if (e.target.classList.contains('node')) {
        const nodeId = parseInt(e.target.dataset.id);
        if (selectedNode === null) {
            selectedNode = nodeId; e.target.classList.add('selected');
        
        } else {
            addEdge(selectedNode, nodeId);
            document.querySelector(`.node[data-id="${selectedNode}"]`).classList.remove('selected'); selectedNode = null;
        }
    }
});
function addEdge(fromId, toId) {
    // Aplicar restricciones si estamos en modo Johnson
    if (isJohnsonMode) {
        // Verificar si es un bucle
        if (fromId === toId) {
            alert('En modo Johnson no se permiten bucles (conexiones de un nodo a sí mismo).');
            return;
        }
        // Verificar si ya existe una arista en la dirección opuesta
        const reverseExists = edges.some(e => e.from === toId && e.to === fromId);
        if (reverseExists) {
            alert('En modo Johnson no se permiten aristas en ambas direcciones entre los mismos nodos.');
            return;
        }
    }
    // Usar promptForWeight para permitir negativos en modo asignación
    const weight = promptForWeight(`Peso ${fromId}→${toId}:`, '1');
    if (weight === null) return;
    const directed = document.getElementById('edgeType').value === 'directed';
    edges.push({ id: Date.now(), from: fromId, to: toId, weight, directed });
    updateEdges();
}

/* ===== DIBUJAR ARISTAS ===== */
function drawEdge(edge) {
    const fromNode = nodes.find(n => n.id === edge.from);
    const toNode = nodes.find(n => n.id === edge.to);
    if (!fromNode || !toNode) return;

    let path;
    if (fromNode.id === toNode.id) {
        // Dibuja un arco circular para el bucle
        const r = 32; // radio del bucle
        const cx = fromNode.x;
        const cy = fromNode.y;
        const startAngle = Math.PI / 4;
        const endAngle = Math.PI * 1.25;
        const x1 = cx + r * Math.cos(startAngle);
        const y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(endAngle);
        const y2 = cy + r * Math.sin(endAngle);

        path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'edge-path');
        path.setAttribute('data-id', edge.id);
        path.setAttribute('data-from', edge.from);
        path.setAttribute('data-to', edge.to);
        path.setAttribute('stroke', edgeColor);
        path.setAttribute('fill', 'none');
        path.setAttribute(
            'd',
            `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y2}`
        );
        svg.appendChild(path);

        // Etiqueta del peso en el bucle
        const label = document.createElement('div');
        label.className = 'edge-label';
        label.textContent = edge.weight;
        label.style.left = `${cx + r + 8}px`;
        label.style.top = `${cy - r - 8}px`;
        label.dataset.from = edge.from;
        label.dataset.to = edge.to;
        label.addEventListener('dblclick', () => editEdgeWeight(edge.id));
        canvas.appendChild(label);
        return;
    }

    // Aristas normales
    const dx = toNode.x - fromNode.x, dy = toNode.y - fromNode.y, distance = Math.sqrt(dx * dx + dy * dy);
    const offset = Math.min(distance * 0.3, 60), offsetX = -dy * offset / distance, offsetY = dx * offset / distance;
    const cp1x = fromNode.x + dx * 0.3 + offsetX, cp1y = fromNode.y + dy * 0.3 + offsetY;
    const cp2x = toNode.x - dx * 0.3 + offsetX, cp2y = toNode.y - dy * 0.3 + offsetY;
    path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'edge-path');
    path.setAttribute('data-id', edge.id);
    path.setAttribute('data-from', edge.from);
    path.setAttribute('data-to', edge.to);
    path.setAttribute('stroke', edgeColor);
    path.setAttribute('d', `M ${fromNode.x} ${fromNode.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toNode.x} ${toNode.y}`);
    if (edge.directed) {
        if (edge.bidirectional) {
            path.setAttribute('marker-start', 'url(#arrowtail)');
            path.setAttribute('marker-end', 'url(#arrowhead)');
        } else {
            path.setAttribute('marker-end', 'url(#arrowhead)');
        }
    }
    svg.appendChild(path);
    const midX = (fromNode.x + toNode.x) / 2 + offsetX * 0.5, midY = (fromNode.y + toNode.y) / 2 + offsetY * 0.5;
    const label = document.createElement('div');
    label.className = 'edge-label';
    label.textContent = edge.weight;
    label.style.left = `${midX}px`;
    label.style.top = `${midY}px`;
    label.dataset.from = edge.from;
    label.dataset.to = edge.to;
    label.addEventListener('dblclick', () => editEdgeWeight(edge.id));
    canvas.appendChild(label);
}
function editEdgeWeight(edgeId) {
    const edge = edges.find(e => e.id === edgeId);
    if (!edge) return;
    const newWeight = promptForWeight('Nuevo peso:', String(edge.weight));
    if (newWeight !== null) {
        edge.weight = newWeight;
        updateEdges();
    }
}
function updateEdges() {
    svg.querySelectorAll('path').forEach(p => p.remove());
    document.querySelectorAll('.edge-label, .edge-h').forEach(l => l.remove());
    edges.forEach(edge => drawEdge(edge));
    if (lastHMap) renderEdgeHUnderWeights(lastHMap);
    // Reaplicar resaltado de ruta crítica y óptima si existen y están activas
    if (lastCriticalEdges && showCriticalPath) applyCriticalHighlight(lastCriticalEdges);
    if (lastOptimalPath && showOptimalPath) applyOptimalPathHighlight(lastOptimalPath);
}

/* ===== MENÚ CONTEXTUAL ===== */
canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    const menu = document.querySelector('.context-menu');
    if (menu) menu.remove();
    if (e.target.classList.contains('node')) {
        const nodeId = parseInt(e.target.dataset.id);
        showNodeMenu(e.clientX, e.clientY, nodeId);
    } else if (e.target.classList.contains('edge-label')) {
        const from = parseInt(e.target.dataset.from), to = parseInt(e.target.dataset.to);
        const edge = edges.find(e => e.from === from && e.to === to);
        if (edge) showEdgeMenu(e.clientX, e.clientY, edge.id);
    }
});
function showNodeMenu(x, y, id) {
    const menu = createMenu(); menu.style.left = `${x}px`; menu.style.top = `${y}px`;
    addItem(menu, 'Editar nombre', () => {
        const node = nodes.find(n => n.id === id);
        const el = document.querySelector(`.node[data-id="${id}"]`);
        const newName = prompt('Nuevo nombre:', node.label);
        if (newName) { node.label = newName; el.textContent = newName; }
        menu.remove();
    });
    
    // Solo mostrar opción de crear bucle si NO estamos en modo Johnson
    if (!isJohnsonMode) {
        addItem(menu, 'Crear bucle', () => {
            addEdge(id, id);
            menu.remove();
        });
    }
    
    addItem(menu, 'Eliminar nodo', () => {
        nodes = nodes.filter(n => n.id !== id);
        document.querySelector(`.node[data-id="${id}"]`).remove();
        edges = edges.filter(e => {
            if (e.from === id || e.to === id) {
                svg.querySelector(`[data-id="${e.id}"]`)?.remove();
                document.querySelectorAll(`.edge-label[data-from="${e.from}"][data-to="${e.to}"]`).forEach(el => el.remove());
                return false;
            }
            return true;
        });
        updateEdges();
        menu.remove();
    });
    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 100);
}
function showEdgeMenu(x, y, id) {
    const menu = createMenu(); menu.style.left = `${x}px`; menu.style.top = `${y}px`;
    const edge = edges.find(e => e.id === id);
    if (!edge) return;
    addItem(menu, 'Editar peso', () => { editEdgeWeight(id); menu.remove(); });
    
    if (edge.directed && edge.from !== edge.to) {
        addItem(menu, 'Cambiar dirección', () => {
            // En modo Johnson, verificar si la dirección opuesta ya existe
            if (isJohnsonMode) {
                const reverseExists = edges.some(e => e.id !== id && e.from === edge.to && e.to === edge.from);
                if (reverseExists) {
                    alert('En modo Johnson no se permite tener ambas direcciones entre los mismos nodos.');
                    menu.remove();
                    return;
                }
            }
            
            [edge.from, edge.to] = [edge.to, edge.from];
            updateEdges();
            menu.remove();
        });
    }
    
    addItem(menu, edge.directed ? 'Hacer no dirigida' : 'Hacer dirigida', () => {
        edge.directed = !edge.directed; edge.bidirectional = false; updateEdges(); menu.remove();
    });
    
    addItem(menu, 'Eliminar arista', () => { edges = edges.filter(e => e.id !== id); updateEdges(); menu.remove(); });
    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 100);
}
function createMenu() { const menu = document.createElement('div'); menu.className = 'context-menu'; return menu; }
function addItem(menu, text, onClick) { const item = document.createElement('div'); item.className = 'context-menu-item'; item.textContent = text; item.onclick = onClick; menu.appendChild(item); }

/* ===== EXPORTAR / IMPORTAR ===== */
// Export modal elements
const exportModal = document.getElementById('exportModal');
const exportFileName = document.getElementById('exportFileName');
const exportConfirm = document.getElementById('exportConfirm');
const exportCancel = document.getElementById('exportCancel');
const closeExportBtn = document.getElementById('closeExport');

function openExportModal() {
    if (!exportModal) return;
    exportModal.style.display = 'block';
    exportFileName.value = exportFileName.value?.trim() || 'grafo';
    setTimeout(()=> exportFileName.focus(), 10);
}
function closeExportModal() {
    if (!exportModal) return;
    exportModal.style.display = 'none';
}
function performExport(name) {
    const safe = (name || '').trim() || 'grafo';
    
    // Preparar datos para exportar incluyendo análisis Johnson
    const data = { 
        nodes, 
        edges, 
        nodeColor, 
        edgeColor,
        isJohnsonMode, // Guardar el estado del modo
        // Guardar datos del análisis Johnson si existen
        johnsonAnalysis: lastHMap ? {
            hMap: Array.from(lastHMap.entries()),
            criticalEdges: lastCriticalEdges ? Array.from(lastCriticalEdges) : [],
            optimalPath: lastOptimalPath ? Array.from(lastOptimalPath) : []
        } : null
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safe}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

document.getElementById('saveGraph').addEventListener('click', () => {
    openExportModal();
});
if (exportConfirm) exportConfirm.addEventListener('click', () => {
    performExport(exportFileName.value);
    closeExportModal();
});
if (exportCancel) exportCancel.addEventListener('click', () => closeExportModal());
if (closeExportBtn) closeExportBtn.addEventListener('click', () => closeExportModal());
// Close with ESC, confirm with Enter
document.addEventListener('keydown', (e)=>{
    if (exportModal && exportModal.style.display === 'block') {
        if (e.key === 'Escape') { e.preventDefault(); closeExportModal(); }
        if (e.key === 'Enter') { e.preventDefault(); performExport(exportFileName.value); closeExportModal(); }
    }
});
document.getElementById('loadGraph').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = () => {
            const data = JSON.parse(reader.result);
            nodes = data.nodes || []; 
            edges = data.edges || []; 
            nodeColor = data.nodeColor || '#00f7ff'; 
            edgeColor = data.edgeColor || '#00f7ff';
            
            // Restaurar estado del modo
            isJohnsonMode = data.isJohnsonMode || false;
            const modeButton = document.getElementById('toggleMode');
            if (isJohnsonMode) {
                modeButton.textContent = '🔄 Modo: Johnson';
                modeButton.classList.add('johnson-mode');
            } else {
                modeButton.textContent = '🔄 Modo: Normal';
                modeButton.classList.remove('johnson-mode');
            }
            
            // Restaurar datos del análisis Johnson si existen
            if (data.johnsonAnalysis) {
                lastHMap = new Map(data.johnsonAnalysis.hMap);
                lastCriticalEdges = new Set(data.johnsonAnalysis.criticalEdges);
                lastOptimalPath = new Set(data.johnsonAnalysis.optimalPath);
            } else {
                lastHMap = null;
                lastCriticalEdges = null;
                lastOptimalPath = null;
            }
            
            document.getElementById('nodeColor').value = nodeColor; 
            document.getElementById('edgeColor').value = edgeColor;
            
            // Limpiar el canvas
            document.querySelectorAll('.node, .edge-label, .edge-h, path, .h-badge, .h-edge-badge, .info-banner, .bottom-banner, .path-controls').forEach(el => el.remove());
            
            // Recrear nodos
            nodes.forEach(n => {
                const el = document.createElement('div'); 
                el.className = 'node'; 
                el.dataset.id = n.id;
                el.style.left = `${n.x - 25}px`; 
                el.style.top = `${n.y - 25}px`;
                el.style.background = `radial-gradient(circle, ${nodeColor}, var(--accent))`; 
                el.textContent = n.label; 
                canvas.appendChild(el);
            });
            
            // Recrear aristas
            updateEdges();
            
            // Aplicar colores
            svg.querySelectorAll('path').forEach(p => p.setAttribute('stroke', edgeColor));
            svg.querySelectorAll('.arrow-marker polygon').forEach(p => p.setAttribute('fill', edgeColor));
            
            // Actualizar contador de nodos
            nodeCounter = Math.max(...nodes.map(n => n.id), 0) + 1;
            
            // Mostrar banner y controles si hay análisis cargado
            if (data.johnsonAnalysis && (lastCriticalEdges.size > 0 || lastOptimalPath.size > 0)) {
                document.querySelectorAll('.bottom-banner').forEach(el => el.remove());
                const banner = document.createElement('div');
                banner.className = 'bottom-banner';
                banner.textContent = '✨ Rutas maximizadas y minimizadas cargadas desde archivo ✨';
                document.body.appendChild(banner);
                
                // Crear controles de visualización
                createPathControls();
            }
        };
        reader.readAsText(file);
    };
    input.click();
});

/* ===== LIMPIAR GRAFO ===== */
document.getElementById('clearGraph').addEventListener('click', () => {
    if (confirm('¿Estás seguro de que quieres limpiar todo el grafo?')) {
        nodes = []; edges = []; nodeCounter = 1;
        document.querySelectorAll('.node, .edge-label, .edge-h, path, .h-badge, .h-edge-badge, .info-banner, .bottom-banner, .path-controls').forEach(el => el.remove());
        activeMatrix?.remove();
        lastHMap = null; lastCriticalEdges = null; lastOptimalPath = null;
        showCriticalPath = true; showOptimalPath = true;

        // Volver al modo normal al limpiar
        isJohnsonMode = false;
        const modeButton = document.getElementById('toggleMode');
        modeButton.textContent = '🔄 Modo: Normal';
        modeButton.classList.remove('johnson-mode');

        // Si está activo el modo Asignación, desactivarlo y actualizar botón
        if (window.isAssignmentMode) {
            window.isAssignmentMode = false;
            const assignmentBtn = document.getElementById('toggleAssignmentMode');
            if (assignmentBtn) {
                assignmentBtn.textContent = '🧮 Modo: Asignación';
                assignmentBtn.classList.remove('johnson-mode');
                assignmentBtn.disabled = false;
            }
            showModeNotification('Modo Asignación desactivado al limpiar el grafo.');
        }
    }
});

/* ===== MATRIZ ===== */
document.getElementById('generateMatrix').addEventListener('click', () => {
    if (activeMatrix) { activeMatrix.remove(); activeMatrix = null; return; }
    const container = document.createElement('div');
    container.className = 'matrix-container';
    container.innerHTML = `<div class="matrix-header"><div class="matrix-title">Matriz de Adyacencia</div><button class="close-btn">&times;</button></div><table class="matrix-table">${generateMatrixHTML()}</table>`;
    document.body.appendChild(container); activeMatrix = container;
    container.querySelector('.close-btn').addEventListener('click', () => { container.remove(); activeMatrix = null; });
    container.querySelectorAll('.matrix-input').forEach(input => {
        input.addEventListener('change', e => {
            const from = parseInt(e.target.dataset.from), to = parseInt(e.target.dataset.to);
            const raw = e.target.value;
            let edge = edges.find(e => e.from === from && e.to === to);
            const prev = edge ? edge.weight : 0;

            if (raw === '') {
                // Vacío: eliminar arista si existía
                if (edge) { edges = edges.filter(el => el.id !== edge.id); updateEdges(); }
                return;
            }
            const weight = Number(raw);
            // Permitir negativos si está en modo asignación
            if (window.isAssignmentMode) {
                if (!Number.isFinite(weight)) {
                    alert('Peso inválido. Debe ser numérico.');
                    e.target.value = prev;
                    return;
                }
            } else {
                if (!Number.isFinite(weight) || weight < 0) {
                    alert('Peso inválido. Debe ser numérico y no negativo.');
                    e.target.value = prev;
                    return;
                }
            }
            if (!edge) {
                const directed = document.getElementById('edgeType').value === 'directed';
                edge = { id: Date.now(), from, to, weight, directed };
                edges.push(edge);
            } else {
                edge.weight = weight;
            }
            updateEdges();
        });
    });
});
function generateMatrixHTML() {
    let html = '<tr><th></th>';
    nodes.forEach(n => html += `<th>${n.label}</th>`);
    html += '</tr>';
    nodes.forEach(from => {
        html += `<tr><th>${from.label}</th>`;
        nodes.forEach(to => {
            const edge = edges.find(e => e.from === from.id && e.to === to.id);
            const weight = edge ? edge.weight : 0;
            html += `<td><input type="number" class="matrix-input" data-from="${from.id}" data-to="${to.id}" value="${weight}" min="0" step="0.1"></td>`;
        });
        html += '</tr>';
    });
    return html;
}

/* ===== AYUDA ===== */
document.getElementById('openHelp').addEventListener('click', () => document.getElementById('helpModal').style.display = 'block');
document.getElementById('closeHelp').addEventListener('click', () => document.getElementById('helpModal').style.display = 'none');
document.getElementById('exportPdfBtn').addEventListener('click', () => {
    const helpContent = document.querySelector('.help-content').innerHTML;
    const newWindow = window.open('', '_blank');
    newWindow.document.write(`<html><head><title>Ayuda - Grafo Completo Editable</title><style>body{font-family:Arial,sans-serif;padding:40px;background:#f9f9f9;color:#333}h3{color:#007acc}ul{margin-bottom:20px}li{margin-bottom:8px}@media print{body{background:white}}</style></head><body><h1>Ayuda del Editor de Grafos</h1>${helpContent}</body></html>`);
    newWindow.document.close(); newWindow.print();
});

/* ===== ARRASTRE ===== */
canvas.addEventListener('mousedown', e => { if (e.target.classList.contains('node')) draggingNode = parseInt(e.target.dataset.id); });
document.addEventListener('mousemove', e => {
    if (draggingNode !== null) {
        const rect = canvas.getBoundingClientRect();
        const node = nodes.find(n => n.id === draggingNode);
        if (node) {
            node.x = e.clientX - rect.left; node.y = e.clientY - rect.top;
            updateNodePosition(draggingNode); updateEdges();
        }
    }
});
document.addEventListener('mouseup', () => draggingNode = null);
function updateNodePosition(id) {
    const node = nodes.find(n => n.id === id);
    const el = document.querySelector(`.node[data-id="${id}"]`);
    if (node && el) {
        el.style.left = `${node.x - 25}px`; el.style.top = `${node.y - 25}px`;
        const badge = document.querySelector(`.h-badge[data-id="${id}"]`);
        if (badge) { badge.style.left = `${node.x - 20}px`; badge.style.top = `${node.y + 32}px`; }
        positionHEdgeBadges();
    }
}

/* ===== CONTROLES DE VISUALIZACIÓN DE RUTAS ===== */
function createPathControls() {
    // Eliminar controles existentes
    document.querySelectorAll('.path-controls').forEach(el => el.remove());
    
    const controls = document.createElement('div');
    controls.className = 'path-controls';
    controls.innerHTML = `
        <div class="path-controls-header">Controles de Rutas</div>
        <div class="path-controls-buttons">
            <button class="path-control-btn ${showCriticalPath ? 'active' : ''}" id="toggleCriticalPath">
                ${showCriticalPath ? '🔴' : '⚫'} Maximizar
            </button>
            <button class="path-control-btn ${showOptimalPath ? 'active' : ''}" id="toggleOptimalPath">
                ${showOptimalPath ? '🟢' : '⚫'} Minimizar
            </button>
            <button class="path-control-btn" id="showAllPaths">
                👁️ Mostrar Todas
            </button>
            <button class="path-control-btn" id="hideAllPaths">
                🙈 Ocultar Todas
            </button>
        </div>
    `;
    
    document.body.appendChild(controls);
    
    // Event listeners para los botones
    document.getElementById('toggleCriticalPath').addEventListener('click', toggleCriticalPath);
    document.getElementById('toggleOptimalPath').addEventListener('click', toggleOptimalPath);
    document.getElementById('showAllPaths').addEventListener('click', showAllPaths);
    document.getElementById('hideAllPaths').addEventListener('click', hideAllPaths);
}

function toggleCriticalPath() {
    showCriticalPath = !showCriticalPath;
    updatePathVisualization();
    updatePathControls();
}

function toggleOptimalPath() {
    showOptimalPath = !showOptimalPath;
    updatePathVisualization();
    updatePathControls();
}

function showAllPaths() {
    showCriticalPath = true;
    showOptimalPath = true;
    updatePathVisualization();
    updatePathControls();
}

function hideAllPaths() {
    showCriticalPath = false;
    showOptimalPath = false;
    updatePathVisualization();
    updatePathControls();
}

function updatePathVisualization() {
    // Limpiar todos los estilos primero
    svg.querySelectorAll('path').forEach(p => {
        p.style.stroke = edgeColor;
        p.style.filter = '';
        p.style.strokeWidth = '3';
    });
    
    // Aplicar resaltados según lo que esté activo
    if (showCriticalPath && lastCriticalEdges) {
        applyCriticalHighlight(lastCriticalEdges);
    }
    if (showOptimalPath && lastOptimalPath) {
        applyOptimalPathHighlight(lastOptimalPath);
    }
}

function updatePathControls() {
    const criticalBtn = document.getElementById('toggleCriticalPath');
    const optimalBtn = document.getElementById('toggleOptimalPath');
    
    if (criticalBtn) {
        criticalBtn.innerHTML = `${showCriticalPath ? '🔴' : '⚫'} Maximizar`;
        criticalBtn.classList.toggle('active', showCriticalPath);
    }
    
    if (optimalBtn) {
        optimalBtn.innerHTML = `${showOptimalPath ? '🟢' : '⚫'} Minimizar`;
        optimalBtn.classList.toggle('active', showOptimalPath);
    }
}

/* ===== JOHNSON + RUTA CRÍTICA + RUTA ÓPTIMA ===== */
function johnsonCriticalPath() {
    // Si no estamos en modo Johnson, activarlo automáticamente
    if (!isJohnsonMode) {
        isJohnsonMode = true;
        const modeButton = document.getElementById('toggleMode');
        modeButton.textContent = '🔄 Modo: Johnson';
        modeButton.classList.add('johnson-mode');
        activateJohnsonMode();
        
        // Esperar un momento para que se apliquen las restricciones
        setTimeout(() => {
            executeJohnsonAlgorithm();
        }, 500);
    } else {
        executeJohnsonAlgorithm();
    }
}

function executeJohnsonAlgorithm() {
    // Validar si hay aristas en ambos sentidos
    const bidirectional = edges.some(e1 =>
        edges.some(e2 =>
            e1.from === e2.to &&
            e1.to === e2.from &&
            e1.from !== e1.to
        )
    );
    if (bidirectional) {
        alert('Para el análisis Johnson, el grafo debe tener solo una dirección entre cada par de nodos.');
        return;
    }

    // Validar si hay bucles
    const hasLoops = edges.some(e => e.from === e.to);
    if (hasLoops) {
        alert('Para el análisis Johnson, el grafo no debe tener bucles (aristas de un nodo a sí mismo).');
        return;
    }

    /* 1. build adjacency list */
    const adj = new Map();
    nodes.forEach(n => adj.set(n.id, []));
    edges.forEach(e => { if (e.from !== e.to) adj.get(e.from).push({ to: e.to, w: e.weight }); });

    /* 2. Bellman-Ford from virtual source */
    const BF = () => {
        const h = new Map([...nodes.map(n => [n.id, 0])]);
        for (let i = 1; i < nodes.length; ++i) {
            let upd = false;
            edges.forEach(e => {
                if (e.from === e.to) return;
                const u = e.from, v = e.to;
                if (h.get(u) + e.weight < h.get(v)) { h.set(v, h.get(u) + e.weight); upd = true; }
            });
            if (!upd) break;
        }
        return h;
    };
    const h = BF();

    /* clean previous h visuals */
    document.querySelectorAll('.h-badge').forEach(el => el.remove());
    document.querySelectorAll('.h-edge-badge').forEach(el => el.remove());
    document.querySelectorAll('.edge-h').forEach(el => el.remove());

    /* 3. re-weight edges (non-negative) */
    const w2 = new Map();
    edges.forEach(e => { if (e.from !== e.to) w2.set(`${e.from}-${e.to}`, e.weight + h.get(e.from) - h.get(e.to)); });

    /* 4. Dijkstra from every node */
    const dist = new Map();
    nodes.forEach(u => {
        const d = new Map([[u.id, 0]]);
        const pq = [{v: u.id, c: 0}];
        while (pq.length) {
            pq.sort((a,b)=>a.c-b.c);
            const {v, c} = pq.shift();
            if (c > (d.get(v)??Infinity)) continue;
            adj.get(v).forEach(({to, w}) => {
                const nc = c + w2.get(`${v}-${to}`);
                if (nc < (d.get(to)??Infinity)) { d.set(to, nc); pq.push({v: to, c: nc}); }
            });
        }
        nodes.forEach(vv => {
            const raw = (d.get(vv.id)??Infinity) - h.get(u.id) + h.get(vv.id);
            dist.set(`${u.id}-${vv.id}`, raw);
        });
    });

    /* 5. longest path in DAG (critical path) */
    const topo = [], indeg = new Map([...nodes.map(n => [n.id, 0])]);
    edges.forEach(e => { if (e.from !== e.to) indeg.set(e.to, indeg.get(e.to) + 1); });
    const q = [...nodes.filter(n => indeg.get(n.id) === 0).map(n => n.id)];
    while (q.length) {
        const u = q.shift(); topo.push(u);
        adj.get(u).forEach(({to}) => { indeg.set(to, indeg.get(to) - 1); if (indeg.get(to) === 0) q.push(to); });
    }
    const longest = new Map([...nodes.map(n => [n.id, 0])]), prev = new Map();
    topo.forEach(u => {
        adj.get(u).forEach(({to, w}) => {
            const cand = longest.get(u) + w;
            if (cand > longest.get(to)) { longest.set(to, cand); prev.set(to, u); }
        });
    });

    /* 6. CPM: calcular LS (latest) por nodo y holguras */
    const projectDuration = Math.max(...[...longest.values()]);
    const latest = new Map([...nodes.map(n => [n.id, Infinity])]);
    // Sinks: nodos sin salidas toman duración total
    nodes.forEach(n => { if ((adj.get(n.id) || []).length === 0) latest.set(n.id, projectDuration); });
    // Procesar en orden topológico inverso
    [...topo].reverse().forEach(u => {
        const outs = adj.get(u) || [];
        if (outs.length === 0) return; // ya fijado como sink
        let best = Infinity;
        outs.forEach(({to, w}) => { best = Math.min(best, (latest.get(to) ?? Infinity) - w); });
        if (best !== Infinity) latest.set(u, best);
        else if (!isFinite(latest.get(u))) latest.set(u, projectDuration);
    });
    const slackNode = new Map();
    nodes.forEach(n => { slackNode.set(n.id, (latest.get(n.id) ?? 0) - (longest.get(n.id) ?? 0)); });
    const slackEdge = new Map();
    edges.forEach(e => {
        if (e.from === e.to) return;
        const es_u = longest.get(e.from) ?? 0;
        const ls_v = latest.get(e.to) ?? projectDuration;
        const s = ls_v - es_u - e.weight;
        slackEdge.set(`${e.from}-${e.to}`, s);
    });

    /* 7. construir conjunto de aristas críticas: holgura ~ 0 */
    const criticalEdges = new Set();
    const isZero = (x) => Math.abs(x) < 1e-9;
    slackEdge.forEach((s, key) => { if (isZero(s)) criticalEdges.add(key); });

    /* 8. encontrar ruta óptima (camino más corto desde inicio a fin) */
    const optimalPath = findOptimalPath(adj, nodes);

    /* mostrar métricas dentro de los nodos: ES | LS */
    nodes.forEach(n => {
        const el = document.querySelector(`.node[data-id="${n.id}"]`);
        if (el) {
            const es = longest.get(n.id) ?? 0;
            const ls = latest.get(n.id) ?? es;
            el.innerHTML = `<div class="node-label">${n.label}</div><div class="node-metrics">${es} | ${ls}</div>`;
        }
    });

    // Guardar holgura por arista y redibujar etiquetas
    lastHMap = new Map(slackEdge);
    updateEdges();

    /* 9. visual highlight (aplicar DESPUÉS de redibujar aristas) */
    lastCriticalEdges = new Set(criticalEdges);
    lastOptimalPath = new Set(optimalPath);
    
    // Crear controles de visualización
    createPathControls();
    
    // Aplicar resaltados según configuración actual
    updatePathVisualization();
    
    document.querySelectorAll('.info-banner, .bottom-banner').forEach(el => el.remove());
    const banner = document.createElement('div');
    banner.className = 'bottom-banner';
    banner.textContent = '✨ Análisis completado - Usa los controles para mostrar/ocultar rutas ✨';
    document.body.appendChild(banner);
    
    return { 
        length: projectDuration, 
        criticalPath: criticalEdges,
        optimalPath: optimalPath
    };
}

/* ===== ENCONTRAR RUTA ÓPTIMA (DIJKSTRA) ===== */
function findOptimalPath(adj, nodes) {
    if (nodes.length === 0) return new Set();
    
    // Encontrar nodo de inicio (con menor id o sin entradas)
    let startNode = nodes[0].id;
    const hasIncoming = new Set();
    edges.forEach(e => { if (e.from !== e.to) hasIncoming.add(e.to); });
    const noIncomingNodes = nodes.filter(n => !hasIncoming.has(n.id));
    if (noIncomingNodes.length > 0) {
        startNode = noIncomingNodes[0].id;
    }
    
    // Encontrar nodo final (con mayor id o sin salidas)
    let endNode = nodes[nodes.length - 1].id;
    const hasOutgoing = new Set();
    edges.forEach(e => { if (e.from !== e.to) hasOutgoing.add(e.from); });
    const noOutgoingNodes = nodes.filter(n => !hasOutgoing.has(n.id));
    if (noOutgoingNodes.length > 0) {
        endNode = noOutgoingNodes[0].id;
    }
    
    // Dijkstra para encontrar el camino más corto
    const dist = new Map();
    const prev = new Map();
    const visited = new Set();
    
    nodes.forEach(n => {
        dist.set(n.id, Infinity);
        prev.set(n.id, null);
    });
    dist.set(startNode, 0);
    
    const pq = [{ id: startNode, distance: 0 }];
    
    while (pq.length > 0) {
        // Ordenar por distancia (Dijkstra)
        pq.sort((a, b) => a.distance - b.distance);
        const current = pq.shift();
        
        if (visited.has(current.id)) continue;
        visited.add(current.id);
        
        if (current.id === endNode) break;
        
        const neighbors = adj.get(current.id) || [];
        for (const neighbor of neighbors) {
            if (visited.has(neighbor.to)) continue;
            
            const alt = current.distance + neighbor.w;
            if (alt < dist.get(neighbor.to)) {
                dist.set(neighbor.to, alt);
                prev.set(neighbor.to, current.id);
                pq.push({ id: neighbor.to, distance: alt });
            }
        }
    }
    
    // Reconstruir el camino óptimo
    const optimalPath = new Set();
    let currentNode = endNode;
    
    while (prev.get(currentNode) !== null) {
        const edgeKey = `${prev.get(currentNode)}-${currentNode}`;
        optimalPath.add(edgeKey);
        currentNode = prev.get(currentNode);
    }
    
    return optimalPath;
}

/* ===== UTILS JOHNSON ===== */
function edgeMidpoint(fromNode, toNode) {
    if (!fromNode || !toNode) return { x: 0, y: 0 };
    if (fromNode.id === toNode.id) return { x: fromNode.x + 38, y: fromNode.y - 18 };
    const dx = toNode.x - fromNode.x, dy = toNode.y - fromNode.y, distance = Math.sqrt(dx * dx + dy * dy);
    const offset = Math.min(distance * 0.3, 60), offsetX = -dy * offset / distance, offsetY = dx * offset / distance;
    const midX = (fromNode.x + toNode.x) / 2 + offsetX * 0.5, midY = (fromNode.y + toNode.y) / 2 + offsetY * 0.5;
    return { x: midX, y: midY };
}
function renderEdgeHUnderWeights(hMap) {
    document.querySelectorAll('.edge-h').forEach(el => el.remove());
    requestAnimationFrame(() => requestAnimationFrame(() => {
        const mapNodes = new Map(nodes.map(n => [n.id, n]));
        edges.forEach(e => {
            const fromNode = mapNodes.get(e.from), toNode = mapNodes.get(e.to);
            if (!fromNode || !toNode) return;
            const hEl = document.createElement('div');
            hEl.className = 'edge-h';
            const edgeKey = `${e.from}-${e.to}`;
            let hv = hMap?.get?.(edgeKey);
            if (hv === undefined) hv = hMap?.get?.(e.from);
            if (!Number.isFinite(hv)) hv = 0;
            const hvText = Math.abs(hv - Math.round(hv)) < 1e-6 ? Math.round(hv) : Number(hv).toFixed(2);
            hEl.textContent = `h=${hvText}`;
            if (e.from === e.to) {
                hEl.style.left = `${fromNode.x + 24}px`;
                hEl.style.top = `${fromNode.y - 18}px`;
            } else {
                const { x: midX, y: midY } = edgeMidpoint(fromNode, toNode);
                hEl.style.left = `${midX - 10}px`;
                hEl.style.top = `${midY + 22}px`;
            }
            canvas.appendChild(hEl);
        });
    }));
}
function positionHEdgeBadges() {
    const mapNodes = new Map(nodes.map(n => [n.id, n]));
    document.querySelectorAll('.h-edge-badge').forEach(b => {
        const [from, to] = (b.dataset.key || '').split('-').map(v => parseInt(v));
        const fromNode = mapNodes.get(from), toNode = mapNodes.get(to);
        if (!fromNode || !toNode) return;
        const { x, y } = edgeMidpoint(fromNode, toNode);
        b.style.left = `${x - 12}px`; b.style.top = `${y + 16}px`;
    });
}
// Aplica el resaltado de ruta crítica sobre las aristas actualmente dibujadas
function applyCriticalHighlight(criticalSet) {
    svg.querySelectorAll('path').forEach(p => {
        const key = `${p.dataset.from}-${p.dataset.to}`;
        if (criticalSet && criticalSet.has(key)) {
            p.style.stroke = '#ff0055';
            p.style.filter = 'drop-shadow(0 0 6px #ff0055)';
            p.style.strokeWidth = '4';
        }
    });
}
// Aplica el resaltado de ruta óptima sobre las aristas actualmente dibujadas
function applyOptimalPathHighlight(optimalSet) {
    svg.querySelectorAll('path').forEach(p => {
        const key = `${p.dataset.from}-${p.dataset.to}`;
        if (optimalSet && optimalSet.has(key)) {
            p.style.stroke = '#00ff00';
            p.style.filter = 'drop-shadow(0 0 8px #00ff00)';
            p.style.strokeWidth = '5';
        }
    });
}

/* ===== ACTIVAR BOTÓN JOHNSON (protegido si no existe) ===== */
document.getElementById('johnsonBtn')?.addEventListener('click', johnsonCriticalPath);

// Activar botones de asignación máxima y mínima
document.getElementById('assignMaxBtn')?.addEventListener('click', () => runAssignment('max'));
document.getElementById('assignMinBtn')?.addEventListener('click', () => runAssignment('min'));

/* ===== ALGORITMO NORTHWEST (TRANSPORTE) ===== */

// Modal de NorthWest
const northwestModal = document.getElementById('northwestModal');
const closeNorthwest = document.getElementById('closeNorthwest');
const northwestCloseBtn = document.getElementById('northwestCloseBtn');
const northwestBody = document.getElementById('northwestBody');

function openNorthwestModal() { if (northwestModal) northwestModal.style.display = 'block'; }
function closeNorthwestModal() { if (northwestModal) northwestModal.style.display = 'none'; }
closeNorthwest?.addEventListener('click', closeNorthwestModal);
northwestCloseBtn?.addEventListener('click', closeNorthwestModal);

// Botón para abrir el input modal
document.getElementById('northwestBtn')?.addEventListener('click', openNorthwestInputModal);

// Modal de entrada
const northwestInputModal = document.getElementById('northwestInputModal');
const closeNorthwestInput = document.getElementById('closeNorthwestInput');
const northwestInputCancelBtn = document.getElementById('northwestInputCancelBtn');

function openNorthwestInputModal() {
    if (northwestInputModal) {
        northwestInputModal.style.display = 'block';
    }
}
function closeNorthwestInputModal() { if (northwestInputModal) northwestInputModal.style.display = 'none'; }
closeNorthwestInput?.addEventListener('click', closeNorthwestInputModal);
northwestInputCancelBtn?.addEventListener('click', closeNorthwestInputModal);

// ===== FUNCIONES PARA TABLA DINÁMICA =====

function getTableDimensions() {
    const tbody = document.getElementById('nwTableBody');
    const rows = tbody.querySelectorAll('tr');
    const numDestinos = rows.length;
    const numOrigenes = rows[0]?.querySelectorAll('.nw-cell-input').length || 0;
    return { numOrigenes, numDestinos };
}

function updateTableHeaders() {
    const { numOrigenes, numDestinos } = getTableDimensions();
    const headerRow = document.getElementById('nwTableHeaderRow');

    // Limpiar y reconstruir headers
    headerRow.innerHTML = '<th class="nw-corner-cell"></th>';
    for (let i = 0; i < numOrigenes; i++) {
        headerRow.innerHTML += `<th class="nw-header-cell">Origen ${i + 1}</th>`;
    }
    headerRow.innerHTML += '<th class="nw-header-oferta">Oferta</th>';

    // Actualizar labels de filas
    const tbody = document.getElementById('nwTableBody');
    const rows = tbody.querySelectorAll('tr');
    rows.forEach((row, idx) => {
        const header = row.querySelector('.nw-row-header');
        if (header) header.textContent = `Destino ${idx + 1}`;
    });
}

function addRow() {
    const tbody = document.getElementById('nwTableBody');
    const { numOrigenes, numDestinos } = getTableDimensions();

    const newRow = document.createElement('tr');
    newRow.innerHTML = `<td class="nw-row-header">Destino ${numDestinos + 1}</td>`;

    for (let i = 0; i < numOrigenes; i++) {
        newRow.innerHTML += `<td><input type="number" class="nw-cell-input" value="0" step="0.1"></td>`;
    }
    newRow.innerHTML += `<td><input type="number" class="nw-cell-oferta" value="0" step="0.1"></td>`;

    tbody.appendChild(newRow);
    updateDemandaRow();
}

function addColumn() {
    const { numOrigenes, numDestinos } = getTableDimensions();
    const tbody = document.getElementById('nwTableBody');
    const rows = tbody.querySelectorAll('tr');

    // Agregar celda a cada fila
    rows.forEach(row => {
        const ofertaCell = row.querySelector('.nw-cell-oferta').parentElement;
        const newCell = document.createElement('td');
        newCell.innerHTML = '<input type="number" class="nw-cell-input" value="0" step="0.1">';
        row.insertBefore(newCell, ofertaCell);
    });

    updateTableHeaders();
    updateDemandaRow();
}

function removeRow() {
    const tbody = document.getElementById('nwTableBody');
    const rows = tbody.querySelectorAll('tr');

    if (rows.length <= 1) {
        alert('Debe haber al menos 1 destino');
        return;
    }

    tbody.removeChild(rows[rows.length - 1]);
    updateDemandaRow();
}

function removeColumn() {
    const { numOrigenes } = getTableDimensions();

    if (numOrigenes <= 1) {
        alert('Debe haber al menos 1 origen');
        return;
    }

    const tbody = document.getElementById('nwTableBody');
    const rows = tbody.querySelectorAll('tr');

    rows.forEach(row => {
        const inputs = row.querySelectorAll('.nw-cell-input');
        if (inputs.length > 0) {
            inputs[inputs.length - 1].parentElement.remove();
        }
    });

    updateTableHeaders();
    updateDemandaRow();
}

function updateDemandaRow() {
    const { numOrigenes } = getTableDimensions();
    const footerRow = document.getElementById('nwTableFooterRow');

    footerRow.innerHTML = '<td class="nw-footer-label">Demanda</td>';
    for (let i = 0; i < numOrigenes; i++) {
        footerRow.innerHTML += `<td><input type="number" class="nw-cell-demanda" value="0" step="1"></td>`;
    }
    footerRow.innerHTML += '<td class="nw-corner-cell"></td>';
}

function resetTable() {
    if (!confirm('¿Estás seguro de que quieres resetear toda la tabla?')) return;

    const tbody = document.getElementById('nwTableBody');
    tbody.innerHTML = `
        <tr>
            <td class="nw-row-header">Destino 1</td>
            <td><input type="number" class="nw-cell-input" value="0" step="1"></td>
            <td><input type="number" class="nw-cell-input" value="0" step="1"></td>
            <td><input type="number" class="nw-cell-oferta" value="0" step="1"></td>
        </tr>
        <tr>
            <td class="nw-row-header">Destino 2</td>
            <td><input type="number" class="nw-cell-input" value="0" step="1"></td>
            <td><input type="number" class="nw-cell-input" value="0" step="1"></td>
            <td><input type="number" class="nw-cell-oferta" value="0" step="1"></td>
        </tr>
    `;

    updateTableHeaders();
    updateDemandaRow();
}

function readTableData() {
    const tbody = document.getElementById('nwTableBody');
    const rows = tbody.querySelectorAll('tr');
    const { numOrigenes, numDestinos } = getTableDimensions();

    // Leer matriz de costos
    const matrizCostos = [];
    rows.forEach((row, i) => {
        matrizCostos[i] = [];
        const inputs = row.querySelectorAll('.nw-cell-input');
        inputs.forEach((input, j) => {
            matrizCostos[i][j] = parseFloat(input.value) || 0;
        });
    });

    // Leer oferta (última columna de cada fila)
    const oferta = [];
    rows.forEach((row, i) => {
        const ofertaInput = row.querySelector('.nw-cell-oferta');
        oferta[i] = parseFloat(ofertaInput.value) || 0;
    });

    // Leer demanda (fila del footer)
    const demanda = [];
    const demandaInputs = document.querySelectorAll('.nw-cell-demanda');
    demandaInputs.forEach((input, j) => {
        demanda[j] = parseFloat(input.value) || 0;
    });

    return { matrizCostos, oferta, demanda, numOrigenes, numDestinos };
}

function executeNorthwest() {
    const tipoOpt = document.getElementById('nwTipoOpt').value;
    const { matrizCostos, oferta, demanda } = readTableData();

    // validar
    if (oferta.some(x => x < 0) || demanda.some(x => x < 0)) {
        alert('Error: Oferta y demanda deben ser valores no negativos');
        return;
    }

    const totalOferta = oferta.reduce((a, b) => a + b, 0);
    const totalDemanda = demanda.reduce((a, b) => a + b, 0);

    if (totalOferta === 0 || totalDemanda === 0) {
        alert('Error: La oferta y demanda totales no pueden ser cero');
        return;
    }

    // Ejecutar algoritmo
    try {
        const resultado = northwestAlgorithm(tipoOpt, matrizCostos, oferta, demanda);
        displayNorthwestResultInline(resultado);

        // Scroll automático hacia los resultados
        setTimeout(() => {
            const resultsSection = document.getElementById('nwResultsSection');
            if (resultsSection) {
                resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 100);
    } catch (error) {
        alert('Error al ejecutar el algoritmo: ' + error.message);
        console.error(error);
    }
}

// ===== IMPORTAR/EXPORTAR =====

function exportToJSON() {
    const tipoOpt = document.getElementById('nwTipoOpt').value;
    const { matrizCostos, oferta, demanda } = readTableData();

    const data = {
        tipo: 'northwest',
        tipoOptimizacion: tipoOpt,
        matrizCostos: matrizCostos,
        oferta: oferta,
        demanda: demanda,
        fecha: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `northwest_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function exportToCSV() {
    const { matrizCostos, oferta, demanda, numOrigenes, numDestinos } = readTableData();

    let csv = 'Tipo,Valores\n';
    csv += 'Matriz de Costos\n';
    csv += ',' + Array.from({ length: numOrigenes }, (_, i) => `Origen ${i + 1}`).join(',') + '\n';

    matrizCostos.forEach((row, i) => {
        csv += `Destino ${i + 1},` + row.join(',') + '\n';
    });

    csv += '\nOferta\n';
    oferta.forEach((val, i) => {
        csv += `Destino ${i + 1},${val}\n`;
    });

    csv += '\nDemanda\n';
    demanda.forEach((val, i) => {
        csv += `Origen ${i + 1},${val}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `northwest_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function importFromFile(file) {
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const content = e.target.result;

            if (file.name.endsWith('.json')) {
                const data = JSON.parse(content);
                loadDataToTable(data);
            } else if (file.name.endsWith('.csv')) {
                alert('Importación CSV en desarrollo. Por favor usa JSON por ahora.');
            }
        } catch (error) {
            alert('Error al importar archivo: ' + error.message);
            console.error(error);
        }
    };

    reader.readAsText(file);
}

function loadDataToTable(data) {
    if (data.tipo !== 'northwest') {
        alert('Archivo JSON no válido para NorthWest');
        return;
    }

    const { matrizCostos, oferta, demanda, tipoOptimizacion } = data;
    const numDestinos = matrizCostos.length;
    const numOrigenes = matrizCostos[0].length;

    // Configurar tipo de optimización
    document.getElementById('nwTipoOpt').value = tipoOptimizacion || 'minimizar';

    // Reconstruir tabla
    const tbody = document.getElementById('nwTableBody');
    tbody.innerHTML = '';

    for (let i = 0; i < numDestinos; i++) {
        const row = document.createElement('tr');
        row.innerHTML = `<td class="nw-row-header">Destino ${i + 1}</td>`;

        for (let j = 0; j < numOrigenes; j++) {
            row.innerHTML += `<td><input type="number" class="nw-cell-input" value="${matrizCostos[i][j]}" step="1"></td>`;
        }

        row.innerHTML += `<td><input type="number" class="nw-cell-oferta" value="${oferta[i]}" step="1"></td>`;
        tbody.appendChild(row);
    }

    updateTableHeaders();
    updateDemandaRow();

    // Cargar demanda
    const demandaInputs = document.querySelectorAll('.nw-cell-demanda');
    demandaInputs.forEach((input, j) => {
        input.value = demanda[j];
    });

    alert('Datos importados correctamente');
}

// Event Listeners
document.getElementById('nwAddRow')?.addEventListener('click', addRow);
document.getElementById('nwAddColumn')?.addEventListener('click', addColumn);
document.getElementById('nwRemoveRow')?.addEventListener('click', removeRow);
document.getElementById('nwRemoveColumn')?.addEventListener('click', removeColumn);
document.getElementById('nwReset')?.addEventListener('click', resetTable);
document.getElementById('nwCalculate')?.addEventListener('click', executeNorthwest);
document.getElementById('nwExportJSON')?.addEventListener('click', exportToJSON);
document.getElementById('nwExportCSV')?.addEventListener('click', exportToCSV);

document.getElementById('nwImportFile')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        importFromFile(file);
        e.target.value = ''; // Reset input
    }
});

function northwestAlgorithm(tipoOptimizacion, matrizCostos, ofertaOriginal, demandaOriginal) {
    // Copiar para no modificar originales
    let oferta = [...ofertaOriginal];
    let demanda = [...demandaOriginal];
    let costos = matrizCostos.map(row => [...row]);

    const m = oferta.length;
    const n = demanda.length;

    const totalOferta = oferta.reduce((a, b) => a + b, 0);
    const totalDemanda = demanda.reduce((a, b) => a + b, 0);

    let nodeFicticio = { tipo: null, cantidad: 0 };

    // Balancear oferta y demanda
    if (Math.abs(totalOferta - totalDemanda) > 1e-9) {
        if (totalOferta > totalDemanda) {
            // Agregar destino ficticio
            nodeFicticio = { tipo: 'destino', cantidad: totalOferta - totalDemanda };
            demanda.push(totalOferta - totalDemanda);
            costos.forEach(row => row.push(0));
        } else {
            // Agregar origen ficticio
            nodeFicticio = { tipo: 'origen', cantidad: totalDemanda - totalOferta };
            oferta.push(totalDemanda - totalOferta);
            costos.push(new Array(n).fill(0));
        }
    }

    const mFinal = oferta.length;
    const nFinal = demanda.length;

    // FASE 1: ESQUINA NOROESTE
    const asignacionInicial = esquinaNoreste(oferta, demanda);
    let asignacion = asignacionInicial.map(row => [...row]);

    const iteraciones = [];
    const maxIteraciones = 1000;
    let iteracion = 0;

    // Guardar iteración inicial
    iteraciones.push({
        numero: 0,
        asignacion: asignacion.map(row => [...row]),
        multiplicadores: null,
        costosReducidos: null,
        costTotal: calcularCostoTotal(asignacion, costos),
        esOptimo: false,
        fase: 'Esquina Noroeste (Solución Inicial)'
    });

    // FASE 2: MÉTODO MODI
    while (iteracion < maxIteraciones) {
        iteracion++;

        // Verificar degeneración
        const numBasicas = contarBasicas(asignacion);
        if (numBasicas < mFinal + nFinal - 1) {
            manejarDegeneracion(asignacion, costos, mFinal, nFinal);
        }

        // Calcular multiplicadores
        const { ui, vj } = calcularMultiplicadores(asignacion, costos, mFinal, nFinal);

        // Calcular costos reducidos
        const costosReducidos = calcularCostosReducidos(asignacion, costos, ui, vj, mFinal, nFinal);

        const costTotal = calcularCostoTotal(asignacion, costos);

        // Verificar optimalidad
        const esOptimo = verificarOptimalidad(costosReducidos, asignacion, tipoOptimizacion);

        iteraciones.push({
            numero: iteracion,
            asignacion: asignacion.map(row => [...row]),
            multiplicadores: { ui: [...ui], vj: [...vj] },
            costosReducidos: costosReducidos.map(row => [...row]),
            costTotal: costTotal,
            esOptimo: esOptimo,
            fase: 'MODI - Optimización'
        });

        if (esOptimo) break;

        // Encontrar celda de entrada
        const celdaEntrada = encontrarCeldaEntrada(costosReducidos, asignacion, tipoOptimizacion);

        if (!celdaEntrada) {
            console.warn('No se pudo encontrar celda de entrada');
            break;
        }

        console.log(`Iteración ${iteracion}: Celda de entrada [${celdaEntrada.i}][${celdaEntrada.j}]`);

        // Crear loop
        const loop = crearLoop(asignacion, celdaEntrada, mFinal, nFinal);

        if (!loop || loop.length === 0) {
            console.warn('No se pudo crear loop válido');
            console.log('Asignación actual:', asignacion);
            console.log('Celda entrada:', celdaEntrada);
            break;
        }

        console.log('Loop encontrado:', loop);

        // Calcular theta
        const theta = calcularTheta(asignacion, loop);

        if (theta <= 0) {
            console.warn('Theta inválido:', theta);
            console.log('Loop:', loop);
            console.log('Asignación:', asignacion);
            break;
        }

        console.log(`Theta calculado: ${theta}`);

        // Aplicar transferencia
        asignacion = aplicarTransferencia(asignacion, loop, theta);
        console.log('Nueva asignación después de transferencia:', asignacion);
    }

    const costoFinal = calcularCostoTotal(asignacion, costos);
    const esOptimo = iteracion < maxIteraciones;

    return {
        costoOptimo: costoFinal,
        asignacionOptima: asignacion,
        iteraciones: iteraciones,
        solucionOptimal: esOptimo,
        nodeFicticioAgregado: nodeFicticio,
        dimensiones: { m: mFinal, n: nFinal },
        matrizCostos: costos,
        tipoOptimizacion: tipoOptimizacion
    };
}

function esquinaNoreste(ofertaOriginal, demandaOriginal) {
    const oferta = [...ofertaOriginal];
    const demanda = [...demandaOriginal];
    const m = oferta.length;
    const n = demanda.length;
    const asignacion = Array.from({ length: m }, () => new Array(n).fill(0));

    let i = 0, j = 0;

    while (i < m && j < n) {
        const cantidad = Math.min(oferta[i], demanda[j]);
        asignacion[i][j] = cantidad;
        oferta[i] -= cantidad;
        demanda[j] -= cantidad;

        // Avance de índices según NW (manejo de empates y bordes)
        if (oferta[i] === 0 && demanda[j] === 0) {
            if (i < m - 1) {
                i++;
            } else if (j < n - 1) {
                j++;
            } else {
                break;
            }
        } else if (oferta[i] === 0) {
            if (i < m - 1) {
                i++;
            } else if (j < n - 1) {
                j++;
            } else {
                break;
            }
        } else if (demanda[j] === 0) {
            if (j < n - 1) {
                j++;
            } else if (i < m - 1) {
                i++;
            } else {
                break;
            }
        } else {
            // Nada se agotó (posible por redondeos)
            break;
        }
    }

    return asignacion;
}

function calcularCostoTotal(asignacion, costos) {
    let total = 0;
    for (let i = 0; i < asignacion.length; i++) {
        for (let j = 0; j < asignacion[i].length; j++) {
            total += asignacion[i][j] * costos[i][j];
        }
    }
    return total;
}

function contarBasicas(asignacion) {
    let count = 0;
    for (let i = 0; i < asignacion.length; i++) {
        for (let j = 0; j < asignacion[i].length; j++) {
            if (asignacion[i][j] > 0) count++;
        }
    }
    return count;
}

function manejarDegeneracion(asignacion, costos, m, n) {
    // Agregar epsilon (0) a una celda no básica estratégicamente
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            if (asignacion[i][j] === 0) {
                asignacion[i][j] = 1e-10; // Epsilon muy pequeño
                return;
            }
        }
    }
}

function calcularMultiplicadores(asignacion, costos, m, n) {
    const ui = new Array(m).fill(undefined);
    const vj = new Array(n).fill(undefined);

    ui[0] = 0; // Inicializar U[0] = 0

    let cambios = true;
    let intentos = 0;

    while (cambios && intentos < 100) {
        cambios = false;
        intentos++;

        for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
                if (asignacion[i][j] > 0) {
                    // Celda básica: costo[i][j] = ui[i] + vj[j]
                    if (ui[i] !== undefined && vj[j] === undefined) {
                        vj[j] = costos[i][j] - ui[i];
                        cambios = true;
                    } else if (vj[j] !== undefined && ui[i] === undefined) {
                        ui[i] = costos[i][j] - vj[j];
                        cambios = true;
                    }
                }
            }
        }
    }

    // Rellenar faltantes con 0
    for (let i = 0; i < m; i++) if (ui[i] === undefined) ui[i] = 0;
    for (let j = 0; j < n; j++) if (vj[j] === undefined) vj[j] = 0;

    return { ui, vj };
}

function calcularCostosReducidos(asignacion, costos, ui, vj, m, n) {
    const costosReducidos = Array.from({ length: m }, () => new Array(n).fill(0));

    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            if (asignacion[i][j] === 0 || asignacion[i][j] < 1e-9) {
                costosReducidos[i][j] = costos[i][j] - (ui[i] + vj[j]);
            } else {
                costosReducidos[i][j] = 0; // Celdas básicas no se evalúan
            }
        }
    }

    return costosReducidos;
}

function verificarOptimalidad(costosReducidos, asignacion, tipoOptimizacion) {
    for (let i = 0; i < costosReducidos.length; i++) {
        for (let j = 0; j < costosReducidos[i].length; j++) {
            if (asignacion[i][j] === 0 || asignacion[i][j] < 1e-9) {
                if (tipoOptimizacion === 'minimizar' && costosReducidos[i][j] < -1e-9) {
                    return false;
                }
                if (tipoOptimizacion === 'maximizar' && costosReducidos[i][j] > 1e-9) {
                    return false;
                }
            }
        }
    }
    return true;
}

function encontrarCeldaEntrada(costosReducidos, asignacion, tipoOptimizacion) {
    let mejorValor = tipoOptimizacion === 'minimizar' ? Infinity : -Infinity;
    let mejorCelda = null;

    for (let i = 0; i < costosReducidos.length; i++) {
        for (let j = 0; j < costosReducidos[i].length; j++) {
            if (asignacion[i][j] === 0 || asignacion[i][j] < 1e-9) {
                if (tipoOptimizacion === 'minimizar' && costosReducidos[i][j] < mejorValor) {
                    mejorValor = costosReducidos[i][j];
                    mejorCelda = { i, j };
                } else if (tipoOptimizacion === 'maximizar' && costosReducidos[i][j] > mejorValor) {
                    mejorValor = costosReducidos[i][j];
                    mejorCelda = { i, j };
                }
            }
        }
    }

    return mejorCelda;
}

function crearLoop(asignacion, celdaEntrada, m, n) {
    const { i: startI, j: startJ } = celdaEntrada;

    // Método BFS mejorado para encontrar loop
    function buscarLoopBFS() {
        const queue = [];
        queue.push({
            i: startI,
            j: startJ,
            path: [{ i: startI, j: startJ, signo: 1 }],
            direction: 'row',
            visited: new Set([`${startI},${startJ},start`])
        });

        while (queue.length > 0) {
            const { i, j, path, direction, visited } = queue.shift();

            if (direction === 'row') {
                // Buscar en la misma fila por celdas básicas
                for (let jj = 0; jj < n; jj++) {
                    if (jj !== j && asignacion[i][jj] > 1e-9) {
                        const key = `${i},${jj},row`;
                        if (visited.has(key)) continue;

                        const newPath = [...path, { i: i, j: jj, signo: path.length % 2 === 1 ? -1 : 1 }];

                        // Verificar si cerramos el loop (volvemos a la columna inicial)
                        if (jj === startJ && newPath.length >= 4) {
                            // Verificar que podemos cerrar desde esta fila
                            if (asignacion[i][startJ] > 1e-9 && i !== startI) {
                                return newPath;
                            }
                        }

                        const newVisited = new Set(visited);
                        newVisited.add(key);
                        queue.push({ i: i, j: jj, path: newPath, direction: 'col', visited: newVisited });
                    }
                }
            } else {
                // Buscar en la misma columna por celdas básicas
                for (let ii = 0; ii < m; ii++) {
                    if (ii !== i && asignacion[ii][j] > 1e-9) {
                        const key = `${ii},${j},col`;
                        if (visited.has(key)) continue;

                        const newPath = [...path, { i: ii, j: j, signo: path.length % 2 === 1 ? -1 : 1 }];

                        // Verificar si cerramos el loop (volvemos a la fila inicial)
                        if (ii === startI && newPath.length >= 4) {
                            // Verificar que podemos cerrar desde esta columna
                            if (asignacion[startI][j] > 1e-9) {
                                return newPath;
                            }
                        }

                        const newVisited = new Set(visited);
                        newVisited.add(key);
                        queue.push({ i: ii, j: j, path: newPath, direction: 'row', visited: newVisited });
                    }
                }
            }
        }

        return null;
    }

    const loop = buscarLoopBFS();

    if (!loop) {
        console.warn('BFS no encontró loop, intentando método simple');
        return crearLoopSimple(asignacion, celdaEntrada, m, n);
    }

    return loop;
}

// Fallback simple para búsqueda de loop
function crearLoopSimple(asignacion, celdaEntrada, m, n) {
    const { i: ii, j: jj } = celdaEntrada;

    // Buscar loop rectangular simple
    for (let j = 0; j < n; j++) {
        if (j !== jj && asignacion[ii][j] > 1e-9) {
            // Encontramos celda básica en la misma fila
            for (let i = 0; i < m; i++) {
                if (i !== ii && asignacion[i][j] > 1e-9 && asignacion[i][jj] > 1e-9) {
                    // Encontramos celda básica que cierra el loop
                    return [
                        { i: ii, j: jj, signo: 1 },   // Celda de entrada (+)
                        { i: ii, j: j, signo: -1 },    // Misma fila (-)
                        { i: i, j: j, signo: 1 },      // Misma columna (+)
                        { i: i, j: jj, signo: -1 }     // Cierre (-)
                    ];
                }
            }
        }
    }

    console.error('No se encontró loop válido para celda:', celdaEntrada);
    console.log('Asignación actual:', asignacion);
    return null;
}

function calcularTheta(asignacion, loop) {
    if (!loop || loop.length === 0) {
        console.error('Loop vacío en calcularTheta');
        return 0;
    }
    
    let theta = Infinity;

    for (const celda of loop) {
        if (celda.signo === -1) {
            const valor = asignacion[celda.i][celda.j];
            // Debe ser una celda básica (valor > 0)
            if (valor > 1e-9) {
                theta = Math.min(theta, valor);
            } else {
                // ERROR: Celda en loop no es básica
                console.error(`Celda no-básica en loop: [${celda.i}][${celda.j}] = ${valor}`);
                return 0;
            }
        }
    }

    if (theta === Infinity || theta <= 0) {
        console.error('Theta inválido calculado:', theta);
        return 0;
    }

    return theta;
}

function aplicarTransferencia(asignacion, loop, theta) {
    const nuevaAsignacion = asignacion.map(row => [...row]);

    for (const celda of loop) {
        if (celda.signo === 1) {
            nuevaAsignacion[celda.i][celda.j] += theta;
        } else {
            nuevaAsignacion[celda.i][celda.j] -= theta;
            if (nuevaAsignacion[celda.i][celda.j] < 1e-9) {
                nuevaAsignacion[celda.i][celda.j] = 0;
            }
        }
    }

    return nuevaAsignacion;
}

function displayNorthwestResult(resultado) {
    let html = '<div class="nw-result-container">';

    // Header con resultado
    html += `<div class="nw-result-header">`;
    html += `<h3>Resultado del Algoritmo NorthWest</h3>`;
    html += `<div class="nw-result-summary">`;
    html += `<div class="nw-summary-item"><strong>Tipo:</strong> ${resultado.tipoOptimizacion.toUpperCase()}</div>`;
    html += `<div class="nw-summary-item nw-highlight"><strong>Costo Óptimo:</strong> ${resultado.costoOptimo.toFixed(2)}</div>`;
    html += `<div class="nw-summary-item"><strong>Iteraciones:</strong> ${resultado.iteraciones.length}</div>`;
    html += `<div class="nw-summary-item"><strong>Estado:</strong> ${resultado.solucionOptimal ? '✅ Óptimo' : '⚠️ No convergió'}</div>`;
    html += `</div>`;

    if (resultado.nodeFicticioAgregado.tipo) {
        html += `<div class="nw-warning">`;
        html += `⚠️ Se agregó un <strong>${resultado.nodeFicticioAgregado.tipo} ficticio</strong> con cantidad ${resultado.nodeFicticioAgregado.cantidad.toFixed(2)} para balancear oferta y demanda.`;
        html += `</div>`;
    }
    html += `</div>`;

    // Tabs para iteraciones
    html += `<div class="nw-iterations-tabs">`;
    resultado.iteraciones.forEach((iter, idx) => {
        html += `<button class="nw-tab-btn ${idx === resultado.iteraciones.length - 1 ? 'active' : ''}" data-iteration="${idx}">`;
        html += iter.numero === 0 ? 'Inicial' : `Iter ${iter.numero}`;
        html += `</button>`;
    });
    html += `</div>`;

    // Contenido de iteraciones
    html += `<div class="nw-iterations-content">`;
    resultado.iteraciones.forEach((iter, idx) => {
        html += `<div class="nw-iteration-panel ${idx === resultado.iteraciones.length - 1 ? 'active' : ''}" data-iteration="${idx}">`;
        html += `<h4>${iter.fase} ${iter.numero > 0 ? `- Iteración ${iter.numero}` : ''}</h4>`;
        html += `<div class="nw-cost-display">Costo Total: <span class="nw-cost-value">${iter.costTotal.toFixed(2)}</span></div>`;

        // Matriz de asignación
        html += `<div class="nw-matrix-section">`;
        html += `<h5>Matriz de Asignación</h5>`;
        html += generarTablaMatriz(iter.asignacion, 'asignacion', resultado);
        html += `</div>`;

        // Multiplicadores (si existen)
        if (iter.multiplicadores) {
            html += `<div class="nw-matrix-section">`;
            html += `<h5>Multiplicadores</h5>`;
            html += `<div class="nw-multipliers">`;
            html += `<div><strong>Ui:</strong> [${iter.multiplicadores.ui.map(v => v.toFixed(2)).join(', ')}]</div>`;
            html += `<div><strong>Vj:</strong> [${iter.multiplicadores.vj.map(v => v.toFixed(2)).join(', ')}]</div>`;
            html += `</div>`;
            html += `</div>`;
        }

        // Costos reducidos (si existen)
        if (iter.costosReducidos) {
            html += `<div class="nw-matrix-section">`;
            html += `<h5>Costos Reducidos</h5>`;
            html += generarTablaMatriz(iter.costosReducidos, 'reducidos', resultado);
            html += `</div>`;
        }

        // Estado
        html += `<div class="nw-status ${iter.esOptimo ? 'optimal' : 'non-optimal'}">`;
        html += iter.esOptimo ? '✅ Solución Óptima Alcanzada' : '🔄 Requiere más iteraciones';
        html += `</div>`;

        html += `</div>`;
    });
    html += `</div>`;

    html += `</div>`;

    northwestBody.innerHTML = html;

    // Event listeners para tabs
    document.querySelectorAll('.nw-tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const iteration = this.dataset.iteration;
            document.querySelectorAll('.nw-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.nw-iteration-panel').forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            document.querySelector(`.nw-iteration-panel[data-iteration="${iteration}"]`).classList.add('active');
        });
    });
}

// Nueva función para mostrar resultados inline (en la misma ventana)
function displayNorthwestResultInline(resultado) {
    const resultsSection = document.getElementById('nwResultsSection');
    const resultsContent = document.getElementById('nwResultsContent');

    if (!resultsSection || !resultsContent) return;

    let html = '<div class="nw-result-container-inline">';

    // Header con resultado
    html += `<div class="nw-result-summary-inline">`;
    html += `<div class="nw-summary-item-inline"><strong>Tipo:</strong> ${resultado.tipoOptimizacion.toUpperCase()}</div>`;
    html += `<div class="nw-summary-item-inline nw-highlight-inline"><strong>Costo Óptimo:</strong> ${resultado.costoOptimo.toFixed(2)}</div>`;
    html += `<div class="nw-summary-item-inline"><strong>Iteraciones:</strong> ${resultado.iteraciones.length}</div>`;
    html += `<div class="nw-summary-item-inline"><strong>Estado:</strong> ${resultado.solucionOptimal ? '✅ Óptimo' : '⚠️ No convergió'}</div>`;
    html += `</div>`;

    if (resultado.nodeFicticioAgregado.tipo) {
        html += `<div class="nw-warning">`;
        html += `⚠️ Se agregó un <strong>${resultado.nodeFicticioAgregado.tipo} ficticio</strong> con cantidad ${resultado.nodeFicticioAgregado.cantidad.toFixed(2)} para balancear oferta y demanda.`;
        html += `</div>`;
    }

    // Tabs para iteraciones
    html += `<div class="nw-iterations-tabs">`;
    resultado.iteraciones.forEach((iter, idx) => {
        html += `<button class="nw-tab-btn-inline ${idx === resultado.iteraciones.length - 1 ? 'active' : ''}" data-iteration="${idx}">`;
        html += iter.numero === 0 ? 'Inicial' : `Iter ${iter.numero}`;
        html += `</button>`;
    });
    html += `</div>`;

    // Contenido de iteraciones
    html += `<div class="nw-iterations-content-inline">`;
    resultado.iteraciones.forEach((iter, idx) => {
        html += `<div class="nw-iteration-panel-inline ${idx === resultado.iteraciones.length - 1 ? 'active' : ''}" data-iteration="${idx}">`;
        html += `<h4 class="nw-iteration-title">${iter.fase} ${iter.numero > 0 ? `- Iteración ${iter.numero}` : ''}</h4>`;
        html += `<div class="nw-cost-display">Costo Total: <span class="nw-cost-value">${iter.costTotal.toFixed(2)}</span></div>`;

        // Matriz de asignación
        html += `<div class="nw-matrix-section">`;
        html += `<h5>Matriz de Asignación</h5>`;
        html += generarTablaMatriz(iter.asignacion, 'asignacion', resultado);
        html += `</div>`;

        // Multiplicadores (si existen)
        if (iter.multiplicadores) {
            html += `<div class="nw-matrix-section">`;
            html += `<h5>Multiplicadores</h5>`;
            html += `<div class="nw-multipliers">`;
            html += `<div><strong>Ui:</strong> [${iter.multiplicadores.ui.map(v => v.toFixed(2)).join(', ')}]</div>`;
            html += `<div><strong>Vj:</strong> [${iter.multiplicadores.vj.map(v => v.toFixed(2)).join(', ')}]</div>`;
            html += `</div>`;
            html += `</div>`;
        }

        // Costos reducidos (si existen)
        if (iter.costosReducidos) {
            html += `<div class="nw-matrix-section">`;
            html += `<h5>Costos Reducidos</h5>`;
            html += generarTablaMatriz(iter.costosReducidos, 'reducidos', resultado);
            html += `</div>`;
        }

        // Estado
        html += `<div class="nw-status ${iter.esOptimo ? 'optimal' : 'non-optimal'}">`;
        html += iter.esOptimo ? '✅ Solución Óptima Alcanzada' : '🔄 Requiere más iteraciones';
        html += `</div>`;

        html += `</div>`;
    });
    html += `</div>`;

    html += `</div>`;

    resultsContent.innerHTML = html;
    resultsSection.classList.remove('hidden');

    // Event listeners para tabs inline
    document.querySelectorAll('.nw-tab-btn-inline').forEach(btn => {
        btn.addEventListener('click', function() {
            const iteration = this.dataset.iteration;
            document.querySelectorAll('.nw-tab-btn-inline').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.nw-iteration-panel-inline').forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            document.querySelector(`.nw-iteration-panel-inline[data-iteration="${iteration}"]`).classList.add('active');
        });
    });
}

function generarTablaMatriz(matriz, tipo, resultado) {
    const m = matriz.length;
    const n = matriz[0].length;
    const isFicticio = resultado.nodeFicticioAgregado.tipo !== null;

    let html = '<table class="nw-result-table">';
    html += '<tr><th></th>';
    for (let j = 0; j < n; j++) {
        const esFicticioCol = isFicticio && resultado.nodeFicticioAgregado.tipo === 'destino' && j === n - 1;
        html += `<th class="${esFicticioCol ? 'nw-ficticio' : ''}">Destino ${j + 1}${esFicticioCol ? ' (F)' : ''}</th>`;
    }
    html += '</tr>';

    for (let i = 0; i < m; i++) {
        const esFicticioRow = isFicticio && resultado.nodeFicticioAgregado.tipo === 'origen' && i === m - 1;
        html += `<tr><th class="${esFicticioRow ? 'nw-ficticio' : ''}">Origen ${i + 1}${esFicticioRow ? ' (F)' : ''}</th>`;
        for (let j = 0; j < n; j++) {
            const valor = matriz[i][j];
            let clase = '';
            if (tipo === 'asignacion' && valor > 0) clase = 'nw-basica';
            if (tipo === 'reducidos' && valor < -1e-9) clase = 'nw-negativo';
            if (tipo === 'reducidos' && valor > 1e-9) clase = 'nw-positivo';

            const texto = Math.abs(valor) < 1e-9 ? '0' : valor.toFixed(2);
            html += `<td class="${clase}">${texto}</td>`;
        }
        html += '</tr>';
    }
    html += '</table>';

    return html;
}