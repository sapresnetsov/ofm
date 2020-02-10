/* eslint-disable indent */
// отрисовка орг. блока
import {
  BACKGROUND_COLOR,
  BORDER_WIDTH, BOTTOM,
  H_BLOCK_PADDING,
  IND_HEIGHT,
  IND_WIDTH, LEFT,
  MIN_BLOCK_HEIGHT, RIGHT, TOP,
} from './constants';

/**
 *
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {string} blockType
 * @param {string} blockLevel
 * @param {string} title
 * @param {any[]} functions
 * @param {any[]} indicators
 * @return {HTMLElement}
 */
export const createBlock = (x, y, width, height, blockType='default', blockLevel='default', title, functions, indicators) => {
  const outerBlock = document.createElement(`div`);
  outerBlock.setAttribute(`class`, `outer_block`);
  outerBlock.style.left = `${x}px`;
  outerBlock.style.top = `${y}px`;
  outerBlock.style.width = `${width}px`;
  outerBlock.style.height = `${height}px`;

  const blockBorderWidth = BORDER_WIDTH[blockLevel];
  const blockBody = document.createElement(`div`);
  blockBody.setAttribute(`class`, `inner_block ${blockLevel}`);
  blockBody.style.paddingLeft = blockBody.style.paddingRight = `${H_BLOCK_PADDING}px`;
  blockBody.style.borderWidth = `${blockBorderWidth}px`;
  blockBody.style.backgroundColor = `${BACKGROUND_COLOR[blockType]}`;
  // Заголовок блока
  const blockTitle = document.createElement(`h3`);
  blockTitle.setAttribute(`class`, `title_text text_color_text`);
  blockTitle.textContent = title;
  blockBody.appendChild(blockTitle);

  // функции
  if (!!functions && functions.length > 0) {
    functions.forEach((func) => {
      const funcText = document.createElement(`p`);
      funcText.setAttribute(`class`, `function_text text_color_text`);
      funcText.textContent = func;
      blockBody.appendChild(funcText);
    });
  }
  outerBlock.appendChild(blockBody);

  // индикаторы
  const footerBlock = document.createElement(`div`);
  if (!indicators) {
    footerBlock.style.visibility = 'hidden';
  } else {
    footerBlock.setAttribute(`class`, `text_color_indicator`);
    footerBlock.style.top = `${MIN_BLOCK_HEIGHT + blockBorderWidth}px`;
    const indBorderWidth = BORDER_WIDTH.ind;
    let indicatorWidth = IND_WIDTH;
    let indWidthDiff;
    const indicatorsLength = indicators.length;
    // TODO продумать, а то выглядит плохо
    if (indicatorsLength > 3) {
      indicatorWidth = Math.trunc((width + blockBorderWidth * 2) / indicatorsLength) + indBorderWidth;
      indWidthDiff = (width + blockBorderWidth * 2 - indicatorWidth * indicatorsLength) + 2;
    }

    // правая сторона блока рассчитывается как
    // Ширина+Удвоенный padding+Удвоенная Толщина рамки-Ширина индикатора+Удвоенная Толщина рамки индикатора
    let indicatorX = width + H_BLOCK_PADDING * 2 + blockBorderWidth * 2 - indicatorWidth - indBorderWidth * 2;
    indicators.reverse().forEach((ind, i) => {
      const indicator = document.createElement(`div`);
      indicator.setAttribute(`class`, `indicator ${blockType}`);
      if (i === indicatorsLength - 1 && indicatorsLength > 3) {
        indicatorWidth += indWidthDiff;
        indicatorX -= indWidthDiff;
      }
      indicator.style.left = `${indicatorX}px`;
      indicator.style.width = `${indicatorWidth}px`;
      indicator.style.height = `${IND_HEIGHT}px`;
      indicator.style.borderWidth = `${indBorderWidth}px`;
      indicator.innerHTML = `<p style="margin: 0">${ind.key} ${ind.value}</p>`;
      if (i !== 0) {
        indicator.style.borderRight = `0`;
      }
      footerBlock.appendChild(indicator);

      indicatorX -= (indicatorWidth + indBorderWidth);
    });
  }
  outerBlock.appendChild(footerBlock);

  return outerBlock;
};

