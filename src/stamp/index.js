/**
 * Отрисовка штампа в правом верхнем углу
 * @param {Object} stamp
 * @param {number} width
 * @return {HTMLElement}
 */
export const drawStamp = (stamp, width) => {
    const y = 20;
    const x = 20;

    let propArr = stamp.name.split('/');
    const name = `${propArr[0]} ${propArr[1]}`;

    const properties = [];
    propArr = stamp.staff_hc.split('/');
    let prop = {name: propArr[0], value: propArr[1]};
    properties.push(prop);

    propArr = stamp.np.split('/');
    prop = {name: propArr[0], value: propArr[1]};
    properties.push(prop);

    propArr = stamp.nrp_all.split('/');
    prop = {name: propArr[0], value: propArr[1]};
    properties.push(prop);

    propArr = stamp.nup_min.split('/');
    prop = {name: propArr[0], value: propArr[1]};
    properties.push(prop);

    propArr = stamp.kzv_max.split('/');
    prop = {name: propArr[0], value: propArr[1]};
    properties.push(prop);

    return createStampBlock(x, y, width, name, properties);
};

/**
 * Отрисовка блока штампа
 * @param {Number} x
 * @param {Number} y
 * @param {Number} width
 * @param {String} name
 * @param {Array} properties
 * @return {HTMLElement}
 */
const createStampBlock = (x, y, width, name, properties) => {
    const outerBlock = document.createElement(`div`);
    outerBlock.setAttribute(`class`, `stamp_block`);
    outerBlock.style.left = `${x}px`;
    outerBlock.style.top = `${y}px`;
    outerBlock.style.width = `${width}px`;
    outerBlock.style.borderWidth = `1px`;

    root.appendChild(outerBlock);

    const titleBlock = document.createElement(`div`);
    titleBlock.setAttribute(`class`, `name_block`);
    titleBlock.textContent = name;
    titleBlock.style.width = `${width}px`;
    outerBlock.appendChild(titleBlock);

    const rowHeight = 20;
    let top = titleBlock.clientHeight + 10;
    properties.forEach((prop) => {
        const rowBlock = document.createElement(`div`);
        rowBlock.setAttribute(`class`, `property_block`);
        rowBlock.style.width = `${width}px`;
        rowBlock.style.height = `${rowHeight}px`;
        rowBlock.style.top = `${top}px`;

        const propNameBlock = document.createElement(`div`);
        propNameBlock.style.width = `${width - 130}px`;

        const propName = document.createElement(`p`);
        propName.setAttribute(`class`, `prop_name prop`);
        propName.textContent = prop.name;
        propNameBlock.appendChild(propName);

        const propValueBlock = document.createElement(`div`);
        propValueBlock.style.left = `${width - 130}px`;
        propValueBlock.style.width = `${130}px`;
        const propValue = document.createElement(`p`);
        propValue.setAttribute(`class`, `prop_value prop`);
        propValue.textContent = prop.value;
        propValueBlock.appendChild(propValue);

        rowBlock.appendChild(propNameBlock);
        rowBlock.appendChild(propValueBlock);

        outerBlock.appendChild(rowBlock);

        top += rowHeight;
    });
    outerBlock.bottom = top - y;
    return outerBlock;
};

/**
 *
 * @param {HTMLElement} stampBlock
 * @param {Object} parent
 * @param {BlockParams} parentBlockParams
 * @param {number} fullWidth
 * @param {Map} blockParamsMap
 */
export const shiftStampRight = (stampBlock, parent, parentBlockParams, fullWidth, blockParamsMap) => {
    if (typeof stampBlock !== undefined) {
        let newStampBlockLeft = fullWidth - parseInt(stampBlock.style.width) - 10;
        if (newStampBlockLeft < parentBlockParams.x + parentBlockParams.width + 50) {
            newStampBlockLeft = fullWidth / 2 - parentBlockParams.width / 2 + parentBlockParams.width + 50;
        }

        const stampBlockStyle = window.getComputedStyle(stampBlock.childNodes[stampBlock.childNodes.length - 1]);
        // для случая, когда у корневого элемента сразу идут заместители, сдвигаем штамп правее
        parent.children.forEach((child) => {
            const childBlockParams = blockParamsMap.get(child.id)
            if (childBlockParams && childBlockParams.right.x > newStampBlockLeft && childBlockParams.y < parseInt(stampBlockStyle.top) + parseInt(stampBlockStyle.height)) {
                newStampBlockLeft = childBlockParams.right.x + 50
            }
        });
        stampBlock.style.left = `${newStampBlockLeft}px`;
    }
};