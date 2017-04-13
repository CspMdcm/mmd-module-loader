define(function (require,module) {
    var a=require("tests/a.js");
    var b=require("tests/b.js");
    
    return {say:function () {
        console.log("hello")
    }}
    
});