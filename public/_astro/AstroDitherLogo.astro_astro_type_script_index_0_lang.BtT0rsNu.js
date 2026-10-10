async function e(e){let t=e.querySelector(`canvas`);if(!t||e.dataset.logoMounted)return;e.dataset.logoMounted=`true`;let n=t.getContext(`webgl`,{alpha:!0,antialias:!1,premultipliedAlpha:!1,preserveDrawingBuffer:!0});if(!n)return;let r=(e,t)=>{let r=n.createShader(e);if(!r)throw Error(`Shader unavailable`);if(n.shaderSource(r,t),n.compileShader(r),!n.getShaderParameter(r,n.COMPILE_STATUS))throw n.deleteShader(r),Error(`Shader compilation failed`);return r};try{let i=await fetch(`/img/marks/astro-extruded.bin`);if(!i.ok)return;let a=await i.arrayBuffer();if(!a.byteLength||a.byteLength%24)return;let o=new Float32Array(a),s=r(n.VERTEX_SHADER,`
attribute vec3 a_position;
attribute vec3 a_normal;
uniform float u_angle;
uniform vec2 u_pointerTilt;
varying vec3 v_normal;
varying vec3 v_position;
void main() {
  float c=cos(u_angle+u_pointerTilt.x), s=sin(u_angle+u_pointerTilt.x);
  mat3 turn=mat3(c,0.,-s, 0.,1.,0., s,0.,c);
  float tilt=-0.09+u_pointerTilt.y;
  mat3 pitch=mat3(1.,0.,0., 0.,cos(tilt),sin(tilt), 0.,-sin(tilt),cos(tilt));
  vec3 p=pitch*turn*a_position;
  v_normal=pitch*turn*a_normal;
  v_position=p;
  gl_Position=vec4(p.xy*.76,-p.z*.4,1.);
}`),c=r(n.FRAGMENT_SHADER,`
precision mediump float;
varying vec3 v_normal;
varying vec3 v_position;
float threshold(vec2 p) {
  // 4x4 Bayer, anchored to the canvas rather than to the rotating surface.
  vec2 q=mod(floor(p),4.);
  float value;
  if(q.y<1.) { if(q.x<1.)value=0.;else if(q.x<2.)value=8.;else if(q.x<3.)value=2.;else value=10.; }
  else if(q.y<2.) { if(q.x<1.)value=12.;else if(q.x<2.)value=4.;else if(q.x<3.)value=14.;else value=6.; }
  else if(q.y<3.) { if(q.x<1.)value=3.;else if(q.x<2.)value=11.;else if(q.x<3.)value=1.;else value=9.; }
  else { if(q.x<1.)value=15.;else if(q.x<2.)value=7.;else if(q.x<3.)value=13.;else value=5.; }
  return (value+.5)/16.;
}
void main(){
  vec3 normal=normalize(v_normal);
  vec3 light=normalize(vec3(-.7,.8,1.3));
  float diffuse=max(dot(normal,light),0.);
  float specular=pow(max(dot(normal,normalize(light+vec3(0.,0.,1.))),0.),22.);
  float tone=clamp(.12+diffuse*.64+specular*.2+v_position.y*.11,0.,1.);
  vec3 blue=vec3(0.,4./255.,246./255.);
  vec3 lavender=vec3(125./255.,128./255.,1.);
  vec3 pale=vec3(205./255.,204./255.,1.);
  vec3 white=vec3(246./255.,246./255.,250./255.);
  float scaled=tone*3., b=threshold(gl_FragCoord.xy);
  vec3 low,high;
  if(scaled<1.){low=blue;high=lavender;}
  else if(scaled<2.){low=lavender;high=pale;}
  else {low=pale;high=white;}
  gl_FragColor=vec4(mix(low,high,step(b,fract(scaled))),1.);
}`),l=n.createProgram();if(!l||(n.attachShader(l,s),n.attachShader(l,c),n.linkProgram(l),n.deleteShader(s),n.deleteShader(c),!n.getProgramParameter(l,n.LINK_STATUS)))return;n.useProgram(l);let u=n.createBuffer();n.bindBuffer(n.ARRAY_BUFFER,u),n.bufferData(n.ARRAY_BUFFER,o,n.STATIC_DRAW);for(let[e,t]of[[`a_position`,0],[`a_normal`,12]]){let r=n.getAttribLocation(l,e);n.enableVertexAttribArray(r),n.vertexAttribPointer(r,3,n.FLOAT,!1,24,t)}n.enable(n.DEPTH_TEST),n.clearColor(0,0,0,0);let d=n.getUniformLocation(l,`u_angle`),f=n.getUniformLocation(l,`u_pointerTilt`),p=matchMedia(`(prefers-reduced-motion: reduce)`),m=matchMedia(`(hover: hover) and (pointer: fine)`),h={x:0,y:0,targetX:0,targetY:0},g=0,_=0,v=0,y=!1,b=!1,x=!1,S=()=>y&&!b&&!x&&!document.hidden&&!p.matches&&document.documentElement.dataset.astroMotionState!==`paused`,C=()=>{if(x||b)return;let t=p.matches?.32:.32+g/36e3*Math.PI*2;n.uniform1f(d,t),n.uniform2f(f,p.matches?0:h.x,p.matches?0:h.y),n.clear(n.COLOR_BUFFER_BIT|n.DEPTH_BUFFER_BIT),n.drawArrays(n.TRIANGLES,0,o.length/6),e.dataset.logoReady=`true`},w=e=>{if(v=0,!S()){_=0;return}let t=_?Math.min(e-_,100):16.7;_&&(g=(g+t)%36e3);let n=1-Math.exp(-t/180);h.x+=(h.targetX-h.x)*n,h.y+=(h.targetY-h.y)*n,_=e,C(),v=requestAnimationFrame(w)},T=()=>{v&&cancelAnimationFrame(v),v=0,_=0,(!S()||!m.matches)&&(h.x=h.y=h.targetX=h.targetY=0),e.dataset.logoRunning=String(S()),p.matches&&C(),S()&&(v=requestAnimationFrame(w))},E=()=>{h.targetX=h.targetY=0},D=t=>{if(!S()||!m.matches||t.pointerType!==`mouse`){E();return}let n=e.getBoundingClientRect();if(!n.width||!n.height)return;let r=e=>Math.max(-1,Math.min(1,e));h.targetX=r((t.clientX-n.left)/n.width*2-1)*.1,h.targetY=r((t.clientY-n.top)/n.height*2-1)*.065},O=()=>{let r=Math.max(64,Math.min(180,Math.round(e.clientWidth/3)));(t.width!==r||t.height!==r)&&(t.width=r,t.height=r,n.viewport(0,0,r,r)),C()},k=new ResizeObserver(O);k.observe(e);let A=new IntersectionObserver(([e])=>{y=e.isIntersecting,T()});A.observe(e);let j=new MutationObserver(T);j.observe(document.documentElement,{attributes:!0,attributeFilter:[`data-astro-motion-state`]}),p.addEventListener(`change`,T),document.addEventListener(`visibilitychange`,T),m.addEventListener(`change`,T),e.addEventListener(`pointermove`,D),e.addEventListener(`pointerleave`,E),e.addEventListener(`pointercancel`,E),t.addEventListener(`webglcontextlost`,t=>{t.preventDefault(),x=!0,delete e.dataset.logoReady,T()}),window.addEventListener(`pagehide`,t=>{t.persisted||(b=!0,T(),k.disconnect(),A.disconnect(),j.disconnect(),p.removeEventListener(`change`,T),document.removeEventListener(`visibilitychange`,T),m.removeEventListener(`change`,T),e.removeEventListener(`pointermove`,D),e.removeEventListener(`pointerleave`,E),e.removeEventListener(`pointercancel`,E),n.deleteBuffer(u),n.deleteProgram(l))},{once:!0}),window.addEventListener(`pageshow`,T),O(),T()}catch{delete e.dataset.logoReady}}document.querySelectorAll(`[data-astro-dither-logo]`).forEach(e);