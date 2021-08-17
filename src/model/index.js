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