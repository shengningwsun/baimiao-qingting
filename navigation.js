import {landscapeHeightAt,landscapeContains} from './landscape.js';
export const EYE=1.62;
export function surfaceHeight(x,z,current=0){
if(x>-2.5&&x<-.1&&z<-.75&&z>-4.91){if(z<-4.02)return 2.25;if(x<-1.42)return .45+Math.max(0,Math.min(1,(-z-.85)/3.1))*1.8;if(x>-1.18)return 2.25+Math.max(0,Math.min(1,(z+3.95)/3.1))*1.8;return current}
if(current>3.45&&Math.abs(x)<7&&z>-5.5&&z<6.5){if(Math.abs(x)<6.4&&z>-4.9&&z<4.9)return 4.05;if(Math.abs(x)<2.63&&z>=3.7&&z<5.85)return 4.05;return null}
if(x>=6.55&&x<7.47&&z>-2.01&&z<-.89){if(x<6.83)return .45;if(x<7.15)return .27;return .1}
if(Math.abs(x)<6.55&&z>-5.08&&z<5.08)return .45;if(Math.abs(x)<2.72&&z>3.7&&z<5.5)return .45;if(Math.abs(x)<1.8&&z>5&&z<6.5)return Math.max(.075,.45-(z-5.5)*.5);return landscapeHeightAt(x,z);
}
export function blocked(x,z,feet,colliders,r=.19){if(!landscapeContains(x,z))return true;const floor=surfaceHeight(x,z,feet);if(floor===null||Math.abs(floor-feet)>.48)return true;for(const c of colliders){if(floor+1.48<c.y0||floor+.16>c.y1)continue;if(c.radius!==undefined){if(Math.hypot(x-c.x,z-c.z)<c.radius+r)return true;}else if(x+r>c.x0&&x-r<c.x1&&z+r>c.z0&&z-r<c.z1)return true}return false}
// A map shortcut can be used while a moving door is paused halfway. Keep its
// arrival inside the requested room, but outside the current leaf and furniture.
export function safeArrival(point,colliders){
  if(!blocked(point.x,point.z,point.y,colliders))return point;
  const level=point.y>3.45?1:0,room=roomAt(point.x,point.z,level),fixed=colliders.filter(c=>!c.dynamicDoor);
  for(let radius=.10;radius<=1.21;radius+=.10)for(let i=0;i<24;i++){
    const x=point.x+Math.sin(i*Math.PI/12)*radius,z=point.z+Math.cos(i*Math.PI/12)*radius;
    if(roomAt(x,z,level)!==room||Math.abs((surfaceHeight(x,z,point.y)??-100)-point.y)>.04||blocked(x,z,point.y,colliders))continue;
    let connected=true;const steps=Math.ceil(radius/.04);
    for(let j=1;j<=steps;j++)if(blocked(point.x+(x-point.x)*j/steps,point.z+(z-point.z)*j/steps,point.y,fixed)){connected=false;break;}
    if(connected)return {...point,x,z};
  }
  return null;
}
export const places={garden:{x:0,z:11.7,y:.08,yaw:0,pitch:.06,name:'前院'},living:{x:.55,z:2.97,y:.45,yaw:1.1,pitch:-.15,name:'一楼 · 客厅'},dining:{x:.5,z:-1.3,y:.45,yaw:-.65,pitch:-.2,name:'一楼 · 餐厅'},upstairs:{x:0,z:1.32,y:4.05,yaw:Math.PI,pitch:-.16,name:'二楼 · 休闲区'},balcony:{x:0,z:5.48,y:4.05,yaw:Math.PI,pitch:-.4,name:'二楼 · 阳台'}};
places.forest={x:-16,z:13,y:landscapeHeightAt(-16,13),yaw:-.6,pitch:.02,name:'林间缓坡'};
export function roomAt(x,z,level){if(Math.abs(x)>6.5||z<-5||z>5.9)return '院子';if(Math.abs(x)<2.65&&z>3.8)return level?'阳台':'入户门廊';if(z>1){if(x<-2.6)return '卧室';if(x>2.6)return level?'卧室':'长辈卧室';return level?'休闲区':'客厅'}if(z>-.8){if(Math.abs(x)>4.1)return '卫生间';return '走廊'}if(x<-2.6)return '卧室';if(x<0)return '楼梯间';if(level)return '卧室';return x>3.7?'厨房':'餐厅'}
