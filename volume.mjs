/**
 * Convex polyhedron clipping for true 3D Voronoi cells. A solid is an array of polygon faces; vertices use x/y/z coordinates.
 */
/**
 * Compute the scalar dot product of two 3D vectors.
 *
 * @param a - First input vector with x/y/z components.
 * @param b - Second input vector with x/y/z components.
 * @returns Scalar dot product of the two vectors.
 */
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
/**
 * Subtract one 3D vector from another without mutating either input.
 *
 * @param a - First input vector with x/y/z components.
 * @param b - Second input vector with x/y/z components.
 * @returns New vector equal to the first vector minus the second.
 */
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
/**
 * Compute the cross product of two 3D vectors.
 *
 * @param a - First input vector with x/y/z components.
 * @param b - Second input vector with x/y/z components.
 * @returns New vector perpendicular to both input vectors.
 */
const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
/**
 * Normalize a nonzero 3D vector without mutating it.
 *
 * @param a - First input vector with x/y/z components.
 * @returns New unit-length vector pointing in the same direction as the input.
 */
const unit=a=>{const length=Math.hypot(a.x,a.y,a.z);return {x:a.x/length,y:a.y/length,z:a.z/length};};
/**
 * Clip each face against a plane and sort the cut points into a new cap face.
 *
 * @param faces - Polygon faces of the convex solid being clipped.
 * @param normal - Clipping-plane normal, directed toward the half-space being discarded.
 * @param limit - Maximum signed plane projection allowed by the clipping half-space.
 * @returns Clipped polygon faces including the newly created cap, or an empty solid.
 */
export function clipSolid(faces,normal,limit) {
    const result=[],cuts=[];
    for(const face of faces) {
        const polygon=[];
        for(let i=0;i<face.length;i++) {
            const a=face[i],b=face[(i+1)%face.length],da=dot(a,normal)-limit,db=dot(b,normal)-limit;
            if(da<=1e-8)polygon.push(a);
            if((da<0&&db>0)||(da>0&&db<0)) {
                const t=da/(da-db),p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};
                polygon.push(p);cuts.push(p);
            }
        }
        if(polygon.length>=3)result.push(polygon);
    }
    const unique=[];
    for(const p of cuts)if(!unique.some(q=>Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z)<1e-6))unique.push(p);
    if(unique.length>=3) {
        const center=unique.reduce((s,p)=>({x:s.x+p.x/unique.length,y:s.y+p.y/unique.length,z:s.z+p.z/unique.length}),{x:0,y:0,z:0});
        const n=unit(normal),u=unit(cross(Math.abs(n.y)<.9?{x:0,y:1,z:0}:{x:1,y:0,z:0},n)),v=cross(n,u);
        unique.sort((a,b)=>Math.atan2(dot(sub(a,center),v),dot(sub(a,center),u))-Math.atan2(dot(sub(b,center),v),dot(sub(b,center),u)));
        result.push(unique);
    }
    return result;
}
/**
 * Intersect the boundary solid with all nearest-site half-spaces to obtain one solid per site.
 *
 * @param sites - Seed coordinates that define nearest-site Voronoi regions.
 * @param boundaryFaces - Convex solid represented as an array of polygon faces with x/y/z vertices.
 * @returns One convex solid per input site, each represented as polygon faces.
 */
export function voronoiVolume(sites,boundaryFaces) {
    return sites.map((site,index)=>{
        let faces=boundaryFaces;
        for(let j=0;j<sites.length&&faces.length;j++) {
            if(j===index)continue;
            const other=sites[j],normal=sub(other,site),limit=(dot(other,other)-dot(site,site))/2;
            faces=clipSolid(faces,normal,limit);
        }
        return faces;
    });
}
