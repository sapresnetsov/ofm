import './../public/style.css';
import {
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
  ADDITIONAL_INFO, LINE_TYPE,
} from './model/constants';
import {
  appendBlock,
  createLine,
  createUpsideDownConnector,
  getBlockParams,
  getDataFromDOM, getGovernanceAreas,
  getHorizontalShiftFromChildren, getPoint, getPointOfSide,
  getVerticalShiftFromChildren
} from './utils';
import {
  drawStamp,
  shiftStampRight
} from "./stamp";
import FileSaver from 'file-saver';
import 'canvas-toBlob';
import { translateHTMLToCanvas } from "./canvas";
import { find } from "lodash";

// Инициализация отрисовки схемы
const maxInlineCount = 4;
export const drawScheme = () => {
  const blocksMap = new Map();
  const blockParamsMap = new Map();
  const linesMap = new Map();
  const curationLinesMap = new Map();
  const governanceAreasMap = new Map();
  const assignedStaffAreasMap = new Map();
  const structuralUnitsAreasMap = new Map();
  const connectorsPathsMap = new Map();

  const {ofmDataStr, ofmTitle, ofmStampStr, maxDepth, drawSeparators, saveToDom, toImage, toPdf, submitToImage, assignedStaffLabel, structuralUnitsLabel} = getDataFromDOM();

  if (!ofmDataStr) {
    return;
  }

  const ofmData = JSON.parse(ofmDataStr.trim().replace(new RegExp('[\\n]+\\s\\s+', 'g'), ''));

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
  const childrenAreasArray = getGovernanceAreas(parent, blockParamsMap);
  childrenAreasArray.forEach((blockArea) => {
    governanceAreasMap.set(blockArea.id, blockArea);
  });

  // отрисовка приписного штата
  let verticalShift = getVerticalShiftFromChildren(parent.children, blockParamsMap) + IND_HEIGHT + V_SPACE_BETWEEN_BLOCKS * 2;
  const assignedStaffAreaBottom = drawOtherUnitsBlocks( blocksMap,
                                                        blockParamsMap,
                                                        parent,
                                                        parentBlockParams,
                                                        governanceAreasMap,
                                                        verticalShift,
                                                        ADDITIONAL_INFO.ASSIGNED_STAFF );
  let assignedStaffAreaTop = verticalShift !== assignedStaffAreaBottom ? verticalShift : 0;

  // отрисовка структурных подразделений
  verticalShift = getVerticalShiftFromChildren(parent.children, blockParamsMap) + IND_HEIGHT + V_SPACE_BETWEEN_BLOCKS * 2;
  const structuralUnitsAreaBottom = drawOtherUnitsBlocks( blocksMap,
                                                          blockParamsMap,
                                                          parent,
                                                          parentBlockParams,
                                                          governanceAreasMap,
                                                          verticalShift,
                                                          ADDITIONAL_INFO.STRUCTURAL_UNIT);
  let structuralUnitsAreaTop = verticalShift !== structuralUnitsAreaBottom ? verticalShift : 0;

  // получение итоговых параметров корневого блока
  blockParamsMap.set(parent.id, getBlockParams(parentBlock, parent, 0));
  parentBlockParams = blockParamsMap.get(parent.id);

  let fullWidth = getHorizontalShiftFromChildren(parent.children, blockParamsMap) || parentBlockParams.x + parentBlockParams.width;
  let fullHeight = getVerticalShiftFromChildren(parent.children, blockParamsMap);
  if (!fullHeight) {
    fullHeight = parentBlockParams.bottom.y + IND_HEIGHT;
  } else {
    fullHeight += IND_HEIGHT + V_SPACE_BETWEEN_BLOCKS * 2;
  }

  // сдвиг штампа в правый угол
  if (ofmStampStr) {
    fullWidth = shiftStampRight(stampBlock, parent, parentBlockParams, fullWidth, blockParamsMap);
  }

  // получения дорожек для отрисовки линий
  const connectorsPathArray = getConnectorsPaths(parent, blockParamsMap, governanceAreasMap);
  connectorsPathArray.forEach((connectorsPath) => {
    const connectorsPrevPaths = connectorsPathsMap.get(connectorsPath.blockId);
    if (!connectorsPrevPaths) {
      connectorsPathsMap.set(connectorsPath.blockId, [connectorsPath]);
    } else {
      connectorsPathsMap.set(connectorsPath.blockId, [...connectorsPrevPaths, connectorsPath]);
    }
  });

  // отрисовка соединительных линий
  drawConnectors(linesMap, blockParamsMap, governanceAreasMap, assignedStaffAreasMap, parent);
  // отрисовка линий курирования
  drawCurationConnectors(parent, parent, blockParamsMap, connectorsPathsMap, curationLinesMap);

  // отрисовка разеделителей областей с приписным штатом/ структурными подразделениями
  let assignedStaffAreaTopSeparator = 0;
  let structuralUnitsAreaTopSeparator = 0;
  if (drawSeparators) {
    assignedStaffAreaTopSeparator = assignedStaffAreaTop - 40;
    structuralUnitsAreaTopSeparator = structuralUnitsAreaTop - 40;
    drawAreaSeparator(assignedStaffAreasMap, fullWidth, assignedStaffAreaTopSeparator, assignedStaffLabel);
    drawAreaSeparator(structuralUnitsAreasMap, fullWidth, structuralUnitsAreaTopSeparator, structuralUnitsLabel);
  }

  // сохранение разметки
  if (saveToDom) {
    saveBlockParamsMapToDOM();
  }

  // формирование изображения схемы
  if (toImage) {
    // формирование канвы для получения изображения
    const canvas = translateHTMLToCanvas( document.body,
                                          ofmTitle,
                                          fullWidth,
                                          fullHeight,
                                          blocksMap,
                                          blockParamsMap,
                                          linesMap,
                                          curationLinesMap,
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
    if (childrenCount > 1
        || parent.type === BLOCK_TYPES.leadership && childrenCount > 0
        || parent.type === BLOCK_TYPES.legate && childrenCount === 0) {
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
  //TODO пересчитанную высоту править здесь
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

    y = blockParamsMap.get(child.id).bottom.y + V_SPACE_BETWEEN_BLOCKS;
  });
  y -= V_SPACE_BETWEEN_BLOCKS;
  return Math.max(y - parentParams.bottom.y, 0);
};

/**
 *
 * @param blocksMap
 * @param blockParamsMap
 * @param parent
 * @param parentBlockParams
 * @param governanceBlocksArea
 * @param initialVerticalShift
 * @param additionalInfo
 * @return {number}
 */
const drawOtherUnitsBlocks = ( blocksMap,
                               blockParamsMap,
                               parent,
                               parentBlockParams,
                               governanceBlocksArea,
                               initialVerticalShift,
                               additionalInfo ) => {

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
    const deepestVerticalShift = drawOtherUnitsBlocks( blocksMap,
                                                       blockParamsMap,
                                                       child,
                                                       childBlockParams,
                                                       governanceBlocksArea,
                                                       initialVerticalShift,
                                                       additionalInfo );
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

  const otherUnits = parent.children.filter((child) => child.additionalInfo === additionalInfo);
  if (!otherUnits.length) {
    return y;
  }
  let otherUnitsVerticalShift = 0;

  const inlineMaxCount = parentBlockArea ? Math.floor(parentBlockArea.width / width) : 1;
  if (inlineMaxCount > 1 && otherUnits.length > 1) {
    childrenDrawnInline = true;
  }

  let maxVerticalShiftFromChildren = 0;
  otherUnits.forEach((otherUnit) => {
    const otherUnitBlock = appendBlock(x, y, width, height, otherUnit, blocksMap, blockParamsMap, parentBlockParams);
    const otherUnitBlockParams = blockParamsMap.get(otherUnit.id);
    const childHeight = otherUnitBlock.children[0].clientHeight;
    let verticalShiftFromChildren;

    if (!childrenDrawnInline) {
      y = otherUnitBlockParams.bottom.y + IND_HEIGHT + V_SPACE_BETWEEN_BLOCKS;
    } else {
      otherUnitsVerticalShift = Math.max(otherUnitsVerticalShift, childHeight);
      childrenInlineCount++;

      const horizontalShift = otherUnitBlockParams.right.x;

      // в один ряд выводится не больше n блоков
      if (childrenInlineCount < inlineMaxCount) {
        x = horizontalShift + H_SPACE_BETWEEN_BLOCKS;
      } else {
        x = initX;
        y += otherUnitsVerticalShift + IND_HEIGHT + V_SPACE_BETWEEN_BLOCKS;
        childrenInlineCount = 0;
      }
    }
    verticalShiftFromChildren = drawOtherUnitsBlocks( blocksMap,
                                                      blockParamsMap,
                                                      otherUnit,
                                                      otherUnitBlockParams,
                                                      governanceBlocksArea,
                                                      otherUnitBlockParams.bottom.y + IND_HEIGHT + V_SPACE_BETWEEN_BLOCKS,
                                                      additionalInfo );

    maxVerticalShiftFromChildren = Math.max(maxVerticalShiftFromChildren, verticalShiftFromChildren);
    if (maxVerticalShiftFromChildren && (!childrenDrawnInline || childrenInlineCount === 0)) {
      y = maxVerticalShiftFromChildren;
      maxVerticalShiftFromChildren = 0;
    }
  });

  return y;
}

/**
 * Отрисовка соединительных линий
 * @param {Map} linesMap
 * @param {Map} blockParamsMap
 * @param {Map} governanceAreasMap
 * @param {Map} assignedStaffAreasMap
 * @param {Object} parent
 */
const drawConnectors = (linesMap, blockParamsMap, governanceAreasMap, assignedStaffAreasMap, parent) => {
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
  const orgUnitArea = governanceAreasMap.get(parent.id);
  const assignedStaffArea = assignedStaffAreasMap.get(parent.id);
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
    drawConnectors(linesMap, blockParamsMap, governanceAreasMap, assignedStaffAreasMap, orgUnit);
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
    drawConnectors(linesMap, blockParamsMap, governanceAreasMap, assignedStaffAreasMap, child);
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
    drawConnectors(linesMap, blockParamsMap, governanceAreasMap, assignedStaffAreasMap, assignedStaff);
  });

  // отрисовка линий к структурным подразделениям
  const structuralUnits = parent.children.filter((child) => child.additionalInfo === ADDITIONAL_INFO.STRUCTURAL_UNIT);
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
    drawConnectors(linesMap, blockParamsMap, governanceAreasMap, assignedStaffAreasMap, structuralUnits);
  });
};

