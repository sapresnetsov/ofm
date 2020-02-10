import './../public/style.css';
import {
  BLOCK_LEVELS,
  BORDER_WIDTH, BOTTOM, H_BLOCK_PADDING,
  H_SPACE_BETWEEN_BLOCKS, LEFT,
  LEVEL_WIDTH_STEP, MIN_BLOCK_WIDTH, ORG_UNIT, POSITION, RIGHT, TOP,
  V_SPACE_BETWEEN_BLOCKS,
} from './constants';
import {MIN_BLOCK_HEIGHT} from './constants';
import {IND_HEIGHT} from './constants';
import {
  createBlock, createUpsideDownConnector, createStampBlock,
  getBlockParams,
  getDataFromDOM,
} from './utils';
import {struct} from './data';

const blocksMap = new Map();
const blockParamsMap = new Map();
const linesMap = new Map();
const initialYShift = 20;

// Инициализация отрисовки схемы
export const init = () => {
  // полифилл для IE
  if (!Math.trunc) {
    Math.trunc = function(v) {
      v = +v;
      return (v - v % 1) || (!isFinite(v) || v === 0 ? v : v < 0 ? -0 : 0);
    };
  }

  const root = document.getElementById('root');
  const screenWidth = screen.width;

  const {ofmDataStr, ofmStampStr, maxDepth} = getDataFromDOM();
  let parent;

  if (ofmDataStr) {
    const ofmData = JSON.parse(ofmDataStr.replace(new RegExp('[\\n]+\\s\\s+', 'g'), ''));
    parent = ofmData[0];
  } else {
    parent = struct[0];
  }

  // первоначально корневой блок отрисовывается посередине экрана
  const parentWidth = MIN_BLOCK_WIDTH + LEVEL_WIDTH_STEP * maxDepth;
  const x = screenWidth / 2 - parentWidth / 2;
  const y = initialYShift;
  const parentBlock = createBlock(x, y, parentWidth, MIN_BLOCK_HEIGHT, parent.type, parent.level, parent.title, parent.functions, parent.indicators);
  root.appendChild(parentBlock);

  // отрисовка штампа схемы
  let stampBlock;
  const tmpStampStr = ofmStampStr.trim();
  if (tmpStampStr) {
    const ofmStamp = JSON.parse(ofmStampStr.replace(new RegExp('[\\n]+\\s\\s+', 'g'), ''));
    stampBlock = drawStamp(ofmStamp, screenWidth);

    if (parentBlock.children[0].clientHeight + y < stampBlock.bottom) {
      parentBlock.style.top = `${stampBlock.bottom - parentBlock.children[0].clientHeight - y}px`;
      blockParamsMap.set(parent.id, getBlockParams(parentBlock));
      parentBlockParams = blockParamsMap.get(parent.id);
    }
  }

  let newHeight = parentBlock.children[0].clientHeight;

  if (parentBlock.clientHeight > newHeight) {
    parentBlock.children[0].style.height = MIN_BLOCK_HEIGHT + 'px';
    newHeight = parentBlock.clientHeight;
  } else {
    parentBlock.style.height = newHeight + 'px';
    parentBlock.children[0].style.height = newHeight + 'px';
    parentBlock.children[1].style.top = newHeight + 'px';
  }
  const indicatorBlockTop = newHeight + BORDER_WIDTH[parent.level] * 2;
  parentBlock.children[1].style.top = indicatorBlockTop + 'px';
  blocksMap.set(parent.id, parentBlock);
  blockParamsMap.set(parent.id, getBlockParams(parentBlock));

  let parentBlockParams = blockParamsMap.get(parent.id);
  drawFirstRow(root, blocksMap, blockParamsMap, parent, parentBlockParams);

  let nextShift = 0;
  let shiftsCount = 0;
  parent.children.forEach((child) => {
    // сдвиг блока вправо
    if (nextShift) {
      const childBlock = blocksMap.get(child.id);
      const childBlockParams = blockParamsMap.get(child.id);
      childBlock.style.left = `${childBlockParams.x + nextShift - childBlockParams.width * shiftsCount}px`;
      blockParamsMap.set(child.id, getBlockParams(childBlock));
    }
    let childBlockParams = blockParamsMap.get(child.id);

    // отрисовка с блоками орг. единиц
    const shift = drawOrgUnits(blocksMap, blockParamsMap, child, childBlockParams);

    // если есть заместители у ШД (S -> S), то отрисовываются их блоки
    if (child.otype === POSITION) {
      childBlockParams = blockParamsMap.get(child.id);
      const {deputyVerticalShift} = drawDeputy(blocksMap, blockParamsMap, child, childBlockParams);
      // если заместители по высоте превышают допустимый лимит, то требуется
      // сдвинуть нижележащие блоки орг. единиц
      if (deputyVerticalShift) {
        shiftOrgUnitsDown(child, blocksMap, blockParamsMap, deputyVerticalShift);
      }
    }
    if (!!shift[0]) {
      nextShift += shift[0];
      shiftsCount++;
    }
  });

  // общая ширина схемы определяется по правой точке последнего блока
  const childBlockParams = blockParamsMap.get(parent.children[parent.children.length - 1].id);
  const fullWidth = childBlockParams.right.x;

  // итоговое выравнивание корневого элемента и штампа по общей ширине схемы
  const newParentBlockLeft = fullWidth / 2 - parentWidth / 2;
  if (tmpStampStr) {
    let newStampBlockLeft = fullWidth - parseInt(stampBlock.style.width) - 10;
    if (newStampBlockLeft < newParentBlockLeft + parentWidth + 50) {
      newStampBlockLeft = newParentBlockLeft + parentWidth + 50;
    }
    stampBlock.style.left = `${newStampBlockLeft}px`;
  }
  parentBlock.style.left = `${newParentBlockLeft}px`;
  blockParamsMap.set(parent.id, getBlockParams(parentBlock));
  parentBlockParams = blockParamsMap.get(parent.id);

  // отрисовка соединяющих линий
  parent.children.forEach((child) => {
    const childBlockParams = blockParamsMap.get(child.id);
    createUpsideDownConnector(root, linesMap, parentBlockParams, childBlockParams, BOTTOM, TOP);

    drawConnectors(linesMap, blockParamsMap, child);
  });

  saveBlockParamsMapToDOM();
};

