import './../public/style.css';
import {struct} from './data';
import {H_SPACE_BETWEEN_BLOCKS, LEVEL_WIDTH_STEP, PARENT_WIDTH, V_SPACE_BETWEEN_BLOCKS} from './constants';
import {MIN_BLOCK_HEIGHT} from './constants';
import {IND_HEIGHT} from './constants';
import {createLeadershipBlock, createManufacturingBlock, getBlockParams} from './utils';

const blocksMap = new Map();
const linesMap = new Map();
const layersMap = new Map();

// Инициализация отрисовки схемы
const init = () => {
  const root = document.getElementById('root');
  const screenWidth = screen.width;

  const parent = struct[0];

  // оценка требуемой ширины для вывода ряда иерархии
  // const block_width = getBlockWidth(parent);

  const x = screenWidth / 2 - PARENT_WIDTH / 2;
  const y = 20;
  let parentBlock = createLeadershipBlock(x, y, PARENT_WIDTH, MIN_BLOCK_HEIGHT, parent.title, parent.functions, parent.indicators);
  root.appendChild(parentBlock);

  let newHeight = parentBlock.children[0].clientHeight + 7;

  if (parentBlock.clientHeight > newHeight) {
    parentBlock.children[0].style.height = MIN_BLOCK_HEIGHT + 'px';
    newHeight = parentBlock.clientHeight;
  } else {
    parentBlock.style.height = newHeight + 'px';
    parentBlock.children[1].style.top = newHeight + 'px';
  }
  blocksMap.set(parent.id, getBlockParams(parentBlock));

  parentBlock = blocksMap.get(parent.id);

  drawFirstLayer(root, blocksMap, parent, parentBlock.x, parentBlock.y, parentBlock.height);

  parent.children.forEach((child) => {
    drawColumn(blocksMap, child, blocksMap.get(child.id));
  });
};

const drawColumn = (blocksMap, parent, parentParams,) => {
  const childrenBlocksMap = new Map();

  let maxHeight = MIN_BLOCK_HEIGHT;
  let newHeight = MIN_BLOCK_HEIGHT;
  const width = parentParams.width - LEVEL_WIDTH_STEP;
  const height = MIN_BLOCK_HEIGHT;

  const x = parentParams.x + LEVEL_WIDTH_STEP;
  let y = parentParams.bottom_p.y + V_SPACE_BETWEEN_BLOCKS;

  parent.children.forEach((child) => {
    const childBlock = createManufacturingBlock(x, y, width, height, child.title, child.functions, child.indicators, child.level);
    childrenBlocksMap.set(child.id, childBlock);
    root.appendChild(childBlock);

    const childHeight = childBlock.children[0].clientHeight + 8;

    if (childHeight > maxHeight) {
      maxHeight = childHeight;
      newHeight = childHeight;
    } else {
      childBlock.children[0].style.height = MIN_BLOCK_HEIGHT + 'px';
    }

    // смещение индикаторов
    childBlock.children[1].style.top = childHeight + 'px';

    y += newHeight + IND_HEIGHT + H_SPACE_BETWEEN_BLOCKS;
  });

  const indicatorBlockTop = newHeight + 8;
  if (maxHeight > height) {
    maxHeight += IND_HEIGHT;
  } else {
    maxHeight = height;
  }

  // пересчет высоты блоков и добавление в глобальный map
  // parent.children.forEach((child) => {
  //   const childBlock = childrenBlocksMap.get(child.id);
  //   childBlock.style.height = maxHeight + 'px';
  //   childBlock.children[0].style.height = newHeight + 'px';
  //   childBlock.children[1].style.top = indicatorBlockTop + 'px';
  //   blocksMap.set(child.id, getBlockParams(childBlock));
  // });
};

const drawFirstLayer = (root, blocksMap, parent, parX, parY, parentHeight) => {
  const childrenBlocksMap = new Map();

  let maxHeight = MIN_BLOCK_HEIGHT;
  let newHeight = MIN_BLOCK_HEIGHT;
  const width = PARENT_WIDTH - 20;
  const height = MIN_BLOCK_HEIGHT;
  const count = parent.children.length;

  const globalWidth = width * count + H_SPACE_BETWEEN_BLOCKS * ( count - 1 );
  let x = parX - globalWidth / 2;
  if (x < 0) {
    x = H_SPACE_BETWEEN_BLOCKS;
  }
  const y = parY + parentHeight + V_SPACE_BETWEEN_BLOCKS;

  parent.children.forEach((child) => {
    const childBlock = createLeadershipBlock(x, y, width, height, child.title, child.functions, child.indicators, child.level);
    childrenBlocksMap.set(child.id, childBlock);
    root.appendChild(childBlock);

    const childHeight = childBlock.children[0].clientHeight + 8;

    if (childHeight > maxHeight) {
      maxHeight = childHeight;
      newHeight = childHeight;
    } else {
      childBlock.children[0].style.height = MIN_BLOCK_HEIGHT + 'px';
    }

    x += width + H_SPACE_BETWEEN_BLOCKS;
  });

  const indicatorBlockTop = newHeight + 8;
  if (maxHeight > height) {
    maxHeight += IND_HEIGHT;
  } else {
    maxHeight = height;
  }

  // пересчет высоты блоков и добавление в глобальный map
  parent.children.forEach((child) => {
    const childBlock = childrenBlocksMap.get(child.id);
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
