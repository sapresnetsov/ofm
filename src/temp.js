import {
  AREA_SHIFT,
  ASSIGNED_STAFF, BLOCK_LEVELS,
  BLOCK_TYPES,
  GOVERNANCE,
  H_BLOCK_PADDING,
  H_SPACE_BETWEEN_BLOCKS,
  IND_HEIGHT,
  LEVEL_WIDTH_STEP,
  MIN_BLOCK_HEIGHT, ORG_UNIT, POSITION, STRUCTURAL_UNIT,
  V_SPACE_BETWEEN_BLOCKS
} from "./model/constants";
import {appendBlock, getBlockParams} from "./utils";

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
    const childBlock = appendBlock(x, y, width, height, child, blocksMap, blockParamsMap, parentParams, true);
    const childHeight = parseInt(childBlock.children[0].clientHeight);
    const borderWidth = parseInt(childBlock.children[0].style.borderWidth);

    if (childHeight > maxHeight) {
      maxHeight = childHeight;
      newHeight = childHeight;
    }

    blockParamsMap.set(child.id, getBlockParams(childBlock, child, parentParams.top));
    // const childBlockParams = blockParamsMap.get(child.id);

    // drawFirstRow(blocksMap, blockParamsMap, child, childBlockParams);

    x += width + H_BLOCK_PADDING + borderWidth * 2 + H_SPACE_BETWEEN_BLOCKS;
  });

  if (maxHeight > height) {
    maxHeight += IND_HEIGHT;
  } else {
    maxHeight = height;
  }

  // пересчет высоты блоков и добавление в глобальный map
  parent.children.filter((elem) => elem.additionalInfo === GOVERNANCE).forEach((child) => {
    const childBlock = blocksMap.get(child.id);
    const indicatorBlockTop = newHeight + parseInt(childBlock.children[0].style.borderWidth, 10) * 2;
    childBlock.style.height = maxHeight + 'px';
    childBlock.children[0].style.height = newHeight + 'px';
    childBlock.children[1].style.top = indicatorBlockTop + 'px';
    blocksMap.set(child.id, childBlock);
    blockParamsMap.set(child.id, getBlockParams(childBlock, child, parentParams.top.y));
  });
};

/**
 * Отрисовка блоков с единицами управления
 * @param {Map} blocksMap
 * @param {Map} blockParamsMap
 * @param {Object} parent
 * @param {Object} parentParams
 */
const drawDeputyBlock = (blocksMap, blockParamsMap, deputy, parent, parentParams) => {
  const maxHeight = MIN_BLOCK_HEIGHT;
  const newHeight = MIN_BLOCK_HEIGHT;

  const width = parentParams.width - LEVEL_WIDTH_STEP;
  const height = MIN_BLOCK_HEIGHT;
  const x = H_SPACE_BETWEEN_BLOCKS;
  const y = parentParams.bottom.y + V_SPACE_BETWEEN_BLOCKS + IND_HEIGHT;

  const deputyBlock = appendBlock(x, y, width, height, deputy, blocksMap, blockParamsMap, parentParams, true);
  // const childHeight = parseInt(deputyBlock.children[0].clientHeight);
  // const borderWidth = parseInt(deputyBlock.children[0].style.borderWidth);

  blockParamsMap.set(deputy.id, getBlockParams(deputyBlock, deputy, parentParams.top));


  deputy.children.forEach((child) => {
    if (child.type === BLOCK_TYPES.deputy) {

    }
  })
  // x += width + H_BLOCK_PADDING + borderWidth * 2 + H_SPACE_BETWEEN_BLOCKS;

  // parent.children.forEach((child) => {
  //   // const deputyBlock = appendBlock(x, y, width, height, child, blocksMap, blockParamsMap, parentParams, true);
  //   // const childHeight = parseInt(deputyBlock.children[0].clientHeight);
  //   // const borderWidth = parseInt(deputyBlock.children[0].style.borderWidth);
  //   //
  //   // if (childHeight > maxHeight) {
  //   //   maxHeight = childHeight;
  //   //   newHeight = childHeight;
  //   // }
  //   //
  //   // blockParamsMap.set(child.id, getBlockParams(deputyBlock, child, parentParams.top));
  //   // // const childBlockParams = blockParamsMap.get(child.id);
  //   //
  //   // // drawFirstRow(blocksMap, blockParamsMap, child, childBlockParams);
  //   //
  //   // x += width + H_BLOCK_PADDING + borderWidth * 2 + H_SPACE_BETWEEN_BLOCKS;
  // });
  //
  // if (maxHeight > height) {
  //   maxHeight += IND_HEIGHT;
  // } else {
  //   maxHeight = height;
  // }

  // пересчет высоты блоков и добавление в глобальный map
  // parent.children.filter((elem) => elem.additionalInfo === GOVERNANCE).forEach((child) => {
  //   const childBlock = blocksMap.get(child.id);
  //   const indicatorBlockTop = newHeight + parseInt(childBlock.children[0].style.borderWidth, 10) * 2;
  //   childBlock.style.height = maxHeight + 'px';
  //   childBlock.children[0].style.height = newHeight + 'px';
  //   childBlock.children[1].style.top = indicatorBlockTop + 'px';
  //   blocksMap.set(child.id, childBlock);
  //   blockParamsMap.set(child.id, getBlockParams(childBlock, child, parentParams.top.y));
  // });
};

