/**
 * 相当于Vue的构造函数 传入的是一个包含Configurations的属性对象
 * @param options
 * @constructor
 */

function MVVM(options) {
    // 配置对象保存到vm
    this.$options = options || {};
    // 将data保存到vm与变量data中
    var data = this._data = this.$options.data;
    // 保存vm到me
    var me = this;

    // 数据代理
    // 实现 vm.xxx -> vm._data.xxx
    Object.keys(data).forEach(function(key) {
        // 对指定的属性实现代理
        me._proxyData(key);
    });

    this._initComputed();

    observe(data, this);

    // 创建了一个编译对象
    this.$compile = new Compile(options.el || document.body, this)
}

MVVM.prototype = {
    constructor: MVVM,
    $watch: function(key, cb, options) {
        new Watcher(this, key, cb);
    },

    /**
     * 实现数据代理的方法
     * @param key
     * @param setter
     * @param getter
     * @private
     */
    _proxyData: function(key, setter, getter) {
        var me = this;

        /**
         * 就是利用get/set 与_data.xxx绑定到一起
         */
        setter = setter || 
        Object.defineProperty(me, key, {
            configurable: false,    // 不能重新定义 保障get/set功能
            enumerable: true,       // 可以枚举遍历
            // 当通过vm.xxx读取属性值的时候，从_data中获取对应属性值返回
            get: function proxyGetter() {
                return me._data[key];
            },
            // 当通过vm.xxx写属性值的时候，写到_data值中
            set: function proxySetter(newVal) {
                me._data[key] = newVal;
            }
        });
    },

    _initComputed: function() {
        var me = this;
        var computed = this.$options.computed;
        if (typeof computed === 'object') {
            Object.keys(computed).forEach(function(key) {
                Object.defineProperty(me, key, {
                    get: typeof computed[key] === 'function' 
                            ? computed[key] 
                            : computed[key].get,
                    set: function() {}
                });
            });
        }
    }
};