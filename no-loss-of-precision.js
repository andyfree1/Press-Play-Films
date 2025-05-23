"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../util");
const getESLintCoreRule_1 = require("../util/getESLintCoreRule");
const baseRule = (0, getESLintCoreRule_1.getESLintCoreRule)('no-loss-of-precision');
exports.default = (0, util_1.createRule)({
    name: 'no-loss-of-precision',
    meta: {
        type: 'problem',
        deprecated: true,
        docs: {
            description: 'Disallow literal numbers that lose precision',
            extendsBaseRule: true,
        },
        hasSuggestions: baseRule.meta.hasSuggestions,
        messages: baseRule.meta.messages,
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        return baseRule.create(context);
    },
});
//# sourceMappingURL=no-loss-of-precision.js.map