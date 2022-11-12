// Type definitions for @tableland/sqlparser
// Project: @tableland/sqlparser
// Definitions by: Carson Farmer <carson@textile.io>

declare module "@tableland/sqlparser" {
  /**
   * Initialize the @tableland/sqlparser module.
   * This must be called first to populate the sqlparser global namespace.
   *
   * @param input Input is provided primarily for testing purposes. It can be an optional `string`,
   * `Request`, or `URL` specifing a "remote" WASM source, or a `BufferSource` to specify a local WASM file.
   * It is best to leave undefined, and allow the library to use the included local WASM binary.
   * @return A `Promise` that resolves to a WASM `Exports` object.
   */
  export function init(
    input?: string | Request | URL | BufferSource
  ): Promise<WebAssembly.Exports>;

  export default init;

  /**
   * Initialize the @tableland/sqlparser module.
   * This is the synchronous counter-part to `init`, and is included primarily for testing purposes.
   *
   * @param bytes The input `bytes` must be a `BufferSource` to specify a local WASM file.
   * @return A WASM `Exports` object.
   */
  export function initSync(bytes: BufferSource): WebAssembly.Exports;

  /**
   * The WASM `Exports` object cache.
   */
  export const __wasm: WebAssembly.Exports | undefined;

  export type NormalizeResult = sqlparser.NormalizeResult;
}

declare namespace sqlparser {
  /**
   * Information about a (set of) normalized SQL statement(s).
   */
  interface NormalizeResult {
    type: "read" | "write" | "create" | "acl";
    statements: Array<string>;
  }

  /**
   * Validate and normalize a string containing (possibly multiple) SQL statement(s).
   * @param statement A string containing SQL statement(s).
   * @return A `Promise` that resolves to an array or normalized SQL statements.
   */
  export function normalize(statement: string): Promise<NormalizeResult>;

  /**
   * Validate and return the sha2 hash string of the schema from a CREATE statement.
   * @param statement A string containing a SQL CREATE statement.
   * @return A `Promise` that resolves to a string.
   */
  export function structureHash(statement: string): Promise<string>;

  /**
   * Set or get the maximum allowable query size.
   * @param size If a valid number is given, maxQuerySize is set to size.
   * If no value is specifed, the function will return the current maxQuerySize value.
   * @return The (possibly updated) maximum allowable query size in bytes.
   */
  export function maxQuerySize(size?: number): number;
}
