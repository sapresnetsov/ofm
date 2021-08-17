import './../public/style.css';
import {
  AREA_SHIFT,
  BLOCK_LEVELS,
  BLOCK_TYPES,
  BOTTOM,
  H_SPACE_BETWEEN_BLOCKS,
  LEFT,
  LEVEL_WIDTH_STEP,
  MIN_BLOCK_WIDTH,
  RIGHT,
  TOP,
  V_SPACE_BETWEEN_BLOCKS,
  MIN_BLOCK_HEIGHT,
  IND_HEIGHT,
  STAMP_WIDTH,
  OTYPES,
  ADDITIONAL_INFO,
} from './model/constants';
import {
  appendBlock, createCurationConnector,
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

  const {ofmDataStr, ofmTitle, ofmStampStr, maxDepth, drawSeparators, saveToDom, toImage, toPdf, submitToImage, assignedStaffLabel, structuralUnitsLabel} = getDataFromDOM();

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
  drawGovernanceBlocks(blocksMap, blockParamsMap, parent, parentBlockParams);

  // зоны отрисованных блоков прямого подчинения
  const childrenBlocksAreas = getChildrenBlocksAreas(parent, blockParamsMap);
  childrenBlocksAreas.forEach((blockArea) => {
    governanceAreaMap.set(blockArea.id, blockArea);
  });

  // отрисовка приписного штата
  let verticalShift = getVerticalShiftFromChildren(parent.children, blockParamsMap) + IND_HEIGHT + V_SPACE_BETWEEN_BLOCKS * 2;
  const assignedStaffAreaTop = verticalShift;
  drawAssignedStaffBlocks(blocksMap, blockParamsMap, parent, parentBlockParams, governanceAreaMap, verticalShift);

  // отрисовка структурных подразделений
  verticalShift = getVerticalShiftFromChildren(parent.children, blockParamsMap) + IND_HEIGHT + V_SPACE_BETWEEN_BLOCKS * 2;
  const structuralUnitsAreaTop = verticalShift;
  drawStructuralUnitBlocks(blocksMap, blockParamsMap, parent, parentBlockParams, governanceAreaMap, verticalShift);

  const fullWidth = getHorizontalShiftFromChildren(parent.children, blockParamsMap);
  const fullHeight = getVerticalShiftFromChildren(parent.children, blockParamsMap) + IND_HEIGHT + V_SPACE_BETWEEN_BLOCKS * 2;

  blockParamsMap.set(parent.id, getBlockParams(parentBlock, parent, 0));
  parentBlockParams = blockParamsMap.get(parent.id);
  // сдвиг штампа в правый угол
  shiftStampRight(stampBlock, parent, parentBlockParams, fullWidth, blockParamsMap);

  drawConnectors(linesMap, blockParamsMap, governanceAreaMap, assignedStaffAreaMap, parent);

  // отрисовка разеделителей областей с приписным штатом/ структурными подразделениями
  let assignedStaffAreaTopSeparator = 0;
  let structuralUnitsAreaTopSeparator = 0;
  if (drawSeparators) {
    assignedStaffAreaTopSeparator = assignedStaffAreaTop - 40;
    structuralUnitsAreaTopSeparator = structuralUnitsAreaTop - 40;
    drawAreaSeparator(assignedStaffAreaMap, fullWidth, assignedStaffAreaTopSeparator, assignedStaffLabel);
    drawAreaSeparator(structuralUnitsAreaMap, fullWidth, structuralUnitsAreaTopSeparator, structuralUnitsLabel);
  }

  // сохранение разметки
  if (saveToDom) {
    saveBlockParamsMapToDOM();
  }

  // формирование канвы для получения изображения
  if (toImage) {
    const canvas = translateHTMLToCanvas( document.body,
                                          ofmTitle,
                                          fullWidth,
                                          fullHeight,
                                          blocksMap,
                                          blockParamsMap,
                                          linesMap,
                                          stampBlock,
                                          assignedStaffAreaTopSeparator,
                                          structuralUnitsAreaTopSeparator );
    if (!submitToImage) {
      canvas.toBlob((blob) => {
        FileSaver.saveAs(blob, `${ofmTitle}.png`);
      });
    } else {
      createSubmitToImageButton(() => canvas.toBlob((blob) => {
        const fileName = `${ofmTitle}.png`;
        if(window.navigator.msSaveOrOpenBlob) {
          window.navigator.msSaveOrOpenBlob(blob, fileName);
        } else {
          let URLObj = window.URL || window.webkitURL;
          let a = document.createElement("a");
          a.href = URLObj.createObjectURL(blob);
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
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
 * @param {Map} blocksMap
 * @param {Map} blockParamsMap
 * @param {OFMData} parent
 * @param {BlockParams} parentBlockParams
 * @return Object
 */
const drawGovernanceBlocks = ( blocksMap,
                               blockParamsMap,
                               parent,
                               parentBlockParams) => {

  const children = parent.children.filter((child) => child.type !== BLOCK_TYPES.deputy
                                                              && child.additionalInfo === ADDITIONAL_INFO.GOVERNANCE);

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

  if (parent.otype === OTYPES.POSITION) {
    childrenDrawnInline = true;

    // Отрисовка заместителей без потомков
    const deputyVerticalShift = drawDeputy(blocksMap, blockParamsMap, parent, parentBlockParams);
    if (childrenCount > 1 || parent.type ===BLOCK_TYPES.leadership && childrenCount > 0) {
      y += deputyVerticalShift;
    }
  }

  children.forEach((child, index) => {
    const childBlock = appendBlock(x, y, width, height, child, blocksMap, blockParamsMap, parentBlockParams);
    const childBlockParams = blockParamsMap.get(child.id);
    const childHeight = childBlock.children[0].clientHeight;

    // отрисовка потомков
    const shift = drawGovernanceBlocks(blocksMap, blockParamsMap, child, childBlockParams);

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
  if (childrenDrawnInline && childrenCount > 1 || parent.type ===BLOCK_TYPES.leadership && childrenCount > 0) {
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
  children.filter((child) => child.otype === OTYPES.POSITION).forEach((child, key) => {
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
    if (child.children.filter((child) => child.type !== BLOCK_TYPES.deputy && child.additionalInfo === ADDITIONAL_INFO.GOVERNANCE).length < 2) {
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
const drawAssignedStaffBlocks = ( blocksMap,
                                  blockParamsMap,
                                  parent,
                                  parentBlockParams,
                                  governanceBlocksArea,
                                  initialVerticalShift ) => {

  const children = parent.children.filter((child) => child.type !== BLOCK_TYPES.deputy
                                                     && child.additionalInfo === ADDITIONAL_INFO.GOVERNANCE);

  let childrenDrawnInline = false;
  let childrenInlineCount = 0;

  const width = parentBlockParams.width - LEVEL_WIDTH_STEP;
  const height = MIN_BLOCK_HEIGHT;

  let verticalShiftFromChildren = 0;
  children.forEach((child) => {
    const childBlockParams = blockParamsMap.get(child.id);
    //  получение максимального вертикального сдвига
    const deepestVerticalShift = drawAssignedStaffBlocks( blocksMap,
                                                          blockParamsMap,
                                                          child,
                                                          childBlockParams,
                                                          governanceBlocksArea,
                                                          initialVerticalShift );
    // определение максимальной высоты сдвига
    verticalShiftFromChildren = Math.max(verticalShiftFromChildren, deepestVerticalShift);
  });

  const parentBlockArea = governanceBlocksArea.get(parent.id);
  const initX = (parentBlockArea ? parentBlockArea.x : parentBlockParams.x) + LEVEL_WIDTH_STEP / 2;
  const initY = initialVerticalShift;
  let x = initX;
  let y = verticalShiftFromChildren || initY;
  if (parentBlockArea) {
    y = Math.max(y, parentBlockArea.y + parentBlockArea.height);
  }

  const assignedStaffUnits = parent.children.filter((child) => child.additionalInfo === ADDITIONAL_INFO.ASSIGNED_STAFF);
  if (assignedStaffUnits.length === 0) {
    return 0;
  }
  let assignedStaffUnitsVerticalShift = 0;

  const inlineMaxCount = parentBlockArea ? Math.floor(parentBlockArea.width / width) : 1;
  if (inlineMaxCount > 1 && assignedStaffUnits.length > 1) {
    childrenDrawnInline = true;
  }

  let maxVerticalShiftFromChildren = 0;
  assignedStaffUnits.forEach((assignedStaffUnit) => {
    const assignedStaffBlock = appendBlock(x, y, width, height, assignedStaffUnit, blocksMap, blockParamsMap, parentBlockParams);
    const assignedStaffBlockParams = blockParamsMap.get(assignedStaffUnit.id);
    const childHeight = assignedStaffBlock.children[0].clientHeight;
    let verticalShiftFromChildren = 0;

    if (!childrenDrawnInline) {
      y = assignedStaffBlockParams.bottom.y + IND_HEIGHT + V_SPACE_BETWEEN_BLOCKS;
    } else {
      assignedStaffUnitsVerticalShift = Math.max(assignedStaffUnitsVerticalShift, childHeight);
      childrenInlineCount++;

      const horizontalShift = assignedStaffBlockParams.right.x;

      // в один ряд выводится не больше n блоков
      if (childrenInlineCount < inlineMaxCount) {
        x = horizontalShift + H_SPACE_BETWEEN_BLOCKS;
      } else {
        x = initX;
        y += assignedStaffUnitsVerticalShift + IND_HEIGHT + V_SPACE_BETWEEN_BLOCKS;
        childrenInlineCount = 0;
      }
    }
    verticalShiftFromChildren = drawAssignedStaffBlocks( blocksMap,
                                                         blockParamsMap,
                                                         assignedStaffUnit,
                                                         assignedStaffBlockParams,
                                                         governanceBlocksArea,
                                            assignedStaffBlockParams.bottom.y + IND_HEIGHT + V_SPACE_BETWEEN_BLOCKS );

    maxVerticalShiftFromChildren = Math.max(maxVerticalShiftFromChildren, verticalShiftFromChildren);
    if (maxVerticalShiftFromChildren && (!childrenDrawnInline || childrenInlineCount === 0)) {
      y = maxVerticalShiftFromChildren;
      maxVerticalShiftFromChildren = 0;
    }
  });

  return y;
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
                                                     && child.additionalInfo === ADDITIONAL_INFO.GOVERNANCE);

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
    //  получение максимального вертикального сдвига
    const deepestVerticalShift = drawStructuralUnitBlocks( blocksMap,
                                                           blockParamsMap,
                                                           child,
                                                           childBlockParams,
                                                           governanceBlocksArea,
                                                           initialVerticalShift );
    // определение максимальной высоты сдвига
    verticalShiftFromChildren = Math.max(verticalShiftFromChildren, deepestVerticalShift);
  });

  const parentBlockArea = governanceBlocksArea.get(parent.id);
  const initX = parentBlockArea.x;
  const initY = initialVerticalShift;
  let x = initX;
  let y = verticalShiftFromChildren || initY;

  const structuralUnits = parent.children.filter((child) => child.additionalInfo === ADDITIONAL_INFO.STRUCTURAL_UNIT);
  let structuralUnitsVerticalShift = 0;

  const inlineMaxCount = Math.floor(parentBlockArea.width / width);
  if (inlineMaxCount > 1 && structuralUnits.length > 1) {
    childrenDrawnInline = true;
  }

  structuralUnits.forEach((structuralUnit) => {
    const structuralUnitBlock = appendBlock(x, y, width, height, structuralUnit, blocksMap, blockParamsMap, parentBlockParams);
    const structuralUnitBlockParams = blockParamsMap.get(structuralUnit.id);
    const childHeight = structuralUnitBlock.children[0].clientHeight;

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

  if (parent.otype === OTYPES.POSITION) {
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
  const orgUnits = parent.children.filter((child) => child.otype === OTYPES.ORG_UNIT && child.additionalInfo === ADDITIONAL_INFO.GOVERNANCE);
  orgUnits.forEach((orgUnit) => {
    const orgUnitBlockParams = blockParamsMap.get(orgUnit.id);
    let tempOrgUnit;
    if (parent.otype === OTYPES.POSITION && orgUnitBlockParams.y !== orgUnitArea.y) {
      tempOrgUnit = {...orgUnitArea};
    }
    createUpsideDownConnector(root, blockParamsMap, linesMap, tempOrgUnit, parentBlockParams, orgUnitBlockParams, fromSide, toSide);
    drawConnectors(linesMap, blockParamsMap, orgUnitsAreaMap, assignedStaffAreaMap, orgUnit);
  });

  // отрисовка линий к заместителям
  const positions = parent.children.filter((child) => child.type === BLOCK_TYPES.legate || child.type === BLOCK_TYPES.deputy );
  positions.forEach((child) => {
    const childBlockParams = blockParamsMap.get(child.id);

    let fromSide;
    let toSide;

    if (child.type === BLOCK_TYPES.legate) {
      fromSide = BOTTOM;
      toSide = TOP;
    } else {
      fromSide = RIGHT;
      toSide = LEFT;
    }

    let parentArea;
    if (orgUnitArea && childBlockParams && childBlockParams.y !== orgUnitArea.y) {
      parentArea = {...orgUnitArea};
    }

    createUpsideDownConnector(root, blockParamsMap, linesMap, parentArea, parentBlockParams, childBlockParams, fromSide, toSide);
    drawConnectors(linesMap, blockParamsMap, orgUnitsAreaMap, assignedStaffAreaMap, child);
  });

  // отрисовка линий к приписному штату
  const assignedStaff = parent.children.filter((child) => child.additionalInfo === ADDITIONAL_INFO.ASSIGNED_STAFF);
  let tempOrgUnit;
  if (parent.otype === OTYPES.POSITION && orgUnitArea) {
    tempOrgUnit = {...orgUnitArea};
  }
  assignedStaff.forEach((assignedStaff) => {
    const assignedStaffBlockParams = blockParamsMap.get(assignedStaff.id);
    createUpsideDownConnector(root, blockParamsMap, linesMap, tempOrgUnit, parentBlockParams, assignedStaffBlockParams, fromSide, toSide);
    drawConnectors(linesMap, blockParamsMap, orgUnitsAreaMap, assignedStaffAreaMap, assignedStaff);
  });

  // отрисовка линий к структурным подразделениям
  const structuralUnits = parent.children.filter((child) => child.additionalInfo === OTYPES.STRUCTURAL_UNIT);
  if (parent.otype === OTYPES.POSITION) {
    if (assignedStaffArea && assignedStaffArea.width && (!orgUnitArea || !orgUnitArea.width)) {
      tempOrgUnit = {...assignedStaffArea};
    } else if (orgUnitArea) {
      tempOrgUnit = {...orgUnitArea};
    }
  }
  structuralUnits.forEach((structuralUnit) => {
    const structuralUnitParams = blockParamsMap.get(structuralUnit.id);
    createUpsideDownConnector(root, blockParamsMap, linesMap, tempOrgUnit, parentBlockParams, structuralUnitParams, fromSide, toSide);
    drawConnectors(linesMap, blockParamsMap, orgUnitsAreaMap, assignedStaffAreaMap, structuralUnits);
  });

  // отрисовка линий курирования
  if (parent.curation && parent.curation.length > 0) {
    parent.curation.forEach((curatedId) => {
      const curatedBlockParams = blockParamsMap.get(curatedId);
      if (curatedBlockParams) {
        let curatedUnitArea;
        if (orgUnitArea && curatedBlockParams.y !== orgUnitArea.y) {
          curatedUnitArea= {...orgUnitArea};
        }
        // createCurationConnector(root, blockParamsMap, linesMap, curatedUnitArea, parentBlockParams, curatedBlockParams, BOTTOM, TOP, true);
      }
    });
  }
};

/**
 * Сдвиг всех дочерних блоков вниз
 * @param {OFMData} parent
 * @param {Object} parentBlockParams
 * @param {Map} blocksMap
 * @param {Map} blockParamsMap
 * @param {number} deputyBottom
 * @param {number} childInlineCount
 */
const shiftChildBlocksDown = ( parent,
                               parentBlockParams,
                               blocksMap,
                               blockParamsMap,
                               deputyBottom,
                               childInlineCount) => {
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
    .filter((child) => child.type !== BLOCK_TYPES.deputy && child.additionalInfo === ADDITIONAL_INFO.GOVERNANCE)
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
      if (deepestVerticalShift === 0) {
        deepestVerticalShift = previousBottom + verticalSpaceBetweenBlocks;
      }
      childKey += 1;
  });
};

/**
 *
 * @param {OFMData} parent
 * @param {BlockParams} parentBlockParams
 * @param {Map} blocksMap
 * @param {Map} blockParamsMap
 * @return {number}
 */
const shiftDeputyBlocksDown = ( parent,
                                parentBlockParams,
                                blocksMap,
                                blockParamsMap) => {
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
const shiftOrgUnitsDown = ( parent,
                            blocksMap,
                            blockParamsMap,
                            shift) => {
  const orgUnits = parent.children.filter((child) => child.otype === OTYPES.ORG_UNIT && child.additionalInfo === ADDITIONAL_INFO.GOVERNANCE);

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
const shiftOtherUnitsDown = ( blocksMap,
                              blockParamsMap,
                              additionalInfo,
                              verticalShift) => {
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
 * @param {number} areaTop
 * @param {String} areaName
 */
const drawAreaSeparator = (areaMap, fullWidth, areaTop, areaName) => {
  if (areaTop) {
    const areaNameBlock = document.createElement(`div`);
    areaNameBlock.style.left = `50px`;
    areaNameBlock.style.top = `${areaTop}px`;
    areaNameBlock.style.width = `250px`;

    const areaNameP = document.createElement(`p`);
    areaNameP.setAttribute(`class`, `area_name`)
    areaNameP.textContent = areaName;
    areaNameBlock.appendChild(areaNameP);
    root.appendChild(areaNameBlock);
    createLine(root, {x: 0, y: areaTop}, {x: fullWidth, y: areaTop}, 'h', 'dashed');
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
