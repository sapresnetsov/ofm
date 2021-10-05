/**
 * @typedef {Object} Point
 *
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} OFMData
 *
 * @property {string} id
 * @property {string} title
 * @property {string[]} functions
 * @property {string} otype
 * @property {string} level
 * @property {string} type
 * @property {string} additionalInfo
 * @property {string[]} curation
 * @property {OFMIndicator[]} indicators
 * @property {OFMData[]} children
 */

/**
 * @typedef OFMIndicator
 *
 * @property {string} key
 * @property {number} value
 */

/**
 * @typedef {Object} BlockParams
 *
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {number} borderWidth
 * @property {Point} top
 * @property {Point} bottom
 * @property {Point} left
 * @property {Point} right
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {number} innerPaddingLeft
 * @property {number} innerPaddingRight
 * @property {number} borderWidth
 * @property {number} borderStyle
 * @property {Point} top
 * @property {Point} bottom
 * @property {Point} left
 * @property {Point} right
 * @property {number} nearParentTop
 * @property {string} backgroundColor
 * @property {boolean} isRootChild
 * @property {OFMData.id} id
 * @property {OFMData.title} title
 * @property {OFMData.functions} functions
 * @property {OFMData.type} type
 * @property {OFMData.additionalInfo} additionalInfo
 * @property {OFMData.indicators} indicators
 */

/**
 * @typedef {Object} ImplicatedBlock
 *
 * @property {string} blockId
 * @property {'top', 'left', 'right'} side
 **/

/**
 * @typedef {Object} NeighbourPath
 * @property {string} blockId
 * @property {number} pathId
 */

/**
 * @typedef {Object} Path
 *
 * @property {string} blockId
 * @property {number} pathId
 * @property {'H'|'V'} type
 * @property {ImplicatedBlock[]} implicatedBlocks
 * @property {NeighbourPath[]} neighbourPaths
 * @property {Point} start
 * @property {Point} end
 * @property {string} root
 * @property {boolean} noSelfHorizontal
 * @property {number} width
 * @property {Array} lines
 */

/**
 * @typedef {Object} BlockPaths
 *
 * @property {string} id // идентификатор родительского блока
 * @property {path} paths
 *
**/

