/*! 
 safelink - v0.10.3 - 2014-05-09
(C) 2014 Joel Grenon. Distributed under the Apache Version 2.0, January 2004. See attached license
*/var Q=require("q"),redis=require("redis"),_=require("lodash"),async=require("async"),moment=require("moment");require("underscore-query"),module.exports=function(a){var b=this;this.log.trace(a,"Handling subscribe command");var c=Q.defer();return Q.nextTick(function(){b.log.debug("Subscribing agent %s to event %s",a.id,a.event);var d=_.query.build(b.eventSubscriptions).and({agentId:a.id}).first();d||(d=new EventSubscription(b,a.id),b.eventSubscriptions.push(d)),_.contains(d.events,a.event)?b.log.warn("Subscription to event %s is already in place. It will be reused",a.event):(b.on(a.event,d.listener(a)),d.events.push(a.event),b.log.debug("Subscription to event %s was successfully established for agent %s",a.event,a.id)),c.resolve({success:!0})}),c.promise};var EventSubscription=function(a,b){this.events=[],this.agentId=b,this.listener=function(b){return function(c){a.emitTo(b.id,b.event,c)}}};