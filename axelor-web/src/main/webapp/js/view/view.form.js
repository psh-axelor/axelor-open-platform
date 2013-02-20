FormViewCtrl.$inject = ['$scope', '$element'];
function FormViewCtrl($scope, $element) {

	DSViewCtrl('form', $scope, $element);

	var ds = $scope._dataSource;

	$scope.fields = {};
	$scope.fields_view = {};
	
	$scope.record = {};
	$scope.$$original = null;
	$scope.$$dirty = false;
	
	$scope.$events = {};
	
	/**
	 * Get field attributes.
	 * 
	 * @param field field name or field element
	 */
	$scope.getViewDef = function(field) {
		var name = id = field,
			elem = $(field),
			attrs = {};

		if (_.isObject(field)) {  // assume element
			name = elem.attr('x-field') || elem.attr('data-field') || elem.attr('name');
			id = elem.attr('id') || name;
		}
		
		attrs = _.extend({}, $scope.fields[name], $scope.fields_view[id]);

		return attrs;
	};

	$scope.doRead = function(id) {
		var params = {
			fields : _.pluck($scope.fields, 'name')
		};
		return ds.read(id, params);
	};

	function doEdit(id, dummy) {
		return $scope.doRead(id).success(function(record){
			if (dummy) {
				record = _.extend(dummy, record);
			}
			$scope.edit(record);
		});
	}
	
	var initialized = false;
	$scope.onShow = function(viewPromise) {
		
		var params = this._viewParams;

		if (params.recordId) {
			return viewPromise.then(function(){
				doEdit(params.recordId);
			});
		}
		
		if (!initialized && params.options && params.options.mode === "edit") {
			initialized = true;
			$scope._routeSearch = params.options.search;
			var recordId = +params.options.state;
			if (recordId > 0) {
				return viewPromise.then(function(){
					doEdit(recordId);
				});
			}
		}
		
		var page = ds.page(),
			record = null;
		
		if (page.index > -1) {
			record = ds.at(page.index);
		}
		viewPromise.then(function(){
			setTimeout(function(){
				if (record === undefined) {
					$scope.edit(null);
					$scope.ajaxStop(function(){
						setTimeout(function(){
							$scope.$broadcast("on:new");
							$scope.$apply();
						});
					});
				}
				if (record && record.id)
					return doEdit(record.id);
				$scope.edit(record);
			});
		});
	};
	
	$scope.getRouteOptions = function() {
		var rec = $scope.record,
			args = [];
		
		if (rec && rec.id > 0) {
			args.push(rec.id);
		}

		return {
			mode: 'edit',
			args: args,
			query: $scope._routeSearch
		};
	};
	
	$scope._routeSearch = {};
	$scope.setRouteOptions = function(options) {
		var opts = options || {},
			record = $scope.record || {},
			state = +opts.state || null;

		$scope._routeSearch = opts.search;
		if (record.id == state) {
			return $scope.updateRoute();
		}
		
		var params = $scope._viewParams;
		if (params.viewType !== "form") {
			return $scope.show();
		}
		return state ? doEdit(state) : $scope.edit(null);
	};

	$scope.edit = function(record) {
		$scope.editRecord(record);
		$scope.updateRoute();
		$scope._viewPromise.then(function(){
			var events = $scope.$events;
			if (events.onLoad && record) {
				setTimeout(events.onLoad);
			}
		});
	};
	
	$scope.editRecord = function(record) {
		$scope.$$original = record || {};
		$scope.$$dirty = false;
		$scope.record = angular.copy($scope.$$original);
		setTimeout(function(){
			$scope.$apply();
			$scope.$broadcast("on:edit", $scope.record);
		});
	};
	
	function updateSelected(name, records) {
		var path = $scope.formPath ? $scope.formPath + '.' + name : name,
			child = $element.find('[x-path="' + path + '"]:first'),
			childScope = child.data('$scope');
		if (records == null || childScope == null)
			return records;
		
		var selected = childScope.selection || [],
			result = [];
		
		selected = _.map(selected, function(i){
			return childScope.dataView.getItem(i).id;
		});
		
		_.each(records, function(item){
			item = _.extend({}, item, {
				selected : _.contains(selected, item.id)
			});
			result.push(item);
		});
		
		return result;
	}
	
	$scope.getContext = function() {
		var context = _.extend({}, $scope._routeSearch, $scope.record);
		if ($scope.$parent && $scope.$parent.getContext) {
			context._parent = $scope.$parent.getContext();
		}
		
		_.each($scope.fields, function(field, name) {
			if (/-many$/.test(field.type)) {
				var items = updateSelected(field.name, context[name]);
				if (items) {
					context[name] = items;
				}
			}
		});
		context._model = ds._model;
		return context;
	};

	$scope.isDirty = function() {
		return $scope.$$dirty;
	};

	$scope.$watch("record", function(rec, old) {
		if (rec === old) {
			return $scope.$$dirty = false;
		}
		$scope.$$dirty = !ds.equals($scope.record, $scope.$$original);
	}, true);

	$scope.isValid = function() {
		return $scope.form && $scope.form.$valid;
	};
	
	$scope.canCopy = function() {
		return $scope.record && !$scope.isDirty() && $scope.record.id;
	};
	
	$scope.canSave = function() {
		return $scope.isDirty() && $scope.isValid();
	};
	
	$scope.onNew = function() {
		$scope.confirmDirty(function(){
			$scope.edit(null);
			$scope.$broadcast("on:new");
		});
	};
	
	$scope.$on("on:new", function(event){
		$scope._viewPromise.then(function(){
			var events = $scope.$events;
			if (events.onNew) {
				setTimeout(events.onNew);
			}
		});
	});

	$scope.onCopy = function() {
		var record = $scope.record;
		ds.copy(record.id).success(function(record){
			$scope.edit(record);
		});
	};
	
	$scope.getDummyValues = function() {
		if (!$scope.record) return {};
		var fields = _.keys($scope.fields);
		var extra = _.chain($scope.fields_view)
					  .filter(function(f){ return f.widget && !_.contains(fields, f.name); })
					  .pluck('name')
					  .compact()
					  .value();
		return _.pick($scope.record, extra);
	};

	$scope.onSave = function() {
		var events = $scope.$events,
			saveAction = events.onSave;
		
		function doSave() {
			var dummy = $scope.getDummyValues();
			return ds.save($scope.record).success(function(record, page) {
				return doEdit(record.id, dummy);
			});
		}
		
		if (saveAction) {
			return saveAction().then(doSave);
		}
		return doSave();
	};
	
	$scope.confirmDirty = function(callback) {

		if (!$scope.isDirty())
			return callback();

		axelor.dialogs.confirm(_t("Current changes will be lost. Do you really want to proceed?"), function(confirmed){
			if (!confirmed)
				return;
			setTimeout(function(){
				$scope.$apply(function(){
					callback();
				});
			});
		});
	};
	
	$scope.onRefresh = function() {
		$scope.confirmDirty($scope.reload);
	};

	$scope.reload = function() {
		var record = $scope.record;
		if (record && record.id) {
			return doEdit(record.id);
		}
		$scope.edit(null);
		$scope.$broadcast("on:new");
	};

	$scope.onCancel = function() {
		
		var e = $scope.$broadcast("cancel:grid-edit");
		if (e.defaultPrevented) {
			return;
		}
		$scope.confirmDirty(function() {
			$scope.editRecord(null);
			$scope.switchTo('grid', function(viewScope) {
				viewScope.updateRoute();
			});
		});
	};

	$scope.onSearch = function() {
		$scope.onCancel();
	};
	
	$scope.pagerText = function() {
		var page = ds.page(),
			record = $scope.record || {};
			
		if (page && page.from !== undefined) {
			if (page.total == 0 || !record.id) return null;
			return _t("{0} of {1}", (page.from + page.index + 1), page.total);
		}
	},
	
	$scope.canNext = function() {
		var page = ds.page();
		return (page.index < page.size - 1) || (page.from + page.index < page.total - 1);
	};
	
	$scope.canPrev = function() {
		var page = ds.page();
		return page.index > 0 || ds.canPrev();
	};
	
	$scope.onNext = function() {
		$scope.confirmDirty(function() {
			ds.nextItem(function(record){
				if (record && record.id) doEdit(record.id);
			});
		});
	};
	
	$scope.onPrev = function() {
		$scope.confirmDirty(function() {
			ds.prevItem(function(record){
				if (record && record.id) doEdit(record.id);
			});
		});
	};
}

