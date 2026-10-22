/**
 * Three.js presentation of clipped 3D Voronoi cells. Geometry is regenerated for each shape; separation and model size change display transforms.
 */
import * as THREE from 'three';
import {OrbitControls} from '../../Lib/Three/OrbitControls.js';
import {voronoiVolume} from './volume.mjs';
const panel=document.getElementById('solid-view'),container=document.getElementById('solid-canvas'),status=document.getElementById('solid-status');
let renderer,scene,camera,controls,cells=[],visible=false;
const group=new THREE.Group();
/**
 * Scale the whole displayed solid and adapt the camera's zoom limits.
 *
 * Inputs: None; uses enclosing state where needed.
 * @returns No value is returned; updates the current state, scene, or interface.
 */
function resizeModel(){
    const scale=Number(document.getElementById('solid-size').value)/40;
    group.scale.setScalar(scale);
    if(controls){controls.minDistance=12*scale;controls.maxDistance=250*scale;}
}
/**
 * Restore an angled view with a distance based on the model size.
 *
 * Inputs: None; uses enclosing state where needed.
 * @returns No value is returned; updates the current state, scene, or interface.
 */
function reset(){
    const scale=Math.max(1,Number(document.getElementById('solid-size').value)/40*.75);
    camera.position.set(58*scale,42*scale,65*scale);controls.target.set(0,0,0);controls.update();
}
/**
 * Lazily create the renderer and controls so the 2D mode works without starting WebGL.
 *
 * Inputs: None; uses enclosing state where needed.
 * @returns True if the renderer is available; false if WebGL initialization failed.
 */
function initialize(){
    if(renderer)return true;
    try{renderer=new THREE.WebGLRenderer({antialias:true});}catch{status.textContent='Please enable WebGL to view 3D Voronoï cells.';return false;}
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));container.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','Interactive volumetric Voronoï cells');
    scene=new THREE.Scene();scene.background=new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--site-bg').trim());
    camera=new THREE.PerspectiveCamera(45,1,.1,1000);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=12;controls.maxDistance=250;
    scene.add(group,new THREE.HemisphereLight(0xffffff,0x344760,2));const light=new THREE.DirectionalLight(0xffffff,2.5);light.position.set(40,70,60);scene.add(light);
    // Recalculate view dimensions when the surrounding layout changes.
new ResizeObserver(()=>{const width=Math.max(1,container.clientWidth),height=Math.max(1,container.clientHeight);renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();}).observe(container);
    // Keep visual frames separate from the simulation's own update timing.
renderer.setAnimationLoop(()=>{if(visible){controls.update();renderer.render(scene,camera);}});reset();return true;
}
/**
 * Displace each cell along its site vector to expose interior faces.
 *
 * Inputs: None; uses enclosing state where needed.
 * @returns No value is returned; updates the current state, scene, or interface.
 */
function spread(){const amount=Number(document.getElementById('separation').value)/100;cells.forEach(({mesh,center})=>mesh.position.copy(center).multiplyScalar(amount));}
/**
 * Create a boundary mesh, clip solid cells, replace old GPU resources, and apply display settings.
 *
 * Inputs: None; uses enclosing state where needed.
 * @returns No value is returned; updates the current state, scene, or interface.
 */
function generate(){
    if(!initialize())return;
    const shape=document.getElementById('solid-shape').value,count=Number(document.getElementById('solid-count').value);
    const source=shape==='sphere'?new THREE.IcosahedronGeometry(20,2):shape==='cylinder'?new THREE.CylinderGeometry(20,20,40,28,1):new THREE.BoxGeometry(40,40,40);
    const geometry=source.index?source.toNonIndexed():source;
    const positions=geometry.attributes.position,faces=[];
    for(let i=0;i<positions.count;i+=3)faces.push([0,1,2].map(j=>({x:positions.getX(i+j),y:positions.getY(i+j),z:positions.getZ(i+j)})));
    if(geometry!==source)geometry.dispose();source.dispose();
    const sites=[];
    while(sites.length<count){const p={x:(Math.random()*2-1)*18,y:(Math.random()*2-1)*18,z:(Math.random()*2-1)*18};if(shape==='sphere'&&Math.hypot(p.x,p.y,p.z)>18)continue;if(shape==='cylinder'&&Math.hypot(p.x,p.z)>18)continue;if(sites.some(s=>Math.hypot(p.x-s.x,p.y-s.y,p.z-s.z)<1))continue;sites.push(p);}
    cells.forEach(({mesh})=>{mesh.geometry.dispose();mesh.material.dispose();});group.clear();cells=[];
    const solids=voronoiVolume(sites,faces);
    solids.forEach((solid,index)=>{
        if(!solid.length)return;
        const center=new THREE.Vector3(sites[index].x,sites[index].y,sites[index].z),vertices=[];
        // Shrink each cell slightly around its own site to reveal its boundaries.
        /**
         * Append one slightly inset cell vertex to the render geometry.
         *
         * @param p - Point or vector being mapped, measured, or appended.
         * @returns New length of the flat vertex-coordinate array after appending one vertex.
         */
        const push=p=>vertices.push(center.x+(p.x-center.x)*.975,center.y+(p.y-center.y)*.975,center.z+(p.z-center.z)*.975);
        for(const face of solid)for(let i=1;i<face.length-1;i++){push(face[0]);push(face[i]);push(face[i+1]);}
        const cellGeometry=new THREE.BufferGeometry();cellGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));cellGeometry.computeVertexNormals();
        const material=new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(index*.618033%1,.5,.55),roughness:.7,side:THREE.DoubleSide});
        const mesh=new THREE.Mesh(cellGeometry,material);group.add(mesh);cells.push({mesh,center});
    });
    resizeModel();spread();status.textContent=`${cells.length} volumetric cells inside a ${shape==='cube'?'cube':shape}. Increase separation to see the interior cells.`;
}
document.getElementById('diagram-mode').addEventListener('change',event=>{
    visible=event.target.value==='3d';panel.hidden=!visible;document.getElementById('planar-view').hidden=visible;
    if(visible&&!renderer)generate();
});
document.getElementById('generate-solid').addEventListener('click',generate);
document.getElementById('solid-shape').addEventListener('change',generate);
document.getElementById('solid-count').addEventListener('input',event=>{document.getElementById('solid-count-value').value=event.target.value;});
document.getElementById('separation').addEventListener('input',event=>{document.getElementById('separation-value').value=event.target.value+'%';spread();});
document.getElementById('reset-solid').addEventListener('click',()=>{if(renderer)reset();});

document.getElementById('solid-size').addEventListener('input',event=>{
    document.getElementById('solid-size-value').value=event.target.value;
    resizeModel();
});
