import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { DoorModel } from './AnywhereDoor'
import { SouvenirSpot, useWorldPhysics, HOME_DOOR } from './WorldScene'

// 《Id 之海》 behind the door: the night sea, sky and lighthouse from the user's Id 之海 page
// (sky + Gerstner ocean shaders carried over, ported from three r128 to the current colour
// pipeline), at a calm sea state. The lighthouse lamp is the souvenir.
const LH = new THREE.Vector3(-11, 0, -40)

const SKY = `
uniform float uTime; uniform float uStorm; uniform vec3 uMoon; uniform float uWarm; uniform float uVal; uniform float uEnergy; uniform float uHope; uniform vec2 uSeed; uniform vec3 uAur;
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h12(i),h12(i+vec2(1,0)),f.x), mix(h12(i+vec2(0,1)),h12(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*vn(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return s; }
vec3 horizonCol(){ vec3 cool = vec3(.055,.075,.13), warm = vec3(.16,.085,.07); vec3 h = mix(cool, warm, uWarm) * (.8 + .35*max(uVal,0.)); return mix(h, vec3(.05,.055,.075), uStorm*.85); }
vec3 aurora(vec3 d){
  if (d.y < .02 || uHope < .25) return vec3(0.);
  float az = atan(d.x, -d.z);
  float base = .16 + .08*sin(az*2.3 + uSeed.x*6.) + .05*fbm(vec2(az*3. + uTime*.02, uSeed.y));
  float band = smoothstep(base - .02, base + .03, d.y) * exp(-max(d.y - base, 0.)*7.);
  float curtain = pow(fbm(vec2(az*9. + uTime*.05 + uSeed.x*10., d.y*2. - uTime*.03)), 2.) * 2.2;
  float k = smoothstep(.25, .75, uHope) * (1. - .8*uStorm) * 2.4;
  return uAur * band * curtain * k * (.7 + .3*sin(uTime*.7 + az*4.));
}
vec3 skyColor(vec3 d, float stars){
  float y = max(d.y, 0.); float md = max(dot(d, uMoon), 0.);
  vec3 zen = mix(mix(vec3(.002,.005,.02), vec3(.008,.004,.014), uWarm), vec3(.003,.004,.008), uStorm);
  vec3 mid = mix(mix(vec3(.008,.022,.06), vec3(.03,.018,.04), uWarm), vec3(.012,.015,.026), uStorm);
  vec3 hor = horizonCol() + vec3(.16,.08,.07)*pow(md,5.)*(1.-.6*uStorm);
  vec3 c = mix(hor, mid, smoothstep(0., .22, y)); c = mix(c, zen, smoothstep(.18, .8, y));
  c += vec3(.35,.45,.7)*(pow(md,80.)*.35 + pow(md,14.)*.03);
  if (stars > 0.) {
    vec3 sdd = d*210.; vec3 cl = floor(sdd); float h = h12(cl.xy + cl.z*17.13);
    if (h > .982) { float st = smoothstep(.16, 0., length(fract(sdd)-.5)); float tw = .55+.45*sin(uTime*(1.5+h*3.)+h*90.);
      c += mix(vec3(.75,.85,1.), vec3(1.,.9,.75), fract(h*91.))*st*tw*smoothstep(.03,.3,y)*(1.-.75*uStorm)*2.2; }
    c += vec3(1.,.96,.88)*2.6*smoothstep(.99958,.99972,md);
  }
  if (d.y > 0.) {
    vec2 cp = d.xz/(d.y+.1)*1.3 + uSeed*40. + vec2(uTime*.015, uTime*.005)*(.5 + 1.4*uEnergy);
    float n = fbm(cp); float cov = smoothstep(.60-.30*uStorm, .92-.12*uStorm, n);
    vec3 cc = mix(vec3(.006,.007,.012), vec3(.045,.05,.07), pow(md,6.)) + vec3(.5,.55,.7)*pow(md,30.)*.5*smoothstep(.5,.75,n);
    c = mix(c, cc, cov*smoothstep(0.,.06,d.y)*.92);
    if (stars > 0.) c += aurora(d)*(1. - cov*.55);
  }
  if (d.y < 0.) c = hor*.75;
  return c;
}`

