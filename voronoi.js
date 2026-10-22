/**
 * Voronoï explorer. Half-plane clipping creates 2D regions; clipping convex solids creates volumetric cells for the 3D mode.
 */
import { voronoi } from './geometry.mjs';
const canvas = document.getElementById('diagram');
const context = canvas.getContext('2d');
const slider = document.getElementById('point-count');
const status = document.getElementById('diagram-status');
const removeButton = document.getElementById('remove-point');
const palette = getComputedStyle(document.documentElement);
/**
 * Read a named value from the shared CSS palette.
 *
 * @param name - CSS custom-property name or display label used by this operation.
 * @returns CSS palette value as a trimmed string.
 */
const theme = name => palette.getPropertyValue(name).trim();
let points = [], selected = -1, dragging = false, frame = null, nextId = 0;
const limit = 300;
/**
 * Recompute cells at the displayed canvas size and draw regions, points, and selection state.
 *
 * Inputs: None; uses enclosing state where needed.
 * @returns No value is returned; updates the current state, scene, or interface.
 */
function draw() {
    frame = null;
    if(document.getElementById('planar-view').hidden) return;
    const width = canvas.clientWidth, height = canvas.clientHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = theme('--site-surface'); context.fillRect(0, 0, width, height);
    const sites = points.map(p => ({ x: p.x * width, z: p.z * height }));
    const cells = voronoi(sites, [{x:0,z:0},{x:width,z:0},{x:width,z:height},{x:0,z:height}]);
    cells.forEach((cell,index) => {
        if (cell.length < 3) return;
        context.beginPath();context.moveTo(cell[0].x,cell[0].z);
        cell.slice(1).forEach(p=>context.lineTo(p.x,p.z));context.closePath();
        context.fillStyle = `hsl(${points[index].id * 137.508 % 360} 44% 37%)`;context.fill();
        context.strokeStyle = theme('--site-bg');context.lineWidth=1.5;context.stroke();
    });
    sites.forEach((p,index) => {
        context.beginPath();context.arc(p.x,p.z,index===selected?7:4,0,Math.PI*2);
        context.fillStyle=theme(index===selected?'--site-accent':'--site-text');context.fill();
        context.strokeStyle=theme('--site-bg');context.lineWidth=2;context.stroke();
    });
    removeButton.disabled = selected < 0;
    status.textContent = points.length ? `${points.length} regions${selected>=0 ? ` · Point ${selected+1} selected` : ''}` : 'No points yet. Click the diagram or choose Add point to begin.';
}
/**
 * Coalesce multiple pointer events into a single animation-frame redraw.
 *
 * Inputs: None; uses enclosing state where needed.
 * @returns No value is returned; updates the current state, scene, or interface.
 */
function redraw() { if(frame===null) frame=requestAnimationFrame(draw); }
// Add a point unless the limit is reached or it is too close to an existing site.
/**
 * Add a new normalized site unless it overlaps an existing point or exceeds the limit.
 *
 * @param x - Normalized horizontal position within the canvas, from zero to one.
 * @param z - Normalized vertical position within the canvas, from zero to one.
 * @returns No value is returned; updates the current state, scene, or interface.
 */
function add(x,z) {
    if(points.length>=limit) { status.textContent=`Maximum ${limit} points reached.`; return; }
    if(points.some(p=>Math.hypot(p.x-x,p.z-z)<.002)) return;
    points.push({x,z,id:nextId++});selected=points.length-1;redraw();
}
/**
 * Replace the sites using the current point-count setting.
 *
 * Inputs: None; uses enclosing state where needed.
 * @returns No value is returned; updates the current state, scene, or interface.
 */
function randomize() {
    points=[];selected=-1;
    for(let i=0;i<Number(slider.value);i++) add(.02+Math.random()*.96,.02+Math.random()*.96);
    selected=-1;redraw();
}
/**
 * Delete the active point and move selection to a remaining site.
 *
 * Inputs: None; uses enclosing state where needed.
 * @returns No value is returned; updates the current state, scene, or interface.
 */
function removeSelected() {
    if(selected<0) return;
    points.splice(selected,1);selected=points.length?Math.min(selected,points.length-1):-1;redraw();
}
/**
 * Convert a pointer event to normalized diagram coordinates and clamp it inside the canvas.
 *
 * @param event - Browser input event containing pointer or keyboard coordinates and state.
 * @returns Normalized x/z canvas coordinates clamped inside the diagram.
 */
function position(event) {
    const rect=canvas.getBoundingClientRect();
    return {x:Math.max(.001,Math.min(.999,(event.clientX-rect.left)/rect.width)),z:Math.max(.001,Math.min(.999,(event.clientY-rect.top)/rect.height))};
}
canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0) return;
    const p=position(event);
    let nearest=-1,closest=18;
    points.forEach((point,i)=>{
        const d=Math.hypot((point.x-p.x)*canvas.clientWidth,(point.z-p.z)*canvas.clientHeight);
        if(d<closest) {closest=d;nearest=i;}
    });
    selected=nearest;
    if(nearest<0) add(p.x,p.z);
    dragging=selected>=0;canvas.setPointerCapture(event.pointerId);canvas.focus();redraw();
});
canvas.addEventListener('pointermove',event=>{
    if(!dragging || selected<0) return;
    const p=position(event);
    if(points.some((other,i)=>i!==selected && Math.hypot(other.x-p.x,other.z-p.z)<.002)) return;
    Object.assign(points[selected],p);redraw();
});
for(const event of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(event,()=>{dragging=false;});
canvas.addEventListener('keydown',event=>{
    if(event.key==='Tab' && points.length && !event.ctrlKey && !event.metaKey) {
        const next=selected+(event.shiftKey?-1:1);
        if(next>=0 && next<points.length) {event.preventDefault();selected=next;redraw();}
    }
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key) && selected>=0) {
        event.preventDefault();const p=points[selected],step=event.shiftKey?.03:.005;
        const x=Math.max(.001,Math.min(.999,p.x+(event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0)));
        const z=Math.max(.001,Math.min(.999,p.z+(event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0)));
        if(!points.some((other,i)=>i!==selected && Math.hypot(other.x-x,other.z-z)<.002)) Object.assign(p,{x,z});
        redraw();
    }
    if(event.key==='Delete' || event.key==='Backspace') {event.preventDefault();removeSelected();}
});
slider.addEventListener('input',()=>{document.getElementById('point-count-value').value=slider.value;});
document.getElementById('randomize').addEventListener('click',randomize);
document.getElementById('add-point').addEventListener('click',()=>{add(.1+Math.random()*.8,.1+Math.random()*.8);});
removeButton.addEventListener('click',removeSelected);
document.getElementById('clear-points').addEventListener('click',()=>{points=[];selected=-1;redraw();});
// Recalculate view dimensions when the surrounding layout changes.
new ResizeObserver(redraw).observe(canvas);
randomize();
