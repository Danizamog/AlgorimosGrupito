/* ===== VARIABLES GLOBALES ===== */
let nodes = [], edges = [], selectedNode = null, draggingNode = null, nodeCounter = 1;
let nodeColor = "#00f7ff", edgeColor = "#00f7ff", activeMatrix = null, lastHMap = null, lastCriticalEdges = null, lastOptimalPath = null;
let showCriticalPath = true, showOptimalPath = true; // Controles de visualización

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

/* ===== UTILIDADES DE VALIDACIÓN ===== */
function promptForNonNegativeWeight(message, defaultValue = '1') {
    while (true) {
        const raw = prompt(message, defaultValue);
        if (raw === null) return null; // cancelado
        const val = Number(raw);
        if (Number.isFinite(val) && val >= 0) return val;
        alert('Peso inválido. Debe ser un número no negativo.');
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
    if (mode==='max') {
        // Minimización equivalente: maxVal - beneficio
        const base = Math.max(1, maxVal);
        C = M.map(row => row.map(v => base - v));
    } else {
        // Minimizar costo: si no existe arista, penalizar muy alto para evitar elegirla
        const BIG = (maxVal || 1) * 10 + 1;
        C = M.map((row,i) => row.map((v,j) => E[i][j] ? v : BIG));
    }
    const assignment = hungarian(C);
    // compute total based on original matrix for mode
    let total = 0; const selected = new Set(); const pairs = [];
    assignment.forEach(({row,col})=>{ if (col>=0) { total += M[row][col]; selected.add(`${row}-${col}`); } });
    assignment.forEach(({row,col})=>{
        if (col>=0) pairs.push({ from: rowNames[row], to: colNames[col], value: M[row][col] });
    });
    renderAssignmentModal({ mode, total, M, rowNames, colNames, selected, pairs });
}

function renderAssignmentModal({ mode, total, M, rowNames, colNames, selected, pairs }) {
    if (!assignmentBody) return;
    const n = M.length;
    const title = mode==='max' ? 'Máxima asignación' : 'Mínimo costo';
    // grid: first row headers (blank + col names), then each row with name + cells
    let html = `<div class="assignment-summary">${title}: <span class="assignment-total">${total}</span></div>`;
    html += `<div class="assignment-grid" style="grid-template-columns: 140px repeat(${n}, 1fr)">`;
    html += `<div></div>`;
    for (let j=0;j<n;j++) html += `<div class="header">${colNames[j]}</div>`;
    for (let i=0;i<n;i++) {
        html += `<div class="header">${rowNames[i]}</div>`;
        for (let j=0;j<n;j++) {
            const key = `${i}-${j}`;
            const cls = selected.has(key) ? 'assignment-cell selected' : 'assignment-cell';
            const val = M[i][j];
            html += `<div class="${cls}">${val}</div>`;
        }
    }
    html += `</div>`;
    if (pairs?.length) {
        html += `<div class="assignment-pairs">` + pairs.map(p=>`<div class="pair"><span class="k">${p.from}</span> → <span class="k">${p.to}</span> <span class="v">(${p.value})</span></div>`).join('') + `</div>`;
    }
    assignmentBody.innerHTML = html;
    openAssignmentModal();
}

assignMaxBtn?.addEventListener('click', ()=>{ analysisMenu?.classList.remove('show'); runAssignment('max'); });
assignMinBtn?.addEventListener('click', ()=>{ analysisMenu?.classList.remove('show'); runAssignment('min'); });

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
        } else if (selectedNode === nodeId) {
            // Eliminado soporte para bucles
            alert('No se permiten bucles en el grafo.');
            e.target.classList.remove('selected'); 
            selectedNode = null;
        } else {
            addEdge(selectedNode, nodeId);
            document.querySelector(`.node[data-id="${selectedNode}"]`).classList.remove('selected'); selectedNode = null;
        }
    }
});
function addEdge(fromId, toId) {
    // Verificar que no es un bucle
    if (fromId === toId) {
        alert('No se permiten bucles en el grafo.');
        return;
    }
    
    // Bloquear arista inversa (ida y vuelta)
    const reverseExists = edges.some(e => e.from === toId && e.to === fromId);
    if (reverseExists) {
        alert('No se permite crear aristas en ambos sentidos entre los mismos nodos.');
        return;
    }
    const weight = promptForNonNegativeWeight(`Peso ${fromId}→${toId}:`, '1');
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
    const dx = toNode.x - fromNode.x, dy = toNode.y - fromNode.y, distance = Math.sqrt(dx * dx + dy * dy);
    const offset = Math.min(distance * 0.3, 60), offsetX = -dy * offset / distance, offsetY = dx * offset / distance;
    const cp1x = fromNode.x + dx * 0.3 + offsetX, cp1y = fromNode.y + dy * 0.3 + offsetY;
    const cp2x = toNode.x - dx * 0.3 + offsetX, cp2y = toNode.y - dy * 0.3 + offsetY;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
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
    const newWeight = promptForNonNegativeWeight('Nuevo peso:', String(edge.weight));
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
    // Eliminada opción de crear bucle
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
            // Evitar crear arista en ambos sentidos
            const reverseExists = edges.some(e => e.id !== id && e.from === edge.to && e.to === edge.from);
            if (reverseExists) {
                alert('No se permite tener ambas direcciones entre los mismos nodos.');
                menu.remove();
                return;
            }
            [edge.from, edge.to] = [edge.to, edge.from];
            updateEdges();
            menu.remove();
        });
    }
    addItem(menu, edge.directed ? 'Hacer no dirigida' : 'Hacer dirigida', () => {
        edge.directed = !edge.directed; edge.bidirectional = false; updateEdges(); menu.remove();
    });
    // Eliminar opción bidireccional para evitar ida y vuelta
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
            if (!Number.isFinite(weight) || weight < 0) {
                alert('Peso inválido. Debe ser numérico y no negativo.');
                e.target.value = prev;
                return;
            }
            // Evitar arista inversa entre distintos nodos
            if (from !== to) {
                const reverseExists = edges.some(el => el.from === to && el.to === from);
                if (reverseExists && (!edge || (edge.from !== from || edge.to !== to))) {
                    alert('No se permite crear aristas en ambos sentidos entre los mismos nodos.');
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