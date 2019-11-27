export const svgNS = `http://www.w3.org/2000/svg`;
export const TITLE_FONT_SIZE = `14pt`;
export const FUNC_FONT_SIZE = `12pt`;
export const TITLE_SPACE_AFTER = `5pt`;

export const BLOCK_TYPES = {
  leadership: `leadership`,
  deputy: `deputy`,
  manufacturing: `manufacturing`,
  technical: `technical`,
  economy: `economy`,
  management: `management`,
  default: `default`,
  ind: `indicator`,
};
export const BLOCK_LEVELS = {
  first: 'first',
  second: 'second',
  independent: 'independent',
  dependent: 'dependent',
  default: 'default',
};

// pt -> px
export const BORDER_WIDTH = {
  first: 4,
  second: 3,
  independent: 1,
  dependent: 1,
  default: 1,
  ind: 1,
};

export const BACKGROUND_COLOR = {
  leadership: `#d9d9d9`,
  deputy: `#d9d9d9`,
  manufacturing: `#d8e3bf`,
  technical: `#daeef3`,
  economy: `#f9fcd1`,
  management: `#dfd9e8`,
  default: `white`,
  ind: `#ffffca`,
};

export const POSITION = 'S';
export const ORG_UNIT = 'O';

export const TOP = `top`;
export const BOTTOM = `bottom`;
export const LEFT = `left`;
export const RIGHT = `right`;

export const MIN_BLOCK_WIDTH = 250;
export const MAX_BLOCK_WIDTH = 300;
export const MIN_BLOCK_HEIGHT = 100;
export const MAX_BLOCK_HEIGHT = 100;
export const IND_HEIGHT = 15;
export const IND_WIDTH = 40;
// при задании величины необходимо учитывать padding внутри блоков
export const H_BLOCK_PADDING = 5;
export const H_SPACE_BETWEEN_BLOCKS = 20 + H_BLOCK_PADDING * 2;
export const V_SPACE_BETWEEN_BLOCKS = 25;
export const LEVEL_WIDTH_STEP = 15;