/**
 *
 * @param parent
 * @param blockParamsMap
 * @param governanceAreasMap
 * @param outerHorizontalPath
 * @return {[]}
 */
const getConnectorsPaths = (parent, blockParamsMap, governanceAreasMap, outerHorizontalPath) => {
  const MIN_VERTICAL_SHIFT = 2;
  const INITIAL_SHIFT = 5;

  const connectorsPaths = [];
  const parentBlockParams = blockParamsMap.get(parent.id);
  let parentPathCounter = 0;

  const governance = parent.children.filter((child) => child.additionalInfo === ADDITIONAL_INFO.GOVERNANCE && child.type !== BLOCK_TYPES.deputy);
  const deputy = parent.children.filter((child) => child.type === BLOCK_TYPES.deputy);

  const parentArea = governanceAreasMap.get(parent.id);
  let xPoint = parentBlockParams.left.x - INITIAL_SHIFT;
  const parentVerticalPath = getVerticalPath( parent.id,
                                              ++parentPathCounter,
                                              getPoint(xPoint, parentBlockParams.top.y),
                                              getPoint(xPoint, parentArea.y));
  connectorsPaths.push(parentVerticalPath);
  if (outerHorizontalPath) {
    outerHorizontalPath.neighbourPaths.push(getNeighbourPath(parentVerticalPath));
    parentVerticalPath.neighbourPaths.push(getNeighbourPath(outerHorizontalPath));
  }
  // горизонтальный путь от левой точки до правой точки его дочерней области
  let yPoint = parentArea.y - INITIAL_SHIFT;
  let parentHorizontalEndPoint = parentArea.x + parentArea.width;
  if (deputy && deputy.length > 0) {
    const deputyBlockParams = blockParamsMap.get(deputy[0].id);
    parentHorizontalEndPoint = Math.max(parentHorizontalEndPoint, deputyBlockParams.right.x + H_SPACE_BETWEEN_BLOCKS);
  }
  const parentHorizontalPath = getHorizontalPath( parent.id,
                                                  ++parentPathCounter,
                                                  getPoint(parentArea.x, yPoint),
                                                  getPoint(parentHorizontalEndPoint, yPoint),
                                                  true);
  connectorsPaths.push(parentHorizontalPath);
  // вертикальный путь от верхней левой точки до нижней левой точки его дочерней области
  xPoint = parentArea.x - INITIAL_SHIFT;
  const parentLeftVerticalPath = getVerticalPath( parent.id,
                                                  ++parentPathCounter,
                                                  getPoint(xPoint, parentArea.y),
                                                  getPoint(xPoint, parentArea.y + parentArea.height) )
  if (governance.length > maxInlineCount) {
    connectorsPaths.push(parentLeftVerticalPath);
  }
  // если блок leadership или legate
  // для всех заместителей добавляем вертикальные пути
  if (deputy && deputy.length > 0) {
    let deputyXShift = INITIAL_SHIFT;
    deputy.reverse().forEach((deputyBlock) => {
      const deputyBlockParams = blockParamsMap.get(deputyBlock.id);
      const deputyX = deputyBlockParams.right.x + deputyXShift;
      deputyXShift += MIN_VERTICAL_SHIFT;
      const deputyPath = getVerticalPath( deputyBlock.id,
                                          1,
                                          getPoint(deputyX, deputyBlockParams.right.y),
                                          getPoint(deputyX, parentHorizontalPath.end.y));
      connectorsPaths.push(deputyPath);
      deputyPath.neighbourPaths.push(getNeighbourPath(parentHorizontalPath));
      parentHorizontalPath.neighbourPaths.push(getNeighbourPath(deputyPath));
    })
  }

  // настройка соседних путей
  parentVerticalPath.neighbourPaths.push(getNeighbourPath(parentHorizontalPath));
  parentHorizontalPath.neighbourPaths.push(getNeighbourPath(parentVerticalPath));
  if (governance.length > maxInlineCount) {
    parentLeftVerticalPath.neighbourPaths.push(getNeighbourPath(parentHorizontalPath));
    parentHorizontalPath.neighbourPaths.push(getNeighbourPath(parentLeftVerticalPath));
  }

  // для дочерних блоков
  let newRow = false;
  // проверка на единственного потомка не заместителя
  let singleChild = false;
  if (governance.length === 1 && governance.every(child => child.type === BLOCK_TYPES.default)) {
    singleChild = true;
  }
  let parentAdditionalHorizontalPath;
  governance.forEach((child, key) => {
    const childBlockParams = blockParamsMap.get(child.id);

    // дополнительные горизонтальные пути
    newRow = (key + 1) % maxInlineCount;
    if (parent.type === BLOCK_TYPES.legate && key >= maxInlineCount && newRow) {
      yPoint = childBlockParams.top.y - INITIAL_SHIFT;
      parentAdditionalHorizontalPath = getHorizontalPath( parent.id,
                                                          ++parentPathCounter,
                                                          getPoint(parentArea.x, yPoint),
                                                          getPoint(parentArea.x + parentArea.width, yPoint) );
      connectorsPaths.push(parentAdditionalHorizontalPath);
      parentLeftVerticalPath.neighbourPaths.push(getNeighbourPath(parentAdditionalHorizontalPath));
      parentAdditionalHorizontalPath.neighbourPaths.push(getNeighbourPath(parentLeftVerticalPath));
    }

    if (child.type === BLOCK_TYPES.legate) {
      const childConnectorsPaths = getConnectorsPaths( child,
                                                       blockParamsMap,
                                                       governanceAreasMap,
                                                       parentAdditionalHorizontalPath || parentHorizontalPath );
      connectorsPaths.push(...childConnectorsPaths);

    } else if (child.type === BLOCK_TYPES.default) {
      const startY = parentAdditionalHorizontalPath ? parentAdditionalHorizontalPath.start.y : parentHorizontalPath.start.y;
      xPoint = childBlockParams.left.x - INITIAL_SHIFT;
      const parentChildVerticalPath = getVerticalPath( parent.id,
                                                       ++parentPathCounter,
                                                       getPoint(xPoint, startY),
                                                       getPoint(xPoint, childBlockParams.bottom.y) );
      if (!singleChild) {
        connectorsPaths.push(parentChildVerticalPath);
      }

      const noSelfHorizontal = parent.type === BLOCK_TYPES.legate;
      const childConnectorsPaths = getDefaultBlockConnectorsPaths( child,
                                                                   childBlockParams,
                                                                   parentChildVerticalPath,
                                                                   blockParamsMap,
                                                                   noSelfHorizontal );

      if (parentAdditionalHorizontalPath) {
        parentChildVerticalPath.neighbourPaths.push(getNeighbourPath(parentAdditionalHorizontalPath));
        parentAdditionalHorizontalPath.neighbourPaths.push(getNeighbourPath(parentChildVerticalPath));
      }

      childConnectorsPaths.forEach((childPath) => {
        parentChildVerticalPath.neighbourPaths.push(getNeighbourPath(childPath));
        parentChildVerticalPath.end.y = Math.max(parentChildVerticalPath.end.y, childPath.end.y);
        if (singleChild) {
          parentVerticalPath.end.y = parentChildVerticalPath.end.y;
        }
        if (childPath.noSelfHorizontal) {
          if (parentAdditionalHorizontalPath) {
            childPath.neighbourPaths.push(getNeighbourPath(parentAdditionalHorizontalPath));
          } else {
            childPath.neighbourPaths.push(getNeighbourPath(parentHorizontalPath));
          }
        } else {
          if (singleChild) {
            childPath.neighbourPaths.push(getNeighbourPath(parentVerticalPath));
          } else {
            childPath.neighbourPaths.push(getNeighbourPath(parentChildVerticalPath));
          }
        }

        connectorsPaths.push(childPath);
      })
    }
  });

  return connectorsPaths;
}

