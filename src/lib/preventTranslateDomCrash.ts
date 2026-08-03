// Google Translate rewrites text nodes directly in the DOM (wrapping them in <font> tags),
// which desyncs React's virtual DOM from the real DOM. On the next reconciliation React calls
// removeChild/insertBefore on a node that Google Translate already moved, throwing a NotFoundError
// that unmounts the whole app (blank screen). This makes those calls no-ops instead of crashing.
// See: https://github.com/facebook/react/issues/11538
if (typeof Node === "function" && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(
    newNode: T,
    referenceNode: Node | null
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      return newNode;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}
