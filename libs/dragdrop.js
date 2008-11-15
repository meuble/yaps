/*  Yaps JavaScript framework for Facebook, version 0.0.1
 *  (c) 2008-2010 Stéphane Akkaoui
 *
 *  Yaps is freely distributable under the terms of an MIT-style license.
 *  For details, see the Yaps web site: http://labs.sociabliz.com/yaps
 *
 * This file contains classes for drag & drop actions.
 * It depends on the base.js file for common methods.
 * 
 *--------------------------------------------------------------------------*/


var Droppables = {
	drops: [],

	remove: function(element) {
		var results = [];
		for (var i = 0, length = this.drops.length; i < length; i++)
			if (! this.drops[i].element == $(element))
				results.push(this.drops[i]);
		this.drags = results;
	},

	add: function(element) {
		element = $(element);
		var options = extend_instance({
			greedy:     true,
			hoverclass: null,
			tree:       false
		}, arguments[1] || { });

		// cache containers
		if(options.containment) {
			options._containers = [];
			var containment = options.containment;
			if(isArray(containment)) {
				for (var i = 0, length = containment.length; i < length; i++) {
					var c = containment[i];
					options._containers.push($(c));
				}
			} else {
				options._containers.push($(containment));
			}
		}

		if(options.accept) options.accept = isArray(options.accept) ? options.accept : [options.accept];

		Element.makePositioned(element); // fix IE

		options.element = element;

		this.drops.push(options);
	},

	findDeepestChild: function(drops) {
		deepest = drops[0];

		for (i = 1; i < drops.length; ++i)
			if (Element.isParent(drops[i].element, deepest.element))
				deepest = drops[i];

		return deepest;
	},

	isContained: function(element, drop) {
		var containmentNode;
		if(drop.tree) {
			containmentNode = element.treeNode; 
		} else {
			containmentNode = element.parentNode;
		}

		var results = [];
		for (var i = 0, length = this.drops.length; i < length; i++)
			if (drop._containers[i] == containmentNode)
				results.push(drop._containers[i]);

		return results;
	},

	isAccepted: function(drop, element) {
		result = false;
		for (var i = 0, length = drop.accept.length; i < length; i++) {
			result = result || element.hasClassName(drop.accept[i]);
		}
		return result;
	},

	isAffected: function(point, element, drop) {
		return ((drop.element != element) && 
				((!drop._containers) || this.isContained(element, drop)) &&
				((!drop.accept) || this.isAccepted(drop, element)) &&
				Position.within(drop.element, point[0], point[1]));
	},

	deactivate: function(drop) {
		if (drop.hoverclass)
			drop.element.removeClassName(drop.hoverclass);
		this.last_active = null;
	},

	activate: function(drop) {
		if (drop.hoverclass)
			drop.element.addClassName(drop.hoverclass);
		this.last_active = drop;
	},

	show: function(point, element) {
		if(!this.drops.length) return;
		var drop, affected = [];

		for (var i = 0, length = this.drops.length; i < length; i++)
			if (Droppables.isAffected(point, element, this.drops[i]))
    			affected.push(this.drops[i]);

		if (affected.length>0)
			drop = Droppables.findDeepestChild(affected);

		if(this.last_active && this.last_active != drop) this.deactivate(this.last_active);

		if (drop) {
			Position.within(drop.element, point[0], point[1]);
			if(drop.onHover)
				drop.onHover(element, drop.element, Position.overlap(drop.overlap, drop.element));

			if (drop != this.last_active) Droppables.activate(drop);
		}
	},

	fire: function(event, element) {
		if(!this.last_active) return;
		Position.prepare();

		if (this.isAffected([Event.pointerX(event), Event.pointerY(event)], element, this.last_active))
		if (this.last_active.onDrop) {
			this.last_active.onDrop(element, this.last_active.element, event); 
			return true; 
		}
 	},

	reset: function() {
		if(this.last_active)
			this.deactivate(this.last_active);
	}
}

