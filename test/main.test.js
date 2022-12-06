// @ts-check
import { rejects, strictEqual, deepStrictEqual, match } from "assert";
import { test, before, describe } from "mocha";
// eslint-disable-next-line no-unused-vars
import _init, { initSync, __wasm, init } from "../main.js";

describe("sqlparser", function () {
  before(async function () {
    await init();
  });

  describe("normalize", function () {
    test("when there is a basic syntax error", async function () {
      await rejects(
        globalThis.sqlparser.normalize(
          "create table blah_5_ (id int, image blah, description text)"
        ),
        (err) => {
          strictEqual(
            err.message,
            "error parsing statement: syntax error at position 40 near 'blah'"
          );
          return true;
        }
      );
    });

    test("when there is a single create statement", async function () {
      const { type, statements } = await globalThis.sqlparser.normalize(
        "CREATE table blah_5_ (id int, image blob, description text);"
      );
      strictEqual(type, "create");
      match(statements[0], /^create table blah_5_.*/);
    });

    test("when there is a single read statement", async function () {
      const { type, statements } = await globalThis.sqlparser.normalize(
        "select * FROM fake_table_1 where something='nothing';"
      );
      strictEqual(type, "read");
      match(statements[0], /^select \* from fake_table_1.*/);
    });

    test("when there is a single grant statement", async function () {
      const { type, statements } = await globalThis.sqlparser.normalize(
        "grant INSERT, update, DELETE on foo_1337_100 to '0xd43c59d569', '0x4afe8e30'"
      );
      strictEqual(type, "acl");
      match(statements[0], /^grant delete, insert, update on foo_1337_100.*/);
    });

    test("when there is a single revoke statement", async function () {
      const { type, statements } = await globalThis.sqlparser.normalize(
        "REVOKE insert, UPDATE, delete ON foo_1337_100 from '0xd43c59d569', '0x4afe8e30'"
      );
      strictEqual(type, "acl");
      match(statements[0], /^revoke delete, insert, update on foo_1337_100.*/);
    });

    test("when there is a single write statement", async function () {
      const { type, statements } = await globalThis.sqlparser.normalize(
        "insert INTO blah_5_ values (1, 'three', 'something');"
      );
      strictEqual(type, "write");
      match(statements[0], /^insert into blah_5_ values.*/);
    });

    test("where no arguments are passed to the function", async function () {
      await rejects(
        // @ts-expect-error error
        globalThis.sqlparser.normalize(),
        (err) => {
          strictEqual(err.message, "missing required argument: statement");
          return true;
        }
      );
    });

    test("when a single statement with mixed case is normalized", async function () {
      const { type, statements } = await globalThis.sqlparser.normalize(
        "select * FrOM fake_table_1 WHere something='nothing';"
      );
      strictEqual(type, "read");
      strictEqual(
        statements.pop(),
        "select * from fake_table_1 where something = 'nothing'"
      );
    });

    test("when there are multiple write statements", async function () {
      const { type, statements } = await globalThis.sqlparser.normalize(`
      insert into blah_5_ values (1, 'three', 'something');
      update blah_5_ set description='something';
      `);
      strictEqual(type, "write");
      deepStrictEqual(statements, [
        "insert into blah_5_ values (1, 'three', 'something')",
        "update blah_5_ set description = 'something'",
      ]);
    });

    test("when there is a syntax error in a latter statement", async function () {
      await rejects(
        globalThis.sqlparser.normalize(`
      insert into blah_5_ values (1, 'three', 'something');
      update syn tax err set foo;
      `),
        (err) => {
          strictEqual(
            err.message,
            "error parsing statement: syntax error at position 81 near 'tax'"
          );
          return true;
        }
      );
    });

    test("when there is a non-syntax error", async function () {
      await rejects(
        globalThis.sqlparser.normalize("select AUTOINCREMENT from t;"),
        (err) => {
          strictEqual(
            err.message,
            "error parsing statement: 1 error occurred:\n\t* keyword not allowed: AUTOINCREMENT\n\n"
          );
          return true;
        }
      );
    });

    test("when an empty statement is passed", async function () {
      const result = globalThis.sqlparser.normalize("");
      await rejects(result, (err) => {
        strictEqual(err.message, "error parsing statement: empty string");
        return true;
      });
    });

    test("when create and mutate calls are mixed it fails", async function () {
      await rejects(
        globalThis.sqlparser.normalize(
          "create table blah_5_ (id int, image blob, description text);insert into blah_5_ values (1, 'three', 'something');"
        ),
        (err) => {
          strictEqual(
            err.message,
            "error parsing statement: syntax error at position 66 near 'insert'"
          );
          return true;
        }
      );
    });

    test("when create and query calls are mixed it fails", async function () {
      await rejects(
        globalThis.sqlparser.normalize(
          "create table blah_5_ (id int, image blob, description text);select * from blah_5_;"
        ),
        (err) => {
          strictEqual(
            err.message,
            "error parsing statement: syntax error at position 66 near 'select'"
          );
          return true;
        }
      );
    });

    test("when query and write calls are mixed it fails", async function () {
      await rejects(
        globalThis.sqlparser.normalize(
          "select * from blah_5_;insert into blah_5_ values (1, 'three', 'something');"
        ),
        (err) => {
          strictEqual(
            err.message,
            "error parsing statement: syntax error at position 28 near 'insert'"
          );
          return true;
        }
      );
    });

    test("when a mix of acl and write types are provided the type is write", async function () {
      const { type } = await globalThis.sqlparser.normalize(
        "grant insert on foo_1337_100 to '0xd43c59d569';insert into foo_1337_100 values (1, 'three', 'something');"
      );
      strictEqual(type, "write");
    });

    test("when the ordering of write/acl types doesn't affect the type", async function () {
      const { type } = await globalThis.sqlparser.normalize(
        "insert into foo_1337_100 values (1, 'three', 'something');revoke insert on foo_1337_100 from '0xd43c59d569';"
      );
      strictEqual(type, "write");
    });
  });

  describe("validateStatement()", function () {
    test("when there is a basic syntax error", async function () {
      await rejects(
        globalThis.sqlparser.validateStatement(
          "create table blah_5_ (id int, image blah, description text)"
        ),
        (err) => {
          strictEqual(
            err.message,
            "error parsing statement: syntax error at position 40 near 'blah'"
          );
          return true;
        }
      );
    });

    test("when there is a really long statement", async function () {
      await rejects(
        globalThis.sqlparser.validateStatement(
          "insert INTO blah_5_1 values (1, 'three', 'something');".repeat(650)
        ),
        (err) => {
          strictEqual(
            err.message,
            "statement size error: larger than specified max"
          );
          return true;
        }
      );
    });

    test("when there is a single create statement", async function () {
      const statement = await globalThis.sqlparser.validateStatement(
        "CREATE table blah_5 (id int, image blob, description text);"
      );
      match(statement, /^create table blah_5.*/);
    });

    test("when there is a create statement with an invalid name", async function () {
      const statement = await globalThis.sqlparser.validateStatement(
        "create TABLE blah_5_1 (id int, image blob, description text);"
      );
      match(statement, /^create table blah_5_.*/);
    });

    test("when there is a single read statement", async function () {
      const statement = await globalThis.sqlparser.validateStatement(
        "select * FROM fake_42_1 where something='nothing';"
      );
      match(statement, /^select \* from fake_42_1.*/);
    });

    test("when there is a single read statement with an invalid table name", async function () {
      await rejects(
        globalThis.sqlparser.validateStatement(
          "select * FROM fake_table_1 where something='nothing';"
        ),
        (err) => {
          strictEqual(
            err.message,
            "error validating name: walk subtree: validate: table name has wrong format: fake_table_1"
          );
          return true;
        }
      );
    });

    test("when there is a single grant statement", async function () {
      const statement = await globalThis.sqlparser.validateStatement(
        "grant INSERT, update, DELETE on foo_1337_100 to '0xd43c59d569', '0x4afe8e30'"
      );
      match(statement, /^grant delete, insert, update on foo_1337_100.*/);
    });

    test("when there is a single revoke statement", async function () {
      const statement = await globalThis.sqlparser.validateStatement(
        "REVOKE insert, UPDATE, delete ON foo_1337_100 from '0xd43c59d569', '0x4afe8e30'"
      );
      match(statement, /^revoke delete, insert, update on foo_1337_100.*/);
    });

    test("when there is a single write statement", async function () {
      const statement = await globalThis.sqlparser.validateStatement(
        "insert INTO blah_5_1 values (1, 'three', 'something');"
      );
      match(statement, /^insert into blah_5_1 values.*/);
    });

    test("when there is a single write statement with an invalid table name", async function () {
      await rejects(
        globalThis.sqlparser.validateStatement(
          "insert INTO blah_5_ values (1, 'three', 'something');"
        ),
        (err) => {
          strictEqual(
            err.message,
            "error validating name: walk subtree: validate: table name has wrong format: blah_5_"
          );
          return true;
        }
      );
    });

    test("where no arguments are passed to the function", async function () {
      await rejects(
        // @ts-expect-error error
        globalThis.sqlparser.validateStatement(),
        (err) => {
          strictEqual(err.message, "missing required argument: statement");
          return true;
        }
      );
    });

    test("when a single statement with mixed case is normalized", async function () {
      const statement = await globalThis.sqlparser.validateStatement(
        "select * FrOM fake_6_1 WHere something='nothing';"
      );
      strictEqual(
        statement,
        "select * from fake_6_1 where something = 'nothing'"
      );
    });

    test("when there are multiple write statements", async function () {
      const statement = await globalThis.sqlparser.validateStatement(`
      insert into blah_5_1 values (1, 'three', 'something');
      update blah_5_1 set description='something';
      `);
      deepStrictEqual(
        statement,
        [
          "insert into blah_5_1 values (1, 'three', 'something')",
          "update blah_5_1 set description = 'something'",
        ].join("; ")
      );
    });

    test("when there are multiple write statements and one has the wrong name format", async function () {
      await rejects(
        globalThis.sqlparser.validateStatement(`
      insert into blah_5_1 values (1, 'three', 'something');
      update blah_5_ set description='something';
      `),
        (err) => {
          strictEqual(
            err.message,
            "error validating name: walk subtree: validate: table name has wrong format: blah_5_"
          );
          return true;
        }
      );
    });

    test("when there is a syntax error in a latter statement", async function () {
      await rejects(
        globalThis.sqlparser.validateStatement(`
      insert into blah_5_ values (1, 'three', 'something');
      update syn tax err set foo;
      `),
        (err) => {
          strictEqual(
            err.message,
            "error parsing statement: syntax error at position 81 near 'tax'"
          );
          return true;
        }
      );
    });

    test("when there is a non-syntax error", async function () {
      await rejects(
        globalThis.sqlparser.validateStatement("select AUTOINCREMENT from t;"),
        (err) => {
          strictEqual(
            err.message,
            "error parsing statement: 1 error occurred:\n\t* keyword not allowed: AUTOINCREMENT\n\n"
          );
          return true;
        }
      );
    });

    test("when an empty statement is passed", async function () {
      const result = globalThis.sqlparser.validateStatement("");
      await rejects(result, (err) => {
        strictEqual(err.message, "error parsing statement: empty string");
        return true;
      });
    });

    test("when create and mutate calls are mixed it fails", async function () {
      await rejects(
        globalThis.sqlparser.validateStatement(
          "create table blah_5_ (id int, image blob, description text);insert into blah_5_ values (1, 'three', 'something');"
        ),
        (err) => {
          strictEqual(
            err.message,
            "error parsing statement: syntax error at position 66 near 'insert'"
          );
          return true;
        }
      );
    });

    test("when create and query calls are mixed it fails", async function () {
      await rejects(
        globalThis.sqlparser.validateStatement(
          "create table blah_5_ (id int, image blob, description text);select * from blah_5_;"
        ),
        (err) => {
          strictEqual(
            err.message,
            "error parsing statement: syntax error at position 66 near 'select'"
          );
          return true;
        }
      );
    });

    test("when query and write calls are mixed it fails", async function () {
      await rejects(
        globalThis.sqlparser.validateStatement(
          "select * from blah_5_;insert into blah_5_ values (1, 'three', 'something');"
        ),
        (err) => {
          strictEqual(
            err.message,
            "error parsing statement: syntax error at position 28 near 'insert'"
          );
          return true;
        }
      );
    });
  });

  describe("getUniqueTableNames()", function () {
    test("when there is a statement syntax error", async function () {
      await rejects(
        globalThis.sqlparser.getUniqueTableNames("create nothing;"),
        (err) => {
          strictEqual(
            err.message,
            "error parsing statement: syntax error at position 14 near 'nothing'"
          );
          return true;
        }
      );
    });
    test("where no arguments are passed to the function", async function () {
      await rejects(
        // @ts-expect-error error
        globalThis.sqlparser.getUniqueTableNames(),
        (err) => {
          strictEqual(err.message, "missing required argument: statement");
          return true;
        }
      );
    });
    test("when a create statement is provided", async function () {
      const tables = await globalThis.sqlparser.getUniqueTableNames(
        "create table blah_5_ (id int, image blob, description text);"
      );
      strictEqual(tables.pop(), "blah_5_");
    });

    test("when a write statement is provided", async function () {
      const tables = await globalThis.sqlparser.getUniqueTableNames(
        "insert into blah_5_ values (1, 'three', 'something');"
      );
      strictEqual(tables.pop(), "blah_5_");
    });

    test("when a read statement is provided", async function () {
      const tables = await globalThis.sqlparser.getUniqueTableNames(
        "select t1.id, t3.* from t1, t2 join t3 join (select * from t4);"
      );
      deepStrictEqual(tables, ["t1", "t2", "t3", "t4"]);
    });

    test("when multiple write statements are provided", async function () {
      const tables = await globalThis.sqlparser.getUniqueTableNames(
        "insert into blah_5_ values (1, 'five', 'something');insert into blah_3_ values (1, 'three', 'nothing');"
      );
      deepStrictEqual(tables, ["blah_5_", "blah_3_"]);
    });

    test("when an empty statement is provided", async function () {
      const tables = await globalThis.sqlparser.getUniqueTableNames("");
      deepStrictEqual(tables, []);
    });
  });

  describe("validateTableName()", function () {
    test("when provided with invalid table names", async function () {
      const invalidNames = [
        "t",
        "t2",
        "t_2_",
        "t_",
        "__",
        "t__",
        "t_2__",
        "__1",
      ];
      for (const tableName of invalidNames) {
        await rejects(
          globalThis.sqlparser.validateTableName(tableName),
          (err) => {
            strictEqual(
              err.message,
              `error validating name: table name has wrong format: ${tableName}`
            );
            return true;
          }
        );
      }
    });

    test("when provided with a valid table name", async function () {
      const validatedTable = await globalThis.sqlparser.validateTableName(
        "t_1_2"
      );
      deepStrictEqual(validatedTable, {
        name: "t_1_2",
        chainId: 1,
        tableId: 2,
        prefix: "t",
      });
    });
    test("when provided with a valid table name with multiple chars in prefix", async function () {
      const validatedTable = await globalThis.sqlparser.validateTableName(
        "table_1_2"
      );
      deepStrictEqual(validatedTable, {
        name: "table_1_2",
        chainId: 1,
        tableId: 2,
        prefix: "table",
      });
    });

    test("when provided with a valid table name without prefix", async function () {
      const validatedTable = await globalThis.sqlparser.validateTableName(
        "_1_2"
      );
      deepStrictEqual(validatedTable, {
        name: "_1_2",
        chainId: 1,
        tableId: 2,
        prefix: "",
      });
    });

    test("when provided with a valid create table name", async function () {
      const validatedTable = await globalThis.sqlparser.validateTableName(
        "t_1",
        true
      );
      deepStrictEqual(validatedTable, {
        name: "t_1",
        chainId: 1,
        prefix: "t",
      });
      // strictEqual(validatedTable.tableId, undefined);
    });

    test("when provided with a valid create table name without prefix", async function () {
      const validatedTable = await globalThis.sqlparser.validateTableName(
        "_1",
        true
      );
      deepStrictEqual(validatedTable, {
        name: "_1",
        chainId: 1,
        prefix: "",
      });
    });
  });

  describe("updateTableNames()", function () {
    test("when re-mapping table names", async function () {
      const statement = await globalThis.sqlparser.updateTableNames(
        "select `t1`.id, t3.* from t1, t2 join t3 join (select * from t4);",
        { t1: "table1", t2: "table2", t3: "table3" } // Leave t4 "as is"
      );
      // Note the canonical "join" added below to replace the comma
      deepStrictEqual(
        statement,
        "select table1.id, table3.* from table1 join table2 join table3 join (select * from t4)"
      );
    });

    test("mapping names to something invalid throws an error", async function () {
      await rejects(
        globalThis.sqlparser.updateTableNames(
          "select `t1`.id, t3.* from t1, t2 join t3 join (select * from t4);",
          { t1: "@#$%^&", t2: "valid", t3: "3.14" } // Leave t4 "as is"
        ),
        (err) => {
          strictEqual(
            err.message,
            "error parsing updated statement: syntax error at position 7 near '@'"
          );
          return true;
        }
      );
    });
  });
});