/**
 *
 * @param parent
 * @param parentBlockParams
 * @param parentChildVerticalPath
 * @param blockParamsMap
 * @param {boolean} noSelfHorizontal
 * @return {*}
 */
const getDefaultBlockConnectorsPaths = (parent, parentBlockParams, parentChildVerticalPath, blockParamsMap, noSelfHorizontal) => {
  let parentHorizontalPathStart;
  let parentHorizontalPathEnd;
  if (noSelfHorizontal) {
    parentHorizontalPathStart = getPoint(0, 0);
    parentHorizontalPathEnd = getPoint(0, 0);
  } else {
    parentHorizontalPathStart = getPoint(parentChildVerticalPath.start.x, parentBlockParams.top.y - 5);
    parentHorizontalPathEnd = getPoint(parentBlockParams.right.x, parentBlockParams.top.y - 5);
  }

  const parentHorizontalPath = getHorizontalPath( parent.id,
                                                  1,
                                                  parentHorizontalPathStart,
                                                  parentHorizontalPathEnd,
                                                  false,
                                                  V_SPACE_BETWEEN_BLOCKS,
                                                  noSelfHorizontal );
  const childHorizontalPaths = [];
  parent.children.forEach((child) => {
    const childBlockParams = blockParamsMap.get(child.id);
    const childConnectorsPaths = getDefaultBlockConnectorsPaths(child, childBlockParams, parentChildVerticalPath, blockParamsMap);
    childHorizontalPaths.push(...childConnectorsPaths);
  });
  return [parentHorizontalPath, ...childHorizontalPaths];
}

