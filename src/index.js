import './../public/style.css';
import {
  BORDER_WIDTH, H_BLOCK_PADDING,
  H_SPACE_BETWEEN_BLOCKS,
  LEVEL_WIDTH_STEP,
  PARENT_WIDTH,
  V_SPACE_BETWEEN_BLOCKS,
} from './constants';
import {MIN_BLOCK_HEIGHT} from './constants';
import {IND_HEIGHT} from './constants';
import {
  createBlock,
  createLeadershipBlock,
  getBlockParams,
} from './utils';
import {struct} from './data';

const blocksMap = new Map();
const linesMap = new Map();
const layersMap = new Map();

// Инициализация отрисовки схемы
export const init = () => {
  const root = document.getElementById('root');
  const screenWidth = screen.width;

  const ofmDataStr = document.getElementById('ofmData').textContent;
  let parent;
  if (ofmDataStr) {
    const ofmData = JSON.parse(ofmDataStr.replace(new RegExp('[\\n]+\\s\\s+', 'g'), ''));
    parent = ofmData[0];
  } else {
    parent = struct[0];
  }

  // оценка требуемой ширины для вывода ряда иерархии
  // const block_width = getBlockWidth(parent);
  // TODO корневой блок, скорее всего, придется перемещать после отрисовки всех блоков
  const x = screenWidth / 2 - PARENT_WIDTH / 2;
  const y = 20;
  const parentBlock = createLeadershipBlock(x, y, PARENT_WIDTH, MIN_BLOCK_HEIGHT, parent.title, parent.functions, parent.indicators);
  root.appendChild(parentBlock);

  let newHeight = parentBlock.children[0].clientHeight;

  if (parentBlock.clientHeight > newHeight) {
    parentBlock.children[0].style.height = MIN_BLOCK_HEIGHT + 'px';
    newHeight = parentBlock.clientHeight;
  } else {
    parentBlock.style.height = newHeight + 'px';
    parentBlock.children[1].style.top = newHeight + 'px';
  }
  const indicatorBlockTop = newHeight + BORDER_WIDTH.leadership * 2;
  parentBlock.children[1].style.top = indicatorBlockTop + 'px';
  blocksMap.set(parent.id, getBlockParams(parentBlock));

  const parentBlockParams = blocksMap.get(parent.id);
  drawFirstLayer(root, blocksMap, parent, parentBlockParams);

  parent.children.forEach((child) => {
    drawColumn(blocksMap, child, blocksMap.get(child.id));
  });
};

/**
 * Отрисовка вертикально-расположенных блоков
 * @param {Object} blocksMap
 * @param {Object} parent
 * @param {Object} parentParams
 * @return {number} verticalShift
 */
const drawColumn = (blocksMap, parent, parentParams,) => {
  const childrenBlocksMap = new Map();
  const width = parentParams.width - LEVEL_WIDTH_STEP;
  const height = MIN_BLOCK_HEIGHT;

  const x = parentParams.x + LEVEL_WIDTH_STEP + parentParams.borderWidth * 2;
  let y = parentParams.bottom_p.y + V_SPACE_BETWEEN_BLOCKS + IND_HEIGHT;
  let retVerticalShift = 0;

  let i;
  parent.children.forEach((child) => {
    i += 1;
    const blockType = child.type || 'default';
    const tempX = x - BORDER_WIDTH[blockType] * 2;
    const initialBlockParams = [tempX, y, width, height, blockType, child.title, child.functions, child.indicators];
    const childBlock = createBlock(...initialBlockParams);
    // childrenBlocksMap.set(child.id, childBlock);
    root.appendChild(childBlock);

    const childHeight = childBlock.children[0].clientHeight;
    const indicatorBlockTop = childHeight + BORDER_WIDTH[blockType] * 2;

    // подбор высоты
    // childBlock.style.height = childHeight + 'px';
    childBlock.children[0].style.height = childHeight + 'px';
    childBlock.children[1].style.top = indicatorBlockTop + 'px';

    blocksMap.set(child.id, getBlockParams(childBlock));
    retVerticalShift += childHeight + BORDER_WIDTH[blockType] * 2 + IND_HEIGHT;
    if (!parent.children[i]) {
      retVerticalShift += V_SPACE_BETWEEN_BLOCKS;
    }
    // отрисовка потомков
    const verticalShift = drawColumn(blocksMap, child, blocksMap.get(child.id));

    y = blocksMap.get(child.id).bottom_p.y + IND_HEIGHT + V_SPACE_BETWEEN_BLOCKS + verticalShift;
  });

  return retVerticalShift;
};

/**
 * Отрисовка блоков с единицами управления
 * @param {Object} root
 * @param {Map} blocksMap
 * @param {Object} parent
 * @param {Object} parentParams
 */
const drawFirstLayer = (root, blocksMap, parent, parentParams) => {
  const childrenBlocksMap = new Map();

  let maxHeight = MIN_BLOCK_HEIGHT;
  let newHeight = MIN_BLOCK_HEIGHT;
  const width = PARENT_WIDTH - 20;
  const height = MIN_BLOCK_HEIGHT;
  const count = parent.children.length;

  const globalWidth = width * count + H_SPACE_BETWEEN_BLOCKS * ( count - 1 );
  let x = parentParams.x - globalWidth / 2;
  if (x < 0) {
    x = H_SPACE_BETWEEN_BLOCKS;
  }
  const y = parentParams.bottom_p.y + V_SPACE_BETWEEN_BLOCKS + IND_HEIGHT;

  parent.children.forEach((child) => {
    const blockType = child.type || 'default';
    const initialBlockParams = [x, y, width, height, blockType, child.title, child.functions, child.indicators];
    const childBlock = createBlock(...initialBlockParams);
    childrenBlocksMap.set(child.id, childBlock);
    root.appendChild(childBlock);

    const childHeight = childBlock.children[0].clientHeight;

    if (childHeight > maxHeight) {
      maxHeight = childHeight;
      newHeight = childHeight;
    }

    x += width + H_BLOCK_PADDING + BORDER_WIDTH[blockType] * 2 + H_SPACE_BETWEEN_BLOCKS;
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
    blocksMap.set(child.id, getBlockParams(childBlock));
  });
};

const drawConnectors = () => {

};

const getBlockWidth = (parent) => {
  const firstLevelChildrenCount = parent.children.length;
};

init();
