/**
 * Copyright (c) 2017 ~ present NAVER Corp.
 * billboard.js project is licensed under the MIT license
 */
import {
	curveStepBefore as d3CurveStepBefore,
	curveStepAfter as d3CurveStepAfter,
	curveBasisClosed as d3CurveBasisClosed,
	curveBasisOpen as d3CurveBasisOpen,
	curveBasis as d3CurveBasis,
	curveBundle as d3CurveBundle,
	curveCardinalClosed as d3CurveCardinalClosed,
	curveCardinalOpen as d3CurveCardinalOpen,
	curveCardinal as d3CurveCardinal,
	curveCatmullRomClosed as d3CurveCatmullRomClosed,
	curveCatmullRomOpen as d3CurveCatmullRomOpen,
	curveCatmullRom as d3CurveCatmullRom,
	curveLinearClosed as d3CurveLinearClosed,
	curveLinear as d3CurveLinear,
	curveMonotoneX as d3CurveMonotoneX,
	curveMonotoneY as d3CurveMonotoneY,
	curveNatural as d3CurveNatural,
	curveStep as d3CurveStep
} from "d3-shape";
import {select as d3Select} from "d3-selection";
import CLASS from "../../config/classes";
import {getUnique, isObjectType, isNumber, isUndefined, notEmpty} from "../../module/util";