/**
 * @param {string} blockId
 * @param {number} pathId
 * @param {'H'|'V'} type
 * @param {Point} start
 * @param {Point} end
 * @param {boolean} isRoot
 * @param {number} width
 * @param {boolean} noSelfHorizontal
 * @return {Path}
 */
const getPath = ( blockId,
                  pathId,
                  type,
                  start,
                  end,
                  isRoot,
                  width,
                  noSelfHorizontal=false) => {
  const path = {
    blockId,
    pathId,
    type,
    implicatedBlocks: [],
    neighbourPaths: [],
    start,
    end,
    isRoot,
    width,
    noSelfHorizontal,
    lines: []
  };
  Object.defineProperties(path, {
    blockId: {
      writable: false,
      configurable: false
    },
    pathId: {
      writable: false,
      configurable: false
    },
    type: {
      writable: false,
      configurable: false
    },
    implicatedBlocks: {
      writable: false,
      configurable: false
    },
    neighbourPaths: {
      writable: false,
      configurable: false
    },
    start: {
      writable: false,
      configurable: false
    },
    end: {
      writable: false,
      configurable: false
    },
    isRoot: {
      writable: false,
      configurable: false
    },
    width: {
      writable: false,
      configurable: false
    },
    noSelfHorizontal: {
      writable: false,
      configurable: false
    },
    lines: {
      writable: false,
      configurable: false,
      value: getPathLines(path)
    }
  });
  return path;
}

