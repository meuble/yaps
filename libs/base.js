/*  Yaps JavaScript framework for Facebook, version 0.0.1
 *  (c) 2008-2010 Stéphane Akkaoui
 *
 *  Yaps is freely distributable under the terms of an MIT-style license.
 *  For details, see the Yaps web site: http://labs.sociabliz.com/yaps
 *
 * This file contains common methods and wrappers. 
 * 
 *--------------------------------------------------------------------------*/

function extend_instance(destination, source) {
  for (var property in source)
    destination[property] = source[property];
  return destination;
}

var Node = {};
if (!Node.ELEMENT_NODE) {
  // DOM level 2 ECMAScript Language Binding
  extend_instance(Node, {
    ELEMENT_NODE: 1,
    ATTRIBUTE_NODE: 2,
    TEXT_NODE: 3,
    CDATA_SECTION_NODE: 4,
    ENTITY_REFERENCE_NODE: 5,
    ENTITY_NODE: 6,
    PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_TYPE_NODE: 10,
    DOCUMENT_FRAGMENT_NODE: 11,
    NOTATION_NODE: 12
  });
}

var Prototype = {
  Version: '0.0.1',

  ScriptFragment: '<script[^>]*>([\\S\\s]*?)<\/script>',
  JSONFilter: /^\/\*-secure-([\s\S]*)\*\/\s*$/,

  emptyFunction: function() { },
  K: function(x) { return x }
};


var Class = {
  create: function() {
    var parent = null, properties = arguments;
    if (isFunction(properties[0]))
      parent = properties.shift();

    function klass() {
      this.initialize.apply(this, arguments);
    }

    extend_instance(klass, Class.Methods);
    klass.superclass = parent;
    klass.subclasses = [];

    if (parent) {
      var subclass = function() { };
      subclass.prototype = parent.prototype;
      klass.prototype = new subclass;
      parent.subclasses.push(klass);
    }

    for (var i = 0; i < properties.length; i++)
      klass.addMethods(properties[i]);

    if (!klass.prototype.initialize)
      klass.prototype.initialize = Prototype.emptyFunction;

    klass.prototype.constructor = klass;

    return klass;
  }
};

Class.Methods = {
  addMethods: function(source) {
    var ancestor   = this.superclass && this.superclass.prototype;
    var properties = keys(source);

    if (!keys({ toString: true }).length)
      properties.push("toString", "valueOf");

    for (var i = 0, length = properties.length; i < length; i++) {
      var property = properties[i], value = source[property];
      if (ancestor && isFunction(value) &&
          value.argumentNames().first() == "$super") {
        var method = value, value = extend_instance(wrap(method,(function(m) {
	          return function() { return ancestor[m].apply(this, arguments) };
	        }), [property]), {
          valueOf:  function() { return method },
          toString: function() { return method.toString() }
        });
      }
      this.prototype[property] = value;
    }

    return this;
  }
};

var Abstract = { };

function $(element) {
	if (typeof element == "string") {
		element=document.getElementById(element);
	}
	if (element)
		extend_instance(element,Element);
	return element;
}

var Element = {
	"hide": function () {
		Animation(this).duration(0).hide().go();
	},
	"show": function () {
		Animation(this).duration(0).show().go();
	},
	"visible": function () {
		return (this.getStyle("display") != "none");
	},
	"toggle": function () {
		if (this.visible) {
			this.hide();
		} else {
			this.show();
		}
	},
	"highlight": function() {
		Animation(this).to('background', '#fff').from('background', '#ffff4b').go();
	},

	"makePositioned": function(element) {
		element = $(element);
		var pos = element.getStyle('position');
		if (pos == 'static' || !pos) {
			element._madePositioned = true;
			element.setStyle('position', 'relative');
		}
		return element;
	},

	"descendantOf": function(element, ancestor) {
		element = $(element), ancestor = $(ancestor);
		var originalAncestor = ancestor;

		if (element.compareDocumentPosition)
			return (element.compareDocumentPosition(ancestor) & 8) === 8;

		if (element.sourceIndex) {
			var e = element.sourceIndex, a = ancestor.sourceIndex,
			nextAncestor = ancestor.nextSibling;
			if (!nextAncestor) {
				do { ancestor = ancestor.getParentNode(); }
				while (!(nextAncestor = ancestor.nextSibling) && ancestor.getParentNode());
			}
			if (nextAncestor) return (e > a && e < nextAncestor.sourceIndex);
		}

		while (element = element.getParentNode())
		if (element == originalAncestor) return true;
		return false;
	},

	"remove": function(element) {
		element = $(element);
		element.getParentNode().removeChild(element);
		return element;
	},

	"positionedOffset": function() {
		var element = this
		var valueT = 0, valueL = 0;
		do {
			valueT += (element.getAbsoluteTop()  || 0) - document.getRootElement().getAbsoluteTop();
			valueL += (element.getAbsoluteLeft() || 0) - document.getRootElement().getAbsoluteLeft();
			element = element.offsetParent;
			if (element) {
				if (element == document.getRootElement()) break;
				var p = element.getStyle('position');
				if (p == 'relative' || p == 'absolute') break;
			}

		} while (element);
		return [valueL, valueT];
	}
};

