/**
 * Red-Black Tree - 红黑树的5个性质:
 * 1. 每个节点是红色或黑色
 * 2. 根节点是黑色
 * 3. 每个叶节点(NIL)是黑色
 * 4. 红色节点的子节点必须是黑色
 * 5. 从任一节点到其叶子的所有路径包含相同数量的黑色节点
 */

enum Color {
  RED = 'RED',
  BLACK = 'BLACK',
}

class RBNode<T> {
  key: T;
  color: Color;
  left: RBNode<T> | null;
  right: RBNode<T> | null;
  parent: RBNode<T> | null;

  constructor(key: T, color: Color = Color.RED) {
    this.key = key;
    this.color = color;
    this.left = null;
    this.right = null;
    this.parent = null;
  }
}

class RedBlackTree<T> {
  private root: RBNode<T> | null = null;
  private readonly NIL: RBNode<T>;

  constructor(private compare: (a: T, b: T) => number = (a, b) => (a < b ? -1 : a > b ? 1 : 0)) {
    this.NIL = new RBNode<T>(null as unknown as T, Color.BLACK);
    this.root = this.NIL;
  }

  private rotateLeft(x: RBNode<T>): void {
    const y = x.right!;
    x.right = y.left;

    if (y.left !== this.NIL) {
      y.left!.parent = x;
    }

    y.parent = x.parent;

    if (x.parent === null) {
      this.root = y;
    } else if (x === x.parent.left) {
      x.parent.left = y;
    } else {
      x.parent.right = y;
    }

    y.left = x;
    x.parent = y;
  }

  private rotateRight(x: RBNode<T>): void {
    const y = x.left!;
    x.left = y.right;

    if (y.right !== this.NIL) {
      y.right!.parent = x;
    }

    y.parent = x.parent;

    if (x.parent === null) {
      this.root = y;
    } else if (x === x.parent.right) {
      x.parent.right = y;
    } else {
      x.parent.left = y;
    }

    y.right = x;
    x.parent = y;
  }

  insert(key: T): void {
    const newNode = new RBNode<T>(key, Color.RED);
    newNode.left = this.NIL;
    newNode.right = this.NIL;

    let parent: RBNode<T> | null = null;
    let current = this.root;

    while (current !== this.NIL && current !== null) {
      parent = current;
      const cmp = this.compare(key, current.key);
      if (cmp < 0) {
        current = current.left!;
      } else {
        current = current.right!;
      }
    }

    newNode.parent = parent;

    if (parent === null) {
      this.root = newNode;
    } else if (this.compare(key, parent.key) < 0) {
      parent.left = newNode;
    } else {
      parent.right = newNode;
    }

    this.insertFixup(newNode);
  }

  /**
   * insertFixup: 修复插入后的红黑树性质 (CLRS算法)
   * Case 1: 叔节点为红色 → 重新着色
   * Case 2: 叔节点为黑色,当前节点是右子 → 左旋转换为Case 3
   * Case 3: 叔节点为黑色,当前节点是左子 → 重新着色+右旋
   */
  private insertFixup(node: RBNode<T>): void {
    while (node.parent !== null && node.parent.color === Color.RED) {
      if (node.parent === node.parent.parent?.left) {
        const uncle = node.parent.parent.right;

        if (uncle?.color === Color.RED) {
          // Case 1
          node.parent.color = Color.BLACK;
          uncle.color = Color.BLACK;
          node.parent.parent.color = Color.RED;
          node = node.parent.parent;
        } else {
          if (node === node.parent.right) {
            // Case 2
            node = node.parent;
            this.rotateLeft(node);
          }
          // Case 3
          node.parent!.color = Color.BLACK;
          node.parent!.parent!.color = Color.RED;
          this.rotateRight(node.parent!.parent!);
        }
      } else {
        const uncle = node.parent.parent?.left;

        if (uncle?.color === Color.RED) {
          // Case 1 (mirror)
          node.parent.color = Color.BLACK;
          uncle.color = Color.BLACK;
          node.parent.parent!.color = Color.RED;
          node = node.parent.parent!;
        } else {
          if (node === node.parent.left) {
            // Case 2 (mirror)
            node = node.parent;
            this.rotateRight(node);
          }
          // Case 3 (mirror)
          node.parent!.color = Color.BLACK;
          node.parent!.parent!.color = Color.RED;
          this.rotateLeft(node.parent!.parent!);
        }
      }
    }

    this.root!.color = Color.BLACK;
  }

  private transplant(u: RBNode<T>, v: RBNode<T>): void {
    if (u.parent === null) {
      this.root = v;
    } else if (u === u.parent.left) {
      u.parent.left = v;
    } else {
      u.parent.right = v;
    }
    v.parent = u.parent;
  }

