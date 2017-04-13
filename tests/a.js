define(function fucA(){
    console.log("模块a已执行,a依赖c");
    var c=require("tests/c.js");
    console.log("模块a中模块c已执行")
    
});