export default function IdSea({ world }) {
  const U = useMemo(() => ({
    uTime: { value: 0 }, uStorm: { value: .15 }, uWarm: { value: .45 }, uVal: { value: .35 }, uEnergy: { value: .35 }, uHope: { value: .7 },
    uSeed: { value: new THREE.Vector2(.31, .62) }, uAur: { value: new THREE.Vector3(.1, .9, .6) }, uWaveRot: { value: .2 },
    uMoon: { value: new THREE.Vector3(.13, .19, -1).normalize() }, uLamp: { value: new THREE.Vector3(LH.x, 21, LH.z) },
  }), [])
  const sky = useMemo(() => new THREE.ShaderMaterial({
    uniforms: U, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: `varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: SKY + `varying vec3 vD; void main(){ gl_FragColor = vec4(skyColor(normalize(vD),1.),1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  }), [U])
  const ocean = useMemo(() => new THREE.ShaderMaterial({
    uniforms: U, transparent: true, fog: false,
    vertexShader: `uniform float uTime; uniform float uStorm; uniform float uEnergy; uniform float uWaveRot; varying vec3 vW; varying vec3 vN; varying float vH;
      vec3 g(vec4 w, vec3 p, inout vec3 T, inout vec3 B){ vec2 d0 = normalize(w.xy); float cr = cos(uWaveRot), sr = sin(uWaveRot); vec2 d = vec2(cr*d0.x - sr*d0.y, sr*d0.x + cr*d0.y); float Q = w.z*(.3+.7*uStorm+.12*uEnergy); float k = 6.2831/w.w; float c = sqrt(9.8/k);
        float f = k*(dot(d,p.xz) - c*uTime); float a = Q/k; float s = sin(f), co = cos(f);
        T += vec3(-d.x*d.x*Q*s, d.x*Q*co, -d.x*d.y*Q*s); B += vec3(-d.x*d.y*Q*s, d.y*Q*co, -d.y*d.y*Q*s);
        return vec3(d.x*a*co, a*s, d.y*a*co); }
      void main(){ vec3 p = (modelMatrix*vec4(position,1.)).xyz; vec3 T = vec3(1,0,0), B = vec3(0,0,1), o = vec3(0);
        o += g(vec4(1.,.3,.22,70.),p,T,B); o += g(vec4(.6,1.,.18,37.),p,T,B); o += g(vec4(-.4,1.,.14,21.),p,T,B); o += g(vec4(.9,-.5,.1,13.),p,T,B);
        p += o; vH = o.y; vN = normalize(cross(B,T)); vW = p; gl_Position = projectionMatrix*viewMatrix*vec4(p,1.); }`,
    fragmentShader: SKY + `uniform vec3 uLamp; varying vec3 vW; varying vec3 vN; varying float vH;
      void main(){
        vec3 V = normalize(cameraPosition - vW); float dist = length(cameraPosition - vW);
        vec2 q = vW.xz; float t = uTime;
        vec2 dn = vec2(sin(q.x*.9+t*1.3) + .8*sin(q.x*.37-q.y*.61+t*.9) + .4*sin(q.x*2.1+q.y*1.7+t*2.),
                       cos(q.y*.8+t*1.1) + .8*cos(q.y*.41+q.x*.55-t*.7) + .4*cos(q.y*2.3-q.x*1.3+t*1.8));
        dn += (vec2(vn(q*.7+t*.4), vn(q.yx*.7-t*.35))-.5)*2.;
        vec3 n = normalize(vN + vec3(dn.x,0.,dn.y)*.045*(.6+uStorm)*exp(-dist*.006));
        float fres = .02 + .98*pow(1. - max(dot(n,V),0.), 5.);
        vec3 R = reflect(-V, n); R.y = abs(R.y);
        vec3 refl = skyColor(R, 0.);
        vec3 deep = vec3(.001,.006,.011);
        vec3 sss = mix(vec3(.004,.035,.042), vec3(.035,.022,.008), uWarm)*clamp(vH+1.2,0.,3.)*.45;
        vec3 col = mix(deep + sss, refl*.85, fres);
        float md = max(dot(R, uMoon), 0.);
        col += vec3(.8,.88,1.)*(pow(md,500.)*5. + pow(md,60.)*.18)*(1.-.55*uStorm);
        vec3 L = normalize(uLamp - vW); float ld = length(uLamp - vW);
        col += vec3(1.,.62,.28)*pow(max(dot(R,L),0.),400.)*.9*exp(-ld*.011);
        vec3 fogC = skyColor(normalize(vec3(-V.x,.02,-V.z)), 0.);
        float fog = 1. - exp(-dist*(.0042 + .0045*uStorm));
        vec2 qc = q*.9 + uSeed*50.; float pl = h12(floor(qc)); float glowP = step(.9, pl) * smoothstep(.22, 0., length(fract(qc)-.5)) * (.5+.5*sin(t*1.7 + pl*60.)) * smoothstep(.0,.5,uVal) * (1.-uStorm*.8) * smoothstep(70.,25.,dist);
        col += mix(vec3(.02,.75,.65), vec3(.15,.45,1.), uSeed.y) * glowP * 1.6;
        col = mix(col, fogC, fog);
        gl_FragColor = vec4(col, mix(.8, 1., max(fres, fog)));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }), [U])
  const beam = useRef(), glow = useRef()
  useFrame(({ clock }) => {
    U.uTime.value = clock.elapsedTime
    if (beam.current) beam.current.rotation.y = clock.elapsedTime * .45
    if (glow.current) glow.current.intensity = 40 + Math.sin(clock.elapsedTime * 2) * 6
  })
  const ground = useMemo(() => () => 1.0, []) // you walk on the calm sea surface, as in a dream
  const placed = useMemo(() => [{ x: LH.x, z: LH.z, r: 6 }], [])
  const souvenirAt = useMemo(() => [LH.x + 5.5, 1.2, LH.z + 5], [])
  useWorldPhysics(ground, placed, souvenirAt)
  const top = 21
  return <>
    <color attach="background" args={['#05080e']}/>
    <fogExp2 attach="fog" args={['#1a1622', .0065]}/>
    <mesh material={sky} renderOrder={-10} frustumCulled={false}><sphereGeometry args={[1000, 48, 24]}/></mesh>
    <mesh material={ocean} renderOrder={1} frustumCulled={false} rotation-x={-Math.PI / 2} position-z={-250}><planeGeometry args={[700, 620, 260, 230]}/></mesh>
    <hemisphereLight args={['#33476a', '#07090d', .7]}/>
    <directionalLight position={[13, 19, -100]} color="#a9bde0" intensity={1.1}/>
    {/* the lighthouse on its rocks */}
    <group position={LH}>
      {[[0, 0, 0, 6.2, .55], [4.5, -.6, 2, 4, .6], [-4.8, -.4, 1.2, 4.4, .5], [2, -.8, -3.5, 4.6, .45], [5.5, -.2, 5, 2.4, .5]].map(([x, y, z, r, sy], i) =>
        <mesh key={i} position={[x, y, z]} scale={[1, sy, 1]} rotation-y={i * 1.3}><dodecahedronGeometry args={[r, 1]}/><meshStandardMaterial color="#2a2e34" roughness={.95} flatShading/></mesh>)}
      {[0, 1, 2, 3, 4, 5].map(i => <mesh key={i} position-y={2.3 + i * 3 + 1.5}><cylinderGeometry args={[3.3 - (i + 1) * .18, 3.3 - i * .18, 2.96, 32]}/><meshStandardMaterial color={i % 2 ? '#5a4a40' : '#c9c1b2'} roughness={.85}/></mesh>)}
      {[1, 3, 5].map(i => <mesh key={`w${i}`} position-y={2.3 + i * 3 + 1.5}><cylinderGeometry args={[3.3 - (i + 1) * .18 + .03, 3.3 - i * .18 + .03, 1.4, 32, 1, true]}/><meshBasicMaterial color={new THREE.Color(1.6, 1.15, .7)} transparent opacity={.55} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false}/></mesh>)}
      <mesh position-y={top - .3}><cylinderGeometry args={[3, 2.5, .45, 32]}/><meshStandardMaterial color="#1b1d22" metalness={.4} roughness={.6}/></mesh>
      <mesh position-y={top + 1.2}><cylinderGeometry args={[1.55, 1.55, 2.6, 16]}/><meshBasicMaterial color={new THREE.Color(2.2, 1.5, .8)} toneMapped={false}/></mesh>
      <mesh position-y={top + 3.6}><coneGeometry args={[2.2, 2.2, 32]}/><meshStandardMaterial color="#1b1d22" metalness={.4} roughness={.6}/></mesh>
      <pointLight ref={glow} position={[2, top - 2, 3]} color="#ffa850" intensity={40} distance={45} decay={2}/>
      <group ref={beam} position-y={top + 1.2}>
        {[0, Math.PI].map(r => <mesh key={r} rotation-y={r}><group rotation-z={Math.PI / 2}><mesh position-y={-60}>
          <coneGeometry args={[6, 120, 32, 1, true]}/><meshBasicMaterial color={new THREE.Color(1, .78, .48)} transparent opacity={.06} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false}/>
        </mesh></group></mesh>)}
      </group>
    </group>
    {/* a trail of buoys (the page's 航标) leading from the door toward the lighthouse */}
    {[0, 1, 2, 3, 4, 5].map(i => { const t = (i + 1) / 7; return <group key={i} position={[THREE.MathUtils.lerp(0, LH.x + 6, t) + Math.sin(i * 2.1) * 2.5, .6, THREE.MathUtils.lerp(2, LH.z + 8, t)]}>
      <mesh><sphereGeometry args={[.42, 16, 12]}/><meshBasicMaterial color={new THREE.Color(.35, 1, .88).multiplyScalar(.9)} toneMapped={false}/></mesh>
      <pointLight color="#7fe0d4" intensity={3} distance={6} decay={2}/>
    </group> })}
    <SouvenirSpot spec={{ palette: { ground: '#2a2e34' }, souvenir: world.souvenir }} at={souvenirAt}/>
    <group position={[HOME_DOOR[0], 1.0, HOME_DOOR[2]]} rotation-y={Math.PI}><DoorModel glow="#ffcf8a"/></group>
    <mesh position={[HOME_DOOR[0], .95, HOME_DOOR[2] - 1.2]} rotation-x={-Math.PI / 2}><circleGeometry args={[3.2, 40]}/><meshStandardMaterial color="#3a3530" roughness={.9}/></mesh>
  </>
}
