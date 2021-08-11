import './../public/style.css';
import {
  AREA_SHIFT,
  ASSIGNED_STAFF,
  BLOCK_LEVELS,
  BLOCK_TYPES,
  BOTTOM, GOVERNANCE,
  H_SPACE_BETWEEN_BLOCKS,
  LEFT,
  LEVEL_WIDTH_STEP,
  MIN_BLOCK_WIDTH,
  ORG_UNIT,
  POSITION,
  RIGHT,
  STRUCTURAL_UNIT,
  TOP,
  V_SPACE_BETWEEN_BLOCKS,
  MIN_BLOCK_HEIGHT,
  IND_HEIGHT,
  STAMP_WIDTH
} from './constants';
import {
  appendBlock,
  createLine,
  createUpsideDownConnector,
  getBlockParams,
  getChildrenBlocksAreas,
  getDataFromDOM,
  getHorizontalShiftFromChildren,
  getVerticalShiftFromChildren
} from './utils';
import {
  drawStamp,
  shiftStampRight
} from "./stamp";
import FileSaver from 'file-saver';
import 'canvas-toBlob';
import { translateHTMLToCanvas } from "./canvas";

// Инициализация отрисовки схемы
const maxInlineCount = 4;
export const drawScheme = () => {
  const blocksMap = new Map();
  const blockParamsMap = new Map();
  const linesMap = new Map();
  const governanceAreaMap = new Map();
  const assignedStaffAreaMap = new Map();
  const structuralUnitsAreaMap = new Map();

  const {ofmDataStr, ofmTitle, ofmStampStr, maxDepth, drawSeparators, saveToDom, toImage, toPdf, submitToImage} = getDataFromDOM();

  if (!ofmDataStr) {
    return;
  }

  const ofmData = JSON.parse(ofmDataStr.trim().replace(new RegExp('[\\n]+\\s\\s+', 'g'), ''));

  // if (deleteTechBlock) {
  //   const techBlockDiv = document.getElementById('techBlock');
  //   techBlockDiv.parentNode.removeChild(techBlockDiv);
  // }

  const parent = ofmData[0];
  const parentTop = 20;
  const parentBlock = appendBlock(30, 
                                     parentTop,
                                     MIN_BLOCK_WIDTH + LEVEL_WIDTH_STEP * maxDepth,
                                     MIN_BLOCK_HEIGHT,
                                     parent,
                                     blocksMap,
                                     blockParamsMap,
                                     {top: {y: 0}});

  // отрисовка штампа схемы
  let stampBlock;
  if (ofmStampStr) {
    const ofmStamp = JSON.parse(ofmStampStr.trim().replace(new RegExp('[\\n]+\\s\\s+', 'g'), ''));
    stampBlock = drawStamp(ofmStamp, STAMP_WIDTH);

    if (parentBlock.children[0].clientHeight + parentTop < stampBlock.bottom) {
      parentBlock.style.top = `${stampBlock.bottom - parentTop * 2}px`;
      blockParamsMap.set(parent.id, getBlockParams(parentBlock, parent, 0));
    }
  }
  let parentBlockParams = blockParamsMap.get(parent.id);

  // отрисовка блоков прямого подчинения
  drawChildBlocks(blocksMap, blockParamsMap, parent, parentBlockParams);

  // зоны отрисованных блоков прямого подчинения
  const childrenBlocksAreas = getChildrenBlocksAreas(parent, blockParamsMap);
  childrenBlocksAreas.forEach((blockArea) => {
    governanceAreaMap.set(blockArea.id, blockArea);
  });

  // отрисовка приписного штата
  let verticalShift = getVerticalShiftFromChildren(parent.children, blockParamsMap) + IND_HEIGHT + V_SPACE_BETWEEN_BLOCKS;
  //TODO добавить вывод приписного штата
  drawAssignedStaffBlocks(blocksMap, blockParamsMap, parent, parentBlockParams, governanceAreaMap, verticalShift);

  // отрисовка структурных подразделений
  verticalShift = getVerticalShiftFromChildren(parent.children, blockParamsMap) + IND_HEIGHT + V_SPACE_BETWEEN_BLOCKS;
  drawStructuralUnitBlocks(blocksMap, blockParamsMap, parent, parentBlockParams, governanceAreaMap, verticalShift);

  const fullWidth = getHorizontalShiftFromChildren(parent.children, blockParamsMap);
  const fullHeight = getVerticalShiftFromChildren(parent.children, blockParamsMap);

  blockParamsMap.set(parent.id, getBlockParams(parentBlock, parent, 0));
  parentBlockParams = blockParamsMap.get(parent.id);
  // сдвиг штампа в правый угол
  shiftStampRight(stampBlock, parent, parentBlockParams, fullWidth, blockParamsMap);

  drawConnectors(linesMap, blockParamsMap, governanceAreaMap, assignedStaffAreaMap, parent);

  // отрисовка разеделителей областей с приписным штатом/ структурными подразделениями
  //TODO переделать/ скорректировать получение зон
  if (drawSeparators) {
    drawAreaSeparator(assignedStaffAreaMap, fullWidth);
    drawAreaSeparator(structuralUnitsAreaMap, fullWidth);
  }

  // сохранение разметки
  if (saveToDom) {
    saveBlockParamsMapToDOM();
  }

  // формирование канвы для получения изображения
  if (toImage) {
    const canvas = translateHTMLToCanvas(document.body, ofmTitle, fullWidth, fullHeight, blocksMap, blockParamsMap, linesMap, stampBlock);
    if (!submitToImage) {
      canvas.toBlob((blob) => {
        FileSaver.saveAs(blob, `${ofmTitle}.png`);
      });
    } else {
      createSubmitToImageButton(() => canvas.toBlob((blob) => {
        let URLObj = window.URL || window.webkitURL;
        let a = document.createElement("a");
        a.href = URLObj.createObjectURL(blob);
        a.download = `${ofmTitle}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }));
    }

  }

  if (toPdf) {

  }

  if (submitToImage) {

  }
};

/**
 * Отрисовка блоков прямого подчинения (не приписной штат и не СП)
 * @param blocksMap
 * @param blockParamsMap
 * @param parent
 * @param parentBlockParams
 * @return Object
 */
const drawChildBlocks = (blocksMap, blockParamsMap, parent, parentBlockParams) => {

  const children = parent.children.filter((child) => child.type !== BLOCK_TYPES.deputy && child.additionalInfo !== STRUCTURAL_UNIT && child.additionalInfo !== ASSIGNED_STAFF);

  const childrenCount = children.length;
  if (childrenCount === 0 && !parent.children.filter((child) => child.type === BLOCK_TYPES.deputy)) {
    return [0, 0];
  }

  let maxHeight = MIN_BLOCK_HEIGHT;
  let newHeight = MIN_BLOCK_HEIGHT;

  let childrenDrawnInline = false;
  let childrenInlineCount = 0;
  let inlineMaxVerticalShift = 0;
  const inlineMaxCount = parent.type === BLOCK_TYPES.leadership ? 100 : maxInlineCount;

  const width = parentBlockParams.width - LEVEL_WIDTH_STEP;
  const height = MIN_BLOCK_HEIGHT;

  const initX = parentBlockParams.x + LEVEL_WIDTH_STEP / 2 + parentBlockParams.borderWidth;
  let x = initX;
  let y = parentBlockParams.bottom.y + V_SPACE_BETWEEN_BLOCKS + IND_HEIGHT;

  if (parent.otype === POSITION) {
    childrenDrawnInline = true;

    // Отрисовка заместителей без потомков
    const deputyVerticalShift = drawDeputy(blocksMap, blockParamsMap, parent, parentBlockParams);
    if (childrenCount > 1) {
      y += deputyVerticalShift;
    }
  }

  children.forEach((child, index) => {
    const childBlock = appendBlock(x, y, width, height, child, blocksMap, blockParamsMap, parentBlockParams);
    const childBlockParams = blockParamsMap.get(child.id);
    const childHeight = childBlock.children[0].clientHeight;

    // отрисовка потомков
    const shift = drawChildBlocks(blocksMap, blockParamsMap, child, childBlockParams);

    // определение максимальной высоты для выравнивания линии
    if (childHeight > maxHeight) {
      maxHeight = childHeight;
      newHeight = childHeight;
    }

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
      if (childrenInlineCount < inlineMaxCount && index !== children.length - 1) {
        if (!!shift[0] && child.children.length > 1) {
          x += shift[0] + H_SPACE_BETWEEN_BLOCKS + LEVEL_WIDTH_STEP / 2;
        } else {
          x = childBlockParams.right.x + H_SPACE_BETWEEN_BLOCKS;
        }
        // в связи с изменение алгоритма необходимо получить максимальный сдвиг,
        // учитывая всех потомков
        const deepestHorizontalShift = getHorizontalShiftFromChildren(child.children, blockParamsMap);

        if (deepestHorizontalShift > x) {
          x = deepestHorizontalShift + H_SPACE_BETWEEN_BLOCKS;
        }
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
  if (childrenDrawnInline && childrenCount > 1) {
    if (childrenCount < inlineMaxCount) {
      childrenInlineCount = childrenCount;
    } else {
      childrenInlineCount = inlineMaxCount;
    }

    const parentBlock = blocksMap.get(parent.id);
    const lastChildBlockParams = blockParamsMap.get(children[childrenInlineCount - 1].id);

    const childrenWidth = lastChildBlockParams.right.x - parentBlockParams.left.x;

    if (childrenCount === 1) {
      parentBlock.style.left = `${lastChildBlockParams.left.x - LEVEL_WIDTH_STEP}px`;
    } else {
      parentBlock.style.left = `${parentBlockParams.x + (childrenWidth) / 2 - parentBlockParams.width / 2}px`;
    }
    const newParentBlockParams = getBlockParams(parentBlock, parent, parentBlockParams.nearParentTop);
    blockParamsMap.set(parent.id, newParentBlockParams);

    parent.children
      .filter((child) => child.type === BLOCK_TYPES.deputy)
      .forEach((deputy) => {
        const deputyBlock = blocksMap.get(deputy.id);
        deputyBlock.style.left = `${newParentBlockParams.right.x + parentBlockParams.borderWidth + H_SPACE_BETWEEN_BLOCKS}px`;
        const deputyBlockParams = getBlockParams(deputyBlock, deputy, deputyBlock.nearParentTop);
        blockParamsMap.set(deputy.id, deputyBlockParams);
      });

    retHorizontalShift = childrenWidth;
  }

  if (maxHeight > height) {
    maxHeight += IND_HEIGHT;
  } else {
    maxHeight = height;
  }

  // пересчет высоты блоков и добавление в глобальный map
  let previousBottom = 0;
  children.filter((child) => child.otype === POSITION).forEach((child, key) => {
    const childBlock = blocksMap.get(child.id);

    const indicatorBlockTop = newHeight + parseInt(childBlock.children[0].style.borderWidth, 10) * 2;
    childBlock.style.height = maxHeight + 'px';
    childBlock.children[0].style.height = newHeight + 'px';
    if (!childrenDrawnInline && key > 0) {
      childBlock.style.top = `${previousBottom + V_SPACE_BETWEEN_BLOCKS + IND_HEIGHT}px`;
    }
    childBlock.children[1].style.top = indicatorBlockTop + 'px';
    blocksMap.set(child.id, childBlock);
    const newChildBlockParams  = getBlockParams(childBlock, child, parentBlockParams.top.y);
    blockParamsMap.set(child.id, newChildBlockParams);
    previousBottom = newChildBlockParams.bottom.y;

    // сдвиг заместителей без потомков
    let deputyBottom = shiftDeputyBlocksDown(child, newChildBlockParams, blocksMap, blockParamsMap);

    // сдвиг дочерних блоков
    if (child.children.filter((child) => child.type !== BLOCK_TYPES.deputy && child.additionalInfo === GOVERNANCE).length < 2) {
      deputyBottom = 0;
    }

    shiftChildBlocksDown(child, newChildBlockParams, blocksMap, blockParamsMap, deputyBottom, maxInlineCount);
  });

  return [retHorizontalShift, y];
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
  const positions = parent.children.filter((child) => child.type === BLOCK_TYPES.deputy);
  const positionsLength = positions.length;
  if (!positionsLength) {
    return 0;
  }

  const width = parentParams.width - LEVEL_WIDTH_STEP;
  const height = MIN_BLOCK_HEIGHT;

  const x = parentParams.right.x + parentParams.borderWidth + H_SPACE_BETWEEN_BLOCKS;
  let y = parentParams.y;

  positions.forEach((child) => {
    appendBlock(x, y, width, height, child, blocksMap, blockParamsMap, parentParams);

    y = blockParamsMap.get(child.id).bottom.y + IND_HEIGHT + V_SPACE_BETWEEN_BLOCKS;
  });

  const lastChildParams = blockParamsMap.get(positions[positionsLength - 1].id);
  // у блоков с заместителями заместителей нет индикаторов, поэтому берется разница между
  // нижними точками блоков
  const verticalDiff = lastChildParams.bottom.y - parentParams.bottom.y;

  return verticalDiff > 0 ? verticalDiff : 0;
};


const drawAssignedStaffBlocks = ( blocksMap,
                                  blockParamsMap,
                                  parent,
                                  parentBlockParams,
                                  governanceBlocksArea,
                                  initialVerticalShift ) => {


}

/**
 *
 * @param blocksMap
 * @param blockParamsMap
 * @param parent
 * @param parentBlockParams
 * @param governanceBlocksArea
 * @param initialVerticalShift
 * @return {number}
 */
const drawStructuralUnitBlocks = ( blocksMap,
                                   blockParamsMap,
                                   parent,
                                   parentBlockParams,
                                   governanceBlocksArea,
                                   initialVerticalShift ) => {

  const children = parent.children.filter((child) => child.type !== BLOCK_TYPES.deputy
                                                     && child.additionalInfo === GOVERNANCE);

  const childrenCount = children.length;
  if (childrenCount === 0) {
    return 0;
  }

  let childrenDrawnInline = false;
  let childrenInlineCount = 0;
  let inlineMaxVerticalShift = 0;

  const width = parentBlockParams.width - LEVEL_WIDTH_STEP;
  const height = MIN_BLOCK_HEIGHT;

  let verticalShiftFromChildren = 0;
  children.forEach((child) => {
    const childBlockParams = blockParamsMap.get(child.id);
  //   отрисовка потомков
    const deepestVerticalShift = drawStructuralUnitBlocks( blocksMap,
                                                           blockParamsMap,
                                                           child,
                                                           childBlockParams,
                                                           governanceBlocksArea,
                                                           initialVerticalShift );
    // определение максимальной высоты сдвига
    if (deepestVerticalShift > verticalShiftFromChildren) {
      verticalShiftFromChildren = deepestVerticalShift;
    }
  });

  const parentBlockArea = governanceBlocksArea.get(parent.id);
  const initX = parentBlockArea.x;
  const initY = initialVerticalShift;
  let x = initX;
  let y = verticalShiftFromChildren || initY;

  const structuralUnits = parent.children.filter((child) => child.additionalInfo === STRUCTURAL_UNIT);
  let structuralUnitsVerticalShift = 0;

  const inlineMaxCount = Math.floor(parentBlockArea.width / width);
  if (inlineMaxCount > 1 && structuralUnits.length > 1) {
    childrenDrawnInline = true;
  }

  structuralUnits.forEach((structuralUnit) => {
    const structuralUnitBlock = appendBlock(x, y, width, height, structuralUnit, blocksMap, blockParamsMap, parentBlockParams);
    const structuralUnitBlockParams = blockParamsMap.get(structuralUnit.id);
    const childHeight = parseInt(structuralUnitBlock.children[0].clientHeight);

    if (!childrenDrawnInline) {
      y = structuralUnitBlockParams.bottom.y + IND_HEIGHT + V_SPACE_BETWEEN_BLOCKS;
    } else {
      if (childHeight > structuralUnitsVerticalShift) {
        structuralUnitsVerticalShift = childHeight;
      }
      childrenInlineCount++;

      const horizontalShift = structuralUnitBlockParams.right.x;

      // в один ряд выводится не больше n блоков
      if (childrenInlineCount < inlineMaxCount) {
        x = horizontalShift + H_SPACE_BETWEEN_BLOCKS;
      } else {
        x = initX;
        y += structuralUnitsVerticalShift + IND_HEIGHT + V_SPACE_BETWEEN_BLOCKS;
        childrenInlineCount = 0;
        inlineMaxVerticalShift = 0;
      }
    }
  });
  //
  return y;
};

/**
 * Отрисовка соединительных линий
 * @param {Map} linesMap
 * @param {Map} blockParamsMap
 * @param {Map} orgUnitsAreaMap
 * @param {Map} assignedStaffAreaMap
 * @param {Object} parent
 */
const drawConnectors = (linesMap, blockParamsMap, orgUnitsAreaMap, assignedStaffAreaMap, parent) => {
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
  const orgUnitArea = orgUnitsAreaMap.get(parent.id);
  const assignedStaffArea = assignedStaffAreaMap.get(parent.id);
  if (!parent.children && (!parent.curation || parent.curation.length === 0)) {
    return;
  }
  const orgUnits = parent.children.filter((child) => child.otype === ORG_UNIT && child.additionalInfo === GOVERNANCE);
  orgUnits.forEach((orgUnit) => {
    const orgUnitBlockParams = blockParamsMap.get(orgUnit.id);
    let tempOrgUnit;
    if (parent.otype === POSITION && orgUnitBlockParams.y !== orgUnitArea.y) {
      tempOrgUnit = {...orgUnitArea};
    }
    createUpsideDownConnector(root, linesMap, tempOrgUnit, parentBlockParams, orgUnitBlockParams, fromSide, toSide);
    drawConnectors(linesMap, blockParamsMap, orgUnitsAreaMap, assignedStaffAreaMap, orgUnit);
  });

  // отрисовка линий к заместителям
  const positions = parent.children.filter((child) => child.type === BLOCK_TYPES.legate || child.type === BLOCK_TYPES.deputy );
  positions.forEach((child) => {
    const childBlockParams = blockParamsMap.get(child.id);

    let fromSize;
    let toSize;

    if (child.type === BLOCK_TYPES.legate) {
      fromSize = BOTTOM;
      toSize = TOP;
    } else {
      fromSize = RIGHT;
      toSize = LEFT;
    }

    let parentArea;
    if (orgUnitArea && childBlockParams && childBlockParams.y !== orgUnitArea.y) {
      parentArea = {...orgUnitArea};
    }

    createUpsideDownConnector(root, linesMap, parentArea, parentBlockParams, childBlockParams, fromSize, toSize);
    drawConnectors(linesMap, blockParamsMap, orgUnitsAreaMap, assignedStaffAreaMap, child);
  });

  // отрисовка линий к приписному штату
  const assignedStaff = parent.children.filter((child) => child.additionalInfo === ASSIGNED_STAFF);
  let tempOrgUnit;
  if (parent.otype === POSITION && orgUnitArea) {
    tempOrgUnit = {...orgUnitArea};
  }
  assignedStaff.forEach((assignedStaff) => {
    const assignedStaffBlockParams = blockParamsMap.get(assignedStaff.id);
    createUpsideDownConnector(root, linesMap, tempOrgUnit, parentBlockParams, assignedStaffBlockParams, fromSide, toSide);
    drawConnectors(linesMap, blockParamsMap, orgUnitsAreaMap, assignedStaffAreaMap, assignedStaff);
  });

  // отрисовка линий к структурным подразделениям
  const structuralUnits = parent.children.filter((child) => child.additionalInfo === STRUCTURAL_UNIT);
  if (parent.otype === POSITION) {
    if (assignedStaffArea && assignedStaffArea.width && (!orgUnitArea || !orgUnitArea.width)) {
      tempOrgUnit = {...assignedStaffArea};
    } else if (orgUnitArea) {
      tempOrgUnit = {...orgUnitArea};
    }
  }
  structuralUnits.forEach((structuralUnit) => {
    const structuralUnitParams = blockParamsMap.get(structuralUnit.id);
    createUpsideDownConnector(root, linesMap, tempOrgUnit, parentBlockParams, structuralUnitParams, fromSide, toSide);
    drawConnectors(linesMap, blockParamsMap, orgUnitsAreaMap, assignedStaffAreaMap, structuralUnits);
  });

  // отрисовка линий курирования
  if (parent.curation && parent.curation.length > 0) {
    parent.curation.forEach((curatedId) => {
      const curatedBlockParams = blockParamsMap.get(curatedId);
      if (curatedBlockParams) {
        let curatedUnitArea;
        if (curatedBlockParams.y !== orgUnitArea.y) {
          curatedUnitArea= {...orgUnitArea};
        }
        createUpsideDownConnector(root, linesMap, curatedUnitArea, parentBlockParams, curatedBlockParams, BOTTOM, TOP, true);
      }
    });
  }
};

/**
 * Сдвиг всех дочерних блоков вниз
 * @param {Object} parent
 * @param {Object} parentBlockParams
 * @param {Map} blocksMap
 * @param {Map} blockParamsMap
 * @param {number} deputyBottom
 * @param {number} childInlineCount
 */
const shiftChildBlocksDown = (parent, parentBlockParams, blocksMap, blockParamsMap, deputyBottom, childInlineCount) => {
  const verticalSpaceBetweenBlocks = V_SPACE_BETWEEN_BLOCKS + IND_HEIGHT;
  // TODO возможно лишняя переменная
  let previousBottom = 0;
  let previousMaxBottom = 0;
  let deepestVerticalShift = 0;
  let previousDeepestVerticalShift = 0;
  let takeVerticalShift;
  let childKey = 0;
  let previousLineVerticalShift = 0;

  parent.children
    .filter((child) => child.type !== BLOCK_TYPES.deputy && child.additionalInfo === GOVERNANCE)
    .forEach((child, key) => {
      const childBlock = blocksMap.get(child.id);
      takeVerticalShift = key >= childInlineCount;
      let newTopY;
      if (childKey >= childInlineCount) {
        childKey = 0;
        previousDeepestVerticalShift = deepestVerticalShift;
        if (previousLineVerticalShift === deepestVerticalShift) {
          previousDeepestVerticalShift = previousMaxBottom;
        }
        previousLineVerticalShift = deepestVerticalShift;
        previousMaxBottom = 0;
      }
      if (key === 0 || parent.type === BLOCK_TYPES.legate) {
        (deputyBottom > parentBlockParams.bottom.y)
          ? newTopY = deputyBottom + verticalSpaceBetweenBlocks
          : newTopY = parentBlockParams.bottom.y + verticalSpaceBetweenBlocks;

        if (takeVerticalShift) {
          newTopY = previousDeepestVerticalShift + verticalSpaceBetweenBlocks;
        }
        childBlock.style.top = `${newTopY}px`;
      } else {
        if (previousBottom >= deepestVerticalShift - 45) {
          newTopY = previousBottom + verticalSpaceBetweenBlocks;
        } else {
          newTopY = deepestVerticalShift + verticalSpaceBetweenBlocks;
        }
        childBlock.style.top = `${newTopY}px`;
      }

      const newChildBlockParams = getBlockParams(childBlock, child, parentBlockParams.top.y);
      previousMaxBottom = Math.max(previousMaxBottom, newChildBlockParams.bottom.y);
      previousBottom = newChildBlockParams.bottom.y;
      blockParamsMap.set(child.id, newChildBlockParams);

      // сдвиг заместителей без потомков
      const deepDeputyBottom = shiftDeputyBlocksDown(child, newChildBlockParams, blocksMap, blockParamsMap);
      // сдвиг подлежащих блоков
      shiftChildBlocksDown(child, newChildBlockParams, blocksMap, blockParamsMap, deepDeputyBottom, childInlineCount);

      const childrenVerticalShift = getVerticalShiftFromChildren(child.children, blockParamsMap);
      deepestVerticalShift = Math.max(deepestVerticalShift, childrenVerticalShift);
      // if (deepestVerticalShift < childrenVerticalShift) {
      //   deepestVerticalShift = childrenVerticalShift;
      // }
      if (deepestVerticalShift === 0) {
        deepestVerticalShift = previousBottom + verticalSpaceBetweenBlocks;
      }
      childKey += 1;
  });
};

/**
 *
 * @param {Object} parent
 * @param {Object} parentBlockParams
 * @param {Map} blocksMap
 * @param {Map} blockParamsMap
 * @return {number}
 */
const shiftDeputyBlocksDown = (parent, parentBlockParams, blocksMap, blockParamsMap) => {
  let previousBottom = 0;
  parent.children
    .filter((child) => child.type === BLOCK_TYPES.deputy)
    .forEach((child, key) => {
      const childBlock = blocksMap.get(child.id);
      if (!!childBlock) {
        if (key === 0) {
          childBlock.style.top = `${parentBlockParams.top.y}px`;
        } else {
          childBlock.style.top = `${previousBottom + V_SPACE_BETWEEN_BLOCKS}px`;
        }

        const newChildBlockParams = getBlockParams(childBlock, child, parentBlockParams.top.y);
        previousBottom = newChildBlockParams.bottom.y;
        blockParamsMap.set(child.id, newChildBlockParams);
      }
    });
  return previousBottom;
};

/**
 * Сдвиг всех дочерних блоков вниз
 * @param {Object} parent
 * @param {Map} blocksMap
 * @param {Map} blockParamsMap
 * @param {number} shift
 */
const shiftOrgUnitsDown = (parent, blocksMap, blockParamsMap, shift) => {
  const orgUnits = parent.children.filter((child) => child.otype === ORG_UNIT && child.additionalInfo === GOVERNANCE);

  orgUnits.forEach((child) => {
    const childBlock = blocksMap.get(child.id);
    const childBlockParams = blockParamsMap.get(child.id);
    childBlock.style.top = `${childBlockParams.top.y + shift}px`;
    blockParamsMap.set(child.id, getBlockParams(childBlock, child, childBlockParams.top.y + shift));
    shiftOrgUnitsDown(child, blocksMap, blockParamsMap, shift);
  });
};

/**
 *
 * @param {Map} blocksMap
 * @param {Map} blockParamsMap
 * @param {string} additionalInfo
 * @param {number} verticalShift
 */
const shiftOtherUnitsDown = (blocksMap, blockParamsMap, additionalInfo, verticalShift) => {
  blockParamsMap.forEach((blockParams, key) => {
    if (blockParams.additionalInfo === additionalInfo && blockParams.isRootChild === false) {
      const block = blocksMap.get(key);
      const top = parseInt(block.style.top);
      let additionalShift = 0;
      if (blockParams.nearParentTop) {
        additionalShift = Math.abs(top - blockParams.nearParentTop);
      }
      block.style.top = `${verticalShift + additionalShift}px`;
      blockParamsMap.set(key, getBlockParams(block, {additionalInfo: additionalInfo}, verticalShift + blockParams.nearParentTop));
    }
  });
};

/**
 * Разделитель для зон блоков
 * @param {Map} areaMap
 * @param {number} fullWidth
 */
const drawAreaSeparator = (areaMap, fullWidth) => {
  if (areaMap.size > 0) {
    let areaTop;
    const shift = AREA_SHIFT + 20;
    areaMap.forEach((area) => {
      if (!areaTop) {
        areaTop = area.y;
      }
    });
    if (areaTop) {
      createLine(root, {x: 0, y: areaTop - shift}, {x: fullWidth, y: areaTop - shift}, 'h', 'dashed');
    }
  }
};

const saveBlockParamsMapToDOM = () => {

};

/**
 *
 * @param submitFunction
 */
const createSubmitToImageButton = (submitFunction) => {
  const submitToImageButton = document.createElement(`button`);
  submitToImageButton.setAttribute(`class`, `submit_to_image_button`);
  submitToImageButton.onclick = submitFunction;
  submitToImageButton.title = `Выгрузить изображение`;

  const span = document.createElement(`span`);
  const submit_to_image_button_img = document.createElement(`img`);
  submit_to_image_button_img.setAttribute(`src`, `../public/download.svg`);
  submit_to_image_button_img.setAttribute(`class`, `submit_to_image_button_img`);
  span.appendChild(submit_to_image_button_img);

  submitToImageButton.appendChild(span);

  document.body.appendChild(submitToImageButton);
};

drawScheme();
