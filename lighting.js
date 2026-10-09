export const lightingPresets={
  day:{label:'晴日',icon:'☀',hemi:.72,hemiColor:0xf1f5fa,sun:2.0,sunColor:0xfff8ee,sunPosition:[-15,25,17],fill:.18,fog:0xc5d9cf,top:0x64b6ed,bottom:0xcbe4ef,background:0xbaddec,environment:.24,exposure:1,lamps:3.3,emissive:.5},
  dusk:{label:'黄昏',icon:'◐',hemi:.65,hemiColor:0xb2bccc,sun:1.05,sunColor:0xffb66f,sunPosition:[-23,8,6],fill:.13,fog:0xbda999,top:0x718398,bottom:0xf4c297,background:0x718398,environment:.16,exposure:.97,lamps:13,emissive:2},
  night:{label:'夜晚',icon:'☾',hemi:.2,hemiColor:0x8ea9d1,sun:.22,sunColor:0xc9ddff,sunPosition:[-32,38,-75],fill:.065,fog:0x101a30,top:0x050d1c,bottom:0x172a46,background:0x081426,environment:.035,exposure:1,lamps:15,emissive:2.8}
};
export const lightingCycle=Object.keys(lightingPresets);
export function lightingMode(value){
  const mode=typeof value==='boolean'?(value?'dusk':'day'):value;
  if(!Object.hasOwn(lightingPresets,mode))throw Error('Unknown lighting');
  return mode;
}
