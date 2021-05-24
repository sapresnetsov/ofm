/* eslint-disable indent */
// отрисовка орг. блока
import {
  BACKGROUND_COLOR, BLOCK_TYPES,
  BORDER_WIDTH, BOTTOM, GOVERNANCE,
  H_BLOCK_PADDING,
  IND_HEIGHT,
  IND_WIDTH, LEFT,
  MIN_BLOCK_HEIGHT, ORG_UNIT, POSITION, RIGHT, TOP, V_SPACE_BETWEEN_BLOCKS,
} from './constants';

/**
 * Создания блока
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {string} blockType
 * @param {string} blockLevel
 * @param {string} title
 * @param {String[]} functions
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
      indicator.style.backgroundColor = 'lightyellow';
      indicator.style.color = 'blue';
      indicator.style.fontSize = '6pt';
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
    x: Math.floor(pX),
    y: Math.floor(pY),
  };
};

/**
 * Получение параметров HTML-блока и параметров отображения по смыслу в ОФМ
 * @param {Object} block
 * @param {Object} ofmValue
 * @param {number} nearParentTop
 * @param {Boolean} [isRootChild]
 * @return {BlockParams}
 */
export const getBlockParams = (block, ofmValue, nearParentTop, isRootChild=false) => {
  const left = parseInt(block.style.left, 10);
  const top = parseInt(block.style.top, 10);
  const width = parseInt(block.style.width, 10);
  const height = parseInt(block.children[0].style.height, 10);
  // рамка устанавливается у внутреннего блока
  const borderWidth = parseInt(block.children[0].style.borderWidth, 10);
  const innerPaddingLeft = parseInt(block.children[0].style.paddingLeft, 10);
  const innerPaddingRight = parseInt(block.children[0].style.paddingRight, 10);
  const innerBlockStyle = window.getComputedStyle(block.children[0]);
  // const indicatorsBlockStyle = window.getComputedStyle(block.children[1]);
  // заголовок
  const titleTag = block.children[0].children[0];
  const titleStyle = window.getComputedStyle(titleTag);
  const titleHeight = 19;
  const title = {
    font: `bold ${titleStyle.fontSize} Calibri`,
    text: titleTag.innerText,
    height: titleHeight,
    paddingTop: parseInt(titleStyle.paddingTop, 10),
    paddingBottom: parseInt(titleStyle.paddingBottom, 10),
    paddingLeft: parseInt(titleStyle.paddingLeft, 10),
    paddingRight: parseInt(titleStyle.paddingRight, 10),
  };
  // функции
  let functions = [];
  if (block.children[0].children.length > 1) {
    const funcArr = [...block.children[0].children];
    const funcStyle = window.getComputedStyle(block.children[0].children[1]);
    let funcHeight = parseInt(funcStyle.height, 10);
    funcHeight = funcHeight / Math.ceil(funcHeight / parseInt(funcStyle.fontSize, 10));
    functions = funcArr.slice(1, funcArr.length).map((func) => {
      return {
        font: `${funcStyle.fontSize} ${funcStyle.fontFamily}`,
        text: func.innerText,
        height: funcHeight,
        paddingTop: parseInt(funcStyle.paddingTop, 10),
        paddingBottom: parseInt(funcStyle.paddingBottom, 10),
      };
    });
  }
  // Индикаторы
  let indicators = [];
  if (block.children[1].children && block.children[1].children.length > 0) {
    indicators = [...block.children[1].children].map((ind) => {
      return {
        x: parseInt(ind.style.left, 10),
        y: parseInt(ind.style.top, 10),
        width: parseInt(ind.style.width, 10),
        height: parseInt(ind.style.height, 10),
        borderWidth: 1,
        backgroundColor: ind.style.backgroundColor,
        text: ind.innerText,
        font: `${ind.style.fontSize} Calibri`,
      };
    });
  }
  return {
    x: left,
    y: top,
    width: width,
    height: height,
    innerPaddingLeft: innerPaddingLeft,
    innerPaddingRight: innerPaddingRight,
    borderWidth: borderWidth,
    borderStyle: innerBlockStyle.borderStyle || innerBlockStyle.borderBottomStyle,
    top: getPoint(left + width / 2, top),
    bottom: getPoint(left + width / 2 + innerPaddingLeft, top + height + borderWidth * 2),
    left: getPoint(left, top + height / 2),
    right: getPoint(left + width + borderWidth * 2 + innerPaddingLeft + innerPaddingRight, top + height / 2),
    nearParentTop: nearParentTop,
    additionalInfo: ofmValue.additionalInfo,
    isRootChild: isRootChild,
    backgroundColor: innerBlockStyle.backgroundColor,
    id: ofmValue.id,
    title: title,
    functions: functions,
    indicators: indicators,
  };
};

