import './../public/style.css';
import {
  ASSIGNED_STAFF,
  BLOCK_LEVELS,
  BOTTOM, GOVERNANCE, H_BLOCK_PADDING,
  H_SPACE_BETWEEN_BLOCKS, LEFT,
  LEVEL_WIDTH_STEP, MIN_BLOCK_WIDTH, ORG_UNIT, POSITION, RIGHT, STRUCTURAL_UNIT, TOP,
  V_SPACE_BETWEEN_BLOCKS,
} from './constants';
import {MIN_BLOCK_HEIGHT} from './constants';
import {IND_HEIGHT} from './constants';
import {
  appendBlock,
  createUpsideDownConnector,
  getBlockParams,
} from './utils';
import {struct} from './data';

const blocksMap = new Map();
const blockParamsMap = new Map();
const linesMap = new Map();
const orgUnitAreasMap = new Map();
const assignedStaffAreasMap = new Map();

// Инициализация отрисовки схемы
export const drawScheme = (ofmDataStr, maxDepth) => {
  const root = document.getElementById('root');

  let parent;
  if (ofmDataStr) {
    const ofmData = JSON.parse(ofmDataStr.replace(new RegExp('[\\n]+\\s\\s+', 'g'), ''));
    parent = ofmData[0];
  } else {
    parent = struct[0];
  }

  const parentWidth = MIN_BLOCK_WIDTH + LEVEL_WIDTH_STEP * maxDepth;
  const parentBlock = appendBlock(0, 20, parentWidth, MIN_BLOCK_HEIGHT, parent, blocksMap, blockParamsMap);

  // отрисовка первого уровня
  let parentBlockParams = blockParamsMap.get(parent.id);
  drawFirstRow(blocksMap, blockParamsMap, parent, parentBlockParams);

  // отрисовка вертикально-расположенных блоков
  drawColumns(blocksMap, blockParamsMap, parent);

  // общая ширина схемы определяется по правой точке последнего блока
  const childBlockParams = blockParamsMap.get(parent.children[parent.children.length - 1].id);
  const fullWidth = childBlockParams.right.x;

  // итоговое выравнивание корневого элемента по общей ширине схемы
  parentBlock.style.left = `${fullWidth / 2 - parentWidth / 2}px`;
  blockParamsMap.set(parent.id, getBlockParams(parentBlock, parent));
  parentBlockParams = blockParamsMap.get(parent.id);

  // отрисовка соединяющих линий
  parent.children.forEach((child) => {
    const childBlockParams = blockParamsMap.get(child.id);
    createUpsideDownConnector(root, linesMap, undefined, parentBlockParams, childBlockParams, BOTTOM, TOP);
    drawConnectors(linesMap, blockParamsMap, orgUnitAreasMap, assignedStaffAreasMap, child);
  });

  // сохранение разметки
  saveBlockParamsMapToDOM();

  // формирование канвы для получения изображения
  translateHTMLToCanvas(root.innerHTML);
};

/**
 * Отрисовка блоков с единицами управления
 * @param {Map} blocksMap
 * @param {Map} blockParamsMap
 * @param {Object} parent
 * @param {Object} parentParams
 */
