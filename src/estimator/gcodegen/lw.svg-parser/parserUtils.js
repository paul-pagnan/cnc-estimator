
export const forEachChildNode = (nodeList, iteratee) => {
    if (!nodeList) return;
    for (let i = 0; i < nodeList.length; i++) {
        const node = nodeList.item(i);
        iteratee(node);
    }
}
