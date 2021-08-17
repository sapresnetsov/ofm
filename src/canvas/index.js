import { BORDER_WIDTH } from "../model/constants";
import { getPoint } from "../utils";

/**
 * Перевод HTML на канву
 * @param {HTMLElement} root
 * @param {string} ofmTitle
 * @param {number} width
 * @param {number} height
 * @param {Map} blocksMap
 * @param {Map} blockParamsMap
 * @param {Map} linesMap
 * @param {HTMLElement} stampBlock
 * @param {number} assignedStaffAreaTop
 * @param {number} structuralUnitsAreaTop
 */
export const translateHTMLToCanvas = ( root,
                                       ofmTitle,
                                       width,
                                       height,
                                       blocksMap,
                                       blockParamsMap,
                                       linesMap,
                                       stampBlock,
                                       assignedStaffAreaTop,
                                       structuralUnitsAreaTop) => {

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.style.display = 'none';

    root.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (blockParamsMap) {
        blockParamsMap.forEach((blockParams) => {
            const {x, y, width, height, innerPaddingLeft, innerPaddingRight, borderWidth, borderStyle, backgroundColor, title, functions, indicators} = blockParams;
            canvasDrawRect(ctx, x, y, width, height, innerPaddingLeft, innerPaddingRight, borderWidth, borderStyle, backgroundColor, title, functions, indicators);
        });
    }

    if (stampBlock) {
        canvasDrawStamp(ctx, stampBlock.style, stampBlock.childNodes[0], stampBlock.childNodes);
    }

    if (linesMap) {
        linesMap.forEach((line) => {
            line.parts.forEach((part, i) => {
                if (i !== line.parts.length - 1) {
                    canvasDrawLine(ctx, part, line.parts[i+1], line.lineStyle, line.lineColor);
                }
            });
        });
    }
    if (assignedStaffAreaTop) {
        canvasDrawLine(ctx, getPoint(0, assignedStaffAreaTop), getPoint(width, assignedStaffAreaTop), 'dashed', 'black');
        ctx.beginPath();
        ctx.font = '15px bold';
        ctx.textAlign = 'left';
        ctx.fillText('Приписной штат', 50, assignedStaffAreaTop + 10);
    }
    if (structuralUnitsAreaTop) {
        canvasDrawLine(ctx, getPoint(0, structuralUnitsAreaTop), getPoint(width, structuralUnitsAreaTop), 'dashed', 'black');
        ctx.beginPath();
        ctx.font = '15px bold';
        ctx.textAlign = 'left';
        ctx.fillText('Структурные подразделения', 50, structuralUnitsAreaTop + 10);
    }
    return canvas
};

/**
 * Вывод блока на канву
 * @param {Object} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {number} innerPaddingLeft
 * @param {number} innerPaddingRight
 * @param {number} borderWidth
 * @param {number} borderStyle
 * @param {string} backgroundColor
 * @param {Object} title
 * @param {Object[]} functions
 * @param {Object[]} indicators
 */