// Returns true if child is contained within element
Element.isParent = function(child, element) {
  if (!child.parentNode || child == element) return false;
  if (child.parentNode == element) return true;
  return Element.isParent(child.parentNode, element);
}

Element.Methods = {

	relativize: function(element) {
		element = $(element);
		if (element.getStyle('position') == 'relative') return;
	    // Position.prepare(); // To be done manually by Scripty when it needs it.

		element.setStyle('position', 'relative');
		var top  = parseFloat(element.getStyle('top')  || 0) - (element._originalTop || 0);
		var left = parseFloat(element.getStyle('left') || 0) - (element._originalLeft || 0);


		element.setStyle('top', top + 'px');
		element.setStyle('left', left + 'px');
		element.setStyle('height', element._originalHeight);
		element.setStyle('width', element._originalWidth);

		return element;
	},

	cumulativeOffset: function(element) {		
		return [element.getAbsoluteLeft(), element.getAbsoluteTop()];
	},

	cumulativeScrollOffset: function(element) {
		var valueT = 0, valueL = 0;
		do {
			valueT += element.scrollTop  || 0;
			valueL += element.scrollLeft || 0;
			element = element.offsetParent;
		} while (element);
		return [valueL, valueT];
	},

	absolutize: function(element) {
		element = $(element);
		if (element.getStyle('position') == 'absolute') return;
		// Position.prepare(); // To be done manually by Scripty when it needs it.

		var offsets = element.positionedOffset();
		var top     = offsets[1];
		var left    = offsets[0];
		var width   = element.getClientWidth();
		var height  = element.getClientHeight();

		element._originalLeft   = left - parseFloat(element.getStyle('left')  || 0);
		element._originalTop    = top  - parseFloat(element.getStyle('top') || 0);
		element._originalWidth  = element.getStyle('width');
		element._originalHeight = element.getStyle('height');

		element.setStyle('position', 'absolute');
		element.setStyle('top', top + 'px');
		element.setStyle('left', left + 'px');
		element.setStyle('width', width + 'px');
		element.setStyle('height', height + 'px');
		return element;
	}
}

function $$(className, tag, parentContainer){
       var testClass = new RegExp("(\s)*" + className + "(\s)*");
       var tag = tag || "*";
       var parentContainer = $(parentContainer) || document;
       var elements = (tag == "*" && elm.all)? elm.all : parentContainer.getElementsByTagName(tag);
       var returnElements = [];
       var current;
       var length = elements.length;
       for(var i = 0; i < length; i++){
               current = elements[i];
               if(testClass.test(current.getClassName())){
               returnElements.push(current);            
               }
       }
       return returnElements;
}


function inspect(object) {
    try {
      if (isUndefined(object)) return 'undefined';
      if (object === null) return 'null';
      return object.inspect ? object.inspect() : object.toString();
    } catch (e) {
      if (e instanceof RangeError) return '...';
      throw e;
    }
};

function encodeURIComponent(str) {
	if (typeof(str) == "string") {
		return str.replace(/=/g,'%3D').replace(/&/g,'%26');
	}
	//checkboxes and radio buttons return objects instead of a string
	else if(typeof(str) == "object"){
		for (prop in str)
		{
			return str[prop].replace(/=/g,'%3D').replace(/&/g,'%26');
		}
	}
};

var Form = {};
Form.serialize = function(form_element) {
	elements=$(form_element).serialize();
	param_string="";
	for (var name in elements) {
		if (param_string)	
			param_string += "&";
		param_string += encodeURIComponent(name)+"="+encodeURIComponent(elements[name]);
	}
	return param_string;
};

Ajax.Request = Class.create({
	initialize: function(url, options) {
		var defaults = {
			responseType: Ajax.JSON,
			onSuccess: Prototype.emptyFunction,
			onComplete: Prototype.emptyFunction,
			onFailure: Prototype.emptyFunction,
			onLoading: Prototype.emptyFunction,
			requireLogin: true,
			parameters: "",
			context: null
		};
		
		this._options = extend_instance(defaults, options || {});
		this._url = url;
		
		this.ajax = new Ajax;

		this.prepare();
		this.request();
	},
	
	prepare: function() {
		this.ajax.responseType = this._options.responseType;
		this.ajax.requireLogin = this._options.requireLogin ? 1 : 0;
		this.ajax.ondone = function(data) {
			if (this._options.context != null) {
				this._options.onSuccess.call(this._options.context, data);
				this._options.onComplete.call(this._options.context, data);
			} else {
				this._options.onSuccess(data);
				this._options.onComplete(data);
			}
		}.bind(this);
		this.ajax.onerror = function(data) {
			if (this._options.context != null) {
				this._options.onFailure.call(this._options.context, data);
				this._options.onComplete.call(this._options.context, data);
			} else {
				this._options.onFailure(data);
				this._options.onComplete(data);
			}
		}.bind(this);
		this.parameters = this.prepare_parameters(this._options.parameters);
	},
	
	request: function() {
		this.ajax.post(this._url, this.parameters);
		if (this._options.context != null) {
			this._options.onLoading.call(this._options.context);
		} else {
			this._options.onLoading();
		}	
	},
	
	prepare_parameters: function(params) {
		if (isHash(params)) {
			return params;
		}
		var parameters = {};
		if (params) {
			pairs = params.split('&');	
			for (var i = 0; i < pairs.length; i++) {
				kv = pairs[i].split('=');
				key = kv[0].replace(/%3D/g,'=').replace(/%26/g,'&');
				val = kv[1].replace(/%3D/g,'=').replace(/%26/g,'&');
				parameters[key] = val;
			}
		}
		return parameters;
	}
});


