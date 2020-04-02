/**
 * Copyright (c) 2017 ~ present NAVER Corp.
 * billboard.js project is licensed under the MIT license
 */
import {isString, isArray} from "../../module/util";
import {TYPE, TYPE_BY_CATEGORY} from "../../config/const";

export default {
	setTargetType(targetIds: string[], type: string): void {
		const $$ = this;
		const {config, state: {withoutFadeIn}} = $$;

		$$.mapToTargetIds(targetIds).forEach(id => {
			withoutFadeIn[id] = (type === config.data_types[id]);
			config.data_types[id] = type;
		});

		if (!targetIds) {
			config.data_type = type;
		}
	},

	/**
	 * Updte current used chart types
	 * @private
	 */
	updateTypes(): void {
		const $$ = this;
		const {state} = $$;

		Object.keys(TYPE).forEach(v => {
			const t = TYPE[v];
			const has = $$.hasType(t, null, true);
			const idx = state.currentTypes.indexOf(t);

			if (idx === -1 && has) {
				state.currentTypes.push(t);
			} else if (idx > -1 && !has) {
				state.currentTypes.splice(idx, 1);
			}
		});
	},

	/**
	 * Check if given chart types exists
	 * @param {string} type Chart type
	 * @param {Array} targetsValue Data array
	 * @param {boolean} checkFromData Force to check type cotains from data targets
	 * @returns {boolean}
	 * @private
	 */
	hasType(type: string, targetsValue?, checkFromData = false): boolean {
		const $$ = this;
		const {config, state: {currentTypes}} = $$;
		const types = config.data_types;
		const targets = targetsValue || $$.data.targets;
		let has = false;

		if (!checkFromData && currentTypes.length && currentTypes.indexOf(type) > -1) {
			has = true;
		} else if (targets && targets.length) {
			targets.forEach(target => {
				const t = types[target.id];

				if (t === type || (!t && type === "line")) {
					has = true;
				}
			});
		} else if (Object.keys(types).length) {
			Object.keys(types).forEach(id => {
				if (types[id] === type) {
					has = true;
				}
			});
		} else {
			has = config.data_type === type;
		}

		return has;
	},

	/**
	 * Check if contains given chart types
	 * @param {string} type Type key
	 * @param {object} targets Target data
	 * @param {Array} exclude Excluded types
	 * @returns {boolean}
	 * @private
	 */
	hasTypeOf(type, targets, exclude = []): boolean {
		// 실제 노드 존재 여부도 확인필요
		return !TYPE_BY_CATEGORY[type]
			// @ts-ignore
			.filter(v => exclude.indexOf(v) === -1)
			.every(v => !this.hasType(v, targets));
	},

	/**
	 * Check if given data is certain chart type
	 * @param {object} d Data object
	 * @param {string|Array} type chart type
	 * @returns {boolean}
	 * @private
	 */
	isTypeOf(d, type): boolean {
		const id = isString(d) ? d : d.id;
		const dataType = this.config.data_types[id];

		return isArray(type) ?
			type.indexOf(dataType) >= 0 : dataType === type;
	},

	hasPointType(): boolean {
		const $$ = this;

		return $$.hasTypeOf("Line") || $$.hasType("bubble") || $$.hasType("scatter");
	},

	/**
	 * Check if contains arc types chart
	 * @param {object} targets Target data
	 * @param {Array} exclude Excluded types
	 * @returns {boolean}
	 * @private
	 */
	hasArcType(targets, exclude): boolean {
		return this.hasTypeOf("Arc", targets, exclude);
	},

	hasMultiArcGauge(): boolean {
		return this.hasType("gauge") && this.config.gauge_type === "multi";
	},

	isLineType(d): boolean {
		const id = isString(d) ? d : d.id;

		return !this.config.data_types[id] ||
			this.isTypeOf(id, TYPE_BY_CATEGORY.Line);
	},

	isStepType(d): boolean {
		return this.isTypeOf(d, TYPE_BY_CATEGORY.Step);
	},

	isSplineType(d): boolean {
		return this.isTypeOf(d, TYPE_BY_CATEGORY.Spline);
	},

	isAreaType(d): boolean {
		return this.isTypeOf(d, TYPE_BY_CATEGORY.Area);
	},

	isAreaRangeType(d): boolean {
		return this.isTypeOf(d, TYPE_BY_CATEGORY.AreaRange);
	},

	isBarType(d): boolean {
		return this.isTypeOf(d, "bar");
	},

	isBubbleType(d): boolean {
		return this.isTypeOf(d, "bubble");
	},

	isScatterType(d): boolean {
		return this.isTypeOf(d, "scatter");
	},

	isPieType(d): boolean {
		return this.isTypeOf(d, "pie");
	},

	isGaugeType(d): boolean {
		return this.isTypeOf(d, "gauge");
	},

	isDonutType(d): boolean {
		return this.isTypeOf(d, "donut");
	},

	isRadarType(d): boolean {
		return this.isTypeOf(d, "radar");
	},

	isArcType(d): boolean {
		return this.isPieType(d) ||
			this.isDonutType(d) ||
			this.isGaugeType(d) ||
			this.isRadarType(d);
	},

	// determine if is 'circle' data point
	isCirclePoint(): boolean {
		const {config} = this;
		const pattern = config.point_pattern;

		return config.point_type === "circle" &&
			(!pattern || (isArray(pattern) && pattern.length === 0));
	},

	lineData(d) {
		return this.isLineType(d) ? [d] : [];
	},

	arcData(d) {
		return this.isArcType(d.data) ? [d] : [];
	},

	barData(d) {
		return this.isBarType(d) ? d.values : [];
	},

	/**
	 * Get data adapt for data label showing
	 * @param {object} d Data object
	 * @returns {Array}
	 * @private
	 */
	labelishData(d) {
		return this.isBarType(d) ||
			this.isLineType(d) ||
			this.isScatterType(d) ||
			this.isBubbleType(d) ||
			this.isRadarType(d) ? d.values : [];
	},

	barLineBubbleData(d) {
		return this.isBarType(d) || this.isLineType(d) || this.isBubbleType(d) ?
			d.values : [];
	},

	// https://github.com/d3/d3-shape#curves
	isInterpolationType(type: string): boolean {
		return [
			"basis",
			"basis-closed",
			"basis-open",
			"bundle",
			"cardinal",
			"cardinal-closed",
			"cardinal-open",
			"catmull-rom",
			"catmull-rom-closed",
			"catmull-rom-open",
			"linear",
			"linear-closed",
			"monotone-x",
			"monotone-y",
			"natural"
		].indexOf(type) >= 0;
	}
};