/**
 * Отрисовка блоков схемы, которые выводятся вертикально
 * @param {Map} blocksMap
 * @param {Map} blockParamsMap
 * @param {Map} orgUnitsAreaMap
 * @param {Map} assignedStaffAreaMap
 * @param {Map} structuralUnitsAreaMap
 * @param {Object} parent
 */
const drawColumns = (blocksMap,
                     blockParamsMap,
                     orgUnitsAreaMap,
                     assignedStaffAreaMap,
                     structuralUnitsAreaMap,
                     parent,
                     parentBlockParams) => {
  let nextShift = 0;
  let lastRightPoint = 0;
  let shiftsCount = 0;
  let maxAssignedStaffVerticalShift = 0;
  let maxStructuralUnitsVerticalShift = 0;
  let columns = [];
  if (parent.type === BLOCK_TYPES.leadership) {
    columns = parent.children;
  } else {
    columns = [parent];
  }
  columns.forEach((child) => {
    // сдвиг блока вправо
    if (nextShift) {
      const childBlock = blocksMap.get(child.id);
      const childBlockParams = blockParamsMap.get(child.id);
      childBlock.style.left = `${childBlockParams.x + nextShift - childBlockParams.width * shiftsCount}px`;
      blockParamsMap.set(child.id, getBlockParams(childBlock, child, childBlockParams.nearParentTop, childBlockParams.isRootChild));
      lastRightPoint = 0;
    }
    let childBlockParams = blockParamsMap.get(child.id);

    // // отрисовка блока заместителя
    // if (child.type === BLOCK_TYPES.deputy) {
    //   drawDeputyBlock(blocksMap, blockParamsMap, child, parent, parentBlockParams);
    // }

    // отрисовка блоков орг. единиц
    const orgUnitArea = {};
    const shift = drawOrgUnits(blocksMap, blockParamsMap, orgUnitArea, child, childBlockParams);
    if (Object.entries(orgUnitArea).length && orgUnitArea.height) {
      orgUnitsAreaMap.set(child.id, orgUnitArea);
    }

    // если есть заместители у ШД (S -> S), у которых нет потомков, то отрисовываются их блоки
    if (child.otype === POSITION) {
      childBlockParams = blockParamsMap.get(child.id);
      const {deputyVerticalShift, deputyRightPoint} = drawDeputy(blocksMap, blockParamsMap, child, childBlockParams);
      lastRightPoint = deputyRightPoint;
      // если заместители по высоте превышают допустимый лимит, то требуется
      // сдвинуть нижележащие блоки орг. единиц
      if (deputyVerticalShift) {
        shiftOrgUnitsDown(child, blocksMap, blockParamsMap, deputyVerticalShift);
        if (Object.entries(orgUnitArea).length) {
          orgUnitArea.y += deputyVerticalShift;
        }
      }
    }

    // отрисовка блоков с приписным штатом
    const orgUnitAreaBottom = orgUnitArea.y + orgUnitArea.height;
    if (maxAssignedStaffVerticalShift < orgUnitAreaBottom) {
      maxAssignedStaffVerticalShift = orgUnitAreaBottom;
    }
    const assignedStaffArea = {};
    drawOtherUnits(blocksMap, blockParamsMap, orgUnitArea, assignedStaffArea, child, childBlockParams, ASSIGNED_STAFF);
    if (Object.entries(assignedStaffArea).length && assignedStaffArea.height) {
      assignedStaffAreaMap.set(child.id, assignedStaffArea);
    }

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
    const structuralUnitArea = {};
    drawOtherUnits(blocksMap, blockParamsMap, prevArea, structuralUnitArea, child, childBlockParams, STRUCTURAL_UNIT);
    if (Object.entries(structuralUnitArea).length && structuralUnitArea.height) {
      structuralUnitsAreaMap.set(child.id, structuralUnitArea);
    }

    // сдвиг следующих блоков определяется блоками сдочерними ОЕ, либо блоками с заместителями
    if (shift[0] || lastRightPoint) {
      let deputyShift;
      if (Object.entries(orgUnitArea).length) {
        deputyShift = lastRightPoint - orgUnitArea.x;
      } else {
        childBlockParams = blockParamsMap.get(child.id);
        deputyShift = lastRightPoint - lastRightPoint - childBlockParams.left.x;
      }

      if (deputyShift > shift[0]) {
        nextShift += deputyShift;
      } else {
        nextShift += shift[0];
      }
      shiftsCount++;
    }
  });

  // сдвиг блоков приписного штата вниз
  shiftOtherUnitsDown(blocksMap, blockParamsMap, ASSIGNED_STAFF, maxAssignedStaffVerticalShift);
  assignedStaffAreaMap.forEach((area) => {
    area.y = maxAssignedStaffVerticalShift;
  });

  // сдвиг блоков структурных подразделений вниз
  shiftOtherUnitsDown(blocksMap, blockParamsMap, STRUCTURAL_UNIT, maxStructuralUnitsVerticalShift);
  structuralUnitsAreaMap.forEach((area) => {
    area.y = maxStructuralUnitsVerticalShift;
  });
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
  const positions = parent.children.filter((child) => child.otype === POSITION && (!child.children || child.children.length > 0));
  const positionsLength = positions.length;
  if (!positionsLength) {
    return {};
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

  const width = parentParams.width - LEVEL_WIDTH_STEP;
  const height = MIN_BLOCK_HEIGHT;

  const initX = parentParams.x + LEVEL_WIDTH_STEP / 2 + parentParams.borderWidth;
  let x = initX;
  let y = parentParams.bottom.y + V_SPACE_BETWEEN_BLOCKS + IND_HEIGHT;

  if ((parent.otype === POSITION) && (parent.level) === BLOCK_LEVELS.second && childrenCount > 1) {
    childrenDrawnInline = true;
  }

  orgUnits.forEach((child) => {
    appendBlock(x, y, width, height, child, blocksMap, blockParamsMap, parentParams);

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
    blockParamsMap.set(parent.id, getBlockParams(parentBlock, parent, parentParams.nearParentTop));
    retHorizontalShift = childrenWidth;
  }

  // область с орг. единицами
  // TODO продумать условие для определения именно ВТОРОГО уровня для ШД
  if (parent.otype === POSITION && childrenCount) {
    const leftChildBlock = blockParamsMap.get(orgUnits[0].id);
    orgUnitArea.x = leftChildBlock.x;
    orgUnitArea.y = leftChildBlock.y;
    y = inlineMaxVerticalShift;

    orgUnitArea.height = y - orgUnitArea.y + IND_HEIGHT + AREA_SHIFT;

    if (!childrenDrawnInline) {
      orgUnitArea.width = leftChildBlock.width;
    } else {
      const rightChildBlock = blockParamsMap.get(orgUnits[childrenInlineCount - 1].id);
      orgUnitArea.width = rightChildBlock.right.x - orgUnitArea.x;
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

  // TODO оставил для последующей модификации по вывод приписного штата и сп в несколько колонок
  let initX;
  let y;
  let parentTop;
  if (!parent.additionalInfo || parent.additionalInfo === GOVERNANCE) {
    initX = prevArea.x;
    y = prevArea.y + prevArea.height;
    parentTop = {top: {y: y}};
  } else {
    initX = parentParams.x + LEVEL_WIDTH_STEP / 2 + parentParams.borderWidth + 5;
    y = parentParams.bottom.y + V_SPACE_BETWEEN_BLOCKS + IND_HEIGHT;
    parentTop = {top: {y: parentParams.nearParentTop}};
  }
  const x = initX;

  units.forEach((child) => {
    appendBlock(x, y, width, height, child, blocksMap, blockParamsMap, parentTop);
    // отрисовка потомков
    const shift = drawOtherUnits(blocksMap, blockParamsMap, prevArea, unitsArea, child, blockParamsMap.get(child.id), additionalInfo);
    const childBlockParams = blockParamsMap.get(child.id);
    if (shift[1]) {
      y = shift[1];
    } else {
      y = childBlockParams.bottom.y + IND_HEIGHT + V_SPACE_BETWEEN_BLOCKS;
    }
  });

  if ((!parent.additionalInfo || parent.additionalInfo === GOVERNANCE) && childrenCount) {
    const leftChildBlock = blockParamsMap.get(units[0].id);
    unitsArea.x = leftChildBlock.x;
    unitsArea.y = leftChildBlock.y;
    unitsArea.width = leftChildBlock.width;
    unitsArea.height = y - (prevArea.y + prevArea.height) + AREA_SHIFT;
  }

  return [0, y];
};