const drawFirstRow = (blocksMap, blockParamsMap, parent, parentParams) => {
  let maxHeight = MIN_BLOCK_HEIGHT;
  let newHeight = MIN_BLOCK_HEIGHT;

  const width = parentParams.width - LEVEL_WIDTH_STEP;
  const height = MIN_BLOCK_HEIGHT;
  let x = H_SPACE_BETWEEN_BLOCKS;
  const y = parentParams.bottom.y + V_SPACE_BETWEEN_BLOCKS + IND_HEIGHT;

  parent.children.forEach((child) => {
    const childBlock = appendBlock(x, y, width, height, child, blocksMap, blockParamsMap);
    const childHeight = parseInt(childBlock.children[0].clientHeight);
    const borderWidth = parseInt(childBlock.children[0].style.borderWidth);

    if (childHeight > maxHeight) {
      maxHeight = childHeight;
      newHeight = childHeight;
    }

    x += width + H_BLOCK_PADDING + borderWidth * 2 + H_SPACE_BETWEEN_BLOCKS;
  });

  if (maxHeight > height) {
    maxHeight += IND_HEIGHT;
  } else {
    maxHeight = height;
  }

  // пересчет высоты блоков и добавление в глобальный map
  parent.children.forEach((child) => {
    const childBlock = blocksMap.get(child.id);
    const indicatorBlockTop = newHeight + parseInt(childBlock.children[0].style.borderWidth, 10) * 2;
    childBlock.style.height = maxHeight + 'px';
    childBlock.children[0].style.height = newHeight + 'px';
    childBlock.children[1].style.top = indicatorBlockTop + 'px';
    blocksMap.set(child.id, childBlock);
    blockParamsMap.set(child.id, getBlockParams(childBlock, child));
  });
};

/**
 * Отрисовка блоков схемы, которые выводятся вертикально
 * @param {Map} blocksMap
 * @param {Map} blockParamsMap
 * @param {Object} parent
 */
const drawColumns = (blocksMap, blockParamsMap, parent) => {
  // TODO необходимо нормально обозвать переменные
  let nextShift = 0;
  let shiftsCount = 0;
  let maxAssignedStaffVerticalShift = 0;
  let maxStructuralUnitsVerticalShift = 0;
  parent.children.forEach((child) => {
    // сдвиг блока вправо
    if (nextShift) {
      const childBlock = blocksMap.get(child.id);
      const childBlockParams = blockParamsMap.get(child.id);
      childBlock.style.left = `${childBlockParams.x + nextShift - childBlockParams.width * shiftsCount}px`;
      blockParamsMap.set(child.id, getBlockParams(childBlock, child));
    }
    let childBlockParams = blockParamsMap.get(child.id);

    // отрисовка блоков орг. единиц
    const orgUnitArea = {};
    const shift = drawOrgUnits(blocksMap, blockParamsMap, orgUnitArea, child, childBlockParams);
    orgUnitAreasMap.set(child.id, orgUnitArea);

    // отрисовка блоков с приписным штатом
    const orgUnitAreaBottom = orgUnitArea.y + orgUnitArea.height;
    if (maxAssignedStaffVerticalShift < orgUnitAreaBottom) {
      maxAssignedStaffVerticalShift = orgUnitAreaBottom;
    }
    const assignedStaffArea = {};
    drawOtherUnits(blocksMap, blockParamsMap, orgUnitArea, assignedStaffArea, child, childBlockParams, ASSIGNED_STAFF);
    assignedStaffAreasMap.set(child.id, assignedStaffArea);

    // отрисовка блоков со структурными подразделениями
    let prevAreaBottom;
    if (assignedStaffArea.height) {
      prevAreaBottom = assignedStaffArea.y + assignedStaffArea.height;
    } else {
      prevAreaBottom = orgUnitAreaBottom;
    }
    if (maxStructuralUnitsVerticalShift < prevAreaBottom) {
      maxStructuralUnitsVerticalShift = prevAreaBottom;
    }
    const prevArea = assignedStaffArea.width ? assignedStaffArea : orgUnitArea;
    drawOtherUnits(blocksMap, blockParamsMap, prevArea, {}, child, childBlockParams, STRUCTURAL_UNIT);

    // если есть заместители у ШД (S -> S), то отрисовываются их блоки
    let lastRightPoint;
    if (child.otype === POSITION) {
      childBlockParams = blockParamsMap.get(child.id);
      const {deputyVerticalShift, deputyRightPoint} = drawDeputy(blocksMap, blockParamsMap, child, childBlockParams);
      lastRightPoint = deputyRightPoint;
      // если заместители по высоте превышают допустимый лимит, то требуется
      // сдвинуть нижележащие блоки орг. единиц
      if (deputyVerticalShift) {
        shiftOrgUnitsDown(child, blocksMap, blockParamsMap, deputyVerticalShift);
      }
    }
    if (shift[0]) {
      nextShift += shift[0];
      shiftsCount++;
    }
  });

  // сдвиг блоков приписного штата вниз
  shiftOtherUnitsDown(blocksMap, blockParamsMap, ASSIGNED_STAFF, maxAssignedStaffVerticalShift);
  assignedStaffAreasMap.forEach((area) => {
    area.y = maxAssignedStaffVerticalShift;
  });

  // сдвиг блоко структурных подразделений вниз
  shiftOtherUnitsDown(blocksMap, blockParamsMap, STRUCTURAL_UNIT, maxStructuralUnitsVerticalShift);
};

