// Disable next line un-used imports just to test out exports and types
// eslint-disable-next-line no-unused-vars
import _init, { initSync, __wasm, init } from "@tableland/sqlparser";
import assert from "assert";
import { test, before } from "mocha";

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
    assert.equal(err.message, "syntax error at position 40 near 'blah'");
  }
});

test("passing", async function () {
  const [result] = await globalThis.sqlparser.normalize(
    "select * FrOM fake_table_1 WHere something='nothing';"
  );
  assert.equal(
    result,
    "select * from fake_table_1 where something = 'nothing'"
  );
});

test("multi-write", async function () {
  const result = await globalThis.sqlparser.normalize(
    "insert into blah_5_ values (1, 'three', 'something');update blah_5_ set description='something';"
  );
  assert.deepEqual(result, [
    "insert into blah_5_ values (1, 'three', 'something')",
    "update blah_5_ set description = 'something'",
  ]);
});