/**
 * Добавление блока
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {Object} child
 * @param {Map} blocksMap
 * @param {Map} blockParamsMap
 * @param {Object} parentParams
 * @param {Boolean} [isRootChild]
 * @return {HTMLElement}
 */
export const appendBlock = (x, y, width, height, child, blocksMap, blockParamsMap, parentParams, isRootChild) => {
  const blockType = child.type || 'default';
  const blockLevel = child.level || 'default';
  const initialBlockParams = [x, y, width, height, blockType, blockLevel, child.title, child.functions, child.indicators];
  const childBlock = createBlock(...initialBlockParams);
  root.appendChild(childBlock);
  // подбор высоты
  const childHeight = childBlock.children[0].clientHeight;
  const indicatorBlockTop = childHeight + BORDER_WIDTH[blockLevel] * 2;
  // childBlock.style.height = childHeight + 'px';
  childBlock.children[0].style.height = childHeight + 'px';
  childBlock.children[1].style.top = indicatorBlockTop + 'px';
  blocksMap.set(child.id, childBlock);
  blockParamsMap.set(child.id, getBlockParams(childBlock, child, parentParams.top.y, isRootChild));
  return childBlock;
};

/**
 * Получение данных через DOM
 * @return {{
 *  ofmDataStr: string,
 *  ofmTitle: string,
 *  ofmStampStr: string,
 *  maxDepth: string,
 *  drawSeparators: boolean,
 *  saveToDom: boolean,
 *  toImage: boolean,
 *  toPdf: boolean,
 *  deleteTechBlock: boolean,
 *  }}
 */
export const getDataFromDOM = () => {
  const ofmDataStr = getDomValue('ofmData');
  const ofmTitle = getDomValue('ofmTitle');
  const ofmStampStr = getDomValue('ofmStamp');
  const maxDepth = getDomValue('maxDepth');
  const drawSeparators = getDomValue('drawSeparators') === 'true';
  const saveToDom = getDomValue('saveToDom') === 'true';
  const toImage = getDomValue('toImage') === 'true';
  const toPdf = getDomValue('toPdf') === 'true';
  const deleteTechBlock = getDomValue('deleteTechBlock') === 'true';

  return {ofmDataStr, ofmTitle, ofmStampStr, maxDepth, drawSeparators, saveToDom, toImage, toPdf, deleteTechBlock};
};

/**
 * Получение значения элемента DOM
 * @param {string} id
 * @return {string}
 */
const getDomValue = (id) => {
  if (document.getElementById(id)) {
    return document.getElementById(id).textContent.trim();
  } else {
    return '';
  }
};

/**
 * Отрисовка линии
 * @param {HTMLElement} root
 * @param {Point} startPoint
 * @param {Point} endPoint
 * @param {string} lineType
 * @param {string} [lineStyle]
 * @param {string} [lineColor]
 */
