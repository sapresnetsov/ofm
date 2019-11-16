import * as constants from './constants';
import './../public/style.css';
import {struct} from './data';
import {PARENT_WIDTH} from './constants';
import {MIN_BLOCK_HEIGHT} from './constants';
import {STD_BLOCK_HEIGHT} from './constants';
import {IND_HEIGHT} from './constants';
import {IND_WIDTH} from './constants';

const getPoint = (pX, pY) => {
  return {
    x: pX,
    y: pY,
  };
};

const getNewBlock = (block) => {
  const left = parseInt(block.style.left, 10);
  const right = parseInt(block.style.right, 10);
  const top = parseInt(block.style.top, 10);
  const bottom = parseInt(block.style.bottom, 10);
  const width = parseInt(block.style.width, 10);
  const height = parseInt(block.style.height, 10);
  return {
    x: left,
    y: top,

    top_p: {
      x: left + width/2,
      y: top,
    },
    bottom_p: {
      x: left + width/2,
      // y: top + height - IND_HEIGHT + 8,
      y: bottom - IND_HEIGHT + 8,
    },
    left_p: {
      x: left,
      y: top + height/2,
    },
    right_p: {
      x: right,
      y: top + height/2,
    },
  };
};

// отрисовка орг. блока
const createBlock = (x, y, width, height, blockClass, title, functions, indicators) => {
  const outerBlock = document.createElement('div');
  outerBlock.setAttribute('class', `outer_block ${blockClass}`);
  outerBlock.style.left = `${x}px`;
  outerBlock.style.top = `${y}px`;
  outerBlock.style.width = `${width}px`;
  outerBlock.style.height = `${height}px`;

  const blockBody = document.createElement('div');
  blockBody.setAttribute('class', 'inner_block');

  // Заголовок блока
  const blockTitle = document.createElement('h3');
  blockTitle.setAttribute('class', 'd');
  blockTitle.textContent = title;
  blockBody.appendChild(blockTitle);

  if (!functions && functions.length > 0) {
    functions.forEach((func) => {
      const funcText = document.createElement('p');
      funcText.setAttribute('class', blockClass);
      funcText.textContent = func;
      blockBody.appendChild(funcText);
    });
  }
  outerBlock.appendChild(blockBody);

  const footerBlock = document.createElement('div');
  footerBlock.setAttribute('class', 'block_indicators');
  footerBlock.style.top = '108px';
  let indicatorX = width - IND_WIDTH + 6;
  indicators.forEach((ind) => {
    const indicator = document.createElement('div');
    indicator.setAttribute('class', 'indicator');
    indicator.style.left = indicatorX + 'px';
    indicator.style.width = IND_WIDTH + 'px';
    indicator.textContent = ind;
    footerBlock.appendChild(indicator);

    indicatorX -= (IND_WIDTH + 1);
  });
  outerBlock.appendChild(footerBlock);

  return outerBlock;
};

const createLeadershipBlock = (x, y, width, height, title, functions, indicators) => {
  return createBlock(x, y, width, height, 'leaderBlock', title, functions, indicators);
};

const createManufacturingBlock = (x, y, width, height, title, functions, indicators) => {
  return createBlock(x, y, width, height, 'manufacturingBlock', title, functions, indicators);
};

// map с данными по точкам блоков для соединения
const blockPoints = new Map();

// Инициализация отрисовки схемы
const init = () => {
  const root = document.getElementById('root');
  const screenWidth = screen.width;

  // корневой элемент схемы
  const parent = struct[0];

  // оценка требуемой ширины для вывода ряда иерархии
  // const block_width = getBlockWidth(parent);


  const x = screenWidth / 2 - PARENT_WIDTH / 2;
  const y = 100;
  const parentBlock = createLeadershipBlock(x, y, PARENT_WIDTH, MIN_BLOCK_HEIGHT, parent.title, parent.functions, parent.indicators);
  blockPoints.set(parent.id, getNewBlock(parentBlock));
  root.appendChild(parentBlock);

  let newHeight = parentBlock.children[0].clientHeight + 7;

  if (parentBlock.clientHeight > newHeight) {
    parentBlock.children[0].style.height = MIN_BLOCK_HEIGHT + 'px';
    newHeight = parentBlock.clientHeight;
  } else {
    parentBlock.style.height = newHeight + 'px';
    parentBlock.children[1].style.top = newHeight + 'px';
  }
};

const getBlockWidth = (parent) => {
  const firstLevelChildrenCount = parent.children.length;
};

init();
