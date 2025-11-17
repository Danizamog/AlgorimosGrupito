/* ===== VARIABLES GLOBALES ===== */
let nodes = [], edges = [], selectedNode = null, draggingNode = null, nodeCounter = 1;
let nodeColor = "#00f7ff", edgeColor = "#00f7ff", activeMatrix = null, lastHMap = null, lastCriticalEdges = null, lastOptimalPath = null;
let showCriticalPath = true, showOptimalPath = true; // Controles de visualización
let isJohnsonMode = false; // Nuevo: Estado del modo
let isKruskalMode = false; // Nuevo: Estado del modo Kruskal (todas aristas no dirigidas)
// Guarda IDs seleccionados por Kruskal (MST)
let lastKruskalSelectedIds = new Set();
// Preferencia para Kruskal: 'min' (árbol mínimo) o 'max' (árbol máximo)
let kruskalPreference = 'min';

/* ===== VARIABLES PARA DIJKSTRA ===== */
let isDijkstraMode = false;
let dijkstraStartNode = null;
let dijkstraDistances = new Map();
let dijkstraPrevious = new Map();
let dijkstraVisited = new Set();
let dijkstraSteps = [];
let dijkstraAnimationRunning = false;
let dijkstraCurrentStepIndex = 0;
// Preferencia: 'min' (camino más corto) o 'max' (camino de mayor peso sin repetir nodos)
let dijkstraPreference = 'min';

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
// Dijkstra elements - will be retrieved when needed
let analysisDijkstra = null;
let dijkstraModal = null;
let dijkstraNodeList = null;
let closeDijkstraModal = null;
let cancelDijkstraBtn = null;
let dijkstraResultsModal = null;
let dijkstraResultsContent = null;
let closeDijkstraResultsModal = null;
let closeDijkstraResultsBtn = null;

// Initialize Dijkstra elements after DOM is loaded
function initializeDijkstraElements() {
    analysisDijkstra = document.getElementById('analysisDijkstra');
    dijkstraModal = document.getElementById('dijkstraModal');
    dijkstraNodeList = document.getElementById('dijkstraNodeList');
    closeDijkstraModal = document.getElementById('closeDijkstraModal');
    cancelDijkstraBtn = document.getElementById('cancelDijkstraBtn');
    dijkstraResultsModal = document.getElementById('dijkstraResultsModal');
    dijkstraResultsContent = document.getElementById('dijkstraResultsContent');
    closeDijkstraResultsModal = document.getElementById('closeDijkstraResultsModal');
    closeDijkstraResultsBtn = document.getElementById('closeDijkstraResultsBtn');

    console.log('Inicializando Dijkstra - Botón encontrado:', analysisDijkstra);

    // Add event listeners after elements are found
    if (analysisDijkstra) {
        analysisDijkstra.addEventListener('click', () => {
            console.log('Click en botón Dijkstra detectado');
            const analysisMenuEl = document.getElementById('analysisMenu');
            if (analysisMenuEl) analysisMenuEl.classList.remove('show');
            initiateDijkstra();
        });
        console.log('Event listener agregado correctamente');
    } else {
        console.error('ERROR: No se encontró el botón analysisDijkstra');
    }

    if (closeDijkstraModal) closeDijkstraModal.addEventListener('click', () => {
        if (dijkstraModal) dijkstraModal.style.display = 'none';
        clearDijkstraVisualization();
    });

    if (cancelDijkstraBtn) cancelDijkstraBtn.addEventListener('click', () => {
        if (dijkstraModal) dijkstraModal.style.display = 'none';
        clearDijkstraVisualization();
    });

    if (closeDijkstraResultsModal) closeDijkstraResultsModal.addEventListener('click', () => {
        if (dijkstraResultsModal) dijkstraResultsModal.style.display = 'none';
    });

    if (closeDijkstraResultsBtn) closeDijkstraResultsBtn.addEventListener('click', () => {
        if (dijkstraResultsModal) dijkstraResultsModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (dijkstraModal && e.target === dijkstraModal) {
            dijkstraModal.style.display = 'none';
            clearDijkstraVisualization();
        }
        if (dijkstraResultsModal && e.target === dijkstraResultsModal) {
            dijkstraResultsModal.style.display = 'none';
        }
    });

    // Crear selector rápido Min/Max para Dijkstra en la barra derecha si no existe
    const rightControls = document.querySelector('.right-controls');
    if (rightControls && !document.getElementById('dijkstraPrefToggle')) {
        const btn = document.createElement('button');
        btn.id = 'dijkstraPrefToggle';
        btn.className = 'tab-btn';
        btn.title = 'Preferencia Dijkstra: minimizar (ruta más corta) o maximizar (ruta más pesada sin repetir nodos)';
        btn.textContent = dijkstraPreference === 'min' ? 'Dijkstra: Min' : 'Dijkstra: Max';
        btn.addEventListener('click', () => {
            dijkstraPreference = dijkstraPreference === 'min' ? 'max' : 'min';
            updateDijkstraPreferenceUI();
            showModeNotification('Dijkstra: ' + (dijkstraPreference === 'min' ? 'Minimizar (corto)' : 'Maximizar (largo)'));
        });
        rightControls.appendChild(btn);
    }
}

