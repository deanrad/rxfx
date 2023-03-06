import ts from "typescript";
import { SlayItem } from "../types";

export function getJestAST(spec: SlayItem) {
  const block =
    ["It", "Test"].includes(spec.tag) || spec.content.length === 0
      ? "it.todo"
      : "describe";
  const shouldNest = block === "describe";

  // Only some tags are self-describing
  const text = ["Context", "It", "Describe", "Test", "it.todo"].includes(
    spec.tag
  )
    ? spec.text
    : `${spec.tag} ${spec.text}`;

  if (!shouldNest) {
    return ts.createExpressionStatement(
      ts.createCall(
        ts.createPropertyAccess(
          ts.createIdentifier("it"),
          ts.createIdentifier("todo")
        ),
        undefined,
        [ts.createStringLiteral(text)]
      )
    );
  }

  // prettier-ignore
  return ts.createExpressionStatement(
    ts.createCall(ts.createIdentifier(block), undefined, [
      ts.createStringLiteral(text),
      ts.createArrowFunction(
        undefined,
        undefined,
        [],
        undefined,
        ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
        ts.createBlock(
          [
            ...spec.content.map(subSpec => getJestAST(subSpec))
          ],
          true
        )
      ),
    ])
  );
}

/** Does the printing work */
const printer = ts.createPrinter({
  newLine: ts.NewLineKind.LineFeed,
  omitTrailingSemicolon: false,
});

/** Conventions for output = not an actual file */
const output = ts.createSourceFile(
  "_testOut.ts",
  "",
  ts.ScriptTarget.Latest,
  /*setParentNodes*/ false,
  ts.ScriptKind.TS
);

function getJestTxt(jestAST: ts.ExpressionStatement) {
  return printer.printNode(ts.EmitHint.Unspecified, jestAST, output);
}

export function convertSlayToJest(spec: SlayItem): string {
  const jestAST = getJestAST(spec);
  const indent4 = getJestTxt(jestAST);
  return indent4.replace(/    /g, "  ");
}