angular.module('axelor.ui').directive('uiViewForm', ['$compile', 'ViewService', function($compile, ViewService){
	
	function parse(scope, schema, fields, types) {
		
		var path = scope.formPath || "";
		
		function update(e, attrs) {
			_.each(attrs, function(v, k) {
				if (_.isUndefined(v)) return;
				e.attr(k, v);
			});
		}
		
		function process(items, parent) {
		
			$(items).each(function(){
			
				if (this.type == 'break') {
					return $('<br>').appendTo(parent);
				}
				
				if (this.type == 'field') {
					delete this.type;
				}
				
				var widget = this.widget || '',
					match = widget.match(/^([\w-]*)\[(.*?)\]$/),
					attrs = {}, widgetAttrs = {};
				
				if (match) {
					widget = match[1].trim();
					_.each(match[2].split(/\s*\|\s*/), function(part) {
						var parts = part.split(/\s*=\s*/);
						var attrName = parts[0].trim();
						var attrValue = parts[1].trim();
						if (attrValue.match(/^(\d+)$/)) {
							attrValue = +attrValue;
						}
						if (attrValue === "true") {
							attrValue = true;
						}
						if (attrValue === "false") {
							attrValue = false;
						}
						if (attrValue === "null") {
							attrValue = null;
						}
						attrs[attrName] = attrValue;
						widgetAttrs['x-' + attrName] = attrValue;
					});
				}
			
				var item = $('<div></div>').appendTo(parent),
					field = fields[this.name] || {},
					widgetId = _.uniqueId('_formWidget'),
					type = widget;

				attrs = angular.extend(attrs, field, this);
				type = types[widget] || types[attrs.type] || attrs.type || 'string';

				if (_.isArray(attrs.selection)) {
					type = 'select';
				}
				
				attrs.serverType = attrs.type;
				attrs.type = type;
				
				item.attr('ui-' + type, '');
				item.attr('id', widgetId);
				
				scope.fields_view[widgetId] = attrs;
				
				if (!_.isUndefined(attrs.noLabel)){
					attrs.showTitle = !attrs.noLabel;
				}
				
				//TODO: cover all attributes
				var _attrs = _.extend({}, attrs.attrs, this.attrs, widgetAttrs, {
						'name'			: attrs.name || this.name,
						'x-cols'		: this.cols,
						'x-colspan'		: this.colSpan,
						'x-rowspan'		: this.rowSpan,
						'x-widths'		: this.colWidths,
						'x-field'		: this.name,
						'x-title'		: attrs.title,
						'x-show-title'	: attrs.showTitle
					});
				
				if (attrs.required)
					_attrs['ng-required'] = true;
				if (attrs.readonly)
					_attrs['x-readonly'] = true;
				
				if (_attrs.name) {
					_attrs['x-path'] = path ? path + "." + _attrs.name : _attrs.name;
				}
				
				update(item, _attrs);

				if (type == 'button' || type == 'static') {
					item.html(this.title);
				}
				
				if (/button|group|tabs|tab|separator|spacer|static/.test(type)) {
					item.attr('x-show-title', false);
				}
			
				var items = this.items || this.pages;
				if (items) {
					process(items, item);
					if (type != 'tabs') {
						item.attr('ui-table-layout', '');
					}
				}
			});
			return parent;
		}
		
		var elem = $('<form name="form" ui-form ui-table-layout ui-actions></form>');
		elem.attr('x-cols', schema.cols)
		  	.attr('x-widths', schema.colWidths);

		process(schema.items, elem);
		
		return elem;
	}
	
	return function(scope, element, attrs) {
		
		var loaded = false;
		
		function findItem(item) {
			var elem = item;
			if (_.isString(item))
				elem = $('#' + item);
			return elem ? $(elem) : null;
		}
		
		scope.isReadonly = function(item) {
			return $(item).is(":disabled,.ui-state-disabled");
		};

		scope.setReadonly = function(item, readonly) {
			var flag = _.isUndefined(readonly) || readonly,
				elem = findItem(item),
				label, classOp;

			if (elem == null)
				return;

			label = elem.data('label') || $();
			classOp = flag ? 'addClass' : 'removeClass';
			
			if (elem.is('.tabbable-tabs')) {
				elem = elem.children('.tab-content');
			}

			elem.add(label)[classOp]('ui-state-disabled');

			if (elem.is('.ui-spinner-input')) {
				return elem.spinner('option', 'disabled', flag);
			}
			if (elem.is(':input')) {
				return elem.attr('disabled', flag);
			}
			
			if (elem.is('.input-append,.picker-input')){
				return elem.find(':input').attr('disabled', flag)[classOp]('ui-state-disabled');
			}

			elem.find(':input, a').each(function(){
				var e = $(this);
				if (e.is('.ui-state-disabled')) {
					return;
				}
				if (e.is('a')) {
					if (e.attr('tabindex') !== -1) {
						return e.attr('tabindex', flag ? -2 : null);
					}
				}
				e.attr('disabled', flag);
			});
			
			if (elem.is(".one2many-item,.many2many-item")) {
				return;
			}
			
			var div = elem.children('.disabled-overlay');
			if (div.size() == 0) {
				div = $('<div class="disabled-overlay"></div>').appendTo(elem);
			}
			
			return flag ? div.show() : div.hide();
		};

		scope.setHidden = function(item, hidden) {
			var flag = _.isUndefined(hidden) || hidden,
				elem = findItem(item), label, label_parent, parent;
			if (elem == null)
				return;
			label = elem.data('label') || $();
			label_parent = label.parent('td');
			parent = elem.parent('td');
			if (parent.size() == 0)
				parent = elem;
			if (label_parent.size())
				label = label_parent;
			return flag ? parent.add(label).hide() : parent.add(label).show();
		};
		
		scope.setRequired = function(item, required) {
			var flag = _.isUndefined(required) || required,
				elem = findItem(item), attrs, label;
			if (elem == null)
				return;
			attrs = elem.data('$attrs');
			label = elem.data('label') || $();
			if (label) {
				flag ? label.addClass('required') : label.removeClass('required');
			}
			if (attrs) {
				attrs.$set('required', flag);
			}
		};
		
		function getContent() {
			var info = {};
				record = scope.record || {};
			if (record.createdOn) {
				info.createdOn = moment(record.createdOn).format('DD/MM/YYYY HH:mm');
				info.createdBy = (scope.record.createdBy || {}).name;
			}
			if (record.updatedOn) {
				info.updatedOn = moment(record.updatedOn).format('DD/MM/YYYY HH:mm');
				info.updatedBy = (scope.record.updatedBy || {}).name;
			}
			var table = $("<table class='field-details'>");
			var tr;
			
			tr = $("<tr></tr>").appendTo(table);
			$("<th></th>").text(_t("Created On:")).appendTo(tr);
			$("<td></td>").text(info.createdOn).appendTo(tr);
			
			tr = $("<tr></tr>").appendTo(table);
			$("<th></th>").text(_t("Created By:")).appendTo(tr);
			$("<td></td>").text(info.createdBy).appendTo(tr);
			
			tr = $("<tr></tr>").appendTo(table);
			$("<th></th>").text(_t("Updated On:")).appendTo(tr);
			$("<td></td>").text(info.updatedOn).appendTo(tr);
			
			tr = $("<tr></tr>").appendTo(table);
			$("<th></th>").text(_t("Updated By:")).appendTo(tr);
			$("<td></td>").text(info.updatedBy).appendTo(tr);
			
			return table;
		}
		
		var logInfo = null;
		scope.onShowLog = function(e) {
			if (logInfo === null) {
				logInfo = $(e.target).parents("div:first").find("button").popover({
					title: _t('Update Log'),
					html: true,
					content: getContent,
					placement: "bottom",
					trigger: "hover",
					delay: {show: 500, hide: 0}
				});
				logInfo.popover('show');
			}
			
		};
		
		scope.hasAuditLog = function() {
			var record = scope.record || {};
			return record.createdOn || record.updatedOn || record.createBy || record.updatedBy;
		};
		
		scope.$on("$destroy", function() {
			if (logInfo != null) {
				logInfo.popover("destroy");
				logInfo = null;
			}
		});
		
		scope.$watch('schema', function(schema){

			if (schema == null || loaded)
				return;
			
			var form = parse(scope, schema, scope.fields, ViewService.FIELD_TYPES);

			form = $compile(form)(scope);
			element.append(form);
			
			if (scope._viewResolver) {
				scope._viewResolver.resolve(schema, element);
				scope.$broadcast("adjust:dialog");
			}

			loaded = true;
		});
	};
}]);
