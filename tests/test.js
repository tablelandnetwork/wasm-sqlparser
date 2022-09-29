/* eslint-disable no-unused-vars */
import _init, { initSync, __wasm, init } from "@tableland/sqlparser";
import assert from "assert";
import { test, before, describe } from "mocha";

describe("sqlparser", function () {
  before(async function () {
    await init();
  });

  test("failing", async function () {
    try {
      await globalThis.sqlparser.normalize(
        "create table blah_5_ (id int, image blah, description text)"
      );
      throw new Error("wrong error");
    } catch (err) {
      assert.strictEqual(
        err.message,
        "syntax error at position 40 near 'blah'"
      );
    }
  });

  test("create type", async function () {
    const { type } = await globalThis.sqlparser.normalize(
      "create table blah_5_ (id int, image blob, description text);"
    );
    assert.strictEqual(type, "create");
  });

  test("read type", async function () {
    const { type } = await globalThis.sqlparser.normalize(
      "select * from fake_table_1 where something='nothing';"
    );
    assert.strictEqual(type, "read");
  });

  test("write type", async function () {
    const { type } = await globalThis.sqlparser.normalize(
      "insert into blah_5_ values (1, 'three', 'something');"
    );
    assert.strictEqual(type, "write");
  });

  test("missing args", async function () {
    try {
      // @ts-ignore error
      await globalThis.sqlparser.normalize();
      throw new Error("wrong error");
    } catch (err) {
      assert.strictEqual(err.message, "missing required argument 'statement'");
    }
  });

  test("passing", async function () {
    const { type, statements } = await globalThis.sqlparser.normalize(
      "select * FrOM fake_table_1 WHere something='nothing';"
    );
    assert.strictEqual(type, "read");
    assert.strictEqual(
      statements.pop(),
      "select * from fake_table_1 where something = 'nothing'"
    );
  });

  test("multi-write", async function () {
    const { type, statements } = await globalThis.sqlparser.normalize(
      "insert into blah_5_ values (1, 'three', 'something');update blah_5_ set description='something';"
    );
    assert.strictEqual(type, "write");
    assert.deepStrictEqual(statements, [
      "insert into blah_5_ values (1, 'three', 'something')",
      "update blah_5_ set description = 'something'",
    ]);
  });

  test("create and mutate fails", async function () {
    try {
      await globalThis.sqlparser.normalize(
        "create table blah_5_ (id int, image blob, description text);insert into blah_5_ values (1, 'three', 'something');"
      );
      throw new Error("wrong error");
    } catch (err) {
      assert.strictEqual(
        err.message,
        "syntax error at position 66 near 'insert'"
      );
    }
  });

  test("create and query fails", async function () {
    try {
      await globalThis.sqlparser.normalize(
        "create table blah_5_ (id int, image blob, description text);select * from blah_5_;"
      );
      throw new Error("wrong error");
    } catch (err) {
      assert.strictEqual(
        err.message,
        "syntax error at position 66 near 'select'"
      );
    }
  });

  test("query and write fails", async function () {
    try {
      await globalThis.sqlparser.normalize(
        "select * from blah_5_;insert into blah_5_ values (1, 'three', 'something');"
      );
      throw new Error("wrong error");
    } catch (err) {
      assert.strictEqual(
        err.message,
        "syntax error at position 28 near 'insert'"
      );
    }
  });

  test("settings", async function () {
    // Also test destructuring
    const { maxQuerySize } = globalThis.sqlparser;
    assert.strictEqual(maxQuerySize(), 35000);
    assert.strictEqual(maxQuerySize(10), 10);
    assert.strictEqual(maxQuerySize(), 10);
  });

  test("max query size", async function () {
    // Also test destructuring
    const { maxQuerySize, normalize } = globalThis.sqlparser;
    try {
      maxQuerySize(10);
      await normalize("select * FrOM fake_table_1 WHere something='nothing';");
      throw new Error("wrong error");
    } catch (err) {
      assert.strictEqual(
        err.message,
        "statement size larger than specified max"
      );
    }
  });
});
