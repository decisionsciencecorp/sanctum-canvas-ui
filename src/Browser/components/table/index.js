/**
 * A6.5 / A6.6 table family barrel.
 */

export {
  DEFAULT_PAGE_SIZE,
  SURFACE_STATUS,
  asArray,
  asText,
  columnsToRows,
  countChangedCells,
  formatCellDisplay,
  fromKeyedRows,
  normalizeCol,
  normalizeColumns,
  normalizeEditableCellType,
  normalizeEditableColumn,
  resolveTableStatus,
  sortRowIndices,
  toKeyedRows,
} from "./shared.js";

export { Col } from "./Col.js";
export { Table, resolveTableColumns, getTableState } from "./Table.js";
export {
  EditableTable,
  normalizeEditableColumns,
  getEditableTableState,
  rulesForCellType,
  validateEditableCell,
  validateEditableTable,
  navigateCell,
} from "./EditableTable.js";
export {
  registerTable,
  TABLE_COMPONENTS,
} from "./registerTable.js";

export { registerTable as default } from "./registerTable.js";