  private minimum(node: RBNode<T>): RBNode<T> {
    while (node.left !== this.NIL && node.left !== null) {
      node = node.left;
    }
    return node;
  }

  private maximum(node: RBNode<T>): RBNode<T> {
    while (node.right !== this.NIL && node.right !== null) {
      node = node.right;
    }
    return node;
  }

  delete(key: T): boolean {
    const node = this.searchNode(key);
    if (node === null || node === this.NIL) {
      return false;
    }

    let y = node;
    let yOriginalColor = y.color;
    let x: RBNode<T>;

    if (node.left === this.NIL) {
      x = node.right!;
      this.transplant(node, node.right!);
    } else if (node.right === this.NIL) {
      x = node.left!;
      this.transplant(node, node.left!);
    } else {
      y = this.minimum(node.right!);
      yOriginalColor = y.color;
      x = y.right!;

      if (y.parent === node) {
        x.parent = y;
      } else {
        this.transplant(y, y.right!);
        y.right = node.right;
        y.right!.parent = y;
      }

      this.transplant(node, y);
      y.left = node.left;
      y.left!.parent = y;
      y.color = node.color;
    }

    if (yOriginalColor === Color.BLACK) {
      this.deleteFixup(x);
    }

    return true;
  }

  /**
   * deleteFixup: 修复删除后的红黑树性质 (CLRS算法)
   * Case 1: 兄弟节点为红色 → 兄弟变黑,父变红,旋转
   * Case 2: 兄弟的两个子节点都是黑色 → 兄弟变红,向上传递
   * Case 3: 兄弟的远侄子为黑色 → 近侄子变黑,兄弟变红,旋转
   * Case 4: 兄弟的远侄子为红色 → 重新着色,旋转,终止
   */
  private deleteFixup(x: RBNode<T>): void {
    while (x !== this.root && x.color === Color.BLACK) {
      if (x === x.parent?.left) {
        let sibling = x.parent.right!;

        if (sibling.color === Color.RED) {
          // Case 1
          sibling.color = Color.BLACK;
          x.parent.color = Color.RED;
          this.rotateLeft(x.parent);
          sibling = x.parent.right!;
        }

        if (sibling.left?.color === Color.BLACK && sibling.right?.color === Color.BLACK) {
          // Case 2
          sibling.color = Color.RED;
          x = x.parent;
        } else {
          if (sibling.right?.color === Color.BLACK) {
            // Case 3
            sibling.left!.color = Color.BLACK;
            sibling.color = Color.RED;
            this.rotateRight(sibling);
            sibling = x.parent!.right!;
          }
          // Case 4
          sibling.color = x.parent!.color;
          x.parent!.color = Color.BLACK;
          sibling.right!.color = Color.BLACK;
          this.rotateLeft(x.parent!);
          x = this.root!;
        }
      } else {
        let sibling = x.parent!.left!;

        if (sibling.color === Color.RED) {
          // Case 1 (mirror)
          sibling.color = Color.BLACK;
          x.parent!.color = Color.RED;
          this.rotateRight(x.parent!);
          sibling = x.parent!.left!;
        }

        if (sibling.right?.color === Color.BLACK && sibling.left?.color === Color.BLACK) {
          // Case 2 (mirror)
          sibling.color = Color.RED;
          x = x.parent!;
        } else {
          if (sibling.left?.color === Color.BLACK) {
            // Case 3 (mirror)
            sibling.right!.color = Color.BLACK;
            sibling.color = Color.RED;
            this.rotateLeft(sibling);
            sibling = x.parent!.left!;
          }
          // Case 4 (mirror)
          sibling.color = x.parent!.color;
          x.parent!.color = Color.BLACK;
          sibling.left!.color = Color.BLACK;
          this.rotateRight(x.parent!);
          x = this.root!;
        }
      }
    }

    x.color = Color.BLACK;
  }

  private searchNode(key: T): RBNode<T> | null {
    let current = this.root;

    while (current !== this.NIL && current !== null) {
      const cmp = this.compare(key, current.key);
      if (cmp === 0) {
        return current;
      } else if (cmp < 0) {
        current = current.left!;
      } else {
        current = current.right!;
      }
    }

    return null;
  }

  search(key: T): boolean {
    return this.searchNode(key) !== null;
  }

  min(): T | null {
    if (this.root === this.NIL || this.root === null) {
      return null;
    }
    return this.minimum(this.root).key;
  }

  max(): T | null {
    if (this.root === this.NIL || this.root === null) {
      return null;
    }
    return this.maximum(this.root).key;
  }

  inOrder(): T[] {
    const result: T[] = [];
    this.inOrderHelper(this.root, result);
    return result;
  }

  private inOrderHelper(node: RBNode<T> | null, result: T[]): void {
    if (node !== null && node !== this.NIL) {
      this.inOrderHelper(node.left, result);
      result.push(node.key);
      this.inOrderHelper(node.right, result);
    }
  }

