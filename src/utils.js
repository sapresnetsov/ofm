// отрисовка орг. блока
import {IND_HEIGHT, IND_WIDTH} from './constants';

export const createBlock = (x, y, width, height, blockClass, title, functions, indicators) => {
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
  blockTitle.setAttribute('class', 'title_text');
  blockTitle.textContent = title;
  blockBody.appendChild(blockTitle);

  // функции
  if (!!functions && functions.length > 0) {
    functions.forEach((func) => {
      const funcText = document.createElement('p');
      funcText.setAttribute('class', 'function_text');
      funcText.textContent = func;
      blockBody.appendChild(funcText);
    });
  }
  outerBlock.appendChild(blockBody);

  // индикаторы
  if (!!indicators) {
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
  }

  return outerBlock;
};

export const createLeadershipBlock = (x, y, width, height, title, functions, indicators) => {
  return createBlock(x, y, width, height, 'leaderBlock', title, functions, indicators);
};

export const createManufacturingBlock = (x, y, width, height, title, functions, indicators) => {
  return createBlock(x, y, width, height, 'manufacturingBlock', title, functions, indicators);
};

export const createLine = (startPoint, endPoint, lineType) => {
  const line = document.createElement('div');
  line.setAttribute('class', 'line ' + lineType);

  switch (lineType) {
    case 'horizontal_line':
      if (startPoint.y <= endPoint.y) {
        line.style.top = startPoint.y +'px';
      } else {
        line.style.top = endPoint.y +'px';
      }
      if (startPoint.x <= endPoint.x) {
        line.style.left = startPoint.x + 'px';
      } else {
        line.style.left = endPoint.x + 'px';
      }
      line.style.width = Math.abs(startPoint.x - endPoint.x) + 'px';
      break;
    case 'vertical_line':
      if (startPoint.x <= endPoint.x) {
        line.style.left = startPoint.x +'px';
      } else {
        line.style.left = endPoint.x +'px';
      }
      if (startPoint.y <= endPoint.y) {
        line.style.top = startPoint.y + 'px';
      } else {
        line.style.top = endPoint.y + 'px';
      }
      line.style.height = Math.abs(startPoint.y - endPoint.y) + 'px';
      break;
    default:
      break;
  }

  return line;
};

export const getPoint = (pX, pY) => {
  return {
    x: pX,
    y: pY,
  };
};

export const getBlockParams = (block) => {
  const left = parseInt(block.style.left, 10);
  const right = parseInt(block.style.right, 10);
  const top = parseInt(block.style.top, 10);
  const width = parseInt(block.style.width, 10);
  const height = parseInt(block.style.height, 10);
  return {
    x: left,
    y: top,
    width: width,
    height: height,

    top_p: getPoint(left + width / 2, top),
    bottom_p: getPoint(left + width / 2, top + height - IND_HEIGHT + 8),
    left_p: getPoint(left, top + height / 2),
    right_p: getPoint(right, top + height / 2),
  };
};