function toJSON(object) {
  var type = typeof object;
  switch (type) {
    case 'undefined':
    case 'function':
    case 'unknown': return;
    case 'boolean': return object.toString();
  }

  if (object === null) return 'null';
  if (object.toJSON) return object.toJSON();
  if (Object.isElement(object)) return;

  var results = [];
  for (var property in object) {
    var value = toJSON(object[property]);
    if (!isUndefined(value))
      results.push(property.toJSON() + ': ' + value);
  }

  return '{' + results.join(', ') + '}';
}

function toQueryString(object) {
  return $H(object).toQueryString();
}

function toHTML(object) {
  return object && object.toHTML ? object.toHTML() : String.interpret(object);
}

function keys(object) {
  var keys = [];
  for (var property in object)
    keys.push(property);
  return keys;
}

function values(object) {
  var values = [];
  for (var property in object)
    values.push(object[property]);
  return values;
}

function clone(object) {
  return Object.extend({ }, object);
}

function isElement(object) {
  return object && object.nodeType == 1;
}

function isArray(object) {
	return object.each
}

function isHash(object) {
	return (typeof object == "object") && !isArray(object);
}

function isFunction(object) {
  return typeof object == "function";
}

function isString(object) {
  return typeof object == "string";
}

function isNumber(object) {
  return typeof object == "number";
}

function isUndefined(object) {
  return typeof object == "undefined";
}

function camelize(string) {
	if (string == 'undefined') return;
	var parts = string.split('-'), len = parts.length;
	if (len == 1) return parts[0];

	var camelized = string.charAt(0) == '-'
		? parts[0].charAt(0).toUpperCase() + parts[0].substring(1)
		: parts[0];

	for (var i = 1; i < len; i++)
		camelized += parts[i].charAt(0).toUpperCase() + parts[i].substring(1);

	return camelized;
}

function bind(functionName, obj, params) {
	if (arguments.length < 2 && isUndefined(obj)) return functionName;
	return functionName.apply(obj, params);
}

function wrap(wrapper, funct, args) {
    var __method = funct;
    return function() {
      return wrapper.apply(this, [__method.bind(this)].concat(args));
    }
}

var Event = {
	inspect: function() {
		return "un event " + this.Methods + " " + this.prototype;
	},

	observe: function(element, name, wrapper) {
		element = $(element);
		element.addEventListener(name, wrapper, false);

		return element;
	},

	stopObserving: function(element, name, wrapper) {
		element = $(element);
		element.removeEventListener(name, wrapper);

		return element;
	},

	isButton: function(event, code) {
		return (isUndefined(event.keyCode) || event.keyCode == 0);
		// return event.which ? (event.which === code + 1) : (event.button === code);
    },

	isLeftClick:   function(event) { 
		return Event.isButton(event, 0) 
	},
    isMiddleClick: function(event) { return Event.isButton(event, 1) },
    isRightClick:  function(event) { return Event.isButton(event, 2) },

    element: function(event) {
		var node = event.target;
		return node.nodeType == Node.TEXT_NODE ? node.getParentNode() : node;
    },

	pointer: function(event) {
		return {
			x: event.pageX,
			y: event.pageY
		};
	},

	pointerX: function(event) { return Event.pointer(event).x },
	pointerY: function(event) { return Event.pointer(event).y },

	stop: function(event) {
		event.stopped = true;
	}
}

var Position = {
	prepare: function() {
		this.deltaX =  document.getRootElement().getScrollLeft()
	                || 0;
	    this.deltaY =  document.getRootElement().getScrollTop()
	                || 0;
	},

	absolutize: function(element) {
		Position.prepare();
		return Element.Methods.absolutize(element);
	},

	// caches x/y coordinate pair to use with overlap
	within: function(element, x, y) {
		this.xcomp = x;
		this.ycomp = y;
		this.offset = Element.Methods.cumulativeOffset(element);

		return (y >= this.offset[1] &&
			y <  this.offset[1] + element.getOffsetHeight() &&
			x >= this.offset[0] &&
			x <  this.offset[0] + element.getOffsetWidth());
	},

	cumulativeOffset: Element.Methods.cumulativeOffset,
	realOffset: Element.Methods.cumulativeScrollOffset
}