function updateDijkstraPreferenceUI() {
    const btn = document.getElementById('dijkstraPrefToggle');
    if (btn) {
        btn.textContent = dijkstraPreference === 'min' ? 'Dijkstra: Min' : 'Dijkstra: Max';
    }
}

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
    // Permitir crear nodos normalmente, incluso en modo Dijkstra
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

        // Si está en modo Dijkstra
        if (isDijkstraMode) {
            if (dijkstraAnimationRunning) {
                alert('Espera a que termine la ejecución de Dijkstra');
                return;
            }
            // Si los resultados ya están presentes, resaltar la ruta hacia el nodo clicado
            if (dijkstraDistances.size > 0) {
                highlightShortestPath(nodeId);
            } else {
                showNotification('Dijkstra aún no ha terminado de calcular o no hay resultados', 'info');
            }
            return;
        }

        // Funcionamiento normal: crear aristas
        if (selectedNode === null) {
            selectedNode = nodeId; e.target.classList.add('selected');

        } else {
            addEdge(selectedNode, nodeId);
            document.querySelector(`.node[data-id="${selectedNode}"]`).classList.remove('selected'); selectedNode = null;
        }
    }
});
function addEdge(fromId, toId) {
    // Permitir bucles en modo normal, pero no en modo Johnson
    if (fromId === toId && isJohnsonMode) {
        showModeNotification('Error: en Modo Johnson no se permiten bucles (una arista no puede apuntar al mismo nodo).');
        return;
    }

    // Aplicar restricciones si estamos en modo Johnson
    if (isJohnsonMode) {
        // Verificar si ya existe una arista en la dirección opuesta
        const reverseExists = edges.some(e => e.from === toId && e.to === fromId);
        if (reverseExists) {
            alert('En modo Johnson no se permiten aristas en ambas direcciones entre los mismos nodos.');
            return;
        }
    }

    // Usar promptForWeight para permitir negativos en modo asignación
    // En modo Kruskal no permitimos crear una arista si ya existe una entre los mismos nodos
    if (isKruskalMode) {
        const existsPair = edges.some(e => (e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId));
        if (existsPair) {
            showModeNotification('Error: en modo Kruskal no se permiten conexiones duplicadas o ida y vuelta entre los mismos nodos.');
            return;
        }
    }

    const weight = promptForWeight(`Peso ${fromId}→${toId}:`, '1');
    if (weight === null) return;

    // Si estamos en modo Kruskal forzamos que la arista sea no dirigida
    const directed = isKruskalMode ? false : (edgeTypeSelect ? (edgeTypeSelect.value === 'directed') : true);

    // Crear arista y dibujar
    const edgeObj = { id: Date.now(), from: fromId, to: toId, weight, directed };
    edges.push(edgeObj);
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
        label.dataset.edgeId = edge.id;
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
    label.dataset.edgeId = edge.id;
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
    
    // No permitimos crear bucles desde el menú contextual (se evitan aristas self-loop)
    
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
        // Si estamos en modo Kruskal no permitimos cambiar dirección
        if (!isKruskalMode) {
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
    }
    
    // No permitir cambiar a dirigida/no dirigida en modo Kruskal
    if (!isKruskalMode) {
        addItem(menu, edge.directed ? 'Hacer no dirigida' : 'Hacer dirigida', () => {
            edge.directed = !edge.directed; edge.bidirectional = false; updateEdges(); menu.remove();
        });
    }
    
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
        ,
        // Guardar estado Kruskal y aristas seleccionadas
        kruskalAnalysis: {
            isKruskalMode: isKruskalMode,
            selectedIds: Array.from(lastKruskalSelectedIds),
            preference: kruskalPreference
        }
    };
    // Incluir estado/resultados de Dijkstra si están presentes
    if (dijkstraDistances && dijkstraDistances.size > 0) {
        data.dijkstraAnalysis = {
            startNodeId: dijkstraStartNode,
            mode: dijkstraPreference,
            distances: Object.fromEntries(dijkstraDistances),
            previous: Object.fromEntries(dijkstraPrevious)
        };
    }
    
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

            // Restaurar Dijkstra si viene en el archivo
            if (data.dijkstraAnalysis) {
                try {
                    dijkstraStartNode = data.dijkstraAnalysis.startNodeId ?? null;
                    dijkstraPreference = data.dijkstraAnalysis.mode || dijkstraPreference || 'min';
                    dijkstraDistances = new Map(Object.entries(data.dijkstraAnalysis.distances || {}).map(([k,v]) => [Number(k), v]));
                    dijkstraPrevious = new Map(Object.entries(data.dijkstraAnalysis.previous || {}).map(([k,v]) => [Number(k), v === null ? null : Number(v)]));

                    // Asegurar que el modo Dijkstra está activo visualmente
                    isDijkstraMode = true;
                    // Colocar etiquetas de distancia y resaltar caminos
                    setTimeout(() => {
                        updateDijkstraDistanceLabels(dijkstraDistances);
                        if (dijkstraStartNode !== null) {
                            highlightAllShortestPaths(dijkstraStartNode);
                            // Mostrar modal de resultados si existe
                            try { showDijkstraResults(dijkstraStartNode); } catch (e) { console.warn('No se pudo mostrar modal de Dijkstra al cargar:', e); }
                        }
                        updateDijkstraPreferenceUI();
                    }, 100);
                } catch (err) {
                    console.error('Error restaurando Dijkstra desde archivo:', err);
                }
            }

            // Restaurar análisis Kruskal si existe
            if (data.kruskalAnalysis) {
                isKruskalMode = !!data.kruskalAnalysis.isKruskalMode;
                lastKruskalSelectedIds = new Set(data.kruskalAnalysis.selectedIds || []);
                kruskalPreference = data.kruskalAnalysis.preference || 'min';
                // actualizar botón Kruskal si existe
                const kbtn = document.getElementById('toggleKruskal');
                if (kbtn) {
                    kbtn.textContent = isKruskalMode ? '🌲 Kruskal: On' : '🌲 Kruskal: Off';
                    kbtn.classList.toggle('kruskal-mode', isKruskalMode);
                }
                // aplicar estilos y deshabilitar controles si estamos en modo Kruskal
                if (isKruskalMode) {
                    document.querySelectorAll('.edge-type-option').forEach(b=>{ try{ b.disabled = true; b.classList.add('disabled'); }catch(e){} });
                    if (edgeTypeDropdown) edgeTypeDropdown.disabled = true;
                    // Aplicar política (forzar no dirigidas y resolver duplicados según preferencia)
                    enforceKruskalEdgePolicy();
                    // Asegurar que el selector de preferencia exista si hay controles disponibles
                    const rightControls = document.querySelector('.right-controls');
                    if (rightControls) {
                        let prefSelect = document.getElementById('kruskalModeSelect');
                        if (!prefSelect) {
                            prefSelect = document.createElement('select');
                            prefSelect.id = 'kruskalModeSelect';
                            prefSelect.className = 'tab-btn';
                            prefSelect.title = 'Preferencia Kruskal: minimizar (MST) o maximizar (MaxST)';
                            const optMin = document.createElement('option'); optMin.value = 'min'; optMin.text = 'Minimizar';
                            const optMax = document.createElement('option'); optMax.value = 'max'; optMax.text = 'Maximizar';
                            prefSelect.appendChild(optMin); prefSelect.appendChild(optMax);
                            prefSelect.value = kruskalPreference;
                            prefSelect.addEventListener('change', () => {
                                kruskalPreference = prefSelect.value;
                                enforceKruskalEdgePolicy();
                                updateEdges();
                            });
                            rightControls.appendChild(prefSelect);
                        } else {
                            prefSelect.value = kruskalPreference;
                        }
                    }
                }
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

            // Si cargamos selección Kruskal, resaltarla
            if (lastKruskalSelectedIds && lastKruskalSelectedIds.size) {
                applyKruskalHighlight(lastKruskalSelectedIds);
            }
            
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
            // Permitir bucles mediante la matriz a menos que estemos en modo Johnson
            if (from === to && isJohnsonMode) {
                alert('En modo Johnson no se permiten aristas desde un nodo hacia sí mismo (bucles).');
                e.target.value = prev;
                return;
            }
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
const openHelpBtn = document.getElementById('openHelp');
const closeHelpBtn = document.getElementById('closeHelp');
const closeHelpModalBtn = document.getElementById('closeHelpModal');
const exportPdfBtn = document.getElementById('exportPdfBtn');

if (openHelpBtn) openHelpBtn.addEventListener('click', () => {
    const helpModal = document.getElementById('helpModal');
    if (helpModal) helpModal.style.display = 'block';
});

if (closeHelpBtn) closeHelpBtn.addEventListener('click', () => {
    const helpModal = document.getElementById('helpModal');
    if (helpModal) helpModal.style.display = 'none';
});

// Cerrar el modal de ayuda con el botón X
if (closeHelpModalBtn) closeHelpModalBtn.addEventListener('click', () => {
    const helpModal = document.getElementById('helpModal');
    if (helpModal) helpModal.style.display = 'none';
});

// Cerrar modal de ayuda al hacer clic fuera de él
window.addEventListener('click', (e) => {
    const helpModal = document.getElementById('helpModal');
    if (e.target === helpModal) {
        helpModal.style.display = 'none';
    }
});

if (exportPdfBtn) exportPdfBtn.addEventListener('click', () => {
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

// --- Kruskal mode: crear botón dinámicamente y funciones ---
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar elementos de Dijkstra con un pequeño delay para asegurar que el DOM esté listo
    setTimeout(() => {
        initializeDijkstraElements();
    }, 100);

    // Crear botón en topbar si no existe
    const tabs = document.querySelector('.tabs');
    if (tabs && !document.getElementById('toggleKruskal')) {
        const btn = document.createElement('button');
        btn.id = 'toggleKruskal';
        btn.className = 'tab-btn';
        btn.title = 'Activar/desactivar modo Kruskal (todas las conexiones no dirigidas)';
        btn.textContent = '🌲 Kruskal: Off';
        tabs.appendChild(btn);
        btn.addEventListener('click', toggleKruskalMode);
    }
});

function toggleKruskalMode() {
    isKruskalMode = !isKruskalMode;
    const btn = document.getElementById('toggleKruskal');
    if (btn) {
        btn.textContent = isKruskalMode ? '🌲 Kruskal: On' : '🌲 Kruskal: Off';
        btn.classList.toggle('kruskal-mode', isKruskalMode);
    }

    // Forzar tipo de arista a 'undirected' en UI
    updateEdgeTypeUI('undirected');

    // Visual: remover flechas de las aristas actuales
    svg.querySelectorAll('path').forEach(p => {
        if (isKruskalMode) {
            p.removeAttribute('marker-end');
            p.removeAttribute('marker-start');
        } else {
            // Si volvemos a modo normal, re-dibujar aristas para restaurar flechas según edgeType
            // (drawEdge se encarga normalmente al actualizar)
        }
    });

    // Convertir aristas existentes a no dirigidas y resolver conflictos bidireccionales
    if (isKruskalMode) {
        // Aplicar política Kruskal (forzar no dirigidas y resolver duplicados según preferencia)
        enforceKruskalEdgePolicy();
    }

    // Deshabilitar/rehabilitar controles de tipo de arista según modo Kruskal
    if (edgeTypeDropdown) edgeTypeDropdown.disabled = isKruskalMode;
    document.querySelectorAll('.edge-type-option').forEach(btn => {
        try { btn.disabled = isKruskalMode; if (isKruskalMode) btn.classList.add('disabled'); else btn.classList.remove('disabled'); } catch (e) {}
    });

    // Crear/actualizar botón de resolver Kruskal
    const rightControls = document.querySelector('.right-controls');
    if (!rightControls) return;
    let solveBtn = document.getElementById('resolveKruskalBtn');
    if (isKruskalMode) {
        if (!solveBtn) {
            solveBtn = document.createElement('button');
            solveBtn.id = 'resolveKruskalBtn';
            solveBtn.className = 'tab-btn kruskal-mode';
            solveBtn.textContent = '🧩 Resolver Kruskal';
            solveBtn.title = 'Calcular árbol de expansión mínima (Kruskal)';
            solveBtn.addEventListener('click', resolveKruskal);
            rightControls.appendChild(solveBtn);
        }

        // Crear selector de preferencia (min/max) si no existe
        let prefSelect = document.getElementById('kruskalModeSelect');
        if (!prefSelect) {
            prefSelect = document.createElement('select');
            prefSelect.id = 'kruskalModeSelect';
            prefSelect.className = 'tab-btn';
            prefSelect.title = 'Preferencia Kruskal: minimizar (MST) o maximizar (MaxST)';
            const optMin = document.createElement('option'); optMin.value = 'min'; optMin.text = 'Minimizar';
            const optMax = document.createElement('option'); optMax.value = 'max'; optMax.text = 'Maximizar';
            prefSelect.appendChild(optMin); prefSelect.appendChild(optMax);
            prefSelect.value = kruskalPreference;
            prefSelect.addEventListener('change', () => {
                kruskalPreference = prefSelect.value;
                // Reaplicar política Kruskal sobre aristas existentes cuando cambie la preferencia
                enforceKruskalEdgePolicy();
                updateEdges();
            });
            rightControls.appendChild(prefSelect);
        } else {
            prefSelect.value = kruskalPreference;
        }
    } else {
        // eliminar botón y limpiar resaltado
        if (solveBtn) solveBtn.remove();
        clearKruskalHighlight();
        // eliminar selector si existe
        const pref = document.getElementById('kruskalModeSelect'); if (pref) pref.remove();
    }
    // Redibujar aristas para aplicar/revertir marcadores visuales según modo
    updateEdges();
}

async function resolveKruskal() {
    if (edges.length === 0) {
        alert('No hay aristas para calcular Kruskal.');
        return;
    }

    // Construir lista de aristas únicas (undirected) con pesos
    const edgeList = [];
    const seen = new Set();
    edges.forEach(e => {
        const a = Math.min(e.from, e.to), b = Math.max(e.from, e.to);
        const key = `${a}-${b}`;
        if (seen.has(key)) return; // ignorar duplicados
        seen.add(key);
        const weight = typeof e.weight === 'number' ? e.weight : (e.weight ? Number(e.weight) : 1);
        edgeList.push({ id: e.id, from: a, to: b, weight, originalEdge: e });
    });

    // Ordenar por peso ascendente
    // Orden según preferencia: 'min' -> ascendente (MST), 'max' -> descendente (MaxST)
    edgeList.sort((x,y) => kruskalPreference === 'max' ? y.weight - x.weight : x.weight - y.weight);

    // Union-Find
    const parent = new Map();
    function find(u) {
        if (!parent.has(u)) parent.set(u, u);
        if (parent.get(u) !== u) parent.set(u, find(parent.get(u)));
        return parent.get(u);
    }
    function union(u,v) {
        const ru = find(u), rv = find(v);
        if (ru === rv) return false;
        parent.set(ru, rv);
        return true;
    }

    // Animación: iremos pintando aristas de menor a mayor peso, evitando formar ciclos
    clearKruskalHighlight();
    lastKruskalSelectedIds = new Set();
    const animationDelay = 400; // ms por arista
    for (const e of edgeList) {
        // buscar el elemento DOM correspondiente (data-id)
        const path = svg.querySelector(`path[data-id="${e.id}"]`);

        // marcar como analizada (sutil)
        if (path) {
            path.style.opacity = '0.7';
            path.style.transition = 'all 200ms ease';
        }

        // si al unir no genera ciclo, la seleccionamos y la pintamos
        if (union(e.from, e.to)) {
            if (path) {
                path.setAttribute('stroke', '#ffd700');
                path.setAttribute('stroke-width', 5);
                path.style.filter = 'drop-shadow(0 0 8px #ffd700)';
                path.classList.add('kruskal-selected');
            }
            lastKruskalSelectedIds.add(e.id);
        } else {
            // si genera ciclo, atenuar permanentemente
            if (path) {
                path.style.opacity = '0.25';
            }
        }

        // esperar un poco antes de la siguiente arista
        // eslint-disable-next-line no-await-in-loop
        await new Promise(r => setTimeout(r, animationDelay));
    }

    // No mostramos costo total según lo solicitado; el resultado visual queda en pantalla
}

function applyKruskalHighlight(mstEdges, total) {
    // Mantener por compatibilidad: resalta todas las aristas cuyo id está en mstEdges
    clearKruskalHighlight();
    const selectedIds = new Set();
    // mstEdges may be array of {from,to} or a Set of ids; accept both
    if (mstEdges instanceof Set) {
        mstEdges.forEach(id => selectedIds.add(Number(id)));
    } else if (Array.isArray(mstEdges) && mstEdges.length && typeof mstEdges[0] === 'object') {
        mstEdges.forEach(me => {
            edges.forEach(e => {
                const a = Math.min(e.from, e.to), b = Math.max(e.from, e.to);
                if (a === me.from && b === me.to) selectedIds.add(e.id);
            });
        });
    }

    svg.querySelectorAll('path').forEach(p => {
        const eid = p.getAttribute('data-id') || p.dataset.id || p.id;
        if (!eid) return;
        if (selectedIds.has(Number(eid))) {
            p.classList.add('kruskal-selected');
            p.setAttribute('stroke', '#ffd700');
            p.setAttribute('stroke-width', 5);
            p.style.filter = 'drop-shadow(0 0 8px #ffd700)';
        } else {
            p.style.opacity = '0.3';
        }
    });
}

function clearKruskalHighlight() {
    const banner = document.getElementById('kruskalBanner'); if (banner) banner.remove();
    svg.querySelectorAll('path').forEach(p => {
        if (p.classList.contains('kruskal-selected')) {
            p.classList.remove('kruskal-selected');
            // restaurar color original
            p.setAttribute('stroke', edgeColor);
            p.setAttribute('stroke-width', 3);
            p.style.filter = '';
        }
        p.style.opacity = '1';
    });
}

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

    // Validar
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
    // Verificar si hay resultados de Dijkstra
    if (dijkstraDistances.size > 0 && dijkstraPrevious.size > 0) {
        // Exportar Dijkstra
        const startNodeId = nodes.length > 0 ? nodes[0].id : null;
        if (startNodeId !== null) {
            exportDijkstraResults(startNodeId);
            return;
        }
    }

    // Si no hay Dijkstra, exportar NorthWest
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

    const suggested = `northwest_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}`;
    let filename = prompt('Nombre de archivo (sin extensión):', suggested);
    if (filename === null) return;
    filename = (filename || '').trim();
    if (!filename) return;
    if (!/\.json$/i.test(filename)) filename += '.json';

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
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

    const suggested = `northwest_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}`;
    let filename = prompt('Nombre de archivo (sin extensión):', suggested);
    if (filename === null) return;
    filename = (filename || '').trim();
    if (!filename) return;
    if (!/\.csv$/i.test(filename)) filename += '.csv';

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
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
        // Verificar si es un archivo de Dijkstra
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const data = JSON.parse(event.target.result);
                if (data.algorithm === 'Dijkstra') {
                    // Es un archivo de Dijkstra
                    dijkstraDistances.clear();
                    dijkstraPrevious.clear();
                    dijkstraPreference = data.mode || 'min';

                    Object.entries(data.distances).forEach(([key, value]) => {
                        dijkstraDistances.set(parseInt(key), value);
                    });

                    Object.entries(data.previous).forEach(([key, value]) => {
                        dijkstraPrevious.set(parseInt(key), value === null ? null : parseInt(value));
                    });

                    // Restaurar nodos y aristas si vienen en el archivo
                    if (data.nodes && data.nodes.length > 0) {
                        // Limpiar grafo actual
                        nodes = [];
                        edges = [];
                        
                        // Recrear nodos
                        data.nodes.forEach(nodeData => {
                            nodes.push({
                                id: nodeData.id,
                                label: nodeData.label,
                                x: nodeData.x,
                                y: nodeData.y
                            });
                        });

                        // Recrear aristas
                        if (data.edges && data.edges.length > 0) {
                            let maxEdgeId = 0;
                            data.edges.forEach(edgeData => {
                                edges.push({
                                    id: edgeData.id,
                                    from: edgeData.from,
                                    to: edgeData.to,
                                    weight: edgeData.weight
                                });
                                if (edgeData.id > maxEdgeId) maxEdgeId = edgeData.id;
                            });
                            nextEdgeId = maxEdgeId + 1;
                        }

                        // Redibujar el grafo
                        canvas.clearRect(0, 0, canvasElement.width, canvasElement.height);
                        edges.forEach(edge => drawEdge(edge.from, edge.to, edge.weight, edge.id));
                        nodes.forEach(node => drawNode(node.id, node.x, node.y, node.label));
                    }

                    // Restaurar visualización de Dijkstra
                    updateDijkstraDistanceLabels(dijkstraDistances);
                    highlightAllShortestPaths(data.startNodeId);
                    updateDijkstraPreferenceUI();
                    showDijkstraResults(data.startNodeId);
                    showNotification(`✅ Resultados de Dijkstra importados (Modo: ${dijkstraPreference})`, 'success');
                } else {
                    // Es un archivo de NorthWest - importar como antes
                    importFromFile(file);
                }
            } catch (error) {
                // Si no es JSON válido, intentar como archivo normal
                importFromFile(file);
            }
        };
        reader.readAsText(file);
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
        oferta: [...oferta],
        demanda: [...demanda],
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

        // Calcular matriz de evaluación (Cij = ui + vj)
        const matrizEvaluacion = calcularMatrizEvaluacion(ui, vj, mFinal, nFinal);

        // Calcular costos reducidos
        const costosReducidos = calcularCostosReducidos(asignacion, costos, ui, vj, mFinal, nFinal);

        const costTotal = calcularCostoTotal(asignacion, costos);

        // Verificar optimalidad
        const esOptimo = verificarOptimalidad(costosReducidos, asignacion, tipoOptimizacion);

        iteraciones.push({
            numero: iteracion,
            asignacion: asignacion.map(row => [...row]),
            oferta: [...oferta],
            demanda: [...demanda],
            multiplicadores: { ui: [...ui], vj: [...vj] },
            matrizEvaluacion: matrizEvaluacion.map(row => [...row]),
            matrizCostos: costos.map(row => [...row]),
            costosReducidos: costosReducidos.map(row => [...row]),
            costTotal: costTotal,
            esOptimo: esOptimo,
            fase: 'MODI - Optimización'
        });

        // Guardar estado de optimalidad para devolverlo si el proceso se interrumpe
        let lastEsOptimo = esOptimo;
        if (esOptimo) break;

        // Obtener lista de celdas candidatas ordenadas
        const candidatos = obtenerCeldasEntrada(costosReducidos, asignacion, tipoOptimizacion);
        if (!candidatos || candidatos.length === 0) {
            console.warn('No se pudo encontrar celda de entrada (no hay candidatas)');
            break;
        }

        let loop = null;
        let chosenCell = null;
        // Intentar cada candidata hasta encontrar un loop válido
        for (const cand of candidatos) {
            chosenCell = { i: cand.i, j: cand.j };
            console.log(`Iteración ${iteracion}: intentanto celda de entrada [${chosenCell.i}][${chosenCell.j}] (valor ${cand.val})`);
            loop = crearLoop(asignacion, chosenCell, mFinal, nFinal);
            if (loop && loop.length > 0) break;
        }

        if (!loop || loop.length === 0) {
            // No se encontró loop válido para ninguna candidata: intentar manejar degeneración y repetir
            console.warn('No se pudo crear loop válido para ninguna candidata. Aplicando manejo de degeneración adicional y reintentando.');
            manejarDegeneracion(asignacion, costos, mFinal, nFinal);
            // Después de marcar degeneración, volver a la siguiente iteración (se recomputarán multiplicadores)
            continue;
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
    // Determinar si la última comprobación declaró optimalidad
    // Si guardamos 'esOptimo' en la última iteración del bucle, preferir ese valor;
    // como simplificación, comprobamos la última entrada en iteraciones
    let finalEsOptimo = false;
    if (iteraciones.length > 0) finalEsOptimo = !!iteraciones[iteraciones.length - 1].esOptimo;

    return {
        costoOptimo: costoFinal,
        asignacionOptima: asignacion,
        iteraciones: iteraciones,
        solucionOptimal: finalEsOptimo,
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

    const EPS = 1e-9;
    while (i < m && j < n) {
        const cantidad = Math.min(oferta[i], demanda[j]);
        asignacion[i][j] = cantidad;
        oferta[i] -= cantidad;
        demanda[j] -= cantidad;

        const ofertaCero = Math.abs(oferta[i]) < EPS;
        const demandaCero = Math.abs(demanda[j]) < EPS;

        // Si ambos quedan a cero, avanzar ambos índices
        if (ofertaCero && demandaCero) {
            i++;
            j++;
            // El while (i < m && j < n) manejará la terminación
        } else if (ofertaCero) {
            if (i < m - 1) i++;
            else break;
        } else if (demandaCero) {
            if (j < n - 1) j++;
            else break;
        } else {
            // Ninguno llegó a 0; no hay más asignaciones posibles en esta configuración
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
    const EPS = 1e-6;
    let count = 0;
    for (let i = 0; i < asignacion.length; i++) {
        for (let j = 0; j < asignacion[i].length; j++) {
            if (asignacion[i][j] >= EPS) count++;
        }
    }
    return count;
}

function manejarDegeneracion(asignacion, costos, m, n) {
    // Agregar un epsilon no nulo a una celda no básica estratégica
    // Usamos un EPS lo suficientemente grande para que sea considerada básica en conteos
    const EPS = 1e-6;
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            if (asignacion[i][j] === 0) {
                asignacion[i][j] = EPS; // marca degeneración
                return;
            }
        }
    }
}

function calcularMultiplicadores(asignacion, costos, m, n) {
    const EPS = 1e-6;
    const ui = new Array(m).fill(undefined);
    const vj = new Array(n).fill(undefined);

    // Buscar el costo mínimo en las celdas básicas para usar como referencia
    let costoMinimo = Infinity;
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            if (asignacion[i][j] >= EPS) {
                costoMinimo = Math.min(costoMinimo, costos[i][j]);
            }
        }
    }

    // Inicializar ui[0] con el costo mínimo (en lugar de 0)
    // Esto hace que los multiplicadores sean más intuitivos
    ui[0] = (costoMinimo !== Infinity && costoMinimo > 0) ? costoMinimo : 0;

    let cambios = true;
    let intentos = 0;

    while (cambios && intentos < 100) {
        cambios = false;
        intentos++;

        for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
                if (asignacion[i][j] >= EPS) {
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
    const EPS = 1e-6;
    const costosReducidos = Array.from({ length: m }, () => new Array(n).fill(0));

    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            if (asignacion[i][j] < EPS) {
                costosReducidos[i][j] = costos[i][j] - (ui[i] + vj[j]);
            } else {
                costosReducidos[i][j] = 0; // Celdas básicas no se evalúan
            }
        }
    }

    return costosReducidos;
}

