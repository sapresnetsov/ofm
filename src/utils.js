/* eslint-disable indent */
// отрисовка орг. блока
import {
  BACKGROUND_COLOR,
  BORDER_WIDTH,
  H_BLOCK_PADDING,
  IND_HEIGHT,
  IND_WIDTH, INDICATOR_TYPE_TEXT,
  MIN_BLOCK_HEIGHT,
} from './constants';

export const createBlock = (x, y, width, height, blockType='default', blockLevel='default', title, functions, indicators) => {
  const outerBlock = document.createElement(`div`);
  outerBlock.setAttribute(`class`, `outer_block`);
  outerBlock.style.left = `${x}px`;
  outerBlock.style.top = `${y}px`;
  outerBlock.style.width = `${width}px`;
  outerBlock.style.height = `${height}px`;

  const blockBorderWidth = BORDER_WIDTH[blockLevel];
  const blockBody = document.createElement(`div`);
  blockBody.setAttribute(`class`, `inner_block ${blockLevel}`);
  blockBody.style.paddingLeft = blockBody.style.paddingRight = `${H_BLOCK_PADDING}px`;
  blockBody.style.borderWidth = `${blockBorderWidth}px`;
  blockBody.style.backgroundColor = `${BACKGROUND_COLOR[blockType]}`;
  // Заголовок блока
  const blockTitle = document.createElement(`h3`);
  blockTitle.setAttribute(`class`, `title_text text_color_text`);
  blockTitle.textContent = title;
  blockBody.appendChild(blockTitle);

  // функции
  if (!!functions && functions.length > 0) {
    functions.forEach((func) => {
      const funcText = document.createElement(`p`);
      funcText.setAttribute(`class`, `function_text text_color_text`);
      funcText.textContent = func;
      blockBody.appendChild(funcText);
    });
  }
  outerBlock.appendChild(blockBody);

  // индикаторы
  const footerBlock = document.createElement(`div`);
  if (!indicators) {
    footerBlock.style.visibility = 'hidden';
  } else {
    footerBlock.setAttribute(`class`, `text_color_indicator`);
    footerBlock.style.top = `${MIN_BLOCK_HEIGHT + blockBorderWidth}px`;
    const indBorderWidth = BORDER_WIDTH.ind;
    const approxIndicatorBlockWidth = (IND_WIDTH + indBorderWidth * 2) * indicators.length;
    let indicatorWidth = IND_WIDTH;
    if (approxIndicatorBlockWidth > width) {
      indicatorWidth = Math.trunc(width / indicators.length) + indBorderWidth;
    }
    // правая сторона блока рассчитывается как
    // Ширина+Удвоенный padding+Удвоенная Толщина рамки-Ширина индикатора+Удвоенная Толщина рамки индикатора
    let indicatorX = width + H_BLOCK_PADDING * 2 + blockBorderWidth * 2 - indicatorWidth - indBorderWidth * 2;
    indicators.reverse().forEach((ind) => {
      const indicator = document.createElement(`div`);
      indicator.setAttribute(`class`, `indicator ${blockType}`);
      indicator.style.left = `${indicatorX}px`;
      indicator.style.width = `${indicatorWidth}px`;
      indicator.style.height = `${IND_HEIGHT}px`;
      indicator.style.borderWidth = `${indBorderWidth}px`;
      indicator.innerHTML = `<p style="margin: 0">${INDICATOR_TYPE_TEXT[ind.key]} ${ind.value}</p>`;
      footerBlock.appendChild(indicator);

      indicatorX -= (indicatorWidth + indBorderWidth);
    });
  }
  outerBlock.appendChild(footerBlock);

  return outerBlock;
};

export const createLine = (startPoint, endPoint, lineType) => {
  const line = document.createElement(`div`);
  line.setAttribute(`class`, `line ` + lineType);

  switch (lineType) {
    case `horizontal_line`:
      if (startPoint.y <= endPoint.y) {
        line.style.top = startPoint.y +`px`;
      } else {
        line.style.top = endPoint.y +`px`;
      }
      if (startPoint.x <= endPoint.x) {
        line.style.left = startPoint.x + `px`;
      } else {
        line.style.left = endPoint.x + `px`;
      }
      line.style.width = Math.abs(startPoint.x - endPoint.x) + `px`;
      break;
    case `vertical_line`:
      if (startPoint.x <= endPoint.x) {
        line.style.left = startPoint.x +`px`;
      } else {
        line.style.left = endPoint.x +`px`;
      }
      if (startPoint.y <= endPoint.y) {
        line.style.top = startPoint.y + `px`;
      } else {
        line.style.top = endPoint.y + `px`;
      }
      line.style.height = Math.abs(startPoint.y - endPoint.y) + `px`;
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

/**
 * Получение фактических параметров HTML-блока
 * @param {Object} block
 * @return {{top_p: {x: *, y: *}, left_p: {x: *, y: *}, right_p: {x: *, y: *}, bottom_p: {x: *, y: *}, x: number, width: number, y: number, height: number}}
 */
export const getBlockParams = (block) => {
  const left = parseInt(block.style.left, 10);
  const top = parseInt(block.style.top, 10);
  const width = parseInt(block.style.width, 10);
  const height = parseInt(block.children[0].style.height, 10);
  // рамка устанавливается у внутреннего блока
  const borderWidth = parseInt(block.children[0].style.borderWidth, 10);
  return {
    x: left,
    y: top,
    width: width,
    height: height,
    borderWidth: borderWidth,
    top_p: getPoint(left + width / 2, top),
    bottom_p: getPoint(left + width / 2, top + height + borderWidth * 2),
    left_p: getPoint(left, top + height / 2),
    right_p: getPoint(left + width + borderWidth * 2, top + height / 2),
  };
};
