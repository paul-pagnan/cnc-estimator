export const imageTagPromise = (tags) => {
    return new Promise(resolve => {
        let images = [];
        const walker = (tag) => {
            if (tag.name === 'image')
                images.push(tag);
            if (tag.children)
                tag.children.forEach(t => walker(t))
        }

        const consumer = () => {
            if (images.length) {
                let tag = images.shift()
                let dataURL = tag.element.getAttribute('xlink:href')
                if (dataURL.substring(0, 5) !== 'data:')
                    return consumer();
                let image = new Image();
                image.onload = () => { tag.naturalWidth = image.naturalWidth; tag.naturalHeight = image.naturalHeight; consumer() }
                image.src = dataURL;
            } else {
                resolve(tags);
            }
        }

        walker(tags);
        consumer();
    })
}