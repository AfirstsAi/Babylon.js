/**
 * Script to parse the JSON output of TypeDoc
 * and check for missing comments on public
 * members.
 * @see https://github.com/TypeStrong/typedoc/blob/master/src/lib/models/reflections/kind.ts#L7
 */
const KINDS = {
    0x1: "PROJECT",
    0x2: "MODULE",
    0x4: "NAMESPACE",
    0x8: "ENUM",
    0x10: "ENUM_MEMBER",
    0x20: "VARIABLE",
    0x40: "FUNCTION",
    0x80: "CLASS",
    0x100: "INTERFACE",
    0x200: "CONSTRUCTOR",
    0x400: "PROPERTY",
    0x800: "METHOD",
    0x1000: "CALL_SIGNATURE",
    0x2000: "INDEX_SIGNATURE",
    0x4000: "CONSTRUCTOR_SIGNATURE",
    0x8000: "PARAMETER",
    0x10000: "TYPE_LITERAL",
    0x20000: "TYPE_PARAMETER",
    0x40000: "ACCESSOR",
    0x80000: "GET_SIGNATURE",
    0x100000: "SET_SIGNATURE",
    0x200000: "TYPE_ALIAS",
    0x400000: "REFERENCE",
};

const kindToCheckFunction = {
    CLASS: (child, parent) => checkBaseComments("CLASS", child, parent),
    PROPERTY: checkPropertyComments,
    METHOD: checkMethodComments,
    INTERFACE: (child, parent) => checkBaseComments("INTERFACE", child, parent),
};

function getKind(child) {
    const kind = KINDS[child.kind];
    if (kind === undefined) {
        throw new Error(`Unknown kind: ${child.kind}`);
    }
    return kind;
}

function checkBaseComments(type, child, parent) {
    const hasComment = traverseChildrenLookingForComments(child);
    if (!hasComment) {
        console.log(`${type} ${child.name} with parent ${parent.name} does not have a comment.`);
    }
}

function traverseChildrenLookingForComments(child) {
    for (const prop in child) {
        if (prop !== "children") {
            if (prop === "comment") {
                return true;
            }
            const value = child[prop];
            if (typeof value === "object" && value !== null) {
                if (traverseChildrenLookingForComments(value)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function isVisible(child, parent) {
    const parentKind = getKind(parent);
    return child.flags.isPublic || (!child.flags.isPrivate && !child.flags.isProtected && parentKind === "INTERFACE");
}

function checkPropertyComments(child, parent) {
    if (isVisible(child, parent)) {
        const hasComment = traverseChildrenLookingForComments(child);
        if (!hasComment) {
            console.log(`Public Property ${child.name} with parent ${parent.name} does not have a comment.`);
        }
    }
}

function checkMethodComments(child, parent) {
    if (isVisible(child, parent)) {
        const hasComment = traverseChildrenLookingForComments(child);
        if (!hasComment) {
            console.log(`Public Method ${child.name} with parent ${parent.name} does not have a comment.`);
        }
    }
}

function sourceInNodeModules(child) {
    return child.sources && child.sources[0].fileName.includes("node_modules");
}

// Define a recursive function to iterate over the children
function checkCommentsOnChild(child, parent, namesToCheck = []) {
    // Check if the child is a declaration
    if ((namesToCheck.length === 0 || namesToCheck.includes(child.name)) && !sourceInNodeModules(child)) {
        const childKind = getKind(child);
        if (childKind in kindToCheckFunction) {
            kindToCheckFunction[childKind](child, parent);
        }
    }

    // If the child has its own children, recursively call this function on them
    if (child.children) {
        child.children.forEach((grandchild) => checkCommentsOnChild(grandchild, child, namesToCheck));
    }
}

/**
 * Given a JSON data object, check for missing comments on public members.
 * @param {*} data the JSON data that is output from typedoc
 */
module.exports = {
    commentAnalyzer: function (data, namesToCheck = []) {
        checkCommentsOnChild(data, null, namesToCheck);
    },
};
