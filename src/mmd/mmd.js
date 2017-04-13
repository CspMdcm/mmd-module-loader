//模块按需加载
//模块依赖管理
//CMD提前加载，延迟执行

window.mmd={
    /**
     * 缓存模块对象
     */
    configMap:{
        RegExp:/require\("(.*)"\)/g    //依赖匹配正则
    },
    
    Modules:{},

    /**
     * 入口方法
     * @param ids  {Array}  入口模块路径数组
     * @param callback
     */
   use:function (ids,callback) {
        //并行加载入口模块
        Promise.all(
           ids.map(function (id) {
              return mmd.loader(id);
          })
       ).then(function (list) {
           //所有依赖加载完毕后执行回调函数
           if(typeof callback==="function"){
               callback.apply(window,list)
           }
       }).catch(function (err) {
           console.log(err);
       })
   },

    /**
     * 模块加载
     * @param id   模块路径
     * @returns {Promise}
     */
    loader:function (id) {
        return new Promise(function (resolve,reject) {
            //创建模块
            //模块状态变为complete即为该模块及其依赖已下载完成
            //返回Promise对象，并将接口传入resolve
                var mod =  mmd.Modules[id] || Module.create(id);
                mod.on('complete', function () {
                    var exp = mmd.getModuleExports(mod);
                    resolve(exp);
                });

                mod.on('error', reject);
        })
    },

    /**
     * 获取模块接口
     * @param mod {object} 模块对象
     * @returns {*}
     */
    getModuleExports:function (mod) {
        if (!mod.exports) {
            mod.exports = mod.factory(require, mod);
        }
        return mod.exports;
    }

};

var define=function (factory) {
    //正则匹配factory，更新依赖项属性
    //如果依赖项存在，则加载，后触发complete事件
    //如果依赖项不存在，则触发complete事件
    var reg=/tests.*/g;
    var str=factory.toString();
    var id=document.currentScript.src.match(reg)[0];
    var mol=mmd.Modules[id];
    var depended=[],match;
    while(match=mmd.configMap.RegExp.exec(str)){
        depended.push(match[1]);
    }
    
    mmd.Modules[id].factory=factory;
    mmd.Modules[id].dependences=depended;
    if(depended.length>0){
        Promise.all(
            depended.map(function (id) {
                return new Promise(function (resolve,reject) {
                    var depMod=mmd.Modules[id]||Module.create(id);
                    depMod.on('complete',resolve);
                    depMod.on('error',reject);
              })
         })
        ).then(function () {
            //所有依赖模块加载完毕后，调用setStatus方法更改父模块状态为complete
            mol.setStatus("complete");
        },function (error) {
            mol.setStatus("error",error);
        })
    }else{
        mol.setStatus("complete");
    }

};

/**
 * 
 * @param id
 * @returns {*}
 */
var require=function (id) {

    var mol=mmd.Modules[id];
    if(mol){
        return mmd.getModuleExports(mol);
    }else{
        throw "not found module:"+id;
    }
};

/**
 * 
 * @type {{create}}
 */
var Module=(function () {
    //模块被创建以后即开始load

    function Module(id) {
        this.id=id;
        this.status="pending";
        this.dependences = null;
        this.factory=null;
        this.callback={};
        this.load();

    }

    Module.prototype.load=function(){
        var id=this.id;
        var script=document.createElement("script");
        script.src=id;
        document.head.appendChild(script);
        this.status="loading";
    };

    Module.prototype.on=function (event,callback) {
        if(event==="complete" && this.status==="complete"){
            callback(this);
        }else if(event==="error" && this.status==="error"){
            callback(this);
        }else{
            this.callback[event]=callback;
        }
    };

    Module.prototype.trigger=function (event) {
           if(event in this.callback){
               var callback=this.callback[event];
               callback(this);
           }else{
               console.log("not found callback")
           }
    };

    Module.prototype.setStatus=function (status) {
        //状态改变，触发响应的事件
         if(this.status!==status){
             this.status=status;
             switch (status) {
                 case "complete":
                     this.trigger('complete');
                     break;
                 case "error":
                     this.trigger('error');
                     break;
                 case "loading":
                     this.trigger("loading");
                     break;
                 default:
                     break;
             }
         }
    };

    var create=function(id){
        var mol=new Module(id);
        mmd.Modules[id]=mol;
        return mol;
    };
    return {create:create};
    
})();
