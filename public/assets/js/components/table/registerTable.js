/**
 * Register A6.5 Table + A6.6 EditableTable (+ Col language carrier).
 *
 * @param {{ register: (type: string, entry: unknown) => void }} registry
 */

import { Col } from "./Col.js";
import { Table } from "./Table.js";
import { EditableTable } from "./EditableTable.js";

export const TABLE_COMPONENTS = Object.freeze({
  Col,
  Table,
  EditableTable,
});

/**
 * @param {{ register: (type: string, entry: unknown) => void }} registry
 */
export function registerTable(registry) {
  if (!registry || typeof registry.register !== "function") {
    throw new Error("registerTable: registry with register() required");
  }
  registry.register("Col", Col);
  registry.register("Table", Table);
  registry.register("EditableTable", EditableTable);
  return registry;
}

export { Col, Table, EditableTable };
export default registerTable;
