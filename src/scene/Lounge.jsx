import { FURNITURE } from '../config/scene'
import GLBAsset from './AssetModel'

const LOUNGE_COLLIDERS = [{name:'Lounge_Collider',position:[0,.7,0],size:[3.35,1.4,3.45]}]
const LOUNGE_ANCHORS = [{name:'Lounge_Interaction',position:[0,1,1.4]}]

export default function Lounge(){return <GLBAsset url="/assets/models/reclining-lounge.glb" position={FURNITURE.beanbag.position} rotation={[0,-.18,0]} collisionMeshes={LOUNGE_COLLIDERS} interactionAnchors={LOUNGE_ANCHORS} fallbackScale={1.4}/>} 