export default {
	/**
	 * Get the shape draw function
	 * @returns {object}
	 * @private
	 */
	getDrawShape() {
		type SHAPE = {
			area?: any;
			bar?: any;
			line?: any;
		};

		const $$ = this;
		const isRotated = $$.config.axis_rotated;
		const {hasRadar} = $$.state;
		const shape = {type: <SHAPE> {}, indices: <SHAPE> {}, pos: {}};

		// setup drawer - MEMO: these must be called after axis updated
		if ($$.hasTypeOf("Line") || $$.hasType("bubble") || $$.hasType("scatter")) {
			const indices = $$.getShapeIndices($$.isLineType);

			shape.indices.line = indices;
			shape.type.line = $$.generateDrawLine ? $$.generateDrawLine(indices, false) : undefined;

			if ($$.hasTypeOf("Area")) {
				const indices = $$.getShapeIndices($$.isAreaType);

				shape.indices.area = indices;
				shape.type.area = $$.generateDrawArea ? $$.generateDrawArea(indices, false) : undefined;
			}
		}

		if ($$.hasType("bar")) {
			const indices = $$.getShapeIndices($$.isBarType);

			shape.indices.bar = indices;
			shape.type.bar = $$.generateDrawBar ? $$.generateDrawBar(indices) : undefined;
		}

		if (!$$.hasArcType() || hasRadar) {
			// generate circle x/y functions depending on updated params
			const cx = hasRadar ? $$.radarCircleX : (isRotated ? $$.circleY : $$.circleX);
			const cy = hasRadar ? $$.radarCircleY : (isRotated ? $$.circleX : $$.circleY);

			shape.pos = {
				xForText: $$.generateXYForText(shape.indices, true),
				yForText: $$.generateXYForText(shape.indices, false),
				cx: (cx || function() {}).bind($$),
				cy: (cy || function() {}).bind($$)
			};
		}

		return shape;
	},

	getShapeIndices(typeFilter) {
		const $$ = this;
		const {config} = $$;
		const xs = config.data_xs;
		const hasXs = notEmpty(xs);
		const indices = {};
		let i: any = hasXs ? {} : 0;

		if (hasXs) {
			getUnique(Object.keys(xs).map(v => xs[v]))
				.forEach(v => {
					i[v] = 0;
					indices[v] = {};
				});
		}

		$$.filterTargetsToShow($$.data.targets.filter(typeFilter, $$))
			.forEach(d => {
				const xKey = d.id in xs ? xs[d.id] : "";
				const ind = xKey ? indices[xKey] : indices;

				for (let j = 0, groups; (groups = config.data_groups[j]); j++) {
					if (groups.indexOf(d.id) < 0) {
						continue;
					}

					for (let k = 0, row; (row = groups[k]); k++) {
						if (row in ind) {
							ind[d.id] = ind[row];
							break;
						}
					}
				}

				if (isUndefined(ind[d.id])) {
					ind[d.id] = xKey ? i[xKey]++ : i++;
					ind.__max__ = (xKey ? i[xKey] : i) - 1;
				}
			});

		return indices;
	},

	/**
	 * Get indices value based on data ID value
	 * @param {object} indices Indices object
	 * @param {string} id Data id value
	 * @returns {object} Indices object
	 * @private
	 */
	getIndices(indices, id: string) {
		const xs = this.config.data_xs;

		return notEmpty(xs) ?
			indices[xs[id]] : indices;
	},

	/**
	 * Get indices max number
	 * @param {object} indices Indices object
	 * @returns {number} Max number
	 * @private
	 */
	getIndicesMax(indices): number {
		return notEmpty(this.config.data_xs) ?
			// if is multiple xs, return total sum of xs' __max__ value
			Object.keys(indices)
				.map(v => indices[v].__max__ || 0)
				.reduce((acc, curr) => acc + curr) : indices.__max__;
	},

	getShapeX(offset, indices, isSub?: boolean): (d) => number {
		const $$ = this;
		const {config, scale} = $$;
		const currScale = isSub ? scale.subX : (scale.zoom || scale.x);
		const barPadding = config.bar_padding;
		const sum = (p, c) => p + c;
		const halfWidth = isObjectType(offset) && offset.total.length ? offset.total.reduce(sum) / 2 : 0;

		return d => {
			const ind = $$.getIndices(indices, d.id);
			const index = d.id in ind ? ind[d.id] : 0;
			const targetsNum = (ind.__max__ || 0) + 1;
			let x = 0;

			if (notEmpty(d.x)) {
				const xPos = currScale(d.x);

				if (halfWidth) {
					x = xPos - (offset[d.id] || offset.width) +
						offset.total.slice(0, index + 1).reduce(sum) -
						halfWidth;
				} else {
					x = xPos - (isNumber(offset) ? offset : offset.width) * (targetsNum / 2 - index);
				}
			}

			// adjust x position for bar.padding optionq
			if (offset && x && targetsNum > 1 && barPadding) {
				if (index) {
					x += barPadding * index;
				}

				if (targetsNum > 2) {
					x -= (targetsNum - 1) * barPadding / 2;
				} else if (targetsNum === 2) {
					x -= barPadding / 2;
				}
			}

			return x;
		};
	},

	getShapeY(isSub?: boolean): Function {
		const $$ = this;
		const isStackNormalized = $$.isStackNormalized();

		return d => {
			const value = isStackNormalized ? $$.getRatio("index", d, true) : (
				$$.isBubbleZType(d) ? $$.getBubbleZData(d.value, "y") : d.value
			);

			return $$.getYScaleById(d.id, isSub)(value);
		};
	},

	/**
	 * Get shape based y Axis min value
	 * @param {string} id Data id
	 * @returns {number}
	 * @private
	 */
	getShapeYMin(id: string): number {
		const $$ = this;
		const scale = $$.scale[$$.axis.getId(id)];
		const [yMin] = scale.domain();

		return !$$.isGrouped(id) && yMin > 0 ? yMin : 0;
	},

	/**
	 * Get Shape's offset data
	 * @param {Function} typeFilter Type filter function
	 * @returns {object}
	 * @private
	 */
	getShapeOffsetData(typeFilter) {
		const $$ = this;
		const targets = $$.orderTargets($$.filterTargetsToShow($$.data.targets.filter(typeFilter, $$)));
		const isStackNormalized = $$.isStackNormalized();

		const shapeOffsetTargets = targets.map(target => {
			let rowValues = target.values;
			const values = {};

			if ($$.isStepType(target)) {
				rowValues = $$.convertValuesToStep(rowValues);
			}

			const rowValueMapByXValue = rowValues.reduce((out, d) => {
				const key = Number(d.x);

				out[key] = d;
				values[key] = isStackNormalized ? $$.getRatio("index", d, true) : d.value;

				return out;
			}, {});

			return {
				id: target.id,
				rowValues,
				rowValueMapByXValue,
				values
			};
		});
		const indexMapByTargetId = targets.reduce((out, {id}, index) => {
			out[id] = index;
			return out;
		}, {});

		return {indexMapByTargetId, shapeOffsetTargets};
	},

	getShapeOffset(typeFilter, indices, isSub?: boolean): Function {
		const $$ = this;
		const {shapeOffsetTargets, indexMapByTargetId} = $$.getShapeOffsetData(typeFilter);

		return (d, idx) => {
			const ind = $$.getIndices(indices, d.id);
			const scale = $$.getYScaleById(d.id, isSub);
			const y0 = scale($$.getShapeYMin(d.id));

			const dataXAsNumber = Number(d.x);
			let offset = y0;

			shapeOffsetTargets
				.filter(t => t.id !== d.id)
				.forEach(t => {
					if (ind[t.id] === ind[d.id] && indexMapByTargetId[t.id] < indexMapByTargetId[d.id]) {
						let row = t.rowValues[idx];

						// check if the x values line up
						if (!row || Number(row.x) !== dataXAsNumber) {
							row = t.rowValueMapByXValue[dataXAsNumber];
						}

						if (row && row.value * d.value >= 0) {
							offset += scale(t.values[dataXAsNumber]) - y0;
						}
					}
				});

			return offset;
		};
	},

	isWithinShape(that, d): boolean {
		const $$ = this;
		const shape = d3Select(that);
		let isWithin;

		if (!$$.isTargetToShow(d.id)) {
			isWithin = false;
		} else if ($$.hasValidPointType && $$.hasValidPointType(that.nodeName)) {
			isWithin = $$.isStepType(d) ?
				$$.isWithinStep(that, $$.getYScaleById(d.id)(d.value)) :
				$$.isWithinCircle(that, $$.isBubbleType(d) ? $$.pointSelectR(d) * 1.5 : 0);
		} else if (that.nodeName === "path") {
			isWithin = shape.classed(CLASS.bar) ? $$.isWithinBar(that) : true;
		}

		return isWithin;
	},

	getInterpolate(d) {
		const $$ = this;
		const interpolation = $$.getInterpolateType(d);

		return {
			"basis": d3CurveBasis,
			"basis-closed": d3CurveBasisClosed,
			"basis-open": d3CurveBasisOpen,
			"bundle": d3CurveBundle,
			"cardinal": d3CurveCardinal,
			"cardinal-closed": d3CurveCardinalClosed,
			"cardinal-open": d3CurveCardinalOpen,
			"catmull-rom": d3CurveCatmullRom,
			"catmull-rom-closed": d3CurveCatmullRomClosed,
			"catmull-rom-open": d3CurveCatmullRomOpen,
			"monotone-x": d3CurveMonotoneX,
			"monotone-y": d3CurveMonotoneY,
			"natural": d3CurveNatural,
			"linear-closed": d3CurveLinearClosed,
			"linear": d3CurveLinear,
			"step": d3CurveStep,
			"step-after": d3CurveStepAfter,
			"step-before": d3CurveStepBefore
		}[interpolation];
	},

	getInterpolateType(d) {
		const $$ = this;
		const {config} = $$;
		const type = config.spline_interpolation_type;
		const interpolation = $$.isInterpolationType(type) ? type : "cardinal";

		return $$.isSplineType(d) ?
			interpolation : (
				$$.isStepType(d) ?
					config.line_step_type : "linear"
			);
	}
};
