"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@typescript-eslint/utils");
const tsutils = __importStar(require("ts-api-utils"));
const ts = __importStar(require("typescript"));
const util_1 = require("../util");
const assertionFunctionUtils_1 = require("../util/assertionFunctionUtils");
// Truthiness utilities
// #region
const isTruthyLiteral = (type) => tsutils.isTrueLiteralType(type) ||
    //  || type.
    (type.isLiteral() && !!type.value);
const isPossiblyFalsy = (type) => tsutils
    .unionTypeParts(type)
    // Intersections like `string & {}` can also be possibly falsy,
    // requiring us to look into the intersection.
    .flatMap(type => tsutils.intersectionTypeParts(type))
    // PossiblyFalsy flag includes literal values, so exclude ones that
    // are definitely truthy
    .filter(t => !isTruthyLiteral(t))
    .some(type => (0, util_1.isTypeFlagSet)(type, ts.TypeFlags.PossiblyFalsy));
const isPossiblyTruthy = (type) => tsutils
    .unionTypeParts(type)
    .map(type => tsutils.intersectionTypeParts(type))
    .some(intersectionParts => 
// It is possible to define intersections that are always falsy,
// like `"" & { __brand: string }`.
intersectionParts.every(type => !tsutils.isFalsyType(type)));
// Nullish utilities
const nullishFlag = ts.TypeFlags.Undefined | ts.TypeFlags.Null;
const isNullishType = (type) => (0, util_1.isTypeFlagSet)(type, nullishFlag);
const isPossiblyNullish = (type) => tsutils.unionTypeParts(type).some(isNullishType);
const isAlwaysNullish = (type) => tsutils.unionTypeParts(type).every(isNullishType);
// isLiteralType only covers numbers and strings, this is a more exhaustive check.
const isLiteral = (type) => tsutils.isBooleanLiteralType(type) ||
    type.flags === ts.TypeFlags.Undefined ||
    type.flags === ts.TypeFlags.Null ||
    type.flags === ts.TypeFlags.Void ||
    type.isLiteral();