/**
 *
 * @param path
 * @return {[]}
 */
const getPathLines = (path) => {
  const SPACE_BETWEEN_LINES = 4;
  const lines = [];
  if (!path.width) {
    return lines;
  }
  let startWidth;
  let endWidth;
  if (path.type === LINE_TYPE.vertical) {
    startWidth = path.start.x;
    endWidth = startWidth - path.width;
    while (startWidth > endWidth) {
      lines.push(
          {
            blockId: undefined,
            n: startWidth,
          }
      );
      startWidth -= SPACE_BETWEEN_LINES;
    }
  } else {
    startWidth = path.start.y;
    endWidth = startWidth - path.width;
    while (startWidth > endWidth) {
      lines.push(
          {
            blockId: undefined,
            n: startWidth,
          }
      );
      startWidth -= SPACE_BETWEEN_LINES;
    }
  }

  return lines;
}

/**
 *
 * @param {string} blockId
 * @param {number} pathId
 * @param {Point} start
 * @param {Point} end
 * @param {boolean} isRoot
 * @param {number} width
 * @param {boolean} noSelfHorizontal
 * @return {Path}
 */
const getHorizontalPath = (blockId, pathId, start, end, isRoot=false, width= V_SPACE_BETWEEN_BLOCKS, noSelfHorizontal=false) => {
  return getPath(blockId, pathId, LINE_TYPE.horizontal, start, end, isRoot, width, noSelfHorizontal);
}