const canvasDrawRect = (ctx, x, y, width, height, innerPaddingLeft, innerPaddingRight, borderWidth, borderStyle, backgroundColor, title, functions, indicators) => {
    ctx.beginPath();
    let spaceBetweenLines = 0;
    let indVShift = 0;
    width += innerPaddingLeft + innerPaddingRight + 1;
    height += 2;
    const rectShift = 0.5;

    switch (borderStyle) {
        case 'solid':
            ctx.lineWidth = borderWidth;
            break;
        case 'double':
            ctx.lineWidth = '1';
            const parsedBorderWidth = borderWidth;
            if (parsedBorderWidth === BORDER_WIDTH.first) {
                spaceBetweenLines = BORDER_WIDTH.first;
            } else if (parsedBorderWidth === BORDER_WIDTH.second) {
                spaceBetweenLines = BORDER_WIDTH.second;
            }
            indVShift += 1;
            break;
        default:
            ctx.lineWidth = '1';
    }
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(x, y, width + spaceBetweenLines, height + spaceBetweenLines);
    ctx.fillStyle = 'black';
    ctx.strokeRect(x + rectShift, y + rectShift, width + spaceBetweenLines, height + spaceBetweenLines);
    if (spaceBetweenLines) {
        ctx.strokeRect(x + spaceBetweenLines + rectShift, y + spaceBetweenLines + rectShift, width - spaceBetweenLines, height - spaceBetweenLines);
    }

    // заголовок
    const textX = x + innerPaddingLeft + borderWidth;
    let textY = y + borderWidth + title.paddingTop;
    const textWidth = width - innerPaddingLeft - innerPaddingRight;
    // const titleTextObject = {...title, height: !functions.length ? height - IND_HEIGHT - title.height: title.height }
    const titleTextObject = {...title }
    textY = rectDrawText( ctx,
        textX,
        textY,
        textWidth,
        innerPaddingLeft,
        innerPaddingRight,
        0,
        titleTextObject);

    // Функции
    if (functions.length > 1) {
        functions.forEach((func) => {
            textY = rectDrawText( ctx,
                textX,
                textY,
                textWidth,
                innerPaddingLeft,
                innerPaddingRight,
                4,
                func);
        });
    }

    // индикаторы
    if (indicators. length > 1) {
        let indicatorX = x + 1;
        const indicatorY = y + height + borderWidth + indVShift;
        ctx.lineWidth = '1';
        let prevIndX = 0;
        indicators.reverse().forEach((ind) => {
            indicatorX += ind.x - prevIndX;
            prevIndX = ind.x;
            ctx.fillStyle = 'lightyellow';
            ctx.strokeRect(indicatorX, indicatorY, ind.width, ind.height);
            ctx.fillRect(indicatorX, indicatorY, ind.width, ind.height);

            ctx.fillStyle = 'blue';
            ctx.textAlign = 'center';
            ctx.font = ind.font;
            ctx.fillText(ind.text, indicatorX + ind.width / 2, indicatorY + ind.height / 2);
        });
    }
};

/**
 *
 * @param ctx
 * @param left
 * @param top
 * @param width
 * @param paddingLeft
 * @param paddingRight
 * @param lineSpacing
 * @param textObject
 * @return {*}
 */
const rectDrawText = (ctx, left, top, width, paddingLeft, paddingRight, lineSpacing, textObject) => {
    const words = textObject.text.split(' ');
    const textX = left + Math.trunc(width / 2);
    let line = '';
    let textY = top + Math.trunc(textObject.paddingTop * 2 + textObject.height / 2);

    ctx.fillStyle = 'black';
    ctx.textAlign = textObject.textAlign;
    ctx.textBaseline = 'middle';
    ctx.font = textObject.font;
    words.forEach((word) => {
        const tmpLine = line + word + ' ';
        const tmpWidth = ctx.measureText(tmpLine).width;
        if (tmpWidth < width) {
            line = tmpLine;
        } else {
            ctx.fillText(line, textX, textY);
            line = word + ' ';
            textY += textObject.height + lineSpacing;
        }
    });
    if (line) {
        ctx.fillText(line, textX, textY);
        textY += textObject.height + textObject.paddingBottom;
    }
    return textY;
};

/**
 * Отрисовка линии
 * @param ctx
 * @param pointFrom
 * @param pointTo
 * @param lineStyle
 * @param lineColor
 */
const canvasDrawLine = (ctx, pointFrom, pointTo, lineStyle, lineColor) => {
    ctx.beginPath();
    ctx.moveTo(pointFrom.x + 0.5, pointFrom.y + 0.5);
    ctx.lineTo(pointTo.x + 0.5, pointTo.y + 0.5);
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;
    if (lineStyle !== 'solid') {
        ctx.setLineDash([5, 5]);
    }
    ctx.stroke();
};

/**
 *
 * @param ctx
 * @param left
 * @param top
 * @param width
 * @param textObject
 * @return {*}
 */
const stampDrawTitle = (ctx, left, top, width, textObject) => {
    const words = textObject.text.split(' ');
    let line = '';
    let textY = top

    ctx.fillStyle = 'black';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = textObject.font;
    words.forEach((word) => {
        const tmpLine = line + word + ' ';
        const tmpWidth = ctx.measureText(tmpLine).width;
        if (tmpWidth < width) {
            line = tmpLine;
        } else {
            ctx.fillText(line, left, textY);
            line = word + ' ';
            textY += textObject.height + 1;
        }
    });
    if (line) {
        ctx.fillText(line, left, textY);
        textY += textObject.height + textObject.paddingBottom;
    }

    return textY;
}

