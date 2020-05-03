function Compile(el, vm) {
    this.$vm = vm;
    // 将el对应的元素对象保存到this.$el中
    this.$el = this.isElementNode(el) ? el : document.querySelector(el);

    // 如果有$el元素 编译模板的三步
    if (this.$el) {
        // 1. 取出el元素的所有子节点保存到fragment中
        this.$fragment = this.node2Fragment(this.$el);
        // 2. 编译fragment中所有层次的子节点 -- 递归
        this.init();
        // 3. 将编译好的子节点fragment添加到el元素中
        this.$el.appendChild(this.$fragment);
    }
}

Compile.prototype = {
    constructor: Compile,
    node2Fragment: function(el) {
        // 创建空的fragment
        var fragment = document.createDocumentFragment(),
            child;

        // 将原生节点拷贝到fragment
        while (child = el.firstChild) {
            fragment.appendChild(child);
        }

        return fragment;
    },

    init: function() {
        this.compileElement(this.$fragment);
    },

    compileElement: function(el) {
        // 取出最外层的子节点
        var childNodes = el.childNodes,
            me = this;

        [].slice.call(childNodes).forEach(function(node) {
            // 对所有的子节点
            var text = node.textContent;
            // (.*) 小括号：值匹配 匹配到的内容会保存到RegExp.$1 $2 $3....中
            var reg = /\{\{(.*)\}\}/;   // {{ name }}

            if (me.isElementNode(node)) {
                me.compile(node);

            } else if (me.isTextNode(node) && reg.test(text)) {
                // 编译大括号表达式的节点
                me.compileText(node, RegExp.$1.trim());
            }

            if (node.childNodes && node.childNodes.length) {
                me.compileElement(node);
            }
        });
    },

    compile: function(node) {
        // 得到标签的所有属性
        var nodeAttrs = node.attributes,
            me = this;
        // 遍历属性
        [].slice.call(nodeAttrs).forEach(function(attr) {
            // 得到属性名 v-on:click
            var attrName = attr.name;
            // 是否为指令属性 v-开头
            if (me.isDirective(attrName)) {
                var exp = attr.value;
                // 得到属性名 on:click
                var dir = attrName.substring(2);
                // 事件指令 on开头
                if (me.isEventDirective(dir)) {
                    // 解析处理事件指令
                    compileUtil.eventHandler(node, me.$vm, exp, dir);
                } else {
                    // 普通指令 编译指令属性
                    compileUtil[dir] && compileUtil[dir](node, me.$vm, exp);
                }
                // 移除指令属性 使在调试界面看不到属性
                node.removeAttribute(attrName);
            }
        });
    },

    compileText: function(node, exp) {
        compileUtil.text(node, this.$vm, exp);
    },

    isDirective: function(attr) {
        return attr.indexOf('v-') == 0;
    },

    isEventDirective: function(dir) {
        return dir.indexOf('on') === 0;
    },

    isElementNode: function(node) {
        return node.nodeType == 1;
    },

    isTextNode: function(node) {
        return node.nodeType == 3;
    }
};

// 指令处理集合
var compileUtil = {
    // 更新节点的工具 调用不同的Updater
    text: function(node, vm, exp) {
        this.bind(node, vm, exp, 'text');
    },

    html: function(node, vm, exp) {
        this.bind(node, vm, exp, 'html');
    },

    model: function(node, vm, exp) {
        this.bind(node, vm, exp, 'model');

        var me = this,
            val = this._getVMVal(vm, exp);
        node.addEventListener('input', function(e) {
            var newValue = e.target.value;
            if (val === newValue) {
                return;
            }

            me._setVMVal(vm, exp, newValue);
            val = newValue;
        });
    },

    class: function(node, vm, exp) {
        this.bind(node, vm, exp, 'class');
    },

    bind: function(node, vm, exp, dir) {
        var updaterFn = updater[dir + 'Updater'];

        // 调用函数更新节点
        updaterFn && updaterFn(node, this._getVMVal(vm, exp));

        new Watcher(vm, exp, function(value, oldValue) {
            updaterFn && updaterFn(node, value, oldValue);
        });
    },

    // 事件处理
    eventHandler: function(node, vm, exp, dir) {
        // 事件名 click
        var eventType = dir.split(':')[1],
            // 从methods 中根据表达式获得对应的 事件回调函数
            fn = vm.$options.methods && vm.$options.methods[exp];

        if (eventType && fn) {
            // 原生: dom事件监听 强制绑定this为vm
            node.addEventListener(eventType, fn.bind(vm), false);
        }
    },

    _getVMVal: function(vm, exp) {
        var val = vm;
        exp = exp.split('.');
        exp.forEach(function(k) {
            val = val[k];
        });
        return val;
    },

    _setVMVal: function(vm, exp, value) {
        var val = vm;
        exp = exp.split('.');
        exp.forEach(function(k, i) {
            // 非最后一个key，更新val的值
            if (i < exp.length - 1) {
                val = val[k];
            } else {
                val[k] = value;
            }
        });
    }
};


var updater = {
    textUpdater: function(node, value) {
        node.textContent = typeof value == 'undefined' ? '' : value;
    },

    htmlUpdater: function(node, value) {
        node.innerHTML = typeof value == 'undefined' ? '' : value;
    },

    // 更新节点的className属性值
    classUpdater: function(node, value, oldValue) {
        var className = node.className;
        className = className.replace(oldValue, '').replace(/\s$/, '');

        var space = className && String(value) ? ' ' : '';

        node.className = className + space + value;
    },

    modelUpdater: function(node, value, oldValue) {
        node.value = typeof value == 'undefined' ? '' : value;
    }
};