/**
 *
 * @param {string} blockId
 * @param {number} pathId
 * @param {Point} start
 * @param {Point} end
 * @param {boolean} isRoot
 * @param {number} width
 * @return {Path}
 */
const getVerticalPath = (blockId, pathId, start, end, isRoot=false, width= H_SPACE_BETWEEN_BLOCKS) => {
  return getPath(blockId, pathId, LINE_TYPE.vertical, start, end, isRoot, width);
}

/**
 *
 * @param path
 * @return {{blockId: (string|*), pathId: (number|*)}}
 */
const getNeighbourPath = (path) => {
  return {
    blockId: path.blockId,
    pathId: path.pathId
  }
}

/**
 *
 * @param {Object} rootBlock
 * @param {Object} currentBlock
 * @param {Map} blockParamsMap
 * @param {Map} connectorsPathsMap
 * @param {Map} linesMap
 */
const drawCurationConnectors = (rootBlock, currentBlock, blockParamsMap, connectorsPathsMap, linesMap) => {
  let toSide = TOP;
  const lineStyle = 'dashed';
  const lineColor = 'blue';

  const currentBlockParams = blockParamsMap.get(currentBlock.id);

  // connectorsPathsMap.forEach((connectorsPaths) => {
  //   connectorsPaths.forEach((connectorsPath) => {
  //     createLine(root, connectorsPath.start, connectorsPath.end, connectorsPath.type, lineStyle, 'red');
  //   })
  // })

  if (currentBlock.curation && currentBlock.curation.length > 0) {
    const currentBlockHierarchy = findBlockHierarchy(rootBlock, currentBlock.id).reverse();
    console.log(`curator ${currentBlock.id}`);

    currentBlock.curation.forEach(curatedBlock => {

      console.log(`curated ${curatedBlock}`);
      // if (currentBlock.id === '44101707/44338250') {
      //   console.log('here');
      // }
      // if (curatedBlock === '44018599/44021026') {
      //   console.log('here2');
      // }
      if (curatedBlock === '44338064/44011701') {
        console.log('here3');
      }
      // if (curatedBlock === '44211833/44011720') {
      //   console.log('here4');
      // }
      const curatedBlockParams = blockParamsMap.get(curatedBlock);
      const curatedBlockHierarchy = findBlockHierarchy(rootBlock, curatedBlock).reverse();
      // находим пересечение иерархий
      const hierarchiesCrossing = findHierarchiesCrossing(currentBlockHierarchy, curatedBlockHierarchy);

      // объединение иерархий
      const mergedHierarchies = [];
      mergedHierarchies.push(...curatedBlockHierarchy.slice(0, curatedBlockHierarchy.indexOf(hierarchiesCrossing) + 1));
      mergedHierarchies.push(...currentBlockHierarchy.slice(0, currentBlockHierarchy.indexOf(hierarchiesCrossing)));

      // подготовка линий от курируемого блока
      let linePoints = [];
      const initialCurationPoint = getPointOfSide(curatedBlockParams, toSide);
      initialCurationPoint.x -= 5;
      linePoints.push(initialCurationPoint);
      const curatedBlockInitialPath = connectorsPathsMap.get(curatedBlockHierarchy[0])[0];
      // получаем, линию в пути, которую можно занять
      if (!curatedBlockInitialPath.noSelfHorizontal) {
        const line = getFreeLine(curatedBlockInitialPath, currentBlock.id);
        linePoints.push(getPoint(initialCurationPoint.x, line.n));
      }

      let previousPath = curatedBlockInitialPath;
      let previousPoint = linePoints[linePoints.length - 1];
      for (let i = 1; i < mergedHierarchies.length; i++) {
        const [newLinesPoint, newPreviousPath] = findPointsToNextHierarchy( connectorsPathsMap,
                                                                            mergedHierarchies[i],
                                                                            mergedHierarchies[i + 1],
                                                                            currentBlock.id,
                                                                            previousPath.neighbourPaths[0].pathId,
                                                                            previousPoint);
        if (!newLinesPoint) {
          continue;
        }
        linePoints.push(...newLinesPoint);
        previousPath = newPreviousPath;
        previousPoint = linePoints[linePoints.length - 1];
      }
      // подготовка линии до блока куратора
      let initialCurrentPoint = getPointOfSide(currentBlockParams, currentBlockParams.type === BLOCK_TYPES.deputy ? RIGHT : LEFT);
      // если прямой потомок
      if (mergedHierarchies.length === 2) {

      }
      linePoints.push(getPoint(previousPoint.x, initialCurrentPoint.y));
      previousPoint = linePoints[linePoints.length - 1];
      // обход блока
      if ((previousPoint.x === initialCurrentPoint.x) && (previousPoint.y < initialCurrentPoint.y)) {
        console.log(`prevPoint:${previousPoint.x}/${previousPoint.y} initCurrent: ${initialCurrentPoint.x}/${initialCurrentPoint.y}`);
        // previousPoint.x = currentBlockParams.left.x;
        // linePoints[linePoints.length - 1] = previousPoint;
      }
      linePoints.push(initialCurrentPoint);
      // отрисовка линий
      createLinesFromArray(linePoints, LINE_TYPE.vertical, lineStyle, lineColor);
      // сохранение линий
      const lineKey = `${currentBlock.id}/${curatedBlock}`;
      linesMap.set(lineKey, {
        parts: linePoints.map(linePoint => ({...linePoint})),
        lineStyle: lineStyle,
        lineColor: lineColor
      });
    })
  }

  const governance = currentBlock.children.filter(child => child.additionalInfo === ADDITIONAL_INFO.GOVERNANCE
                                                           && child.otype === OTYPES.POSITION);

  governance.forEach((governanceBlock) => {
    drawCurationConnectors(rootBlock, governanceBlock, blockParamsMap, connectorsPathsMap, linesMap)
  })
}