exports.default = (0, util_1.createRule)({
    name: 'no-unnecessary-condition',
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow conditionals where the type is always truthy or always falsy',
            recommended: 'strict',
            requiresTypeChecking: true,
        },
        fixable: 'code',
        messages: {
            alwaysFalsy: 'Unnecessary conditional, value is always falsy.',
            alwaysFalsyFunc: 'This callback should return a conditional, but return is always falsy.',
            alwaysNullish: 'Unnecessary conditional, left-hand side of `??` operator is always `null` or `undefined`.',
            alwaysTruthy: 'Unnecessary conditional, value is always truthy.',
            alwaysTruthyFunc: 'This callback should return a conditional, but return is always truthy.',
            literalBooleanExpression: 'Unnecessary conditional, both sides of the expression are literal values.',
            never: 'Unnecessary conditional, value is `never`.',
            neverNullish: 'Unnecessary conditional, expected left-hand side of `??` operator to be possibly null or undefined.',
            neverOptionalChain: 'Unnecessary optional chain on a non-nullish value.',
            noOverlapBooleanExpression: 'Unnecessary conditional, the types have no overlap.',
            noStrictNullCheck: 'This rule requires the `strictNullChecks` compiler option to be turned on to function correctly.',
            typeGuardAlreadyIsType: 'Unnecessary conditional, expression already has the type being checked by the {{typeGuardOrAssertionFunction}}.',
        },
        schema: [
            {
                type: 'object',
                additionalProperties: false,
                properties: {
                    allowConstantLoopConditions: {
                        type: 'boolean',
                        description: 'Whether to ignore constant loop conditions, such as `while (true)`.',
                    },
                    allowRuleToRunWithoutStrictNullChecksIKnowWhatIAmDoing: {
                        type: 'boolean',
                        description: 'Whether to not error when running with a tsconfig that has strictNullChecks turned.',
                    },
                    checkTypePredicates: {
                        type: 'boolean',
                        description: 'Whether to check the asserted argument of a type predicate function for unnecessary conditions',
                    },
                },
            },
        ],
    },
    defaultOptions: [
        {
            allowConstantLoopConditions: false,
            allowRuleToRunWithoutStrictNullChecksIKnowWhatIAmDoing: false,
            checkTypePredicates: false,
        },
    ],
    create(context, [{ allowConstantLoopConditions, allowRuleToRunWithoutStrictNullChecksIKnowWhatIAmDoing, checkTypePredicates, },]) {
        const services = (0, util_1.getParserServices)(context);
        const checker = services.program.getTypeChecker();
        const compilerOptions = services.program.getCompilerOptions();
        const isStrictNullChecks = tsutils.isStrictCompilerOptionEnabled(compilerOptions, 'strictNullChecks');
        if (!isStrictNullChecks &&
            allowRuleToRunWithoutStrictNullChecksIKnowWhatIAmDoing !== true) {
            context.report({
                loc: {
                    start: { column: 0, line: 0 },
                    end: { column: 0, line: 0 },
                },
                messageId: 'noStrictNullCheck',
            });
        }
        function nodeIsArrayType(node) {
            const nodeType = (0, util_1.getConstrainedTypeAtLocation)(services, node);
            return tsutils
                .unionTypeParts(nodeType)
                .some(part => checker.isArrayType(part));
        }
        function nodeIsTupleType(node) {
            const nodeType = (0, util_1.getConstrainedTypeAtLocation)(services, node);
            return tsutils
                .unionTypeParts(nodeType)
                .some(part => checker.isTupleType(part));
        }
        function isArrayIndexExpression(node) {
            return (
            // Is an index signature
            node.type === utils_1.AST_NODE_TYPES.MemberExpression &&
                node.computed &&
                // ...into an array type
                (nodeIsArrayType(node.object) ||
                    // ... or a tuple type
                    (nodeIsTupleType(node.object) &&
                        // Exception: literal index into a tuple - will have a sound type
                        node.property.type !== utils_1.AST_NODE_TYPES.Literal)));
        }
        function isNullableMemberExpression(node) {
            const objectType = services.getTypeAtLocation(node.object);
            if (node.computed) {
                const propertyType = services.getTypeAtLocation(node.property);
                return isNullablePropertyType(objectType, propertyType);
            }
            const property = node.property;
            // Get the actual property name, to account for private properties (this.#prop).
            const propertyName = context.sourceCode.getText(property);
            const propertyType = objectType
                .getProperties()
                .find(prop => prop.name === propertyName);
            if (propertyType &&
                tsutils.isSymbolFlagSet(propertyType, ts.SymbolFlags.Optional)) {
                return true;
            }
            return false;
        }
        /**
         * Checks if a conditional node is necessary:
         * if the type of the node is always true or always false, it's not necessary.
         */
        function checkNode(expression, isUnaryNotArgument = false, node = expression) {
            // Check if the node is Unary Negation expression and handle it
            if (expression.type === utils_1.AST_NODE_TYPES.UnaryExpression &&
                expression.operator === '!') {
                return checkNode(expression.argument, !isUnaryNotArgument, node);
            }
            // Since typescript array index signature types don't represent the
            //  possibility of out-of-bounds access, if we're indexing into an array
            //  just skip the check, to avoid false positives
            if (isArrayIndexExpression(expression)) {
                return;
            }
            // When checking logical expressions, only check the right side
            //  as the left side has been checked by checkLogicalExpressionForUnnecessaryConditionals
            //
            // Unless the node is nullish coalescing, as it's common to use patterns like `nullBool ?? true` to to strict
            //  boolean checks if we inspect the right here, it'll usually be a constant condition on purpose.
            // In this case it's better to inspect the type of the expression as a whole.
            if (expression.type === utils_1.AST_NODE_TYPES.LogicalExpression &&
                expression.operator !== '??') {
                return checkNode(expression.right);
            }
            const type = (0, util_1.getConstrainedTypeAtLocation)(services, expression);
            // Conditional is always necessary if it involves:
            //    `any` or `unknown` or a naked type variable
            if (tsutils
                .unionTypeParts(type)
                .some(part => (0, util_1.isTypeAnyType)(part) ||
                (0, util_1.isTypeUnknownType)(part) ||
                (0, util_1.isTypeFlagSet)(part, ts.TypeFlags.TypeVariable))) {
                return;
            }
            let messageId = null;
            if ((0, util_1.isTypeFlagSet)(type, ts.TypeFlags.Never)) {
                messageId = 'never';
            }
            else if (!isPossiblyTruthy(type)) {
                messageId = !isUnaryNotArgument ? 'alwaysFalsy' : 'alwaysTruthy';
            }
            else if (!isPossiblyFalsy(type)) {
                messageId = !isUnaryNotArgument ? 'alwaysTruthy' : 'alwaysFalsy';
            }
            if (messageId) {
                context.report({ node, messageId });
            }
        }
        function checkNodeForNullish(node) {
            const type = (0, util_1.getConstrainedTypeAtLocation)(services, node);
            // Conditional is always necessary if it involves `any`, `unknown` or a naked type parameter
            if ((0, util_1.isTypeFlagSet)(type, ts.TypeFlags.Any |
                ts.TypeFlags.Unknown |
                ts.TypeFlags.TypeParameter |
                ts.TypeFlags.TypeVariable)) {
                return;
            }
            let messageId = null;
            if ((0, util_1.isTypeFlagSet)(type, ts.TypeFlags.Never)) {
                messageId = 'never';
            }
            else if (!isPossiblyNullish(type) &&
                !(node.type === utils_1.AST_NODE_TYPES.MemberExpression &&
                    isNullableMemberExpression(node))) {
                // Since typescript array index signature types don't represent the
                //  possibility of out-of-bounds access, if we're indexing into an array
                //  just skip the check, to avoid false positives
                if (!isArrayIndexExpression(node) &&
                    !(node.type === utils_1.AST_NODE_TYPES.ChainExpression &&
                        node.expression.type !== utils_1.AST_NODE_TYPES.TSNonNullExpression &&
                        optionChainContainsOptionArrayIndex(node.expression))) {
                    messageId = 'neverNullish';
                }
            }
            else if (isAlwaysNullish(type)) {
                messageId = 'alwaysNullish';
            }
            if (messageId) {
                context.report({ node, messageId });
            }
        }
        /**
         * Checks that a binary expression is necessarily conditional, reports otherwise.
         * If both sides of the binary expression are literal values, it's not a necessary condition.
         *
         * NOTE: It's also unnecessary if the types that don't overlap at all
         *    but that case is handled by the Typescript compiler itself.
         *    Known exceptions:
         *      - https://github.com/microsoft/TypeScript/issues/32627
         *      - https://github.com/microsoft/TypeScript/issues/37160 (handled)
         */
        const BOOL_OPERATORS = new Set([
            '<',
            '>',
            '<=',
            '>=',
            '==',
            '===',
            '!=',
            '!==',
        ]);
        const isBoolOperator = (operator) => BOOL_OPERATORS.has(operator);
        function checkIfBoolExpressionIsNecessaryConditional(node, left, right, operator) {
            const leftType = (0, util_1.getConstrainedTypeAtLocation)(services, left);
            const rightType = (0, util_1.getConstrainedTypeAtLocation)(services, right);
            if (isLiteral(leftType) && isLiteral(rightType)) {
                context.report({ node, messageId: 'literalBooleanExpression' });
                return;
            }
            // Workaround for https://github.com/microsoft/TypeScript/issues/37160
            if (isStrictNullChecks) {
                const UNDEFINED = ts.TypeFlags.Undefined;
                const NULL = ts.TypeFlags.Null;
                const VOID = ts.TypeFlags.Void;
                const isComparable = (type, flag) => {
                    // Allow comparison to `any`, `unknown` or a naked type parameter.
                    flag |=
                        ts.TypeFlags.Any |
                            ts.TypeFlags.Unknown |
                            ts.TypeFlags.TypeParameter |
                            ts.TypeFlags.TypeVariable;
                    // Allow loose comparison to nullish values.
                    if (operator === '==' || operator === '!=') {
                        flag |= NULL | UNDEFINED | VOID;
                    }
                    return (0, util_1.isTypeFlagSet)(type, flag);
                };
                if ((leftType.flags === UNDEFINED &&
                    !isComparable(rightType, UNDEFINED | VOID)) ||
                    (rightType.flags === UNDEFINED &&
                        !isComparable(leftType, UNDEFINED | VOID)) ||
                    (leftType.flags === NULL && !isComparable(rightType, NULL)) ||
                    (rightType.flags === NULL && !isComparable(leftType, NULL))) {
                    context.report({ node, messageId: 'noOverlapBooleanExpression' });
                    return;
                }
            }
        }
        /**
         * Checks that a logical expression contains a boolean, reports otherwise.
         */
        function checkLogicalExpressionForUnnecessaryConditionals(node) {
            if (node.operator === '??') {
                checkNodeForNullish(node.left);
                return;
            }
            // Only checks the left side, since the right side might not be "conditional" at all.
            // The right side will be checked if the LogicalExpression is used in a conditional context
            checkNode(node.left);
        }
        /**
         * Checks that a testable expression of a loop is necessarily conditional, reports otherwise.
         */
        function checkIfLoopIsNecessaryConditional(node) {
            if (node.test == null) {
                // e.g. `for(;;)`
                return;
            }
            /**
             * Allow:
             *   while (true) {}
             *   for (;true;) {}
             *   do {} while (true)
             */
            if (allowConstantLoopConditions &&
                tsutils.isTrueLiteralType((0, util_1.getConstrainedTypeAtLocation)(services, node.test))) {
                return;
            }
            checkNode(node.test);
        }
        function checkCallExpression(node) {
            if (checkTypePredicates) {
                const truthinessAssertedArgument = (0, assertionFunctionUtils_1.findTruthinessAssertedArgument)(services, node);
                if (truthinessAssertedArgument != null) {
                    checkNode(truthinessAssertedArgument);
                }
                const typeGuardAssertedArgument = (0, assertionFunctionUtils_1.findTypeGuardAssertedArgument)(services, node);
                if (typeGuardAssertedArgument != null) {
                    const typeOfArgument = (0, util_1.getConstrainedTypeAtLocation)(services, typeGuardAssertedArgument.argument);
                    if (typeOfArgument === typeGuardAssertedArgument.type) {
                        context.report({
                            node: typeGuardAssertedArgument.argument,
                            messageId: 'typeGuardAlreadyIsType',
                            data: {
                                typeGuardOrAssertionFunction: typeGuardAssertedArgument.asserts
                                    ? 'assertion function'
                                    : 'type guard',
                            },
                        });
                    }
                }
            }
            // If this is something like arr.filter(x => /*condition*/), check `condition`
            if ((0, util_1.isArrayMethodCallWithPredicate)(context, services, node) &&
                node.arguments.length) {
                const callback = node.arguments[0];
                // Inline defined functions
                if (callback.type === utils_1.AST_NODE_TYPES.ArrowFunctionExpression ||
                    callback.type === utils_1.AST_NODE_TYPES.FunctionExpression) {
                    // Two special cases, where we can directly check the node that's returned:
                    // () => something
                    if (callback.body.type !== utils_1.AST_NODE_TYPES.BlockStatement) {
                        return checkNode(callback.body);
                    }
                    // () => { return something; }
                    const callbackBody = callback.body.body;
                    if (callbackBody.length === 1 &&
                        callbackBody[0].type === utils_1.AST_NODE_TYPES.ReturnStatement &&
                        callbackBody[0].argument) {
                        return checkNode(callbackBody[0].argument);
                    }
                    // Potential enhancement: could use code-path analysis to check
                    //   any function with a single return statement
                    // (Value to complexity ratio is dubious however)
                }
                // Otherwise just do type analysis on the function as a whole.
                const returnTypes = tsutils
                    .getCallSignaturesOfType((0, util_1.getConstrainedTypeAtLocation)(services, callback))
                    .map(sig => sig.getReturnType());
                /* istanbul ignore if */ if (returnTypes.length === 0) {
                    // Not a callable function
                    return;
                }
                // Predicate is always necessary if it involves `any` or `unknown`
                if (returnTypes.some(t => (0, util_1.isTypeAnyType)(t) || (0, util_1.isTypeUnknownType)(t))) {
                    return;
                }
                if (!returnTypes.some(isPossiblyFalsy)) {
                    return context.report({
                        node: callback,
                        messageId: 'alwaysTruthyFunc',
                    });
                }
                if (!returnTypes.some(isPossiblyTruthy)) {
                    return context.report({
                        node: callback,
                        messageId: 'alwaysFalsyFunc',
                    });
                }
            }
        }
        // Recursively searches an optional chain for an array index expression
        //  Has to search the entire chain, because an array index will "infect" the rest of the types
        //  Example:
        //  ```
        //  [{x: {y: "z"} }][n] // type is {x: {y: "z"}}
        //    ?.x // type is {y: "z"}
        //    ?.y // This access is considered "unnecessary" according to the types
        //  ```
        function optionChainContainsOptionArrayIndex(node) {
            const lhsNode = node.type === utils_1.AST_NODE_TYPES.CallExpression ? node.callee : node.object;
            if (node.optional && isArrayIndexExpression(lhsNode)) {
                return true;
            }
            if (lhsNode.type === utils_1.AST_NODE_TYPES.MemberExpression ||
                lhsNode.type === utils_1.AST_NODE_TYPES.CallExpression) {
                return optionChainContainsOptionArrayIndex(lhsNode);
            }
            return false;
        }
        function isNullablePropertyType(objType, propertyType) {
            if (propertyType.isUnion()) {
                return propertyType.types.some(type => isNullablePropertyType(objType, type));
            }
            if (propertyType.isNumberLiteral() || propertyType.isStringLiteral()) {
                const propType = (0, util_1.getTypeOfPropertyOfName)(checker, objType, propertyType.value.toString());
                if (propType) {
                    return (0, util_1.isNullableType)(propType);
                }
            }
            const typeName = (0, util_1.getTypeName)(checker, propertyType);
            return checker
                .getIndexInfosOfType(objType)
                .some(info => (0, util_1.getTypeName)(checker, info.keyType) === typeName);
        }
        // Checks whether a member expression is nullable or not regardless of it's previous node.
        //  Example:
        //  ```
        //  // 'bar' is nullable if 'foo' is null.
        //  // but this function checks regardless of 'foo' type, so returns 'true'.
        //  declare const foo: { bar : { baz: string } } | null
        //  foo?.bar;
        //  ```
        function isMemberExpressionNullableOriginFromObject(node) {
            const prevType = (0, util_1.getConstrainedTypeAtLocation)(services, node.object);
            const property = node.property;
            if (prevType.isUnion() && (0, util_1.isIdentifier)(property)) {
                const isOwnNullable = prevType.types.some(type => {
                    if (node.computed) {
                        const propertyType = (0, util_1.getConstrainedTypeAtLocation)(services, node.property);
                        return isNullablePropertyType(type, propertyType);
                    }
                    const propType = (0, util_1.getTypeOfPropertyOfName)(checker, type, property.name);
                    if (propType) {
                        return (0, util_1.isNullableType)(propType);
                    }
                    return !!checker.getIndexInfoOfType(type, ts.IndexKind.String);
                });
                return !isOwnNullable && (0, util_1.isNullableType)(prevType);
            }
            return false;
        }
        function isCallExpressionNullableOriginFromCallee(node) {
            const prevType = (0, util_1.getConstrainedTypeAtLocation)(services, node.callee);
            if (prevType.isUnion()) {
                const isOwnNullable = prevType.types.some(type => {
                    const signatures = type.getCallSignatures();
                    return signatures.some(sig => (0, util_1.isNullableType)(sig.getReturnType()));
                });
                return !isOwnNullable && (0, util_1.isNullableType)(prevType);
            }
            return false;
        }
        function isOptionableExpression(node) {
            const type = (0, util_1.getConstrainedTypeAtLocation)(services, node);
            const isOwnNullable = node.type === utils_1.AST_NODE_TYPES.MemberExpression
                ? !isMemberExpressionNullableOriginFromObject(node)
                : node.type === utils_1.AST_NODE_TYPES.CallExpression
                    ? !isCallExpressionNullableOriginFromCallee(node)
                    : true;
            return ((0, util_1.isTypeFlagSet)(type, ts.TypeFlags.Any | ts.TypeFlags.Unknown) ||
                (isOwnNullable && (0, util_1.isNullableType)(type)));
        }
        function checkOptionalChain(node, beforeOperator, fix) {
            // We only care if this step in the chain is optional. If just descend
            // from an optional chain, then that's fine.
            if (!node.optional) {
                return;
            }
            // Since typescript array index signature types don't represent the
            //  possibility of out-of-bounds access, if we're indexing into an array
            //  just skip the check, to avoid false positives
            if (optionChainContainsOptionArrayIndex(node)) {
                return;
            }
            const nodeToCheck = node.type === utils_1.AST_NODE_TYPES.CallExpression ? node.callee : node.object;
            if (isOptionableExpression(nodeToCheck)) {
                return;
            }
            const questionDotOperator = (0, util_1.nullThrows)(context.sourceCode.getTokenAfter(beforeOperator, token => token.type === utils_1.AST_TOKEN_TYPES.Punctuator && token.value === '?.'), util_1.NullThrowsReasons.MissingToken('operator', node.type));
            context.report({
                loc: questionDotOperator.loc,
                node,
                messageId: 'neverOptionalChain',
                fix(fixer) {
                    return fixer.replaceText(questionDotOperator, fix);
                },
            });
        }
        function checkOptionalMemberExpression(node) {
            checkOptionalChain(node, node.object, node.computed ? '' : '.');
        }
        function checkOptionalCallExpression(node) {
            checkOptionalChain(node, node.callee, '');
        }
        function checkAssignmentExpression(node) {
            // Similar to checkLogicalExpressionForUnnecessaryConditionals, since
            // a ||= b is equivalent to a || (a = b)
            if (['&&=', '||='].includes(node.operator)) {
                checkNode(node.left);
            }
            else if (node.operator === '??=') {
                checkNodeForNullish(node.left);
            }
        }
        return {
            AssignmentExpression: checkAssignmentExpression,
            BinaryExpression(node) {
                const { operator } = node;
                if (isBoolOperator(operator)) {
                    checkIfBoolExpressionIsNecessaryConditional(node, node.left, node.right, operator);
                }
            },
            CallExpression: checkCallExpression,
            'CallExpression[optional = true]': checkOptionalCallExpression,
            ConditionalExpression: (node) => checkNode(node.test),
            DoWhileStatement: checkIfLoopIsNecessaryConditional,
            ForStatement: checkIfLoopIsNecessaryConditional,
            IfStatement: (node) => checkNode(node.test),
            LogicalExpression: checkLogicalExpressionForUnnecessaryConditionals,
            'MemberExpression[optional = true]': checkOptionalMemberExpression,
            SwitchCase({ parent, test }) {
                // only check `case ...:`, not `default:`
                if (test) {
                    checkIfBoolExpressionIsNecessaryConditional(test, parent.discriminant, test, '===');
                }
            },
            WhileStatement: checkIfLoopIsNecessaryConditional,
        };
    },
});
//# sourceMappingURL=no-unnecessary-condition.js.map