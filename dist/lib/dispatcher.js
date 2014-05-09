/*! 
 safelink - v0.10.3 - 2014-05-09
(C) 2014 Joel Grenon. Distributed under the Apache Version 2.0, January 2004. See attached license
*/var util=require("util"),http=require("http"),Q=require("q"),JSON=require("json3"),shortId=require("shortid"),_=require("lodash"),moment=require("moment"),redis=require("redis"),async=require("async"),bunyan=require("bunyan"),WebSocketServer=require("ws").Server,WatchDog=require("./watchdog"),EventEmitter=require("eventemitter3");require("underscore-query");var Dispatcher=function(){function a(a){var f=this;if(this.port=a.port||8080,this.log=a.log||bunyan.createLogger({name:"dispatcher",level:a.logLevel||"info"}),this.pendingCleanupThreshold=a.command_cleanup_threshold||600,this.commandHandlers={},this.agentSockets={},EventEmitter.call(this),a.redis||(a.redis={port:6379,host:"localhost"}),this.db=redis.createClient(a.redis.port,a.redis.host),this.db.on("error",_.bind(function(a){this.emit("internal.db.error",a)},this)),this.eventSubscriptions=[],b=http.createServer(function(a,b){if(f.suspended)b.statusCode=503,b.end("SUSPENDED");else if("POST"===a.method){var e="";a.on("data",function(a){e+=a}),a.on("error",function(a){f.log.error(a),b.send("error")}),a.on("end",function(){var a={};if(e.length>0)try{a=JSON.parse(e);var g=c[a.key];g?Q.fcall(_.bind(g,f),a).then(function(a){b.end(JSON.stringify({success:!0,v:d,data:a}))},function(a){b.end(JSON.stringify({success:!1,v:d,error:a}))}).catch(function(a){b.end(JSON.stringify({success:!1,v:d,error:a}))}):b.end(JSON.stringify({success:!1,error:"unknown-key:"+a.key,v:d}))}catch(h){f.log.error(h)}})}else b.end(JSON.stringify({success:!1,v:d,error:"Unsupported method"}))}),b.on("connection",function(a){a.setTimeout(3e5)}),a.wss){var g=new WebSocketServer({port:a.wss.port});g.on("connection",function(a){a.on("message",function(b){try{var d=JSON.parse(b);f.agentSockets[d.id]=a,f.log.trace("Received message through websocket",d);var e=c[d.key];e?Q.fcall(_.bind(e,f),d).then(function(b){a.send(JSON.stringify({key:"message-response",uuid:d.uuid,data:b}))},function(b){a.send(JSON.stringify({key:"message-error",uuid:d.uuid,error:b}))}).catch(function(b){a.send(JSON.stringify({key:"message-error",uuid:d.uuid,error:b}))}):f.log.warn("No handler was configured for command",d.key)}catch(g){f.log.error(g)}}),a.on("close",function(a){f.log.warn("TODO: Closing socket:",a)})})}this.commandMonitorInterval=setInterval(function(){f.log.debug("Analyzing %d pending commands for cleanup",e.length);var a=_.query(e,{status:{$ne:"PENDING"}});f.log.debug("Found %d candidate commands for cleanup (completed or dead)",a.length),async.forEach(a,function(a,b){var c=moment().utc().unix()-a.ts;f.log.trace(a,"Checking command for cleanup"),"ACTIVE"===a.status&&c>f.pendingCleanupThreshold&&(a.defer.reject(new Error("no-response")),a.status="COMPLETE",f.log.warn("Command %s(%s) for agent %s is now dead and will be cleaned-up",a.id,a.key,a.agentId)),"COMPLETE"===a.status&&(f.log.trace("Cleaning completed command %s",a.id),_.remove(e,function(b){return b.id===a.id}),f.db.del(a.id),f.log.trace("Command %s:%s(%s) has been removed from system",a.agentId,a.id,a.key)),b()},function(a){a?f.log.error(a,"There was a problem while we were cleaning up commands... error is",a):f.log.debug("Cleanup report: %d remaining pending commands after cleanup",e.length)})},3e4),this.on("agent-connected",function(a){a.meta=a.meta||{},a.agent=a.agent||{},this.db.multi().hset(a.id,"connectedTs",a.ts).hset(a.id,"lastHeartbeatTs",a.ts).hset(a.id,"version",a.agent.version||"1").hset(a.id,"heartbeat-interval",a.meta.interval||30).exec(function(b){b?f.log.error(b):f.ensureWatchDog({id:a.id,interval:a.meta.interval||30}).then(function(){f.executeOnAgent(a.id,"configure",{restart:!1})},function(b){f.log.warn("Unable to install watchdog for agent %s. Error = ",a.id,b)})})}),this.on("agent-disconnected",function(a){f.log.warn("Agent %s was detected as disconnected",a.id),f.agentSockets[a.id]&&(f.agentSockets[a.id].close(),delete f.agentSockets[a.id])})}var b;const c=require("./protocol"),d=100,e=[],f={},g={};return util.inherits(a,EventEmitter),a.prototype.listen=function(){var a=Q.defer();return b.listen(this.port,a.makeNodeResolver()),a.promise},a.prototype.suspend=function(a){var b=this;this.suspended?this.log.debug("Already suspended, new suspend request will be ignored"):(this.suspended=!0,this.log.warn("Dispatcher is now suspended"),a&&setTimeout(function(){b.resume()},1e3*a))},a.prototype.resume=function(){this.suspended?(this.suspended=!1,this.log.warn("Dispatcher is now resuming normal operation")):this.log.info("Dispatcher was already executing normally. Resume request will be ignored")},a.prototype.installMonitor=function(a){return g[a.agent]?Q(g[a.agent]):void(g[a.agent]=setInterval(_.bind(function(){var b={agents:this.listConnectedAgents(),pendingCommands:this.listPendingCommands(a.agent).length};this.emitTo(a.agent,b)},this),a.interval))},a.prototype.uninstallMonitor=function(a){g[a]&&(clearInterval(g[a]),delete g[a])},a.prototype.listConnectedAgents=function(){return _.map(_.values(f),function(a){return a.agent})},a.prototype.listPendingCommands=function(a){return _.q(e,{agentId:a,status:"PENDING"})},a.prototype.executeOnAgent=function(a,b,c,d){var f=this,g=Q.defer();return d=d||{},c=c||{},Q.nextTick(_.bind(function(){var h=d.uuid||shortId.generate(),i=moment().utc().unix();this.log.debug("Executing command %s(%s) on agent %s",b,h,a),this.log.trace("Executing command %s(%s) with payload",b,h,c);var j=h;d&&d.group&&(j=d.group.key||a+b),d&&d.dropAllPending&&(_.isString(d.dropAllPending)?_.each(_.query(e,{agentId:a,key:d.dropAllPending,group:{$ne:j},status:"PENDING"}),function(a){a.defer.resolve({success:!0,dropped:!0}),a.status="COMPLETE"}):_.each(_.query(e,{agentId:a,group:{$ne:j},status:"PENDING"}),function(a){a.defer.resolve({success:!0,dropped:!0}),a.status="COMPLETE"})),this.db.multi().hset(h,"id",h).hset(h,"key",b).hset(h,"agent",a).hset(h,"ts",i).hset(h,"group",j).hset(h,"payload",JSON.stringify(c||{})).hset(h,"options",JSON.stringify(d||{})).exec(function(c){if(c)f.log.error("Unable to register command in Redis",c),g.reject(c);else{f.log.debug("Adding command %s(%s) to pending command list for agent %s",b,h,a);var k={id:h,agentId:a,key:b,defer:g,group:j,status:"PENDING",timeout:d.timeout||f.timeout,ts:i};e.push(k)}})},this)),g.promise},a.prototype.emitTo=function(a,b,c,d){var e=this,f=Q.defer();return d=d||{},Q.nextTick(function(){_.isString(a)&&(a=[a]),async.forEach(a,function(a,d){e.db.rpush(a+"_events",JSON.stringify({key:b,data:c})),d()},function(a){a?f.reject(a):f.resolve()})}),f.promise},a.prototype.applyCommandResponse=function(a,b){var c=this,d=Q.defer();return Q.nextTick(function(){c.log.debug("Applying command response for command %s",a),c.log.trace("Command %s response",b);var f=_.query(e,{id:a});if(1===f.length){c.log.debug("Command %s was successfully found in our pending command list",a),c.log.trace("Command found",f[0]);var g=_.query(e,{group:f[0].group,status:"PENDING"});g.push(f[0]),c.log.debug("Found %d commands that will be fulfilled by this response",g.length),async.forEach(g,function(a,d){c.log.trace("Fulfilling command %s(%s)",a.key,a.id),a.defer.resolve(b),a.status="COMPLETE",d()},function(){c.log.debug("Command response was successfully applied"),d.resolve({success:!0})})}else c.log.warn("Unable to find command %s in our pending command list. Most probably a timeout and command was already cleaned up",a),d.reject({success:!1,error:"Unknown command:"+a})}),d.promise},a.prototype.applyCommandError=function(a,b){var c=Q.defer();return Q.nextTick(function(){var d=_.query(e,{id:a});if(1===d.length){var f=_.query(e,{group:d[0].group,status:"PENDING"});f.push(d[0]),async.forEach(f,function(a,c){a.defer.reject(b),a.status="COMPLETE",c()},function(){c.resolve({success:!0})})}else c.reject({success:!1,error:"Unknown command:"+a})}),c.promise},a.prototype.applyCommandProgress=function(a,b){var c=Q.defer();return Q.nextTick(function(){var d=_.query(e,{id:a});if(1===d.length){var f=_.query(e,{group:d[0].group,status:"PENDING"});f.push(d[0]),async.forEach(f,function(a,c){a.defer.notify({cmd:_.pick(a,"id","key","group"),data:b}),c()},function(){c.resolve()})}else c.reject({success:!1,error:"Unknown command:"+a})}),c.promise},a.prototype.startAgentWatchDog=function(a){var b=this,c=Q.defer();return Q.nextTick(function(){f[a.id]=new WatchDog(a,b),b.log.info("Watchdog installed for agent %s",a.id),c.resolve(f[a.id])}),c.promise},a.prototype.stopAgentWatchDog=function(a){clearInterval(f[a])},a.prototype.ensureWatchDog=function(a){return f[a.id]?Q(f[a.id]):this.startAgentWatchDog(a)},a.prototype.hasWatchDog=function(a){return!_.isUndefined(f[a])},a}();module.exports=Dispatcher;