const getFreeLine = (path, blockId) => {
  let line = find(path.lines, line => line.blockId === blockId);
  if (!line) {
    line = find(path.lines, line => !line.blockId);
    // если есть свободная линия, то занимаем её
    if (line) {
      line.blockId = blockId;
    } else {
      // если все линии в пути уже заняты
    }
  }
  return line;
}

/**
 *
 * @param connectorsPathsMap
 * @param blockId
 * @param toBlockId
 * @param destinationBlockId
 * @param initialPathId
 * @param previousOuterPoint
 * @return {[[], *]}
 */
const findPointsToNextHierarchy = (connectorsPathsMap, blockId, toBlockId, destinationBlockId, initialPathId, previousOuterPoint) => {
  const linePoints = [];

  const hierarchyPaths = connectorsPathsMap.get(blockId);
  let currentPath = hierarchyPaths.filter(path => path.pathId === initialPathId)[0];
  let paths = [];
  if (!toBlockId) {
    paths.push(currentPath);
  } else {
    paths = findPathsToBlockIdInNeighbourPaths(connectorsPathsMap, toBlockId, currentPath);
  }
  let previousPoint = previousOuterPoint;
  console.log(paths);
  if (!paths || paths.length === 0 || paths.some(path => !path)) {
    // console.log(hierarchyPaths);
    // console.log(currentPath);
    return [];
  }
  if (!toBlockId && paths.length === 1 && currentPath.isRoot && currentPath.type === LINE_TYPE.horizontal) {
    const verticalPath = hierarchyPaths[0];
    paths.push(verticalPath);
  }
  paths.filter(path => !path.noSelfHorizontal).forEach(path => {
    const line = getFreeLine(path, destinationBlockId);
    if (path.type === LINE_TYPE.vertical) {
      linePoints.push(getPoint(line.n, previousPoint.y));
    } else {
      linePoints.push(getPoint(previousPoint.x, line.n));
    }
    previousPoint = linePoints[linePoints.length - 1];
  })
  return [linePoints, paths[paths.length - 1]];
}