/**
 * Получение объекта точка
 * @param {number} pX
 * @param {number} pY
 * @return {Point}
 */
export const getPoint = (pX, pY) => {
  return {
    x: pX,
    y: pY,
  };
};

/**
 * Получение фактических параметров HTML-блока
 * @param {Object} block
 * @return {BlockParams}
 */
export const getBlockParams = (block) => {
  const left = parseInt(block.style.left, 10);
  const top = parseInt(block.style.top, 10);
  const width = parseInt(block.style.width, 10);
  const height = parseInt(block.children[0].style.height, 10);
  // рамка устанавливается у внутреннего блока
  const borderWidth = parseInt(block.children[0].style.borderWidth, 10);
  const innerPaddingLeft = parseInt(block.children[0].style.paddingLeft, 10);
  const innerPaddingRight = parseInt(block.children[0].style.paddingRight, 10);
  return {
    x: left,
    y: top,
    width: width,
    height: height,
    borderWidth: borderWidth,
    top: getPoint(left + width / 2, top),
    bottom: getPoint(left + width / 2 + innerPaddingLeft, top + height + borderWidth * 2),
    left: getPoint(left, top + height / 2),
    right: getPoint(left + width + borderWidth * 2 + innerPaddingLeft + innerPaddingRight, top + height / 2),
  };
};

/**
 * Получение данных через index.html
 * @return {{ofmDataStr: string, ofmStampStr: string, maxDepth: string}}
 */
export const getDataFromDOM = () => {
  const ofmDataStr = document.getElementById('ofmData').textContent;
  const ofmStampStr = document.getElementById('ofmStamp').textContent;
  const maxDepth = document.getElementById('maxDepth').textContent;

  return {ofmDataStr, ofmStampStr, maxDepth};
};

/**
 * Отрисовка линии
 * @param {HTMLElement} root
 * @param {Point} startPoint
 * @param {Point} endPoint
 * @param {string} lineType
 */
export const createLine = (root, startPoint, endPoint, lineType) => {
  const line = document.createElement(`div`);
  line.setAttribute(`class`, `line ` + lineType);

  switch (lineType) {
    case `horizontal_line`:
      if (startPoint.y <= endPoint.y) {
        line.style.top = startPoint.y +`px`;
      } else {
        line.style.top = endPoint.y +`px`;
      }
      if (startPoint.x <= endPoint.x) {
        line.style.left = startPoint.x + `px`;
      } else {
        line.style.left = endPoint.x + `px`;
      }
      line.style.width = Math.abs(startPoint.x - endPoint.x) + `px`;
      break;
    case `vertical_line`:
      if (startPoint.x <= endPoint.x) {
        line.style.left = startPoint.x +`px`;
      } else {
        line.style.left = endPoint.x +`px`;
      }
      if (startPoint.y <= endPoint.y) {
        line.style.top = startPoint.y + `px`;
      } else {
        line.style.top = endPoint.y + `px`;
      }
      line.style.height = Math.abs(startPoint.y - endPoint.y) + `px`;
      break;
    default:
      break;
  }
  root.appendChild(line);
};