const shiftOrgUnitsDown = (parent, blocksMap, blockParamsMap, shift) => {
  const orgUnits = parent.children.filter((child) => child.otype === ORG_UNIT);

  orgUnits.forEach((child) => {
    const childBlock = blocksMap.get(child.id);
    const childBlockParams = blockParamsMap.get(child.id);

    childBlock.style.top = `${childBlockParams.top.y + shift}px`;
    blockParamsMap.set(child.id, getBlockParams(childBlock));
    shiftOrgUnitsDown(child, blocksMap, blockParamsMap, shift);
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
  const width = parentParams.width - LEVEL_WIDTH_STEP;
  const height = MIN_BLOCK_HEIGHT;

  const x = parentParams.right.x + parentParams.borderWidth + H_SPACE_BETWEEN_BLOCKS;
  let y = parentParams.y + V_SPACE_BETWEEN_BLOCKS;

  const positions = parent.children.filter((child) => child.otype === POSITION);
  const positionsLength = positions.length;
  if (!positionsLength) {
    return {}; // TODO
  }

  positions.forEach((child) => {
    if (child.otype !== POSITION) {
      return;
    }
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
    blockParamsMap.set(child.id, getBlockParams(childBlock));

    y = blockParamsMap.get(child.id).bottom.y + IND_HEIGHT + V_SPACE_BETWEEN_BLOCKS;
  });

  const lastChildParams = blockParamsMap.get(positions[positionsLength - 1].id);
  // у блоков с заместителями заместителей нет индикаторов, поэтмоу берем разницу между
  // нижними точками блоков
  const verticalDiff = lastChildParams.bottom.y - parentParams.bottom.y;
  const deputyVerticalShift = verticalDiff > 0 ? verticalDiff : 0;

  // крайняя правая точка после отрисовки заместителей
  const deputyRightPoint = lastChildParams.right.x + lastChildParams.borderWidth;

  return {deputyVerticalShift, deputyRightPoint};
};

/**
 * Отрисовка вертикально-расположенных блоков
 * @param {Object} blocksMap
 * @param {Object} blockParamsMap
 * @param {Object} parent
 * @param {Object} parentParams
 * @return {Array} verticalShift
 */
const drawOrgUnits = (blocksMap, blockParamsMap, parent, parentParams,) => {
  let childrensDrawnInline = false;
  const width = parentParams.width - LEVEL_WIDTH_STEP;
  const height = MIN_BLOCK_HEIGHT;

  // TODO подумать насчет padding 5
  let x = parentParams.x + LEVEL_WIDTH_STEP / 2 + parentParams.borderWidth + 5;
  let y = parentParams.bottom.y + V_SPACE_BETWEEN_BLOCKS + IND_HEIGHT;
  let retVerticalShift = 0;
  let retHorizontalShift = 0;

  const orgUnits = parent.children.filter((child) => child.otype === ORG_UNIT);
  const childrenCount = orgUnits.length;

  orgUnits.forEach((child, i) => {
    const blockType = child.type || 'default';
    const blockLevel = child.level || 'default';
    const tempX = x - BORDER_WIDTH[blockLevel] * 2;
    const initialBlockParams = [tempX, y, width, height, blockType, blockLevel, child.title, child.functions, child.indicators];
    const childBlock = createBlock(...initialBlockParams);
    root.appendChild(childBlock);

    const childHeight = childBlock.children[0].clientHeight;
    const indicatorBlockTop = childHeight + BORDER_WIDTH[blockLevel] * 2;

    // подбор высоты
    // childBlock.style.height = childHeight + 'px';
    childBlock.children[0].style.height = childHeight + 'px';
    childBlock.children[1].style.top = indicatorBlockTop + 'px';

    blocksMap.set(child.id, childBlock);
    blockParamsMap.set(child.id, getBlockParams(childBlock));
    retVerticalShift += childHeight + BORDER_WIDTH[blockLevel] * 2 + IND_HEIGHT + V_SPACE_BETWEEN_BLOCKS;
    if (!orgUnits[i]) {
      retVerticalShift += V_SPACE_BETWEEN_BLOCKS;
    }
    // отрисовка потомков
    const shift = drawOrgUnits(blocksMap, blockParamsMap, child, blockParamsMap.get(child.id));

    // если у ШД 1/2 уровня есть несколько потомков, то их необходимо выводить в несколько стобцов
    // при этом требуется сдвинуть блок с самой ШД, а также следующие блоки с ШД
    if ((parent.otype === 'S') && (parent.level) === BLOCK_LEVELS.second && childrenCount > 1) {
      x = blockParamsMap.get(child.id).right.x + H_SPACE_BETWEEN_BLOCKS;
      childrensDrawnInline = true;
    } else {
      y = blockParamsMap.get(child.id).bottom.y + IND_HEIGHT + V_SPACE_BETWEEN_BLOCKS + shift[1];
    }
  });

  // если дочерние блоки необходимо вывести в одну строку, то необходимо сместить родительский блок
  // и все следующие
  if (childrensDrawnInline) {
    let childrenWidth = 0;
    orgUnits.forEach((child) => {
      childrenWidth += blockParamsMap.get(child.id).width;
    });
    childrenWidth += H_SPACE_BETWEEN_BLOCKS * (orgUnits.length);
    const parentBlock = blocksMap.get(parent.id);
    // TODO тоже дичь
    parentBlock.style.left = `${parentParams.x + (childrenWidth - H_SPACE_BETWEEN_BLOCKS) / 2 - parentParams.width / 2 + LEVEL_WIDTH_STEP / 2}px`;
    blockParamsMap.set(parent.id, getBlockParams(parentBlock));
    retHorizontalShift = childrenWidth;
  }
  // TODO возвращать не массив, а объект?
  return [retHorizontalShift, retVerticalShift];
};

/**
 * Отрисовка блоков с единицами управления
 * @param {Object} root
 * @param {Map} blocksMap
 * @param {Map} blockParamsMap
 * @param {Object} parent
 * @param {Object} parentParams
 */
const drawFirstRow = (root, blocksMap, blockParamsMap, parent, parentParams) => {
  const childrenBlocksMap = new Map();

  let maxHeight = MIN_BLOCK_HEIGHT;
  let newHeight = MIN_BLOCK_HEIGHT;
  const width = parentParams.width - LEVEL_WIDTH_STEP;
  const height = MIN_BLOCK_HEIGHT;
  const count = parent.children.length;

  const globalWidth = width * count + H_SPACE_BETWEEN_BLOCKS * ( count - 1 );
  let x = parentParams.x - globalWidth / 2;
  if (x < 0 || parent.children.length === 1) {
    x = H_SPACE_BETWEEN_BLOCKS - 10;
  }
  const y = parentParams.bottom.y + V_SPACE_BETWEEN_BLOCKS + IND_HEIGHT;

  parent.children.forEach((child) => {
    const blockType = child.type || 'default';
    const blockLevel = child.level || 'default';
    const initialBlockParams = [x, y, width, height, blockType, blockLevel, child.title, child.functions, child.indicators];
    const childBlock = createBlock(...initialBlockParams);
    childrenBlocksMap.set(child.id, childBlock);
    root.appendChild(childBlock);

    const childHeight = childBlock.children[0].clientHeight;

    if (childHeight > maxHeight) {
      maxHeight = childHeight;
      newHeight = childHeight;
    }

    x += width + H_BLOCK_PADDING + BORDER_WIDTH[blockLevel] * 2 + H_SPACE_BETWEEN_BLOCKS;
  });

  if (maxHeight > height) {
    maxHeight += IND_HEIGHT;
  } else {
    maxHeight = height;
  }

  // пересчет высоты блоков и добавление в глобальный map
  parent.children.forEach((child) => {
    const childBlock = childrenBlocksMap.get(child.id);
    const indicatorBlockTop = newHeight + parseInt(childBlock.children[0].style.borderWidth, 10) * 2;
    childBlock.style.height = maxHeight + 'px';
    childBlock.children[0].style.height = newHeight + 'px';
    childBlock.children[1].style.top = indicatorBlockTop + 'px';
    blocksMap.set(child.id, childBlock);
    blockParamsMap.set(child.id, getBlockParams(childBlock));
  });
};

/**
 * Отрисовка соединительных линий
 * @param {Map} linesMap
 * @param {Map} blockParamsMap
 * @param {Object} parent
 */
const drawConnectors = (linesMap, blockParamsMap, parent) => {
  const parentBlockParams = blockParamsMap.get(parent.id);
  let fromSide;
  let toSide;

  if (parent.otype === 'S') {
    fromSide = BOTTOM;
    toSide = TOP;
  } else {
    fromSide = LEFT;
    toSide = LEFT;
  }
  if (parent.level === BLOCK_LEVELS.dependent) {
    parentBlockParams.left.y += 10;
  }
  const orgUnits = parent.children.filter((child) => child.otype === ORG_UNIT);
  orgUnits.forEach((child) => {
    const childBlockParams = blockParamsMap.get(child.id);
    createUpsideDownConnector(root, linesMap, parentBlockParams, childBlockParams, fromSide, toSide, true);
    drawConnectors(linesMap, blockParamsMap, child);
  });

  const positions = parent.children.filter((child) => child.otype === POSITION);
  positions.forEach((child) => {
    const childBlockParams = blockParamsMap.get(child.id);
    createUpsideDownConnector(root, linesMap, parentBlockParams, childBlockParams, RIGHT, LEFT);
  });
};

/**
 * Отрисовка штампа в правом верхнем углу
 * @param {Object} stamp
 * @param {number} fullWidth
 * @return {HTMLElement}
 */
const drawStamp = (stamp, fullWidth) => {
  const width = 500;
  const y = initialYShift;
  const x = fullWidth - width - 10;

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

const saveBlockParamsMapToDOM = () => {

};

init();