/**
 *
 * @param connectorsPathsMap
 * @param toBlockId
 * @param currentPath
 * @param previousPath
 * @return {[undefined, ...[*]|*]|[undefined]}
 */
const findPathsToBlockIdInNeighbourPaths = (connectorsPathsMap, toBlockId, currentPath, previousPath) => {
  for (let i = 0; i < currentPath.neighbourPaths.length; i++) {
    const neighbourPath = currentPath.neighbourPaths[i];
    if (previousPath && neighbourPath.blockId === previousPath.blockId && neighbourPath.pathId === previousPath.pathId) {
      continue;
    }
    if (currentPath.neighbourPaths[i].blockId === toBlockId) {
      return [currentPath];
    } else {
      const path = connectorsPathsMap.get(currentPath.neighbourPaths[i].blockId).filter(path => path.pathId === currentPath.neighbourPaths[i].pathId)[0];
      if (!path) {
        continue;
      }
      // if (path.blockId === toBlockId && path.isRoot ) {
      //   return [currentPath];
      // }
      const nextPaths = findPathsToBlockIdInNeighbourPaths(connectorsPathsMap, toBlockId, path, currentPath);
      if (nextPaths && nextPaths.length) {
        return [currentPath, ...nextPaths];
      }
    }
  }
}

/**
 *
 * @param {Point[]} linePoints
 * @param {string} initialLineType
 * @param lineStyle
 * @param lineColor
 */
const createLinesFromArray = (linePoints, initialLineType, lineStyle, lineColor) => {
  let lineType = initialLineType;
  for (let i = 0; i < linePoints.length - 1; i++) {
    createLine(root, linePoints[i], linePoints[i + 1], lineType, lineStyle, lineColor);
    lineType = lineType === LINE_TYPE.vertical ? LINE_TYPE.horizontal : LINE_TYPE.vertical;
  }
}

/**
 *
 * @param parent
 * @param {string} currentBlockId
 * @return {[]}
 */
const findBlockHierarchy = (parent, currentBlockId) => {
  let hierarchy = [];
  if (parent.id === currentBlockId) {
    hierarchy.push(currentBlockId);
  } else {
    for (let i = 0; i < parent.children.length; i++) {
      const deepHierarchy = findBlockHierarchy(parent.children[i], currentBlockId)
      if (deepHierarchy.length > 0) {
        hierarchy = parent.type === BLOCK_TYPES.default ? deepHierarchy : [parent.id, ...deepHierarchy];
        break;
      }
    }
  }

  return hierarchy;
}

/**
 *
 * @param {string[]} hierarchyFrom
 * @param {string[]} hierarchyTo
 * @return {string}
 */
const findHierarchiesCrossing = (hierarchyFrom, hierarchyTo) => {
  if (!hierarchyFrom ||!hierarchyTo) {
    return '';
  }

  let hierarchyCrossing = '';

  for (let id of hierarchyFrom) {
    if (hierarchyTo.indexOf(id) !== -1) {
      hierarchyCrossing = id;
      break;
    }
  }

  return hierarchyCrossing;
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
                               childInlineCount ) => {
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
        if (previousBottom >= deepestVerticalShift - verticalSpaceBetweenBlocks) {
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
  if (areaTop > 0) {
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
