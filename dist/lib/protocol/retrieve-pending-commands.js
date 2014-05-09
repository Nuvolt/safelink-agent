/*! 
 safelink - v0.10.3 - 2014-05-09
(C) 2014 Joel Grenon. Distributed under the Apache Version 2.0, January 2004. See attached license
*/var Q=require("q"),redis=require("redis"),_=require("lodash"),async=require("async"),moment=require("moment");require("underscore-query"),module.exports=function(a){var b=this;this.log.trace(a,"Handling retrieve-pending-commands");var c=Q.defer();return Q.nextTick(function(){var d=[];b.log.debug("Retrieving pending command for agent",a.id),async.forEach(b.listPendingCommands(a.id),function(a,c){b.db.multi().hget(a.id,"key").hget(a.id,"payload").exec(function(e,f){d.push({id:a.id,key:f[0],payload:f[1],timeout:a.timeout||b.timeout,ts:a.ts}),a.status="ACTIVE",c()})},function(e){e?c.reject(e):(b.log.trace("Agent %s will receive %d commands to execute",a.id,d.length),c.resolve(d))})}),c.promise};