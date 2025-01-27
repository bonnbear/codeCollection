function compareArrayObjects(arr1, arr2, keys = []) {
    // 检查输入是否为数组
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) {
        return {
            isEqual: false,
            differences: [{
                reason: 'Not both arrays',
                value1: arr1,
                value2: arr2
            }]
        };
    }

    // 检查数组长度是否相同
    if (arr1.length !== arr2.length) {
        return {
            isEqual: false,
            differences: [{
                reason: 'Different array lengths',
                length1: arr1.length,
                length2: arr2.length
            }]
        };
    }

    const differences = [];

    // 遍历数组中的每个对象
    arr1.forEach((item1, index) => {
        const item2 = arr2[index];
        const itemDiffs = [];

        // 比较指定的键
        keys.forEach(key => {
            const hasKey1 = key in item1;
            const hasKey2 = key in item2;

            // 如果两个对象都没有这个键，跳过比较
            if (!hasKey1 && !hasKey2) {
                return; // 继续下一个键
            }

            // 如果只有一个对象有这个键
            if (hasKey1 !== hasKey2) {
                itemDiffs.push({
                    key,
                    value1: hasKey1 ? item1[key] : 'missing',
                    value2: hasKey2 ? item2[key] : 'missing',
                    reason: 'key exists in only one object'
                });
                return;
            }

            // 获取键值
            const value1 = item1[key];
            const value2 = item2[key];

            // 如果值是对象或数组，递归比较
            if (typeof value1 === 'object' && value1 !== null && typeof value2 === 'object' && value2 !== null) {
                const nestedComparison = compareArrayObjects([value1], [value2], Object.keys(value1));
                if (!nestedComparison.isEqual) {
                    itemDiffs.push({
                        key,
                        value1,
                        value2,
                        reason: 'nested objects are not equal',
                        nestedDifferences: nestedComparison.differences
                    });
                }
            }
            // 否则直接比较值
            else if (value1 !== value2) {
                itemDiffs.push({
                    key,
                    value1,
                    value2
                });
            }
        });

        // 如果有差异，记录差异
        if (itemDiffs.length > 0) {
            differences.push({
                index,
                differences: itemDiffs
            });
        }
    });

    return {
        isEqual: differences.length === 0,
        differences
    };
}