// пока реализация предполагает только соединение низа и верха, либо бока и бока
export const createUpsideDownConnector = (root, linesMap, blockFrom, blockTo, fromSide, toSide) => {
  const fromPoint = getPointOfSide(blockFrom, fromSide);
  const toPoint = getPointOfSide(blockTo, toSide);

  const stdNodeShift = 15;
  // точки соединения находятся на одной вертикали
  if (fromSide === BOTTOM && toSide === TOP) {
    if (fromPoint.x >= (toPoint.x) && fromPoint.x <= (toPoint.x)) {
      createLine(root, fromPoint, toPoint, 'vertical_line');
      return;
    }

    // const yMiddle = Math.abs(fromPoint.y - blockTo.top.y) / 2;
    const yMiddle = toPoint.y - stdNodeShift;
    const parMidPoint = getPoint(fromPoint.x, yMiddle);
    const childMidPoint = getPoint(toPoint.x, yMiddle);

    // ломаная линия
    createLine(root, fromPoint, parMidPoint, 'vertical_line');
    createLine(root, parMidPoint, childMidPoint, 'horizontal_line');
    createLine(root, childMidPoint, toPoint, 'vertical_line');
  }

  if (fromSide === BOTTOM && toSide === LEFT) {

  }

  if (fromSide === LEFT && toSide === LEFT) {
    // блок снизу и правее
    if (toPoint.x >= fromPoint.x ) {
      const yDiff = Math.abs(fromPoint.y - toPoint.y);
      const parMidPoint = getPoint(fromPoint.x - stdNodeShift, fromPoint.y);
      const childMidPoint = getPoint(fromPoint.x - stdNodeShift, fromPoint.y + yDiff);

      createLine(root, fromPoint, parMidPoint, 'horizontal_line');
      createLine(root, parMidPoint, childMidPoint, 'vertical_line');
      createLine(root, childMidPoint, toPoint, 'horizontal_line');
    }
  }

  if (fromSide === RIGHT && toSide === LEFT) {
    // блок снизу и правее
    if (toPoint.x >= fromPoint.x ) {
      const parMidPoint = getPoint(toPoint.x - stdNodeShift, fromPoint.y);
      const childMidPoint = getPoint(toPoint.x - stdNodeShift, toPoint.y);
      createLine(root, fromPoint, parMidPoint, 'horizontal_line');
      createLine(root, parMidPoint, childMidPoint, 'vertical_line');
      createLine(root, childMidPoint, toPoint, 'horizontal_line');
    }
  }
};

const getPointOfSide = (blockParams, side) => {
  let point;
  switch (side) {
    case LEFT:
      point = blockParams.left;
      break;
    case RIGHT:
      point = blockParams.right;
      break;
    case TOP:
      point = blockParams.top;
      break;
    case BOTTOM:
      point = blockParams.bottom;
      break;
  }
  return point;
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
export const createStampBlock = (x, y, width, name, properties) => {
  const outerBlock = document.createElement(`div`);
  outerBlock.setAttribute(`class`, `stamp_block`);
  outerBlock.style.left = `${x}px`;
  outerBlock.style.top = `${y}px`;
  outerBlock.style.width = `${width}px`;
  // outerBlock.style.height = `100px`;
  outerBlock.style.borderWidth = `1px`;

  root.appendChild(outerBlock);

  const nameBlock = document.createElement(`div`);
  nameBlock.setAttribute(`class`, `name_block`);
  nameBlock.textContent = name;
  nameBlock.style.width = `${width}px`;
  outerBlock.appendChild(nameBlock);

  const rowHeight = 20;
  let top = nameBlock.clientHeight + 10;
  properties.forEach((prop) => {
    const rowBlock = document.createElement(`div`);
    rowBlock.style.width = `${width}px`;
    rowBlock.style.height = `${rowHeight}px`;
    rowBlock.style.top = `${top}px`;

    const nameBlock = document.createElement(`div`);
    nameBlock.style.width = `${width-130}px`;

    const valueBlock = document.createElement(`div`);
    valueBlock.style.left = `${width-130}px`;
    valueBlock.style.width = `${130}px`;

    const propName = document.createElement(`p`);
    propName.setAttribute(`class`, `prop_name prop`);
    propName.textContent = prop.name;
    nameBlock.appendChild(propName);

    const propValue = document.createElement(`p`);
    propValue.setAttribute(`class`, `prop_value prop`);
    propValue.textContent = prop.value;
    valueBlock.appendChild(propValue);

    rowBlock.appendChild(nameBlock);
    rowBlock.appendChild(valueBlock);

    outerBlock.appendChild(rowBlock);

    top += rowHeight;
  });
  outerBlock.bottom = top - y;
  return outerBlock;
};