/**
 * Отрисовка заместителей для ШД(s->s)
 * @param {Map} blocksMap
 * @param {Map} blockParamsMap
 * @param {Object} parent
 * @param {Object} parentParams
 * @return {Object}
 */
const drawDeputy = (blocksMap, blockParamsMap, parent, parentParams) => {
  const positions = parent.children.filter((child) => child.otype === POSITION);
  const positionsLength = positions.length;
  if (!positionsLength) {
    return {}; // TODO
  }

  const width = parentParams.width - LEVEL_WIDTH_STEP;
  const height = MIN_BLOCK_HEIGHT;

  const x = parentParams.right.x + parentParams.borderWidth + H_SPACE_BETWEEN_BLOCKS;
  let y = parentParams.y + V_SPACE_BETWEEN_BLOCKS;

  positions.forEach((child) => {
    appendBlock(x, y, width, height, child, blocksMap, blockParamsMap);

    y = blockParamsMap.get(child.id).bottom.y + IND_HEIGHT + V_SPACE_BETWEEN_BLOCKS;
  });

  const lastChildParams = blockParamsMap.get(positions[positionsLength - 1].id);
  // у блоков с заместителями заместителей нет индикаторов, поэтому берется разница между
  // нижними точками блоков
  const verticalDiff = lastChildParams.bottom.y - parentParams.bottom.y;
  const deputyVerticalShift = verticalDiff > 0 ? verticalDiff : 0;

  // крайняя правая точка после отрисовки заместителей
  const deputyRightPoint = lastChildParams.right.x + lastChildParams.borderWidth;

  return {deputyVerticalShift, deputyRightPoint};
};

/**
 * Отрисовка блоков с орг.единицами ОФМ
 * @param {Map} blocksMap
 * @param {Map} blockParamsMap
 * @param {Object} orgUnitArea
 * @param {Object} parent
 * @param {Object} parentParams
 * @return {Array} verticalShift
 */
