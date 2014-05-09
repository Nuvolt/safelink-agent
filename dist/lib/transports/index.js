/*! 
 safelink - v0.10.3 - 2014-05-09
(C) 2014 Joel Grenon. Distributed under the Apache Version 2.0, January 2004. See attached license
*/var WebSocket=require("./websocket"),shortid=require("shortid"),Q=require("q"),bunyan=require("bunyan"),HttpPolling=require("./polling");module.exports=function(){function a(a){a=a||{},this.log=a.log||bunyan.createLogger({name:a.logName||"transport",level:a.logLevel||"info"}),this.messages={},this.ws=new WebSocket(this,this.log),this.polling=new HttpPolling(this,this.log)}return a.prototype.send=function(a,b,c,d){var e=Q.defer(),f=this;d=d||{},1===arguments.length&&(c={});var g=shortid.generate();return this.messages[g]={defer:e,key:b,sts:(new Date).getTime(),ttl:1e3*d.ttl||6e4},this.ws.isAvailable()?(this.log.debug("Sending command %s(%s) using WS transport",b,g,{payload:c}),this.ws.send(a,g,b,c,d).then(function(a){f.log.debug("Resolving message %s(%s) with result",b,g,a),e.resolve(a)},function(){f.log.debug("Falling back to polling transport for command %s(%s)",b,g,{payload:c}),f.polling.send(a,g,b,c,d).then(function(a){e.resolve(a)},function(a){e.reject(a)},function(a){e.notify(a)})},function(a){e.notify(a)})):(f.log.debug("Sending command %s(%s) using polling transport",b,g,{payload:c}),this.polling.send(a,g,b,c,d).then(function(a){e.resolve(a)},function(a){e.reject(a)},function(a){e.notify(a)})),e.promise.done(function(){f.messages[g].rts=(new Date).getTime(),f.log.trace("message %s(%s) has been marked with rts",f.messages[g].key,g,f.messages[g].rts)}),e.promise},a.prototype.getResult=function(a){return this.messages[a]},a.prototype.clearResult=function(a){delete this.messages[a]},a}();