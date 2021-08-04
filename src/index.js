import './../public/style.css';
import {
  AREA_SHIFT,
  ASSIGNED_STAFF,
  BLOCK_LEVELS,
  BLOCK_TYPES,
  BORDER_WIDTH,
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

// Инициализация отрисовки схемы
const maxInlineCount = 4;
export const drawScheme = () => {
  const blocksMap = new Map();
  const blockParamsMap = new Map();
  const linesMap = new Map();
  const governanceAreaMap = new Map();
  const assignedStaffAreaMap = new Map();
  const structuralUnitsAreaMap = new Map();

  const {ofmDataStr, ofmTitle, ofmStampStr, maxDepth, drawSeparators, saveToDom, toImage, toPdf, deleteTechBlock} = getDataFromDOM();

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
  //TODO добавить вывод приписного штата

  // отрисовка структурных подразделений
  const verticalShift = getVerticalShiftFromChildren(parent.children, blockParamsMap) + IND_HEIGHT + V_SPACE_BETWEEN_BLOCKS;
  drawStructuralUnitBlocks(blocksMap, blockParamsMap, parent, parentBlockParams, governanceAreaMap, verticalShift);

  const fullWidth = getHorizontalShiftFromChildren(parent.children, blockParamsMap);
  const fullHeight = getVerticalShiftFromChildren(parent.children, blockParamsMap);

  blockParamsMap.set(parent.id, getBlockParams(parentBlock, parent, 0));
  parentBlockParams = blockParamsMap.get(parent.id);
  // сдвиг штампа вправо
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
    translateHTMLToCanvasToImage(document.body, ofmTitle, fullWidth, fullHeight, blocksMap, blockParamsMap, linesMap, stampBlock);
  }

  if (toPdf) {

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
  orgUnits.forEach((orgUnit, i) => {
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
  let previousBottom = 0;
  let deepestVerticalShift = 0;
  let previousDeepestVerticalShift = 0;
  let takeVerticalShift;
  let childKey = 0;

  parent.children
    .filter((child) => child.type !== BLOCK_TYPES.deputy && child.additionalInfo === GOVERNANCE)
    .forEach((child, key) => {
      const childBlock = blocksMap.get(child.id);
      takeVerticalShift = key >= childInlineCount;
      let newTopY = 0;
      if (childKey >= childInlineCount) {
        childKey = 0;
        previousDeepestVerticalShift = deepestVerticalShift;
      }
      if (key === 0 || parent.type === BLOCK_TYPES.legate) {
        (deputyBottom > parentBlockParams.bottom.y)
          ? newTopY = deputyBottom + V_SPACE_BETWEEN_BLOCKS + IND_HEIGHT
          : newTopY = parentBlockParams.bottom.y + V_SPACE_BETWEEN_BLOCKS + IND_HEIGHT;

        if (takeVerticalShift) {
          newTopY = previousDeepestVerticalShift + V_SPACE_BETWEEN_BLOCKS + IND_HEIGHT;
        }
        childBlock.style.top = `${newTopY}px`;
      } else {
        newTopY = previousBottom + V_SPACE_BETWEEN_BLOCKS + IND_HEIGHT;
        childBlock.style.top = `${newTopY}px`;
      }

      const newChildBlockParams = getBlockParams(childBlock, child, parentBlockParams.top.y);
      previousBottom = newChildBlockParams.bottom.y;
      blockParamsMap.set(child.id, newChildBlockParams);

      // сдвиг заместителей без потомков
      const deepDeputyBottom = shiftDeputyBlocksDown(child, newChildBlockParams, blocksMap, blockParamsMap);
      // сдвиг подлежащих блоков
      shiftChildBlocksDown(child, newChildBlockParams, blocksMap, blockParamsMap, deepDeputyBottom, childInlineCount);

      const childrenVerticalShift = getVerticalShiftFromChildren(child.children, blockParamsMap);
      if (deepestVerticalShift < childrenVerticalShift) {
        deepestVerticalShift = childrenVerticalShift;
      }
      if (deepestVerticalShift === 0) {
        deepestVerticalShift = previousBottom + V_SPACE_BETWEEN_BLOCKS + IND_HEIGHT;
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
 * Перевод HTML на канву
 * @param {HTMLElement} root
 * @param {string} ofmTitle
 * @param {number} width
 * @param {number} height
 * @param {Map} blocksMap
 * @param {Map} blockParamsMap
 * @param {Map} linesMap
 * @param {HTMLElement} stampBlock
 */
const translateHTMLToCanvasToImage = ( root,
                                       ofmTitle,
                                       width,
                                       height,
                                       blocksMap,
                                       blockParamsMap,
                                       linesMap,
                                       stampBlock ) => {

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

  canvas.toBlob((blob) => {
    FileSaver.saveAs(blob, `${ofmTitle}.png`);
  });
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
  const titleTextObject = {...title, height: !functions.length ? height - IND_HEIGHT - title.height: title.height }
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
  const maxWidth = width;
  const textX = left + Math.trunc(maxWidth / 2);
  let line = '';
  let textY = top + Math.trunc(textObject.paddingTop * 2 + textObject.height / 2);

  ctx.fillStyle = 'black';
  ctx.textAlign = textObject.textAlign;
  ctx.textBaseline = 'middle';
  ctx.font = textObject.font;
  words.forEach((word) => {
    const tmpLine = line + word + ' ';
    const tmpWidth = ctx.measureText(tmpLine).width;
    if (tmpWidth < maxWidth) {
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
 * @param textObject
 * @return {*}
 */
const stampDrawTitle = (ctx, left, top, textObject) => {
  ctx.fillStyle = 'black';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = textObject.font;
  ctx.fillText(textObject.text, left, top);

  return top + textObject.height + textObject.paddingBottom;
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
  const titleStyle = window.getComputedStyle(stampTitle);
  const titleObject = {
    font: `${titleStyle.fontSize} ${titleStyle.fontFamily}`,
    text: stampTitle.textContent,
    height: parseInt(titleStyle.height, 10),
    paddingTop: parseInt(titleStyle.paddingTop, 10),
    paddingBottom: parseInt(titleStyle.paddingBottom, 10),
    textAlign: 'left'
  };
  textY = stampDrawTitle( ctx,
                          textX,
                          textY,
                          titleObject );
  stampRows.forEach((stampRow, index) => {
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
  });
};



drawScheme();
