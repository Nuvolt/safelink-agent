/*! 
 safelink - v0.10.3 - 2014-05-09
(C) 2014 Joel Grenon. Distributed under the Apache Version 2.0, January 2004. See attached license
*/var request=require("request"),_=require("lodash"),Q=require("q");module.exports=function(){function a(a,b){this.log=b.child({transport:"polling"}),this.layer=a}return a.prototype.isAvailable=function(){return!0},a.prototype.send=function(a,b,c,d,e){var f=Q.defer(),g=this;return this.log.debug("Sending message %s(%s) with timeout %d",c,b,1e3*(e.timeout||a.timeout)),request({url:a.url,method:"POST",body:_.extend(d||{},{uuid:b,key:c,v:a.version,id:a.id}),json:!0,pool:!1,timeout:1e3*(e.timeout||a.timeout)},function(b,e,h){b||e.statusCode>=400?(g.log.error("Error received from server for request, but no callback was provided. %s",b,JSON.stringify({url:a.url,method:"POST",body:_.extend(d||{},{key:c,v:a.version,id:a.id})})),f.reject({status:e.statusCode,error:b})):f.resolve(h)}),f.promise},a}();