const drawOrgUnits = (blocksMap, blockParamsMap, orgUnitArea, parent, parentParams,) => {
  const orgUnits = parent.children.filter((child) => child.otype === ORG_UNIT && (!child.additionalInfo || child.additionalInfo === GOVERNANCE));
  const childrenCount = orgUnits.length;
  if (childrenCount === 0) {
    orgUnitArea.x = parentParams.x;
    orgUnitArea.y = parentParams.bottom.y + V_SPACE_BETWEEN_BLOCKS + IND_HEIGHT;
    orgUnitArea.width = 0;
    orgUnitArea.height = 0;
    return [0, 0];
  }

  let childrenDrawnInline = false;
  let childrenInlineCount = 0;
  let inlineMaxVerticalShift = 0;
  const maxInlineCount = 3;

  const width = parentParams.width - LEVEL_WIDTH_STEP;
  const height = MIN_BLOCK_HEIGHT;

  // TODO подумать насчет padding 5
  const initX = parentParams.x + LEVEL_WIDTH_STEP / 2 + parentParams.borderWidth + 5;
  let x = initX;
  let y = parentParams.bottom.y + V_SPACE_BETWEEN_BLOCKS + IND_HEIGHT;

  if ((parent.otype === POSITION) && (parent.level) === BLOCK_LEVELS.second && childrenCount > 1) {
    childrenDrawnInline = true;
  }

  orgUnits.forEach((child) => {
    // const tempX = x - BORDER_WIDTH[blockLevel] * 2;
    appendBlock(x, y, width, height, child, blocksMap, blockParamsMap);

    // отрисовка потомков
    const shift = drawOrgUnits(blocksMap, blockParamsMap, orgUnitArea, child, blockParamsMap.get(child.id));

    const childBlockParams = blockParamsMap.get(child.id);
    if (!childrenDrawnInline) {
      if (!shift[1]) {
        y = childBlockParams.bottom.y + IND_HEIGHT + V_SPACE_BETWEEN_BLOCKS;
      } else {
        y = shift[1];
      }
    } else {
      // если у ШД 1/2 уровня есть несколько потомков, то их необходимо выводить в несколько стобцов
      // при этом требуется сдвинуть блок с самой ШД, а также следующие блоки с ШД
      if (shift[1] > inlineMaxVerticalShift) {
        inlineMaxVerticalShift = shift[1];
      }
      childrenInlineCount++;
      // в один ряд выводится не больше n блоков
      if (childrenInlineCount < maxInlineCount) {
        x = childBlockParams.right.x + H_SPACE_BETWEEN_BLOCKS;
      } else {
        x = initX;
        y = inlineMaxVerticalShift;
        childrenInlineCount = 0;
        inlineMaxVerticalShift = 0;
      }
    }
  });

  // если дочерние блоки необходимо вывести в одну строку, то необходимо сместить родительский блок
  // и все следующие
  let retHorizontalShift = 0;
  if (childrenDrawnInline) {
    if (childrenCount < maxInlineCount) {
      childrenInlineCount = childrenCount;
    } else {
      childrenInlineCount = maxInlineCount;
    }
    const childrenWidth = blockParamsMap.get(orgUnits[0].id).width * childrenInlineCount + H_SPACE_BETWEEN_BLOCKS * (childrenInlineCount);
    const parentBlock = blocksMap.get(parent.id);
    // TODO тоже дичь
    parentBlock.style.left = `${parentParams.x + (childrenWidth - H_SPACE_BETWEEN_BLOCKS) / 2 - parentParams.width / 2 + LEVEL_WIDTH_STEP / 2}px`;
    blockParamsMap.set(parent.id, getBlockParams(parentBlock, parent));
    retHorizontalShift = childrenWidth;
  }

  // область под ШД
  // TODO продумать условие для определения именно ВТОРОГО уровня для ШД
  if (parent.otype === POSITION && childrenCount) {
    if (!childrenDrawnInline) {
      const leftChildBlock = blockParamsMap.get(orgUnits[0].id);
      orgUnitArea.x = leftChildBlock.x;
      orgUnitArea.y = leftChildBlock.y;
      orgUnitArea.width = leftChildBlock.width;
      orgUnitArea.height = y - orgUnitArea.y;
    } else {
      const leftChildBlock = blockParamsMap.get(orgUnits[0].id);
      const rightChildBlock = blockParamsMap.get(orgUnits[childrenInlineCount - 1].id);
      orgUnitArea.x = leftChildBlock.x;
      orgUnitArea.y = leftChildBlock.y;
      orgUnitArea.width = rightChildBlock.right.x - orgUnitArea.x;
      orgUnitArea.height = y - orgUnitArea.y;
    }
  }

  // TODO возвращать не массив, а объект?
  return [retHorizontalShift, y];
};

/**
 * Отрисовка блоков с приписным штатом
 * @param {Map} blocksMap
 * @param {Map} blockParamsMap
 * @param {Object} prevArea
 * @param {Object} unitsArea
 * @param {Object} parent
 * @param {Object} parentParams
 * @param {String} additionalInfo
 * @return {Array}
 */