/**
 *
 * @param ctx
 * @param left
 * @param top
 * @param propNameObject
 * @param propValueObject
 * @return {*}
 */
const stampDrawProp = (ctx, left, top, propNameObject, propValueObject) => {
    let textLeft = left;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = propNameObject.font;
    ctx.fillText(propNameObject.text, textLeft, top);

    textLeft += propNameObject.width;
    ctx.textAlign = 'left';
    ctx.font = propValueObject.font;
    ctx.fillText(propValueObject.text, textLeft, top);

    return top + propNameObject.height + propNameObject.paddingBottom
};

/**
 *
 * @param ctx
 * @param stampStyle
 * @param stampTitle
 * @param stampRows
 */
const canvasDrawStamp = (ctx, stampStyle, stampTitle, stampRows) => {
    ctx.beginPath();
    const textX = parseInt(stampStyle.left);
    let textY = parseInt(stampStyle.top);
    const width = parseInt(stampStyle.width);
    const titleStyle = window.getComputedStyle(stampTitle);
    const titleObject = {
        font: `${titleStyle.fontSize} ${titleStyle.fontFamily}`,
        text: stampTitle.textContent,
        height: 20,
        paddingTop: parseInt(titleStyle.paddingTop, 10),
        paddingBottom: parseInt(titleStyle.paddingBottom, 10),
        textAlign: 'left'
    };
    textY = stampDrawTitle( ctx,
                            textX,
                            textY,
                            width,
                            titleObject );
    Array.prototype.forEach.call(stampRows, (stampRow, index) => {
        if (index > 0) {
            const propNameStyle = window.getComputedStyle(stampRow.childNodes[0])
            const propNameObject = {
                font: `bold ${propNameStyle.fontSize} ${propNameStyle.fontFamily}`,
                text: stampRow.childNodes[0].textContent,
                width: parseInt(propNameStyle.width, 10),
                height: parseInt(propNameStyle.height, 10),
                paddingTop: parseInt(propNameStyle.paddingTop, 10),
                paddingBottom: parseInt(propNameStyle.paddingBottom, 10),
            };
            const propValueStyle = window.getComputedStyle(stampRow.childNodes[1])
            const propValueObject = {
                font: `${propValueStyle.fontSize} ${propValueStyle.fontFamily}`,
                text: stampRow.childNodes[1].textContent,
                width: parseInt(propValueStyle.width, 10),
                height: parseInt(propValueStyle.height, 10),
                paddingTop: parseInt(propValueStyle.paddingTop, 10),
                paddingBottom: parseInt(propValueStyle.paddingBottom, 10),
            };
            textY = stampDrawProp( ctx,
                textX,
                textY,
                propNameObject,
                propValueObject);
        }
    })
    // stampRows.forEach((stampRow, index) => {
    //     if (index > 0) {
    //         const propNameStyle = window.getComputedStyle(stampRow.childNodes[0])
    //         const propNameObject = {
    //             font: `bold ${propNameStyle.fontSize} ${propNameStyle.fontFamily}`,
    //             text: stampRow.childNodes[0].textContent,
    //             width: parseInt(propNameStyle.width, 10),
    //             height: parseInt(propNameStyle.height, 10),
    //             paddingTop: parseInt(propNameStyle.paddingTop, 10),
    //             paddingBottom: parseInt(propNameStyle.paddingBottom, 10),
    //         };
    //         const propValueStyle = window.getComputedStyle(stampRow.childNodes[1])
    //         const propValueObject = {
    //             font: `${propValueStyle.fontSize} ${propValueStyle.fontFamily}`,
    //             text: stampRow.childNodes[1].textContent,
    //             width: parseInt(propValueStyle.width, 10),
    //             height: parseInt(propValueStyle.height, 10),
    //             paddingTop: parseInt(propValueStyle.paddingTop, 10),
    //             paddingBottom: parseInt(propValueStyle.paddingBottom, 10),
    //         };
    //         textY = stampDrawProp( ctx,
    //             textX,
    //             textY,
    //             propNameObject,
    //             propValueObject);
    //     }
    // });
};