var Draggables = {
	drags: [],
	observers: [],

	register: function(draggable) {
		if(this.drags.length == 0) {
			Event.observe(document.getRootElement(), 'mouseup', this.endDrag.bind(this));
			Event.observe(document.getRootElement(), 'mousemove', this.updateDrag.bind(this));
			Event.observe(document.getRootElement(), 'keypress', this .keyPress.bind(this));
		}
		this.drags.push(draggable);
	},

	unregister: function(draggable) {
		// reject
		var results = [];
		for (var i = 0, length = this.drags.length; i < length; i++)
			if (! this.drags[i] == draggable)
				results.push(this.drags[i]);
		this.drags = results;
		if(this.drags.length == 0) {
			Event.observe(document.getRootElement(), "mouseup", this.endDrag.bind(this));
			Event.observe(document.getRootElement(), "mousemove", this.updateDrag.bind(this));
			Event.observe(document.getRootElement(), "keypress", this.keyPress.bind(this));
		}
	},

	activate: function(draggable) {
		// window.focus(); // allows keypress events if window isn't currently focused, fails for Safari
		this.activeDraggable = draggable;
	},

	deactivate: function() {
		this.activeDraggable = null;
	},

	updateDrag: function(event) {

	    if(!this.activeDraggable) return;
		var pointer = [Event.pointerX(event), Event.pointerY(event)];
		// Mozilla-based browsers fire successive mousemove events with
		// the same coordinates, prevent needless redrawing (moz bug?)

		if(this._lastPointer && (inspect(this._lastPointer) == inspect(pointer))) return;

		this._lastPointer = pointer;


        this.activeDraggable.updateDrag(event, pointer);
	},

	endDrag: function(event) {
		if(this._timeout) { 
			clearTimeout(this._timeout); 
			this._timeout = null; 
		}
		if(!this.activeDraggable) return;
		this._lastPointer = null;
		this.activeDraggable.endDrag(event);
		this.activeDraggable = null;
	},

	keyPress: function(event) {
		if(this.activeDraggable)
			this.activeDraggable.keyPress(event);
	},

 	addObserver: function(observer) {
 		this.observers.push(observer);
 		this._cacheObserverCallbacks();
 	},

	removeObserver: function(element) {  // element instead of observer fixes mem leaks
		// reject 
		var results = [];
		for (var i = 0, length = this.observers.length; i < length; i++)
			if (! this.observers[i].element == element)
				results.push(this.observers[i]);
		this.observers = results;
		this._cacheObserverCallbacks();
	}, 

	notify: function(eventName, draggable, event) {  // 'onStart', 'onEnd', 'onDrag'
		if(this[eventName+'Count'] > 0) {
			// each
			for (var i = 0, length = this.observers.length; i < length; i++)
				if (this.observers[i][eventName]) o[eventName](eventName, draggable, event);
		}
		if(draggable.options[eventName]) draggable.options[eventName](draggable, event);
	},

	_cacheObserverCallbacks: function() {
		eventsNames = ['onStart','onEnd','onDrag'];
		for (var i = 0, length = eventsNames.length; i < length; i++) {
			eventName = eventsNames[i];
			// select
			var results = [];
			for (var i = 0, length = Draggables.observers.length; i < length; i++) {
				o = Draggables.observers[i];
				if (o[eventName]) results.push(o[eventName]);
				Draggables[eventName+'Count'] = results.length;
			}
		}
	}	
}

