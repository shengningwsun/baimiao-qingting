// Geometry-independent anchors survive static batching and furniture culling.
export const interactionTargets=[];
export function registerInteraction(target){
  const item={id:`${target.kind}-${interactionTargets.length}`,range:1.65,...target};
  interactionTargets.push(item);return item;
}
