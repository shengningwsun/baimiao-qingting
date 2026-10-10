export const EYE=1.62;
export function surfaceHeight(x,z,current=0){
if(x>-2.5&&x<-.1&&z<-.75&&z>-4.91){if(z<-4.02)return 2.25;if(x<-1.42)return .45+Math.max(0,Math.min(1,(-z-.85)/3.1))*1.8;if(x>-1.18)return 2.25+Math.max(0,Math.min(1,(z+3.95)/3.1))*1.8;return current}
if(current>3.45){if(Math.abs(x)<6.4&&z>-4.9&&z<4.9)return 4.05;if(Math.abs(x)<2.63&&z>=3.7&&z<5.85)return 4.05;return null}
if(x>=6.55&&x<7.47&&z>-2.01&&z<-.89){if(x<6.83)return .45;if(x<7.15)return .27;return .1}
if(Math.abs(x)<6.55&&z>-5.08&&z<5.08)return .45;if(Math.abs(x)<2.72&&z>3.7&&z<5.5)return .45;if(Math.abs(x)<1.8&&z>5&&z<6.5)return Math.max(.075,.45-(z-5.5)*.5);return .08;
}
export function blocked(x,z,feet,colliders,r=.19){if(Math.abs(x)>68||Math.abs(z)>68)return true;const floor=surfaceHeight(x,z,feet);if(floor===null||Math.abs(floor-feet)>.48)return true;for(const c of colliders){if(floor+1.48<c.y0||floor+.16>c.y1)continue;if(c.radius!==undefined){if(Math.hypot(x-c.x,z-c.z)<c.radius+r)return true;}else if(x+r>c.x0&&x-r<c.x1&&z+r>c.z0&&z-r<c.z1)return true}return false}
export const places={garden:{x:0,z:11.7,y:.08,yaw:0,pitch:.06,name:'前院'},living:{x:.55,z:2.97,y:.45,yaw:1.1,pitch:-.15,name:'一楼 · 客厅'},dining:{x:.5,z:-1.3,y:.45,yaw:-.65,pitch:-.2,name:'一楼 · 餐厅'},upstairs:{x:0,z:1.32,y:4.05,yaw:Math.PI,pitch:-.16,name:'二楼 · 休闲区'},balcony:{x:0,z:5.48,y:4.05,yaw:Math.PI,pitch:-.4,name:'二楼 · 阳台'}};
export function roomAt(x,z,level){if(Math.abs(x)>6.5||z<-5||z>5.9)return '院子';if(Math.abs(x)<2.65&&z>3.8)return level?'阳台':'入户门廊';if(z>1){if(x<-2.6)return '卧室';if(x>2.6)return level?'卧室':'长辈卧室';return level?'休闲区':'客厅'}if(z>-.8){if(Math.abs(x)>4.1)return '卫生间';return '走廊'}if(x<-2.6)return '卧室';if(x<0)return '楼梯间';if(level)return '卧室';return x>3.7?'厨房':'餐厅'}