/**
 * Calcula la matriz de evaluación Cij = ui + vj para todas las celdas
 * Esta matriz muestra los valores duales del método MODI
 * Para variables básicas, Cij debe ser igual al costo original
 */
function calcularMatrizEvaluacion(ui, vj, m, n) {
    const evaluacion = Array.from({ length: m }, () => new Array(n).fill(0));

    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            evaluacion[i][j] = ui[i] + vj[j];
        }
    }

    return evaluacion;
}

function verificarOptimalidad(costosReducidos, asignacion, tipoOptimizacion) {
    const EPS = 1e-6;
    for (let i = 0; i < costosReducidos.length; i++) {
        for (let j = 0; j < costosReducidos[i].length; j++) {
            if (asignacion[i][j] < EPS) {
                if (tipoOptimizacion === 'minimizar' && costosReducidos[i][j] < -EPS) {
                    return false;
                }
                if (tipoOptimizacion === 'maximizar' && costosReducidos[i][j] > EPS) {
                    return false;
                }
            }
        }
    }
    return true;
}

function encontrarCeldaEntrada(costosReducidos, asignacion, tipoOptimizacion) {
    const EPS = 1e-6;
    let mejorValor = tipoOptimizacion === 'minimizar' ? Infinity : -Infinity;
    let mejorCelda = null;

    for (let i = 0; i < costosReducidos.length; i++) {
        for (let j = 0; j < costosReducidos[i].length; j++) {
            if (asignacion[i][j] < EPS) {
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

// Devuelve todas las celdas candidatas (no básicas) ordenadas por prioridad
function obtenerCeldasEntrada(costosReducidos, asignacion, tipoOptimizacion) {
    const EPS = 1e-6;
    const lista = [];
    for (let i = 0; i < costosReducidos.length; i++) {
        for (let j = 0; j < costosReducidos[i].length; j++) {
            if (asignacion[i][j] < EPS) {
                lista.push({ i, j, val: costosReducidos[i][j] });
            }
        }
    }
    // Ordenar: para minimizar, los más negativos primero; para maximizar, los más positivos primero
    if (tipoOptimizacion === 'minimizar') lista.sort((a, b) => a.val - b.val);
    else lista.sort((a, b) => b.val - a.val);
    return lista;
}

function crearLoop(asignacion, celdaEntrada, m, n) {
    const { i: startI, j: startJ } = celdaEntrada;
    const EPS = 1e-6;

    // DFS alternando entre movimientos por fila y por columna
    function dfs(i, j, direction, path, visited) {
        // direction: 'row' -> next move along row (change j), 'col' -> next move along column (change i)
        if (direction === 'row') {
            for (let jj = 0; jj < n; jj++) {
                if (jj === j) continue;
                // permitimos moverse a celdas básicas (>=EPS) o a la celda inicial
                if (!(asignacion[i][jj] >= EPS) && !(i === startI && jj === startJ)) continue;
                const key = `${i},${jj}`;
                // evitar volver inmediatamente al anterior
                if (visited.has(key)) continue;

                // si cerramos ciclo y es válido
                if (i === startI && jj === startJ && path.length >= 3) {
                    return [...path, { i: i, j: jj }];
                }

                visited.add(key);
                const res = dfs(i, jj, 'col', [...path, { i: i, j: jj }], visited);
                if (res) return res;
                visited.delete(key);
            }
        } else {
            for (let ii = 0; ii < m; ii++) {
                if (ii === i) continue;
                if (!(asignacion[ii][j] >= EPS) && !(ii === startI && j === startJ)) continue;
                const key = `${ii},${j}`;
                if (visited.has(key)) continue;

                if (ii === startI && j === startJ && path.length >= 3) {
                    return [...path, { i: ii, j: j }];
                }

                visited.add(key);
                const res = dfs(ii, j, 'row', [...path, { i: ii, j: j }], visited);
                if (res) return res;
                visited.delete(key);
            }
        }
        return null;
    }

    // iniciar DFS desde la celda de entrada; la primera dirección puede ser fila o columna
    const visited = new Set([`${startI},${startJ}`]);
    let rawPath = dfs(startI, startJ, 'row', [{ i: startI, j: startJ }], visited);
    if (!rawPath) {
        // intentar empezando por columna
        rawPath = dfs(startI, startJ, 'col', [{ i: startI, j: startJ }], visited);
    }

    if (!rawPath) {
        console.warn('No se encontró loop con DFS, usando fallback simple');
        return crearLoopSimple(asignacion, celdaEntrada, m, n);
    }

    // Asignar signos alternados (+,-,+,-...) empezando con + en la celda de entrada
    const loop = rawPath.map((cell, idx) => ({ i: cell.i, j: cell.j, signo: idx % 2 === 0 ? 1 : -1 }));
    // Asegurar que el último elemento es la misma celda de entrada y eliminar duplicado final
    if (loop.length > 1) {
        const last = loop[loop.length - 1];
        if (last.i === startI && last.j === startJ) {
            // quitar el último porque la estructura de loop espera pares alternos sin repetir la entrada al final
            loop.pop();
        }
    }

    return loop;
}

// Fallback simple para búsqueda de loop
function crearLoopSimple(asignacion, celdaEntrada, m, n) {
    const { i: ii, j: jj } = celdaEntrada;
    const EPS = 1e-6;

    // Buscar loop rectangular simple (2x2)
    for (let j = 0; j < n; j++) {
        if (j === jj) continue;
        if (asignacion[ii][j] < EPS) continue;
        for (let i = 0; i < m; i++) {
            if (i === ii) continue;
            if (asignacion[i][j] >= EPS && asignacion[i][jj] >= EPS) {
                const loop = [
                    { i: ii, j: jj, signo: 1 },
                    { i: ii, j: j, signo: -1 },
                    { i: i, j: j, signo: 1 },
                    { i: i, j: jj, signo: -1 }
                ];
                return loop;
            }
        }
    }

    console.error('No se encontró loop válido para celda (fallback):', celdaEntrada);
    console.log('Asignación actual:', asignacion);
    return null;
}

function calcularTheta(asignacion, loop) {
    if (!loop || loop.length === 0) {
        console.error('Loop vacío en calcularTheta');
        return 0;
    }
    const EPS = 1e-6;
    let theta = Infinity;

    for (const celda of loop) {
        if (celda.signo === -1) {
            const valor = asignacion[celda.i][celda.j];
            // Debe ser una celda básica (valor >= EPS)
            if (valor >= EPS) {
                theta = Math.min(theta, valor);
            } else {
                // Celda en loop no es básica: ignorar (puede ser epsilon agregado), continuar
                // si valor es muy pequeño tratamos como 0 y no la usamos para theta
                if (valor > 1e-12) {
                    // si está entre 1e-12 y EPS, aceptamos como candidata
                    theta = Math.min(theta, valor);
                }
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
            html += `<div><strong>Ui (Filas):</strong> [${iter.multiplicadores.ui.map(v => v.toFixed(2)).join(', ')}]</div>`;
            html += `<div><strong>Vj (Columnas):</strong> [${iter.multiplicadores.vj.map(v => v.toFixed(2)).join(', ')}]</div>`;
            html += `</div>`;
            html += `<p class="nw-explanation">Los multiplicadores ui y vj se calculan a partir de las variables básicas usando la relación: Cij = ui + vj</p>`;
            html += `</div>`;
        }

        // Matriz de costos con básicas resaltadas
        if (iter.matrizCostos) {
            html += `<div class="nw-matrix-section">`;
            html += `<h5>Matriz de Costos Resultante (Solo Variables Básicas)</h5>`;
            html += `<p class="nw-explanation">Esta matriz muestra ÚNICAMENTE los costos conocidos de las rutas activas (variables básicas resaltadas en cyan). Las celdas vacías representan rutas no utilizadas cuyos costos aún no han sido evaluados.</p>`;
            html += generarTablaMatriz(iter.matrizCostos, 'costos-basicas', resultado, iter.asignacion);
            html += `</div>`;
        }

        // Matriz de evaluación con multiplicadores integrados (si existen multiplicadores)
        if (iter.matrizEvaluacion && iter.multiplicadores) {
            html += `<div class="nw-matrix-section">`;
            html += `<h5>Matriz de Evaluación (Cij = ui + vj)</h5>`;
            html += `<p class="nw-explanation">Ahora CALCULAMOS todos los valores faltantes usando la fórmula Cij = ui + vj. Los multiplicadores ui (última columna) y vj (última fila) permiten estimar los costos de TODAS las rutas, llenando los espacios vacíos de la matriz anterior. Para variables básicas (moradas), este valor calculado debe coincidir exactamente con el costo original conocido.</p>`;
            html += generarMatrizEvaluacionConMultiplicadores(iter.matrizEvaluacion, iter.multiplicadores.ui, iter.multiplicadores.vj, iter.asignacion, resultado);
            html += `</div>`;
        }

        // Costos reducidos (si existen)
        if (iter.costosReducidos) {
            html += `<div class="nw-matrix-section">`;
            html += `<h5>Matriz de Costos Reducidos (Cij - ui - vj)</h5>`;
            html += `<p class="nw-explanation">Para variables no básicas: diferencia entre el costo original y el valor evaluado. ${resultado.tipoOptimizacion === 'minimizar' ? 'Valores negativos (rojos) indican mejora potencial.' : 'Valores positivos (verdes) indican mejora potencial.'}</p>`;
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

    // Mostrar matriz de costos utilizada para visualizar fila/columna ficticia
    if (resultado.matrizCostos && Array.isArray(resultado.matrizCostos) && resultado.matrizCostos.length > 0) {
        html += `<div class=\"nw-matrix-section\">`;
        html += `<h5>Matriz de Costos utilizada</h5>`;
        html += generarTablaMatriz(resultado.matrizCostos, 'costos', resultado);
        html += `</div>`;
    }

    // Tabs para iteraciones
    html += `<div class="nw-iterations-tabs">`;
    resultado.iteraciones.forEach((iter, idx) => {
        html += `<button class="nw-tab-btn-inline" data-iteration="${idx}">`;
        html += iter.numero === 0 ? 'Inicial' : `Iter ${iter.numero}`;
        html += `</button>`;
    });
    // Tab adicional para resultado final
    html += `<button class="nw-tab-btn-inline active" data-iteration="final">📊 Resultado Final</button>`;
    html += `</div>`;

    // Contenido de iteraciones
    html += `<div class="nw-iterations-content-inline">`;
    resultado.iteraciones.forEach((iter, idx) => {
        html += `<div class="nw-iteration-panel-inline" data-iteration="${idx}">`;
        html += `<h4 class="nw-iteration-title">${iter.fase} ${iter.numero > 0 ? `- Iteración ${iter.numero}` : ''}</h4>`;

        // Fórmula del costo detallada
        if (iter.matrizCostos) {
            html += generarFormulaCosto(iter.asignacion, iter.matrizCostos);
        } else {
            html += `<div class="nw-cost-display">Costo Total: <span class="nw-cost-value">${iter.costTotal.toFixed(2)}</span></div>`;
        }

        // Matriz de asignación con oferta y demanda
        html += `<div class="nw-matrix-section">`;
        html += `<h5>Matriz de Asignación</h5>`;
        html += generarTablaMatriz(iter.asignacion, 'asignacion', resultado, iter.asignacion, {oferta: iter.oferta, demanda: iter.demanda});
        html += `</div>`;

        // Matriz de costos con básicas resaltadas
        if (iter.matrizCostos) {
            html += `<div class="nw-matrix-section">`;
            html += `<h5>Matriz de Costos Resultante (Solo Variables Básicas)</h5>`;
            html += `<p class="nw-explanation">Esta matriz muestra ÚNICAMENTE los costos conocidos de las rutas activas (variables básicas resaltadas en cyan). Las celdas vacías representan rutas no utilizadas cuyos costos aún no han sido evaluados.</p>`;
            html += generarTablaMatriz(iter.matrizCostos, 'costos-basicas', resultado, iter.asignacion);
            html += `</div>`;
        }

        // Matriz de evaluación con multiplicadores integrados (si existen multiplicadores)
        if (iter.matrizEvaluacion && iter.multiplicadores) {
            html += `<div class="nw-matrix-section">`;
            html += `<h5>Matriz de Evaluación (Cij = ui + vj)</h5>`;
            html += `<p class="nw-explanation">Ahora CALCULAMOS todos los valores faltantes usando la fórmula Cij = ui + vj. Los multiplicadores ui (última columna) y vj (última fila) permiten estimar los costos de TODAS las rutas, llenando los espacios vacíos de la matriz anterior. Para variables básicas (moradas), este valor calculado debe coincidir exactamente con el costo original conocido.</p>`;
            html += generarMatrizEvaluacionConMultiplicadores(iter.matrizEvaluacion, iter.multiplicadores.ui, iter.multiplicadores.vj, iter.asignacion, resultado);
            html += `</div>`;
        }

        // Costos reducidos (si existen)
        if (iter.costosReducidos) {
            html += `<div class="nw-matrix-section">`;
            html += `<h5>Matriz de Costos Reducidos (Cij - ui - vj)</h5>`;
            html += `<p class="nw-explanation">Para variables no básicas: diferencia entre el costo original y el valor evaluado. ${resultado.tipoOptimizacion === 'minimizar' ? 'Valores negativos (rojos) indican mejora potencial.' : 'Valores positivos (verdes) indican mejora potencial.'}</p>`;
            html += generarTablaMatriz(iter.costosReducidos, 'reducidos', resultado);
            html += `</div>`;
        }

        // Estado
        html += `<div class="nw-status ${iter.esOptimo ? 'optimal' : 'non-optimal'}">`;
        html += iter.esOptimo ? '✅ Solución Óptima Alcanzada' : '🔄 Requiere más iteraciones';
        html += `</div>`;

        html += `</div>`;
    });

    // Panel de Resultado Final
    const iteracionFinal = resultado.iteraciones[resultado.iteraciones.length - 1];
    html += `<div class="nw-iteration-panel-inline active" data-iteration="final">`;
    html += `<h4 class="nw-iteration-title">📊 Resultado Final</h4>`;

    // Costo total destacado
    html += `<div class="nw-final-cost">`;
    html += `<div class="nw-final-cost-label">Costo ${resultado.tipoOptimizacion === 'minimizar' ? 'Mínimo' : 'Máximo'}:</div>`;
    html += `<div class="nw-final-cost-value">${resultado.costoOptimo.toFixed(2)}</div>`;
    html += `</div>`;

    // Fórmula del costo detallada
    if (iteracionFinal.matrizCostos) {
        html += generarFormulaCosto(iteracionFinal.asignacion, iteracionFinal.matrizCostos);
    }

    // Matriz de asignación final con oferta y demanda
    html += `<div class="nw-matrix-section">`;
    html += `<h5>Matriz de Asignación Final</h5>`;
    html += `<p class="nw-explanation">Esta es la solución ${resultado.solucionOptimal ? 'óptima' : 'encontrada'}. Las celdas resaltadas muestran las cantidades transportadas en cada ruta.</p>`;
    html += generarTablaMatriz(iteracionFinal.asignacion, 'asignacion', resultado, iteracionFinal.asignacion, {oferta: iteracionFinal.oferta, demanda: iteracionFinal.demanda});
    html += `</div>`;

    // Información adicional si hay nodo ficticio
    if (resultado.nodeFicticioAgregado.tipo) {
        html += `<div class="nw-info-box">`;
        html += `<strong>ℹ️ Información:</strong> Se agregó un <strong>${resultado.nodeFicticioAgregado.tipo} ficticio</strong> con cantidad <strong>${resultado.nodeFicticioAgregado.cantidad.toFixed(2)}</strong> para balancear el problema.`;
        html += `</div>`;
    }

    // Estado final
    html += `<div class="nw-status optimal">`;
    html += resultado.solucionOptimal ? '✅ Solución Óptima Alcanzada' : '⚠️ Solución No Óptima';
    html += `</div>`;

    html += `</div>`;
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

function generarTablaMatriz(matriz, tipo, resultado, asignacion = null, ofertaDemanda = null) {
    const m = matriz.length;
    const n = matriz[0].length;
    const isFicticio = resultado.nodeFicticioAgregado.tipo !== null;
    const EPS = 1e-9;

    // Calcular oferta y demanda desde asignación si no se proporcionan
    let oferta = null;
    let demanda = null;
    if (tipo === 'asignacion' && ofertaDemanda) {
        oferta = ofertaDemanda.oferta || null;
        demanda = ofertaDemanda.demanda || null;
    } else if (tipo === 'asignacion' && asignacion) {
        // Calcular desde la matriz de asignación
        oferta = new Array(m).fill(0);
        demanda = new Array(n).fill(0);
        for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
                oferta[i] += asignacion[i][j];
                demanda[j] += asignacion[i][j];
            }
        }
    }

    let html = '<table class="nw-result-table">';

    // Header row
    html += '<tr><th></th>';
    for (let j = 0; j < n; j++) {
        const esFicticioCol = isFicticio && resultado.nodeFicticioAgregado.tipo === 'destino' && j === n - 1;
        html += `<th class="${esFicticioCol ? 'nw-ficticio' : ''}">Destino ${j + 1}${esFicticioCol ? ' (F)' : ''}</th>`;
    }
    // Agregar columna de Oferta si aplica
    if (tipo === 'asignacion' && oferta) {
        html += '<th class="nw-supply-demand-header">Oferta</th>';
    }
    html += '</tr>';

    // Filas de datos
    for (let i = 0; i < m; i++) {
        const esFicticioRow = isFicticio && resultado.nodeFicticioAgregado.tipo === 'origen' && i === m - 1;
        html += `<tr><th class="${esFicticioRow ? 'nw-ficticio' : ''}">Origen ${i + 1}${esFicticioRow ? ' (F)' : ''}</th>`;

        for (let j = 0; j < n; j++) {
            const valor = matriz[i][j];
            let clase = '';

            // Lógica de resaltado según el tipo de matriz
            if (tipo === 'asignacion' && valor > EPS) {
                clase = 'nw-basica';
            } else if (tipo === 'reducidos') {
                if (valor < -EPS) clase = 'nw-negativo';
                else if (valor > EPS) clase = 'nw-positivo';
            } else if (tipo === 'evaluacion' && asignacion) {
                // Resaltar variables básicas en la matriz de evaluación
                if (asignacion[i][j] > EPS) {
                    clase = 'nw-basica-evaluacion';
                }
            } else if (tipo === 'costos-basicas' && asignacion) {
                // Resaltar variables básicas en la matriz de costos
                if (asignacion[i][j] > EPS) {
                    clase = 'nw-basica';
                }
            }

            // Para 'costos-basicas', solo mostrar costos de celdas con asignación
            let texto;
            if (tipo === 'costos-basicas' && asignacion && asignacion[i][j] <= EPS) {
                texto = ''; // Celda vacía para variables no básicas
                clase = clase || 'nw-empty-cost';
            } else {
                texto = Math.abs(valor) < EPS ? '0' : valor.toFixed(2);
            }
            html += `<td class="${clase}">${texto}</td>`;
        }

        // Agregar celda de oferta si aplica
        if (tipo === 'asignacion' && oferta) {
            const ofertaValor = oferta[i];
            const ofertaTexto = Math.abs(ofertaValor) < EPS ? '0' : ofertaValor.toFixed(2);
            html += `<td class="nw-supply-demand-cell ${esFicticioRow ? 'nw-ficticio' : ''}">${ofertaTexto}</td>`;
        }

        html += '</tr>';
    }

    // Fila de demanda si aplica
    if (tipo === 'asignacion' && demanda) {
        html += '<tr><th class="nw-supply-demand-header">Demanda</th>';
        for (let j = 0; j < n; j++) {
            const esFicticioCol = isFicticio && resultado.nodeFicticioAgregado.tipo === 'destino' && j === n - 1;
            const demandaValor = demanda[j];
            const demandaTexto = Math.abs(demandaValor) < EPS ? '0' : demandaValor.toFixed(2);
            html += `<td class="nw-supply-demand-cell ${esFicticioCol ? 'nw-ficticio' : ''}">${demandaTexto}</td>`;
        }
        html += '<td class="nw-corner-cell"></td>'; // Celda esquina
        html += '</tr>';
    }

    html += '</table>';

    return html;
}

/**
 * Genera la fórmula detallada del cálculo del costo total
 * Muestra: Σ(cij × xij) = (c11 × x11) + (c12 × x12) + ... = Total
 */
function generarFormulaCosto(asignacion, costos) {
    const EPS = 1e-9;
    const m = asignacion.length;
    const n = asignacion[0].length;

    let terminos = [];
    let total = 0;

    for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
            if (asignacion[i][j] > EPS) {
                const costo = costos[i][j];
                const cantidad = asignacion[i][j];
                const valor = costo * cantidad;
                total += valor;

                terminos.push({
                    formula: `(${costo.toFixed(2)} × ${cantidad.toFixed(2)})`,
                    valor: valor.toFixed(2),
                    origen: i + 1,
                    destino: j + 1
                });
            }
        }
    }

    if (terminos.length === 0) {
        return '<div class="nw-cost-formula">Costo Total = 0</div>';
    }

    let html = '<div class="nw-cost-formula">';
    html += '<div class="nw-cost-formula-title">Cálculo del Costo Total:</div>';
    html += '<div class="nw-cost-formula-content">';
    html += '<strong>Σ(Cij × Xij)</strong> = ';
    html += terminos.map(t => t.formula).join(' + ');
    html += '</div>';
    html += '<div class="nw-cost-formula-result">';
    html += '= ' + terminos.map(t => t.valor).join(' + ');
    html += ' = <strong>' + total.toFixed(2) + '</strong>';
    html += '</div>';
    html += '</div>';

    return html;
}

/**
 * Genera la matriz de evaluación con multiplicadores integrados
 * Los ui aparecen como última columna, los vj como última fila
 * Esto muestra visualmente que Cij = ui + vj
 */
function generarMatrizEvaluacionConMultiplicadores(matrizEvaluacion, ui, vj, asignacion, resultado) {
    const m = matrizEvaluacion.length;
    const n = matrizEvaluacion[0].length;
    const isFicticio = resultado.nodeFicticioAgregado.tipo !== null;
    const EPS = 1e-9;

    let html = '<table class="nw-result-table nw-evaluation-table">';

    // Header row con columnas de destinos + columna ui
    html += '<tr><th></th>';
    for (let j = 0; j < n; j++) {
        const esFicticioCol = isFicticio && resultado.nodeFicticioAgregado.tipo === 'destino' && j === n - 1;
        html += `<th class="${esFicticioCol ? 'nw-ficticio' : ''}">Dest ${j + 1}${esFicticioCol ? ' (F)' : ''}</th>`;
    }
    html += '<th class="nw-multiplier-header">ui</th>';
    html += '</tr>';

    // Filas de datos con valores de evaluación + columna ui
    for (let i = 0; i < m; i++) {
        const esFicticioRow = isFicticio && resultado.nodeFicticioAgregado.tipo === 'origen' && i === m - 1;
        html += `<tr><th class="${esFicticioRow ? 'nw-ficticio' : ''}">Orig ${i + 1}${esFicticioRow ? ' (F)' : ''}</th>`;

        // Valores de evaluación (ui + vj)
        for (let j = 0; j < n; j++) {
            const valor = matrizEvaluacion[i][j];
            let clase = '';

            // Resaltar variables básicas
            if (asignacion && asignacion[i][j] > EPS) {
                clase = 'nw-basica-evaluacion';
            }

            const texto = Math.abs(valor) < EPS ? '0' : valor.toFixed(2);
            html += `<td class="${clase}">${texto}</td>`;
        }

        // Columna ui
        const uiValor = ui[i].toFixed(2);
        html += `<td class="nw-multiplier-cell">${uiValor}</td>`;
        html += '</tr>';
    }

    // Fila vj al final
    html += '<tr><th class="nw-multiplier-header">vj</th>';
    for (let j = 0; j < n; j++) {
        const vjValor = vj[j].toFixed(2);
        html += `<td class="nw-multiplier-cell">${vjValor}</td>`;
    }
    html += '<td class="nw-corner-cell"></td>'; // Celda esquina vacía
    html += '</tr>';

    html += '</table>';

    return html;
}

// Aplica la política Kruskal sobre el array `edges` en memoria:
// - Fuerza todas las aristas a no dirigidas
// - Para pares de nodos con múltiples aristas, conserva la arista según `kruskalPreference`
function enforceKruskalEdgePolicy() {
    // Mapear pares undirected a lista de aristas
    const pairMap = new Map();
    edges.forEach(e => {
        const a = Math.min(e.from, e.to), b = Math.max(e.from, e.to);
        const key = `${a}-${b}`;
        if (!pairMap.has(key)) pairMap.set(key, []);
        pairMap.get(key).push(e);
    });
    const toRemoveIds = new Set();
    pairMap.forEach(list => {
        if (list.length > 1) {
            // elegir la arista a conservar según preferencia
            let keeper = list[0];
            list.forEach(ed => {
                const w = typeof ed.weight === 'number' ? ed.weight : Number(ed.weight || 0);
                const kw = typeof keeper.weight === 'number' ? keeper.weight : Number(keeper.weight || 0);
                if (kruskalPreference === 'max') {
                    if (w > kw) keeper = ed;
                } else {
                    if (w < kw) keeper = ed;
                }
            });
            list.forEach(ed => { if (ed.id !== keeper.id) toRemoveIds.add(ed.id); });
        }
    });
    if (toRemoveIds.size) {
        // Eliminar visualmente los paths correspondientes
        toRemoveIds.forEach(id => { svg.querySelector(`path[data-id="${id}"]`)?.remove(); });
        edges = edges.filter(e => !toRemoveIds.has(e.id));
    }
    // Forzar no dirigida en las aristas restantes
    edges.forEach(e => { e.directed = false; e.bidirectional = false; });
}

/* ===== DIJKSTRA ALGORITHM IMPLEMENTATION ===== */

// Función para mostrar notificaciones visuales
function showNotification(message, type = 'info', persistent = false) {
    // Remover notificación anterior si existe
    const existingNotification = document.querySelector('.dijkstra-notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = 'dijkstra-notification';
    notification.textContent = message;

    const colors = {
        'info': '#00f7ff',
        'success': '#00ff00',
        'warning': '#ffaa00',
        'error': '#ff3333'
    };

    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(26, 26, 46, 0.95);
        border: 2px solid ${colors[type]};
        color: ${colors[type]};
        padding: 15px 30px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: bold;
        z-index: 3000;
        box-shadow: 0 0 20px ${colors[type]}80;
        animation: slideUpFromBottom 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    // Auto-remover después de 3 segundos solo si no es persistente
    if (!persistent) {
        setTimeout(() => {
            notification.style.animation = 'slideDownToBottom 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Actualizar el botón de Dijkstra según el estado
function updateDijkstraButton() {
    if (analysisDijkstra) {
        if (isDijkstraMode) {
            analysisDijkstra.style.background = '#00ff00';
            analysisDijkstra.style.color = '#000';
            analysisDijkstra.textContent = '🛤️ Dijkstra: ON';
        } else {
            analysisDijkstra.style.background = '';
            analysisDijkstra.style.color = '';
            analysisDijkstra.textContent = '🛤️ Dijkstra (Ruta Más Corta)';
        }
    }
}

function initiateDijkstra() {
    // Validar que hay nodos
    if (nodes.length === 0) {
        alert('Por favor, crea al menos un nodo antes de ejecutar Dijkstra');
        return;
    }

    // Alternar modo Dijkstra
    if (isDijkstraMode && !dijkstraAnimationRunning) {
        // Desactivar modo Dijkstra
        isDijkstraMode = false;
        clearDijkstraVisualization();
        showNotification('Modo Dijkstra desactivado', 'info');
        updateDijkstraButton();
        return;
    }

    if (dijkstraAnimationRunning) {
        alert('Espera a que termine la animación actual');
        return;
    }

    // Activar modo Dijkstra y ejecutar automáticamente usando el primer nodo
    isDijkstraMode = true;
    dijkstraDistances.clear();
    dijkstraPrevious.clear();
    dijkstraVisited.clear();
    dijkstraSteps = [];

    // Elegir como inicio el primer nodo creado (nodes[0])
    const startNodeId = nodes[0].id;
    dijkstraStartNode = startNodeId;
    showNotification(`🛤️ Modo Dijkstra activado - Ejecutando desde ${nodes[0].label} (${dijkstraPreference === 'min' ? 'minimizar' : 'maximizar'})`, 'success', true);
    updateDijkstraButton();
    console.log('Modo Dijkstra activado - ejecutando desde nodo', startNodeId);
    // Ejecutar inmediatamente
    executeDijkstra(startNodeId);
}

function executeDijkstra(startNodeId) {
    // Remover notificación de selección de nodo inicial
    const existingNotification = document.querySelector('.dijkstra-notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Eliminar automáticamente bucles antes de ejecutar Dijkstra (no son compatibles)
    const loopEdges = edges.filter(e => e.from === e.to);
    if (loopEdges.length > 0) {
        // Eliminar del array y actualizar vista
        edges = edges.filter(e => e.from !== e.to);
        updateEdges();
        showModeNotification(`Se eliminaron ${loopEdges.length} bucle(s) al activar Dijkstra.`);
    }

    // Validar que hay aristas
    if (edges.length === 0) {
        alert('Por favor, crea al menos una arista antes de ejecutar Dijkstra');
        return;
    }

    // Validar que el grafo es conexo (desde nodo inicio)
    const unreachable = validateGraphConnectivity(startNodeId);
    if (unreachable.length > 0) {
        const msg = `Advertencia: ${unreachable.length} nodo(s) inalcanzable(s): ${unreachable.map(n => n.label).join(', ')}`;
        showNotification(msg, 'warning', true);
    }

    // Detectar ciclos positivos (modo max)
    if (dijkstraPreference === 'max') {
        const hasCycles = detectPositiveCycles();
        if (hasCycles) {
            showNotification('⚠️ Modo Max: Detectados ciclos positivos. Los caminos pueden no ser óptimos.', 'warning', true);
        }
    }

    // Validar pesos no negativos solo si estamos en modo minimizar (Dijkstra clásico)
    if (dijkstraPreference === 'min') {
        for (const edge of edges) {
            if (edge.weight < 0) {
                alert('Dijkstra (minimizar) no funciona con pesos negativos. Por favor, usa solo pesos positivos o cambia a Maximizar.');
                return;
            }
        }
    }

    // Construir lista de adyacencia
    const adj = new Map();
    nodes.forEach(n => adj.set(n.id, []));
    edges.forEach(e => {
        adj.get(e.from).push({ to: e.to, weight: e.weight });
        // Si es no dirigida, agregar también la dirección inversa
        if (!e.directed) {
            adj.get(e.to).push({ to: e.from, weight: e.weight });
        }
    });

    // Inicializar estructuras para Dijkstra
    dijkstraDistances.clear();
    dijkstraPrevious.clear();
    dijkstraVisited.clear();
    dijkstraSteps = [];

    // Inicializar distancias
    nodes.forEach(n => {
        dijkstraDistances.set(n.id, n.id === startNodeId ? 0 : Infinity);
        dijkstraPrevious.set(n.id, null);
    });

    const unvisited = new Set(nodes.map(n => n.id));
    const startNode = nodes.find(n => n.id === startNodeId);
    if (dijkstraPreference === 'min') {
        // Ejecutar Dijkstra y registrar pasos (minimizar)
        while (unvisited.size > 0) {
            // Encontrar el nodo no visitado con menor distancia
            let current = null;
            let minDist = Infinity;

            for (const nodeId of unvisited) {
                if (dijkstraDistances.get(nodeId) < minDist) {
                    minDist = dijkstraDistances.get(nodeId);
                    current = nodeId;
                }
            }

            if (current === null || minDist === Infinity) break;

            unvisited.delete(current);
            dijkstraVisited.add(current);

            // Registrar paso
            dijkstraSteps.push({
                current: current,
                distances: new Map(dijkstraDistances),
                visited: new Set(dijkstraVisited)
            });

            // Relajar aristas
            const neighbors = adj.get(current) || [];
            for (const { to, weight } of neighbors) {
                if (unvisited.has(to)) {
                    const newDist = dijkstraDistances.get(current) + weight;
                    if (newDist < dijkstraDistances.get(to)) {
                        dijkstraDistances.set(to, newDist);
                        dijkstraPrevious.set(to, current);
                    }
                }
            }
        }

        // Visualizar la ejecución paso a paso
        visualizeDijkstraExecution(startNodeId);
    } else {
        // Modo Maximizar: buscar mejor camino simple (sin repetir nodos) desde start a todos los demás
        // Usaremos DFS con backtracking para encontrar el camino máximo simple hacia cada nodo
        const best = new Map();
        const prev = new Map();
        nodes.forEach(n => { best.set(n.id, -Infinity); prev.set(n.id, null); });
        best.set(startNodeId, 0);

        function dfs(current, acc, visitedSet) {
            // guardar mejor
            if (acc > (best.get(current) ?? -Infinity)) {
                best.set(current, acc);
            }
            const neighbors = adj.get(current) || [];
            for (const { to, weight } of neighbors) {
                if (visitedSet.has(to)) continue; // evitar ciclos
                visitedSet.add(to);
                const newAcc = acc + weight;
                // si mejoras, actualizar prev para ese nodo en este camino
                if (newAcc > (best.get(to) ?? -Infinity)) {
                    prev.set(to, current);
                    best.set(to, newAcc);
                }
                dfs(to, newAcc, visitedSet);
                visitedSet.delete(to);
            }
        }

        dfs(startNodeId, 0, new Set([startNodeId]));

        // Guardar resultados globales
        nodes.forEach(n => {
            const val = best.get(n.id);
            dijkstraDistances.set(n.id, val === -Infinity ? Infinity : val);
            dijkstraPrevious.set(n.id, prev.get(n.id) ?? null);
        });

        // No hay animación paso a paso para maximizar; mostrar resultados directamente
        dijkstraAnimationRunning = false;
        updateDijkstraDistanceLabels(dijkstraDistances);
        highlightAllShortestPaths(startNodeId);
        showNotification('✓ Dijkstra (max) completado - Distancias mostradas en nodos', 'success');
        // Mostrar modal de resultados
        showDijkstraResults(startNodeId);
        // actualizar botón
        updateDijkstraButton();
    }
}

function visualizeDijkstraExecution(startNodeId) {
    dijkstraAnimationRunning = true;

    // Función para mostrar un paso
    function showStep(stepIndex) {
        if (stepIndex >= dijkstraSteps.length) {
            // Al terminar la animación
            dijkstraAnimationRunning = false;
            showNotification('✓ Dijkstra completado - Resultados mostrados en modal', 'success');
            // Mostrar distancias finales
            updateDijkstraDistanceLabels(dijkstraDistances);
            // Resaltar árbol de caminos desde el nodo inicio hacia todos los demás
            highlightAllShortestPaths(startNodeId);
            // Mostrar modal de resultados
            showDijkstraResults(startNodeId);
            return;
        }

        clearDijkstraNodeStyles();

        const step = dijkstraSteps[stepIndex];
        const { current, distances, visited } = step;

        // Visualizar nodo inicial en verde
        const startNodeEl = document.querySelector(`.node[data-id="${startNodeId}"]`);
        if (startNodeEl) {
            startNodeEl.style.background = 'radial-gradient(circle, #00ff00, #008800)';
            startNodeEl.style.boxShadow = '0 0 20px #00ff00';
        }

        // Visualizar nodo actual siendo procesado en amarillo
        const currentNodeEl = document.querySelector(`.node[data-id="${current}"]`);
        if (currentNodeEl) {
            currentNodeEl.style.background = 'radial-gradient(circle, #ffff00, #cc8800)';
            currentNodeEl.style.boxShadow = '0 0 25px #ffff00';
            currentNodeEl.style.transform = 'scale(1.15)';
        }

        // Visualizar nodos visitados en azul
        visited.forEach(nodeId => {
            if (nodeId !== startNodeId && nodeId !== current) {
                const nodeEl = document.querySelector(`.node[data-id="${nodeId}"]`);
                if (nodeEl) {
                    nodeEl.style.background = 'radial-gradient(circle, #0088ff, #004488)';
                    nodeEl.style.boxShadow = '0 0 15px #0088ff';
                }
            }
        });

        // Actualizar etiquetas de distancia en nodos
        updateDijkstraDistanceLabels(distances);

        // Continuar con siguiente paso después de 600ms
        setTimeout(() => {
            showStep(stepIndex + 1);
        }, 600);
    }

    showStep(0);
}

function updateDijkstraDistanceLabels(distances) {
    // Remover etiquetas antiguas
    document.querySelectorAll('.dijkstra-distance-label').forEach(el => el.remove());

    // Crear nuevas etiquetas DENTRO de cada nodo
    distances.forEach((dist, nodeId) => {
        const nodeEl = document.querySelector(`.node[data-id="${nodeId}"]`);
        if (nodeEl) {
            // Crear badge de distancia
            const badge = document.createElement('div');
            badge.className = 'dijkstra-distance-label';
            const distText = dist === Infinity ? '∞' : Math.round(dist);
            badge.textContent = distText;

            badge.style.cssText = `
                position: absolute;
                top: 2px;
                right: 2px;
                background: ${dist === Infinity ? '#ff3333' : '#00ff00'};
                color: #000;
                font-size: 10px;
                font-weight: bold;
                padding: 2px 5px;
                border-radius: 10px;
                pointer-events: none;
                box-shadow: 0 0 5px ${dist === Infinity ? '#ff3333' : '#00ff00'};
                z-index: 10;
                min-width: 18px;
                text-align: center;
            `;

            nodeEl.appendChild(badge);
        }
    });
}

function clearDijkstraNodeStyles() {
    document.querySelectorAll('.node').forEach(node => {
        node.style.background = '';
        node.style.boxShadow = '';
        node.style.transform = '';
    });
}

function clearDijkstraVisualization() {
    isDijkstraMode = false;
    dijkstraAnimationRunning = false;
    dijkstraStartNode = null;
    dijkstraCurrentStepIndex = 0;
    dijkstraSteps = [];
    dijkstraDistances.clear();
    dijkstraPrevious.clear();
    dijkstraVisited.clear();

    // Remover notificaciones persistentes
    const existingNotification = document.querySelector('.dijkstra-notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    clearDijkstraNodeStyles();
    document.querySelectorAll('.dijkstra-distance-label').forEach(el => el.remove());
    document.querySelectorAll('.dijkstra-edge-highlight').forEach(el => el.remove());

    // Restaurar aristas a su color normal
    const allEdgePaths = document.querySelectorAll('.edge-path');
    const allEdgeLabels = document.querySelectorAll('.edge-label');

    allEdgePaths.forEach(edgePath => {
        edgePath.setAttribute('stroke', edgeColor);
        edgePath.setAttribute('stroke-width', '3');
        edgePath.style.opacity = '1';
        edgePath.style.filter = '';
        edgePath.classList.remove('dijkstra-path-edge');
    });

    allEdgeLabels.forEach(label => {
        label.style.opacity = '1';
        label.style.fill = '';
        label.style.fontWeight = '';
        label.style.fontSize = '';
    });

    updateDijkstraButton();
}

// Función para resaltar visualmente la ruta más corta hacia un nodo
function highlightShortestPath(targetNodeId) {
    if (dijkstraStartNode === null || dijkstraDistances.size === 0) {
        return;
    }

    // Limpiar resaltados anteriores
    document.querySelectorAll('.dijkstra-edge-highlight').forEach(el => el.remove());
    clearDijkstraNodeStyles();

    // Restaurar todas las aristas primero
    const allEdgePaths = document.querySelectorAll('.edge-path');
    const allEdgeLabels = document.querySelectorAll('.edge-label');

    allEdgePaths.forEach(edgePath => {
        edgePath.setAttribute('stroke', edgeColor);
        edgePath.setAttribute('stroke-width', '3');
        edgePath.style.opacity = '1';
        edgePath.style.filter = '';
    });

    allEdgeLabels.forEach(label => {
        label.style.opacity = '1';
        label.style.fill = '';
        label.style.fontWeight = '';
        label.style.fontSize = '';
    });

    const distance = dijkstraDistances.get(targetNodeId);
    const targetNode = nodes.find(n => n.id === targetNodeId);

    if (distance === Infinity) {
        showNotification(`Nodo ${targetNode.label}: Inalcanzable desde el nodo inicial`, 'warning', true);
        return;
    }

    // Reconstruir el camino
    const path = [];
    let current = targetNodeId;
    while (current !== null) {
        path.unshift(current);
        current = dijkstraPrevious.get(current);
    }

    // Mostrar información del camino (persistente)
    const pathLabels = path.map(id => nodes.find(n => n.id === id).label).join(' → ');
    showNotification(`Ruta: ${pathLabels} | Distancia total: ${distance.toFixed(1)}`, 'info', true);

    // Resaltar nodos del camino
    path.forEach((nodeId, index) => {
        const nodeEl = document.querySelector(`.node[data-id="${nodeId}"]`);
        if (nodeEl) {
            if (index === 0) {
                // Nodo inicial
                nodeEl.style.background = 'radial-gradient(circle, #00ff00, #008800)';
                nodeEl.style.boxShadow = '0 0 25px #00ff00';
            } else if (index === path.length - 1) {
                // Nodo destino
                nodeEl.style.background = 'radial-gradient(circle, #ff00ff, #880088)';
                nodeEl.style.boxShadow = '0 0 25px #ff00ff';
                nodeEl.style.transform = 'scale(1.15)';
            } else {
                // Nodos intermedios
                nodeEl.style.background = 'radial-gradient(circle, #00ffff, #008888)';
                nodeEl.style.boxShadow = '0 0 20px #00ffff';
            }
        }
    });

    // Ahora, atenuar todas las aristas (reutilizando las variables ya declaradas arriba)
    allEdgePaths.forEach(edgePath => {
        edgePath.setAttribute('stroke', '#333333');
        edgePath.setAttribute('stroke-width', '2');
        edgePath.style.opacity = '0.3';
    });

    allEdgeLabels.forEach(label => {
        label.style.opacity = '0.3';
    });

    // Resaltar aristas del camino
    for (let i = 0; i < path.length - 1; i++) {
        const fromId = path[i];
        const toId = path[i + 1];

        // Buscar la arista en ambas direcciones (dirigida o no dirigida)
        allEdgePaths.forEach(edgePath => {
            const edgeFrom = parseInt(edgePath.getAttribute('data-from'));
            const edgeTo = parseInt(edgePath.getAttribute('data-to'));

            // Verificar si esta arista es parte del camino
            if ((edgeFrom === fromId && edgeTo === toId) || (edgeFrom === toId && edgeTo === fromId)) {
                edgePath.setAttribute('stroke', '#00ff00');
                edgePath.setAttribute('stroke-width', '5');
                edgePath.style.opacity = '1';
                edgePath.style.filter = 'drop-shadow(0 0 8px #00ff00)';
                edgePath.classList.add('dijkstra-path-edge');

                // Resaltar también la etiqueta de peso
                const edgeId = edgePath.getAttribute('data-id');
                const edgeLabel = document.querySelector(`.edge-label[data-edge-id="${edgeId}"]`);
                if (edgeLabel) {
                    edgeLabel.style.opacity = '1';
                    edgeLabel.style.fill = '#00ff00';
                    edgeLabel.style.fontWeight = 'bold';
                    edgeLabel.style.fontSize = '16px';
                }
            }
        });
    }
}

function showDijkstraResults(startNodeId) {
    // Crear tabla de resultados
    const startNodeLabel = nodes.find(n => n.id === startNodeId)?.label || 'Unknown';
    const modeText = dijkstraPreference === 'min' ? 'mínimas' : 'máximas';
    
    let html = `<h3 style="color: #00f7ff; margin-bottom: 10px;">Distancias ${modeText} desde Nodo ${startNodeLabel}</h3>`;
    html += `<p style="color: #aaa; font-size: 0.9em; margin-bottom: 15px;">Modo: <span style="color: #ffff00; font-weight: bold;">${dijkstraPreference.toUpperCase()}</span></p>`;

    // Crear array de nodos destino
    const destinos = [];
    nodes.forEach(n => {
        if (n.id !== startNodeId) {
            destinos.push({
                id: n.id,
                label: n.label,
                distance: dijkstraDistances.get(n.id)
            });
        }
    });

    // Calcular estadísticas
    const reachable = destinos.filter(d => d.distance !== Infinity);
    const unreachable = destinos.filter(d => d.distance === Infinity);
    const totalDistance = reachable.reduce((sum, d) => sum + d.distance, 0);
    const avgDistance = reachable.length > 0 ? totalDistance / reachable.length : 0;
    const maxDistance = reachable.length > 0 ? Math.max(...reachable.map(d => d.distance)) : 0;
    const minDistance = reachable.length > 0 ? Math.min(...reachable.map(d => d.distance)) : 0;

    // Mostrar estadísticas
    html += '<div style="background: #1a2a3a; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #00f7ff;">';
    html += '<h4 style="color: #00f7ff; margin-top: 0;">📊 Estadísticas</h4>';
    html += `<p style="color: #aaa; margin: 5px 0;"><strong style="color: #00f7ff;">Nodos Totales:</strong> ${nodes.length}</p>`;
    html += `<p style="color: #aaa; margin: 5px 0;"><strong style="color: #00ff00;">Nodos Alcanzables:</strong> ${reachable.length}</p>`;
    if (unreachable.length > 0) {
        html += `<p style="color: #ff6666; margin: 5px 0;"><strong>Nodos Inalcanzables:</strong> ${unreachable.length}</p>`;
    }
    html += `<p style="color: #aaa; margin: 5px 0;"><strong style="color: #ffff00;">Distancia Total:</strong> ${totalDistance.toFixed(2)}</p>`;
    if (reachable.length > 0) {
        html += `<p style="color: #aaa; margin: 5px 0;"><strong style="color: #ffff00;">Distancia Promedio:</strong> ${avgDistance.toFixed(2)}</p>`;
        html += `<p style="color: #aaa; margin: 5px 0;"><strong style="color: #ffff00;">Distancia Máxima:</strong> ${maxDistance.toFixed(2)}</p>`;
        html += `<p style="color: #aaa; margin: 5px 0;"><strong style="color: #ffff00;">Distancia Mínima:</strong> ${minDistance.toFixed(2)}</p>`;
    }
    html += '</div>';

    // Tabla de resultados
    html += '<h4 style="color: #00f7ff; margin-top: 20px; margin-bottom: 10px;">Tabla de Resultados</h4>';
    html += '<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">';
    html += '<tr style="background: #00f7ff; color: #000;">';
    html += '<th style="border: 1px solid #00f7ff; padding: 10px; text-align: left;">Nodo Destino</th>';
    html += '<th style="border: 1px solid #00f7ff; padding: 10px; text-align: center;">Distancia</th>';
    html += '<th style="border: 1px solid #00f7ff; padding: 10px; text-align: left;">Camino</th>';
    html += '</tr>';

    destinos.forEach((dest, index) => {
        const distance = dest.distance === Infinity ? '∞' : dest.distance.toFixed(2);
        const camino = reconstructPath(startNodeId, dest.id);
        const rowStyle = index % 2 === 0 ? 'background: #1a1a1a;' : 'background: #0a0a0a;';

        html += `<tr style="${rowStyle}">`;
        html += `<td style="border: 1px solid #00f7ff; padding: 10px; color: #00f7ff; font-weight: bold;">Nodo ${dest.label}</td>`;
        html += `<td style="border: 1px solid #00f7ff; padding: 10px; text-align: center; color: #ffff00;">${distance}</td>`;
        html += `<td style="border: 1px solid #00f7ff; padding: 10px; color: #00ff00;">${camino}</td>`;
        html += '</tr>';
    });

    html += '</table>';

    // Agregar nota sobre nodos inalcanzables
    if (unreachable.length > 0) {
        html += '<div style="background: #3a2a2a; padding: 10px; border-radius: 3px; border-left: 4px solid #ff6666;">';
        html += '<p style="color: #ff6666; margin: 0;">⚠️ <strong>Nodos inalcanzables:</strong> ' +
            unreachable.map(d => `Nodo ${d.label}`).join(', ') + '</p>';
        html += '</div>';
    }

    dijkstraResultsContent.innerHTML = html;
    dijkstraResultsModal.style.display = 'block';
}

function validateGraphConnectivity(startNodeId) {
    // BFS para encontrar todos los nodos alcanzables desde startNodeId
    const visited = new Set();
    const queue = [startNodeId];
    visited.add(startNodeId);

    while (queue.length > 0) {
        const currentId = queue.shift();
        const adjacentEdges = edges.filter(e => e.from === currentId);

        for (const edge of adjacentEdges) {
            if (!visited.has(edge.to)) {
                visited.add(edge.to);
                queue.push(edge.to);
            }
        }
    }

    // Encontrar nodos inalcanzables
    const unreachable = nodes.filter(node => !visited.has(node.id));
    return unreachable;
}

function detectPositiveCycles() {
    // Variante de Bellman-Ford para detectar ciclos positivos
    // Inicializar distancias a -infinito (para max) o +infinito (para min)
    const distances = new Map();
    const isMax = dijkstraPreference === 'max';
    
    nodes.forEach(node => {
        distances.set(node.id, isMax ? -Infinity : Infinity);
    });
    distances.set(nodes[0].id, 0);

    // Relajar aristas n-1 veces
    for (let i = 0; i < nodes.length - 1; i++) {
        for (const edge of edges) {
            const dist = distances.get(edge.from);
            if (dist !== (isMax ? -Infinity : Infinity)) {
                const newDist = dist + edge.weight;
                if (isMax ? newDist > distances.get(edge.to) : newDist < distances.get(edge.to)) {
                    distances.set(edge.to, newDist);
                }
            }
        }
    }

    // Buscar ciclos positivos
    for (const edge of edges) {
        const dist = distances.get(edge.from);
        if (dist !== (isMax ? -Infinity : Infinity)) {
            const newDist = dist + edge.weight;
            if (isMax ? newDist > distances.get(edge.to) : newDist < distances.get(edge.to)) {
                return true; // Se encontró un ciclo positivo
            }
        }
    }

    return false;
}

function reconstructPath(startId, endId) {
    if (dijkstraDistances.get(endId) === Infinity) {
        return 'Inalcanzable';
    }

    const path = [];
    let current = endId;

    while (current !== null) {
        const node = nodes.find(n => n.id === current);
        path.unshift(`${node.label}`);
        current = dijkstraPrevious.get(current);
    }

    return path.join(' → ');
}

// Resalta en el grafo todas las aristas que forman el árbol de caminos óptimos
function highlightAllShortestPaths(startNodeId) {
    // Limpiar resaltados anteriores
    document.querySelectorAll('.dijkstra-edge-highlight').forEach(el => el.remove());
    clearDijkstraNodeStyles();

    // Restaurar y atenuar aristas
    const allEdgePaths = document.querySelectorAll('.edge-path');
    const allEdgeLabels = document.querySelectorAll('.edge-label');
    allEdgePaths.forEach(edgePath => {
        edgePath.setAttribute('stroke', '#333333');
        edgePath.setAttribute('stroke-width', '2');
        edgePath.style.opacity = '0.25';
        edgePath.style.filter = '';
    });
    allEdgeLabels.forEach(label => { label.style.opacity = '0.25'; });

    // Recorrer dijkstraPrevious y resaltar aristas prev -> node
    const usedEdges = new Set();
    dijkstraPrevious.forEach((prevNode, nodeId) => {
        if (prevNode === null || prevNode === undefined) return;
        const key = `${prevNode}-${nodeId}`;
        usedEdges.add(key);
    });

    // Resaltar nodos origen y demás
    const startEl = document.querySelector(`.node[data-id="${startNodeId}"]`);
    if (startEl) {
        startEl.style.background = 'radial-gradient(circle, #00ff00, #008800)';
        startEl.style.boxShadow = '0 0 25px #00ff00';
    }

    // Resaltar aristas del árbol
    allEdgePaths.forEach(edgePath => {
        const from = parseInt(edgePath.getAttribute('data-from'));
        const to = parseInt(edgePath.getAttribute('data-to'));
        const key = `${from}-${to}`;
        if (usedEdges.has(key)) {
            edgePath.setAttribute('stroke', '#00ff00');
            edgePath.setAttribute('stroke-width', '4');
            edgePath.style.opacity = '1';
            edgePath.style.filter = 'drop-shadow(0 0 8px #00ff00)';
            edgePath.classList.add('dijkstra-path-edge');

            // Resaltar la etiqueta de peso asociada
            const edgeId = edgePath.getAttribute('data-id');
            const edgeLabel = document.querySelector(`.edge-label[data-edge-id='${edgeId}']`);
            if (edgeLabel) { edgeLabel.style.opacity = '1'; edgeLabel.style.fontWeight = '700'; }
        }
    });

    // Asegurarse de mostrar distancias en nodos
    updateDijkstraDistanceLabels(dijkstraDistances);
}

function exportDijkstraResults(startNodeId) {
    // Preparar datos para exportar
    const exportData = {
        algorithm: 'Dijkstra',
        mode: dijkstraPreference,
        startNodeId: startNodeId,
        startNodeLabel: nodes.find(n => n.id === startNodeId)?.label || 'Unknown',
        timestamp: new Date().toISOString(),
        distances: Object.fromEntries(dijkstraDistances),
        previous: Object.fromEntries(dijkstraPrevious),
        paths: {},
        nodes: nodes.map(n => ({ id: n.id, label: n.label, x: n.x, y: n.y })),
        edges: edges.map(e => ({ id: e.id, from: e.from, to: e.to, weight: e.weight })),
        markedEdges: [] // Aristas que forman el árbol óptimo
    };

    // Calcular caminos y aristas marcadas para cada nodo
    nodes.forEach(node => {
        if (dijkstraDistances.get(node.id) !== Infinity) {
            const path = reconstructPath(startNodeId, node.id);
            exportData.paths[node.id] = {
                nodeLabel: node.label,
                distance: dijkstraDistances.get(node.id),
                path: path
            };
        }
    });

    // Registrar aristas del árbol óptimo
    dijkstraPrevious.forEach((prevNode, nodeId) => {
        if (prevNode !== null && prevNode !== undefined) {
            const edgeInTree = edges.find(e => e.from === prevNode && e.to === nodeId);
            if (edgeInTree) {
                exportData.markedEdges.push({
                    from: prevNode,
                    to: nodeId,
                    edgeId: edgeInTree.id
                });
            }
        }
    });

    // Crear archivo JSON y descargar automáticamente
    const filename = `dijkstra_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotification('✅ Resultados de Dijkstra exportados', 'success');
}