const drawOtherUnits = (blocksMap, blockParamsMap, prevArea, unitsArea, parent, parentParams, additionalInfo) => {
  const units = parent.children.filter((child) => child.otype === ORG_UNIT && child.additionalInfo === additionalInfo);
  const childrenCount = units.length;
  if (childrenCount === 0) {
    return [0, 0];
  }
  const width = parentParams.width - LEVEL_WIDTH_STEP;
  const height = MIN_BLOCK_HEIGHT;

  const initX = parentParams.x + LEVEL_WIDTH_STEP / 2 + parentParams.borderWidth + 5;
  const x = initX;
  let y;
  if (!parent.additionalInfo || parent.additionalInfo === GOVERNANCE) {
    y = prevArea.y + prevArea.height + V_SPACE_BETWEEN_BLOCKS;
  } else {
    y = parentParams.bottom.y + V_SPACE_BETWEEN_BLOCKS + IND_HEIGHT;
  }

  units.forEach((child) => {
    appendBlock(x, y, width, height, child, blocksMap, blockParamsMap);

    // отрисовка потомков
    const shift = drawOtherUnits(blocksMap, blockParamsMap, prevArea, unitsArea, child, blockParamsMap.get(child.id), additionalInfo);
    const childBlockParams = blockParamsMap.get(child.id);
    if (!shift[1]) {
      y = childBlockParams.bottom.y + IND_HEIGHT + V_SPACE_BETWEEN_BLOCKS;
    } else {
      y = shift[1];
    }
  });

  if ((!parent.additionalInfo || parent.additionalInfo === GOVERNANCE) && childrenCount) {
    const leftChildBlock = blockParamsMap.get(units[0].id);
    unitsArea.x = leftChildBlock.x;
    unitsArea.y = leftChildBlock.y;
    unitsArea.width = leftChildBlock.width;
    unitsArea.height = y - (prevArea.y + prevArea.height);
  }

  return [0, y];
};

/**
 * Отрисовка соединительных линий
 * @param {Map} linesMap
 * @param {Map} blockParamsMap
 * @param {Map} orgUnitAreasMap
 * @param {Map} assignedStaffAreasMap
 * @param {Object} parent
 */
const drawConnectors = (linesMap, blockParamsMap, orgUnitAreasMap, assignedStaffAreasMap, parent) => {
  const parentBlockParams = blockParamsMap.get(parent.id);
  let fromSide;
  let toSide;

  if (parent.otype === POSITION) {
    fromSide = BOTTOM;
    toSide = TOP;
  } else {
    fromSide = LEFT;
    toSide = LEFT;
  }
  if (parent.level === BLOCK_LEVELS.dependent) {
    parentBlockParams.left.y += 10;
  }
  const orgUnitArea = orgUnitAreasMap.get(parent.id);
  const assignedStaffArea = assignedStaffAreasMap.get(parent.id);
  if (!parent.children) {
    return;
  }
  const orgUnits = parent.children.filter((child) => child.otype === ORG_UNIT && child.additionalInfo === GOVERNANCE);
  orgUnits.forEach((orgUnit, i) => {
    const orgUnitBlockParams = blockParamsMap.get(orgUnit.id);
    let tempOrgUnit;
    if (parent.otype === POSITION && orgUnits.length > 1 && i > 2) {
      tempOrgUnit = {...orgUnitArea};
    }
    createUpsideDownConnector(root, linesMap, tempOrgUnit, parentBlockParams, orgUnitBlockParams, fromSide, toSide);
    drawConnectors(linesMap, blockParamsMap, orgUnitAreasMap, assignedStaffAreasMap, orgUnit);
  });

  const positions = parent.children.filter((child) => child.otype === POSITION);
  positions.forEach((child) => {
    const childBlockParams = blockParamsMap.get(child.id);
    createUpsideDownConnector(root, linesMap, undefined, parentBlockParams, childBlockParams, RIGHT, LEFT);
  });

  const assignedStaff = parent.children.filter((child) => child.additionalInfo === ASSIGNED_STAFF);
  let tempOrgUnit;
  if (parent.otype === POSITION && orgUnitArea) {
    tempOrgUnit = {...orgUnitArea};
  }
  assignedStaff.forEach((assignedStaff) => {
    const assignedStaffBlockParams = blockParamsMap.get(assignedStaff.id);
    createUpsideDownConnector(root, linesMap, tempOrgUnit, parentBlockParams, assignedStaffBlockParams, fromSide, toSide);
    drawConnectors(linesMap, blockParamsMap, orgUnitAreasMap, assignedStaffAreasMap, assignedStaff);
  });

  const structuralUnits = parent.children.filter((child) => child.additionalInfo === STRUCTURAL_UNIT);
  if (parent.otype === POSITION) {
    if (assignedStaffArea.width && !orgUnitArea.width) {
      tempOrgUnit = {...assignedStaffArea};
    } else if (orgUnitArea) {
      tempOrgUnit = {...orgUnitArea};
    }
  }
  structuralUnits.forEach((structuralUnit) => {
    const structuralUnitParams = blockParamsMap.get(structuralUnit.id);
    createUpsideDownConnector(root, linesMap, tempOrgUnit, parentBlockParams, structuralUnitParams, fromSide, toSide);
    drawConnectors(linesMap, blockParamsMap, orgUnitAreasMap, assignedStaffAreasMap, structuralUnits);
  });
};