export const createLine = (root, startPoint, endPoint, lineType, lineStyle='solid', lineColor='black') => {
  const line = document.createElement(`div`);
  line.setAttribute(`class`, `line ` + lineType);
  line.style.borderStyle = lineStyle;
  line.style.borderColor = lineColor;

  switch (lineType) {
    // горизонтальная линия
    case `h`:
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
    // вертикальная линия
    case `v`:
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

/**
 * пока реализация предполагает только соединение низа и верха, либо бока и бока
 * @param {HTMLElement} root
 * @param {Map} linesMap
 * @param {Object | undefined} orgUnitArea
 * @param {Object} blockFrom
 * @param {Object} blockTo
 * @param {string} fromSide
 * @param {string} toSide
 * @param {Boolean} [curationLine]
 */
export const createUpsideDownConnector = (root, linesMap, orgUnitArea, blockFrom, blockTo, fromSide, toSide, curationLine) => {
  const fromPoint = getPointOfSide(blockFrom, fromSide);

  if (!blockTo) {
    return;
  }

  const toPoint = getPointOfSide(blockTo, toSide);
  const key = blockFrom.id + '/' + blockTo.id;

  let lineStyle = 'solid';
  let lineColor;

  let stdNodeShift = 20;
  let curationShift = 0;
  if (curationLine) {
    curationShift = 10;
    stdNodeShift = 15;
    lineStyle = 'dashed';
    lineColor = 'blue';
  }
  if (fromSide === BOTTOM && toSide === TOP) {
    // точки соединения находятся на одной вертикали
    if (Math.abs(fromPoint.x - toPoint.x) < 5 && (!orgUnitArea || orgUnitArea.width === 0)) {
      toPoint.x += (fromPoint.x - toPoint.x);
      createLine(root, fromPoint, toPoint, 'v');
      linesMap.set(key, [
        {...fromPoint},
        {...toPoint},
        ]);
      return;
    }
    // точки соединения смещены относительно друг-друга
    if (!orgUnitArea) {
      if (curationLine) {
        // TODO
        if (fromPoint.x > toPoint.x) {
          fromPoint.x -= 10;
          toPoint.x += 10;
        } else if (fromPoint.x < toPoint.x) {
          fromPoint.x += 10;
          toPoint.x -= 10;
        }

        if (Math.abs(fromPoint.x - toPoint.x) < 5 && toPoint.y === orgUnitArea.y ) {
          toPoint.x += (fromPoint.x - toPoint.x);
          createLine(root, fromPoint, toPoint, 'v', lineStyle, lineColor);
          linesMap.set(key, [
            {...fromPoint},
            {...toPoint},
          ]);
          return;
        }
        fromPoint.x += 10;
        toPoint.x += 10;
      }
      // ломаная линия из трех звеньев
      const yMiddle = toPoint.y - stdNodeShift;
      const parMidPoint = getPoint(fromPoint.x, yMiddle);
      const childMidPoint = getPoint(toPoint.x + curationShift, yMiddle);
      const endPoint = getPoint(toPoint.x + curationShift, toPoint.y);
      createLine(root, fromPoint, parMidPoint, 'v', lineStyle, lineColor);
      createLine(root, parMidPoint, childMidPoint, 'h', lineStyle, lineColor);
      createLine(root, childMidPoint, endPoint, 'v', lineStyle, lineColor);
      linesMap.set(key, [
        {...fromPoint},
        {...parMidPoint},
        {...childMidPoint},
        {...endPoint},
        ]);
    } else {
      if (curationLine) {
        fromPoint.x -= 10;
        toPoint.x -= 10;
        if (Math.abs(fromPoint.x - toPoint.x) < 5 && toPoint.y === orgUnitArea.y ) {
          toPoint.x += (fromPoint.x - toPoint.x);
          createLine(root, fromPoint, toPoint, 'v', lineStyle, lineColor);
          linesMap.set(key, [
            {...fromPoint},
            {...toPoint},
          ]);
          return;
        }
      }

      const topAreaPoint = getPoint(fromPoint.x, orgUnitArea.y - stdNodeShift);
      const topLeftAreaPoint = getPoint(orgUnitArea.x - stdNodeShift * 2, orgUnitArea.y - stdNodeShift);
      const bottomLeftAreaPoint = getPoint(orgUnitArea.x - stdNodeShift * 2, toPoint.y - stdNodeShift);
      const bottomAreaPoint = getPoint(toPoint.x, toPoint.y - stdNodeShift);
      createLine(root, fromPoint, topAreaPoint, 'v', lineStyle, lineColor);
      createLine(root, topAreaPoint, topLeftAreaPoint, 'h', lineStyle, lineColor);
      createLine(root, topLeftAreaPoint, bottomLeftAreaPoint, 'v', lineStyle, lineColor);
      createLine(root, bottomLeftAreaPoint, bottomAreaPoint, 'h', lineStyle, lineColor);
      createLine(root, bottomAreaPoint, toPoint, 'v', lineStyle, lineColor);
      linesMap.set(key, [
        {...fromPoint},
        {...topAreaPoint},
        {...topLeftAreaPoint},
        {...bottomLeftAreaPoint},
        {...bottomAreaPoint},
        {...toPoint},
        ]);
    }
  }

  // TODO временное решение
  if (fromSide === BOTTOM && toSide === LEFT) {
    // // блок снизу
    // const fromPointX = fromPoint.x + 10;
    // if (fromPoint.y > toPoint.y) {
    //   if (!orgUnitArea) {
    //
    //   } else {
    //     const topAreaPoint = getPoint(fromPointX, orgUnitArea.y - curationNodeShift);
    //     if ()
    //   }
    //   // правее
    //
    //   // левее
    // }
    // //
  }

  if (fromSide === LEFT && toSide === LEFT) {
    // блок снизу и правее
    if (toPoint.x >= fromPoint.x ) {
      const parMidPoint = getPoint(fromPoint.x - stdNodeShift, fromPoint.y);
      const childMidPoint = getPoint(fromPoint.x - stdNodeShift, toPoint.y);
      createLine(root, fromPoint, parMidPoint, 'h');
      createLine(root, parMidPoint, childMidPoint, 'v');
      createLine(root, childMidPoint, toPoint, 'h');
      linesMap.set(key, [
        {...fromPoint},
        {...parMidPoint},
        {...childMidPoint},
        {...toPoint},
        ]);
    }
  }

  if (fromSide === RIGHT && toSide === LEFT) {
    if (Math.abs(fromPoint.y - toPoint.y) < 15) {
      toPoint.y += (fromPoint.y - toPoint.y);
      createLine(root, fromPoint, toPoint, 'h');
      linesMap.set(key, [
        {...fromPoint},
        {...toPoint},
        ]);
      return;
    }
    // блок снизу и правее
    if (toPoint.x >= fromPoint.x ) {
      const parMidPoint = getPoint(toPoint.x - stdNodeShift, fromPoint.y);
      const childMidPoint = getPoint(toPoint.x - stdNodeShift, toPoint.y);
      createLine(root, fromPoint, parMidPoint, 'h');
      createLine(root, parMidPoint, childMidPoint, 'v');
      createLine(root, childMidPoint, toPoint, 'h');
      linesMap.set(key, [
        {...fromPoint},
        {...parMidPoint},
        {...childMidPoint},
        {...toPoint},
        ]);
    }
  }
};

/**
 *
 * @param {Object} blockParams
 * @param {string} side
 * @return {*}
 */
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
 * Получение общей высоты схемы
 * @param {Map} areaMap
 * @return {number} height
 */
export const getFullHeight = (areaMap) => {
  let fullHeight = 0;
  areaMap.forEach((area) => {
    if (area.y + area.height > fullHeight) {
      fullHeight = area.y + area.height;
    }
  });
  return fullHeight;
};

export const getFullWidthHeight = (parent, blockParamsMap, structuralUnitsAreaMap, assignedStaffAreaMap, orgUnitsAreaMap) => {
  let fullWidth = 0;
  let fullHeight = 0;
  let parentBlockParams = blockParamsMap.get(parent.id);
  if (!parent.children.length) {
    fullHeight = parentBlockParams.bottom + IND_HEIGHT;
    fullWidth = screen.width;
  } else {
    parent.children.filter((child) => child.otype === POSITION).forEach((child) => {
      const childBlockParams = blockParamsMap.get(child.id);
      if (childBlockParams.right.x > fullWidth) {
        fullWidth = childBlockParams.right.x;
      }
    });

    // общая высота схемы определяется по нижней точке областей отрисовки (ОЕ, приписной штат, СП)
    if (structuralUnitsAreaMap.size) {
      fullHeight = getFullHeight(structuralUnitsAreaMap);
    } else if (assignedStaffAreaMap.size) {
      fullHeight = getFullHeight(assignedStaffAreaMap);
    } else if (orgUnitsAreaMap.size) {
      fullHeight = getFullHeight(orgUnitsAreaMap);
    } else {
      fullHeight = getFullHeight(blockParamsMap) + IND_HEIGHT;
    }
  }

  return {fullWidth, fullHeight}
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

export const setExtId = (children, parentId) => {
  children.forEach((child) => {
    const newId = `${parentId}/${child.id}`;
    setExtId(child.children, child.id);
    child.id = newId;
  })
};

/**
 *
 * @param children
 * @param blockParamsMap
 * @return {number}
 */
export const getHorizontalShiftFromChildren = (children, blockParamsMap) => {
  let currentHorizontalShift = 0;
  let maxChildrenHorizontalShift = 0;

  if (!children.length) {
    return 0;
  }

  children.forEach((child) => {
    const childBlockParams = blockParamsMap.get(child.id);

    if (!!childBlockParams) {
      const childrenHorizontalShift = getHorizontalShiftFromChildren(child.children, blockParamsMap);

      if (maxChildrenHorizontalShift < childrenHorizontalShift) {
        maxChildrenHorizontalShift = childrenHorizontalShift;
      }

      if (currentHorizontalShift < childBlockParams.right.x) {
        currentHorizontalShift = childBlockParams.right.x;
      }
    }
  });

  if (maxChildrenHorizontalShift > currentHorizontalShift) {
    currentHorizontalShift = maxChildrenHorizontalShift;
  }

  return currentHorizontalShift;
};

/**
 *
 * @param children
 * @param blockParamsMap
 * @return {*|number|number}
 */
export const getVerticalShiftFromChildren = (children, blockParamsMap) => {

  let currentVerticalShift = 0;
  let maxChildrenVerticalShift = 0;

  if (!children.length) {
    return 0;
  }

  children.forEach((child) => {
    const childBlockParams = blockParamsMap.get(child.id);

    if (!!childBlockParams) {
      const childrenVerticalShift = getVerticalShiftFromChildren(child.children, blockParamsMap);

      if (maxChildrenVerticalShift < childrenVerticalShift) {
        maxChildrenVerticalShift = childrenVerticalShift;
      }

      if (currentVerticalShift < childBlockParams.bottom.y) {
        currentVerticalShift = childBlockParams.bottom.y;
      }
    }
  });

  if (maxChildrenVerticalShift > currentVerticalShift) {
    currentVerticalShift = maxChildrenVerticalShift;
  }

  return currentVerticalShift;
};

/**
 *
 * @param children
 * @param blockParamsMap
 * @return {number}
 */
export const getLowestLeftFromChildren = (children, blockParamsMap) => {

  let currentLeft = 100000;
  let lowestChildrenVerticalShift = 1000000;

  if (!children.length) {
    return 100000;
  }

  children.forEach((child) => {
    const childBlockParams = blockParamsMap.get(child.id);

    if (!!childBlockParams) {
      const childrenLeft = getLowestLeftFromChildren(child.children, blockParamsMap);

      if (lowestChildrenVerticalShift > childrenLeft) {
        lowestChildrenVerticalShift = childrenLeft;
      }

      if (currentLeft > childBlockParams.left.x) {
        currentLeft = childBlockParams.left.x;
      }
    }
  });

  if (lowestChildrenVerticalShift < currentLeft) {
    currentLeft = lowestChildrenVerticalShift;
  }

  return currentLeft;
};

/**
 *
 * @param parent
 * @param blockParamsMap
 * @return {Map}
 */
export const getChildrenBlocksAreas = (parent, blockParamsMap) => {

  let childrenBlocksAreas = [];
  const childrenBlocksArea = {};

  const parentBlockParams = blockParamsMap.get(parent.id);
  if (!parent.children.length) {
    childrenBlocksArea.x = parentBlockParams.x;
    childrenBlocksArea.y = parentBlockParams.bottom.y + IND_HEIGHT + V_SPACE_BETWEEN_BLOCKS;
  } else {
    const deputy = parent.children.filter((child) => child.type === BLOCK_TYPES.deputy);
    const notDeputy = parent.children.filter((child) => child.type !== BLOCK_TYPES.deputy);

    let deputyBottomY = getVerticalShiftFromChildren(deputy, blockParamsMap);
    // let deputyRightX = getHorizontalShiftFromChildren(deputy, blockParamsMap);

    const firstNotDeputy = notDeputy[0] ? blockParamsMap.get(notDeputy[0].id) : undefined;
    let notDeputyBottomY = getVerticalShiftFromChildren(notDeputy, blockParamsMap);
    let notDeputyRightX = getHorizontalShiftFromChildren(notDeputy, blockParamsMap);
    let notDeputyLeftX = getLowestLeftFromChildren(notDeputy, blockParamsMap);

    childrenBlocksArea.id = parent.id;
    childrenBlocksArea.x = !notDeputyLeftX ? parentBlockParams.x : notDeputyLeftX;
    childrenBlocksArea.y = (!firstNotDeputy || !firstNotDeputy.y) ? deputyBottomY : firstNotDeputy.y;
    childrenBlocksArea.width = !notDeputyRightX ? 0 : notDeputyRightX - childrenBlocksArea.x;
    childrenBlocksArea.height = !notDeputyBottomY ? 0 : notDeputyBottomY - parentBlockParams.bottom.y;

    childrenBlocksAreas.push(childrenBlocksArea);
    parent.children
      .filter((child) => child.type !== BLOCK_TYPES.deputy && child.additionalInfo === GOVERNANCE)
      .forEach((child) => {

      const nestedChildrenBlockAreas = getChildrenBlocksAreas(child, blockParamsMap);
      if (nestedChildrenBlockAreas.length > 0) {
         childrenBlocksAreas = [...childrenBlocksAreas, ...nestedChildrenBlockAreas];
      }
    });
  }

  return childrenBlocksAreas;
};

/**
 *
 * @param parent
 * @param additionalInfo
 */
export const getChildrenByAdditionalInfo = (parent, additionalInfo) => {
  const govParent = {...parent};

  if (govParent.children.length > 0) {
    govParent.children = govParent.children.map((child) => getChildrenByAdditionalInfo(child, additionalInfo))
                                           .filter((child) => child.additionalInfo === additionalInfo);
  }

  return govParent;
};