var Draggable = Class.create({
	initialize: function(element) {
		var defaults = {
			handle: false,
			reverteffect: function(element, top_offset, left_offset) {
				var dur = Math.sqrt(Math.abs(top_offset^2)+Math.abs(left_offset^2))*200;
				Animation(element).to('left', left_offset).to('top', top_offset).ease(Animation.ease.both).duration(dur).go();
			},
			endeffect: function(element) {
				var toOpacity = isNumber(element._opacity) ? element._opacity : 1.0;
				Animation(element).to('opacity', toOpacity).from('opacity', '0.7').go();
				Draggable._dragging[element] = false 

			},
			zindex: 1000,
			revert: false,
			quiet: false,
			snap: false,  // false, or xy or [x,y] or function(x,y){ return [x,y] }
			delay: 0
		};

		if(!arguments[1] || (! arguments[1].endeffect))
			extend_instance(defaults, {
				starteffect: function(element) {
					element._opacity = element.getStyle('opacity');
					Draggable._dragging[element] = true;
					Animation(element).to('opacity', '0.7').duration(0).go();
				}
			});

		var options = extend_instance(defaults, arguments[1] || { });

		this.element = $(element);

		// TODO: implement down to make this work
		if (options.handle && isString(options.handle))
			this.handle = this.element.down('.'+options.handle, 0);

		if(!this.handle) this.handle = $(options.handle);
		if(!this.handle) this.handle = this.element;

		Element.makePositioned(this.element); // fix IE    

		this.options  = options;
		this.dragging = false;   

		Event.observe(this.handle, "mousedown", this.initDrag.bind(this));
		Draggables.register(this);		
	},

	destroy: function() {
		Event.stopObserving(this.handle, "mousedown", this.eventMouseDown);
		Draggables.unregister(this);
	},

	currentDelta: function() {
		return([
			parseInt(this.element.getStyle('left') || '0'),
			parseInt(this.element.getStyle('top') || '0')]);
	},

	initDrag: function(event) {
		if(!isUndefined(Draggable._dragging[this.element]) &&
			Draggable._dragging[this.element] && Draggable._dragging[this.element] != 0) return;

		if(Event.isLeftClick(event)) { 
			// abort on form elements, fixes a Firefox issue
			var src = Event.element(event);
			if((tag_name = src.getTagName().toUpperCase()) && (
				tag_name=='INPUT' ||
				tag_name=='SELECT' ||
				tag_name=='OPTION' ||
				tag_name=='BUTTON' ||
				tag_name=='TEXTAREA')) return;

			var pointer = [Event.pointerX(event), Event.pointerY(event)];
	      	var pos     = Position.cumulativeOffset(this.element);

	      	this.offset = [(pointer[0] - pos[0]), (pointer[1] - pos[1])];

			Draggables.activate(this);
			Event.stop(event);
		}
	},

	finishDrag: function(event, success) {
		this.dragging = false;

	    if(this.options.quiet){
	      Position.prepare();
	      var pointer = [Event.pointerX(event), Event.pointerY(event)];
	      Droppables.show(pointer, this.element);
	    }

		if(this.options.ghosting) {
			if (!this.element._originallyAbsolute)
				Element.Methods.relativize(this.element);
			delete this.element._originallyAbsolute;
			Element.remove(this._clone);
			this._clone = null;
		}

	    var dropped = false; 
	    if(success) { 
	      dropped = Droppables.fire(event, this.element); 
	      if (!dropped) dropped = false; 
	    }
	    if(dropped && this.options.onDropped) this.options.onDropped(this.element);
	    Draggables.notify('onEnd', this, event);

		var revert = this.options.revert;
		if(revert && isFunction(revert)) revert = revert(this.element);

		var d = this.currentDelta();

		if(revert && this.options.reverteffect) {
			if (revert != 'failure')
				this.options.reverteffect(this.element,
					this.delta[1], this.delta[0]);
		} else {
			this.delta = d;
		}

		if(this.options.zindex)
			this.element.setStyle('zIndex', this.originalZ);

		if(this.options.endeffect) 
			this.options.endeffect(this.element);

		Draggables.deactivate(this);
	    Droppables.reset();
	},

	keyPress: function(event) {
		this.finishDrag(event, false);
		Event.stop(event);
	},

	endDrag: function(event) {
		if(!this.dragging) return;
		this.finishDrag(event, true);
		Event.stop(event);
	},

	startDrag: function(event) {
		this.dragging = true;
		if(!this.delta)
			this.delta = this.currentDelta();

		if(this.options.zindex) {
			this.originalZ = parseInt(this.element.getStyle('z-index') || 0);
			this.element.setStyle('zIndex', this.options.zindex);
		}

		if(this.options.ghosting) {
			this._clone = this.element.cloneNode(true);
			this.element._originallyAbsolute = (this.element.getStyle('position') == 'absolute');
			if (!this.element._originallyAbsolute)
				Position.absolutize(this.element);
			this.element.getParentNode().insertBefore(this._clone, this.element);
		}

		Draggables.notify('onStart', this, event);

		if(this.options.starteffect) this.options.starteffect(this.element);
	},

	updateDrag: function(event, pointer) {	
		if(!this.dragging) this.startDrag(event);

		if(!this.options.quiet){
	      Position.prepare();
	      Droppables.show(pointer, this.element);
	    }

		Draggables.notify('onDrag', this, event);
		this.draw(pointer);
		if(this.options.change) this.options.change(this);
		Event.stop(event);
	},

	draw: function(point) {
		var pos = Position.cumulativeOffset(this.element);
	    var d = this.currentDelta();
	    pos[0] -= d[0]; pos[1] -= d[1];

		p = [0, 0]
		p[0] = point[0]-pos[0]-this.offset[0]
		p[1] = point[1]-pos[1]-this.offset[1]

		if ((!this.options.constraint) || (this.options.constraint=='horizontal'))
			this.element.setStyle('left', p[0] + "px");
		if ((!this.options.constraint) || (this.options.constraint=='vertical'))
			this.element.setStyle('top', p[1] + "px");

		if(this.element.getStyle('visibility') == "hidden") this.element.setStyle('visibility', ""); // fix gecko rendering
	}
});

Draggable._dragging = { };