/**
 * Сдвиг всех дочерних блоков вниз
 * @param {Object} parent
 * @param {Map} blocksMap
 * @param {Map} blockParamsMap
 * @param {number} shift
 */
const shiftOrgUnitsDown = (parent, blocksMap, blockParamsMap, shift) => {
  const orgUnits = parent.children.filter((child) => child.otype === ORG_UNIT);

  orgUnits.forEach((child) => {
    const childBlock = blocksMap.get(child.id);
    const childBlockParams = blockParamsMap.get(child.id);
    childBlock.style.top = `${childBlockParams.top.y + shift}px`;
    blockParamsMap.set(child.id, getBlockParams(childBlock, child));
    shiftOrgUnitsDown(child, blocksMap, blockParamsMap, shift);
  });
};

const shiftOtherUnitsDown = (blocksMap, blockParamsMap, additionalInfo, verticalShift) => {
  blockParamsMap.forEach((blockParams, key) => {
    if (blockParams.additionalInfo === additionalInfo) {
      const block = blocksMap.get(key);
      const top = parseInt(block.style.top);
      if (top < verticalShift) {
        block.style.top = `${top + (verticalShift - top)}px`;
        blockParamsMap.set(key, getBlockParams(block, {additionalInfo: additionalInfo}));
      }
    }
  });
};

const saveBlockParamsMapToDOM = () => {

};

const translateHTMLToCanvas = () => {

};

drawScheme('', 6 );

// html2canvas(document.getElementById('parent')).then((canvas) => {
//   // console.log(canvas.toDataURL('image/jpeg'));
//   const blob = canvas.toBlob(function(blob) {
//     console.log(blob);
//   }, 'image/jpeg', 0.95);
//   // FileSaver.saveAs(blob, 'ofm');
// }
// );

// html2canvas(document.getElementById('root'))
//     .then(function(canvas) {
//       document.body.appendChild(canvas);
//     }
//     );

// htmlToImage.toBlob(document.getElementById('root'))
//     .then(function(blob) {
//       FileSaver.saveAs(blob, 'ofm');
//       // console.log(blob);
//     })
//     .catch(function(error) {
//       console.error('oops, something went wrong!', error);
//     });

// const FormPress = document.createElement('form');
// FormPress.action = 'SAPEVENT:inner_html';
// FormPress.method = 'post';
// FormPress.id = 'FormPress';
//
// const myInput = document.createElement('input');
// myInput.type = 'hidden';
// myInput.name = 'myInput';
// myInput.id = 'myInput';
// myInput.value = 'myInput';
// myInput.readonly = 'readonly';
//
// FormPress.appendChild(myInput);
// document.body.appendChild(FormPress);
// FormPress.submit();