  preOrder(): T[] {
    const result: T[] = [];
    this.preOrderHelper(this.root, result);
    return result;
  }

  private preOrderHelper(node: RBNode<T> | null, result: T[]): void {
    if (node !== null && node !== this.NIL) {
      result.push(node.key);
      this.preOrderHelper(node.left, result);
      this.preOrderHelper(node.right, result);
    }
  }

  postOrder(): T[] {
    const result: T[] = [];
    this.postOrderHelper(this.root, result);
    return result;
  }

  private postOrderHelper(node: RBNode<T> | null, result: T[]): void {
    if (node !== null && node !== this.NIL) {
      this.postOrderHelper(node.left, result);
      this.postOrderHelper(node.right, result);
      result.push(node.key);
    }
  }

  levelOrder(): T[] {
    const result: T[] = [];
    if (this.root === this.NIL || this.root === null) {
      return result;
    }

    const queue: RBNode<T>[] = [this.root];

    while (queue.length > 0) {
      const node = queue.shift()!;
      result.push(node.key);

      if (node.left !== this.NIL && node.left !== null) {
        queue.push(node.left);
      }
      if (node.right !== this.NIL && node.right !== null) {
        queue.push(node.right);
      }
    }

    return result;
  }

  isEmpty(): boolean {
    return this.root === this.NIL || this.root === null;
  }

  height(): number {
    return this.heightHelper(this.root);
  }

  private heightHelper(node: RBNode<T> | null): number {
    if (node === null || node === this.NIL) {
      return 0;
    }
    return 1 + Math.max(this.heightHelper(node.left), this.heightHelper(node.right));
  }

  size(): number {
    return this.sizeHelper(this.root);
  }

  private sizeHelper(node: RBNode<T> | null): number {
    if (node === null || node === this.NIL) {
      return 0;
    }
    return 1 + this.sizeHelper(node.left) + this.sizeHelper(node.right);
  }

  clear(): void {
    this.root = this.NIL;
  }

  /**
   * validate: 验证红黑树性质
   * 检查性质2(根为黑), 性质4(红节点子为黑), 性质5(黑高度一致)
   */
  validate(): boolean {
    if (this.root === this.NIL) {
      return true;
    }

    if (this.root!.color !== Color.BLACK) {
      return false;
    }

    return this.validateNode(this.root!) !== -1;
  }

  private validateNode(node: RBNode<T>): number {
    if (node === this.NIL) {
      return 1;
    }

    if (node.color === Color.RED) {
      if (node.left?.color === Color.RED || node.right?.color === Color.RED) {
        return -1;
      }
    }

    const leftBlackHeight = this.validateNode(node.left!);
    const rightBlackHeight = this.validateNode(node.right!);

    if (leftBlackHeight === -1 || rightBlackHeight === -1 || leftBlackHeight !== rightBlackHeight) {
      return -1;
    }

    return leftBlackHeight + (node.color === Color.BLACK ? 1 : 0);
  }

  print(): void {
    this.printHelper(this.root, '', true);
  }

  private printHelper(node: RBNode<T> | null, prefix: string, isLeft: boolean): void {
    if (node !== null && node !== this.NIL) {
      console.log(prefix + (isLeft ? '├── ' : '└── ') + `${node.key}(${node.color})`);
      this.printHelper(node.left, prefix + (isLeft ? '│   ' : '    '), true);
      this.printHelper(node.right, prefix + (isLeft ? '│   ' : '    '), false);
    }
  }
}

export { RedBlackTree, RBNode, Color };

function main(): void {
  const tree = new RedBlackTree<number>();

  const elements = [7, 3, 18, 10, 22, 8, 11, 26, 2, 6, 13];
  console.log('Inserting:', elements);

  for (const el of elements) {
    tree.insert(el);
  }

  console.log('\nTree structure:');
  tree.print();

  console.log('\nIn-order traversal:', tree.inOrder());
  console.log('Pre-order traversal:', tree.preOrder());
  console.log('Level-order traversal:', tree.levelOrder());

  console.log('\nMin:', tree.min());
  console.log('Max:', tree.max());
  console.log('Height:', tree.height());
  console.log('Size:', tree.size());

  console.log('\nSearch 10:', tree.search(10));
  console.log('Search 100:', tree.search(100));

  console.log('\nTree valid:', tree.validate());

  console.log('\nDeleting 18...');
  tree.delete(18);
  console.log('In-order after deletion:', tree.inOrder());
  console.log('Tree valid:', tree.validate());

  console.log('\nDeleting 3...');
  tree.delete(3);
  console.log('In-order after deletion:', tree.inOrder());
  console.log('Tree valid:', tree.validate());

  tree.print();
}

main();
