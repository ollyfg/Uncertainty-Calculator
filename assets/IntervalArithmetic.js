;(function (window) {
    if (typeof zizhujy == "undefined") {
        zizhujy = {};
        window.zizhujy = zizhujy;
    }

    zizhujy = {
        constantValue: function(v){
            return {val:[v, v], def:[true, true]};
        },

        zero: function(){
            return this.constantValue(0);
        },

        /// <Summary>
        /// [a, b] + [c, d] = [min (a + c, a + d, b + c, b + d), max (a + c, a + d, b + c, b + d)] = [a + c, b + d]
        /// </Summary>
        add: function(interval1, interval2){
            return {
                val: [interval1.val[0] + interval2.val[0], interval1.val[1] + interval2.val[1]],
                def: [interval1.def[0] && interval2.def[0], interval1.def[1] && interval2.def[1]]
            };
        },

        /// <Summary>
        /// [a, b] − [c, d] = [min (a − c, a − d, b − c, b − d), max (a − c, a − d, b − c, b − d)] = [a − d, b − c]
        /// </Summary>
        subtract: function(interval1, interval2){
            return {
                val: [interval1.val[0] - interval2.val[1], interval1.val[1] - interval2.val[0]],
                def: [interval1.def[0] && interval2.def[0], interval1.def[1] && interval2.def[1]]
            };
        },

        negative: function(interval){
            return {
                val: [-interval.val[1], -interval.val[0]],
                def: interval.def
            };
        },

        /// <Summary>
        /// [a, b] × [c, d] = [min (a × c, a × d, b × c, b × d), max (a × c, a × d, b × c, b × d)]
        /// </Summary>
        multiply: function(interval1, interval2){
            var a = interval1.val[0], b = interval1.val[1];
            var c = interval2.val[0], d = interval2.val[1];

            var ac = a*c, ad = a*d, bc = b*c, bd = b*d;

            return {
                val: [
                    Math.min(ac, ad, bc, bd),
                    Math.max(ac, ad, bc, bd)
                ],
                def: [interval1.def[0] && interval2.def[0], interval1.def[1] && interval2.def[1]]
            };
        },

        /// <Summary>
        /// [a, b] ÷ [c, d] = [min (a ÷ c, a ÷ d, b ÷ c, b ÷ d), max (a ÷ c, a ÷ d, b ÷ c, b ÷ d)]
        /// when 0 is not in [c, d].
        /// </Summary>
        divide: function(interval1, interval2){
            var a = interval1.val[0], b = interval1.val[1];
            var c = interval2.val[0], d = interval2.val[1];

//            if(c <= 0 && d >= 0){
//                throw "Can't be divided by 0. [{0}, {1}]/[{2}, {3}].".format(a, b, c, d);
//            }

            var ac = a/c, ad = a/d, bc = b/c, bd = b/d;

            if(c <= 0 && d >= 0){
                return {
                    val: [
                        Math.min(ac, ad, bc, bd),
                        Math.max(ac, ad, bc, bd)
                    ],
                    def: [false, true]
                };
            }else{
                return {
                    val: [
                        Math.min(ac, ad, bc, bd),
                        Math.max(ac, ad, bc, bd)
                    ],
                    def: [interval1.def[0] && interval2.def[0], interval1.def[1] && interval2.def[1]]
                };
            }
        },

        /// <Summary>
        ///     Odd powers: [x1, x2]^n = [x1^n, x2^n], for odd n <- N.
        ///     Even powers:
        ///         [x1, x2]^n = [x1^n, x2^n], if x1 >= 0
        ///         [x1, x2]^n = [x2^n, x1^n], if x2 <  0
        ///         [x1, x2]^n = [0, max{x1^n, x2^n}], otherwise
        /// </Summary>
        pow: function(interval1, interval2){
            if(interval2.val[0] == interval2.val[1]){
                var n = interval2.val[0];

                if(n % 2 == 0){
                    if(interval1.val[0] >= 0){
                        return {val: [Math.pow(interval1.val[0], n), Math.pow(interval1.val[1], n)], def: interval1.def};
                    }else if (interval1.val[1] < 0){
                        return {val: [Math.pow(interval1.val[1], n), Math.pow(interval1.val[0], n)], def: interval1.def};
                    }else {
                        return {val: [0, Math.max(Math.pow(interval1.val[0], n), Math.pow(interval1.val[1], n))], def: interval1.def};
                    }
                }else{
                    if(parseFloat(n) == parseInt(n, 10) && !isNaN(n)){
                        return {val: [Math.pow(interval1.val[0], n), Math.pow(interval1.val[1], n)], def: interval1.def};
                    }else{
                        if(this.greaterThan({val:[0, 0], def:[true,true]}, interval1).val.equals([true, true])){
                            return {val: [-Infinity, Infinity], def: [false, false]};
                        }else{
                            var l = Math.pow(interval1.val[0], n);
                            var u = Math.pow(interval1.val[1], n);
                            if(isNaN(l) || isNaN(u)){
                                return {val: [-Infinity, Infinity], def: [false, true]};
                            }else{
                                return {val: [l, u], def: [true, true]};
                            }
                        }
                    }
                }
            } else if (interval1.val[0] == interval1.val[1]){
                var a = interval1.val[0];
                if(a > 1){
                    return {val: [Math.pow(a, interval2.val[0]), Math.pow(a, interval2.val[1])], def: interval2.def};
                }else{
                    throw "Don't know how to calculate it yet.";
                }
            }else{
                throw "Don't know how to calculate it yet.";
            }
        },

        greaterThan: function(interval1, interval2){
            return {
                val: [interval1.val[0] > interval2.val[1], interval1.val[1] > interval2.val[0]],
                def: this.and(interval1.def, interval2.def)
            };
        },

        overlaps: function(interval1, interval2){
            if(this.greaterThan(interval1, interval2).val.equals([true, true])){
                return {val: [false, false], def: [true, true]};
            }else if (this.greaterThan(interval2, interval1).val.equals([true, true])){
                return {val: [false, false], def: [true, true]};
            }else {
                //return [interval1[0] == interval2[1] && interval1[1] <= interval2[0], interval1[1] >= interval2[0] && interval1[0] <= interval1[1]];
                return {val: [true, true], def: [true, true]};
            }
        },

        equals: function(interval1, interval2){
            if( this.include(interval1, interval2).val.equals([true, true])){
                return {val: [true, true], def: [true, true]};
            }else if (this.include(interval2, interval1).equals([true, true])){
                return {val: [true, true], def: [true, true]};
            }else if(this.greaterThan(interval1, interval2).equals([true, true])){
                return {val: [false, false], def: [true, true]};
            }else if (this.greaterThan(interval2, interval1).equals([true, true])){
                return {val: [false, false], def: [true, true]};
            }else {
                return {val: [false, true], def: [true, true]};
            }
        },

        include: function(interval1, interval2){
            return {
                val: [
                    interval1.val[0] <= interval2.val[0] && interval1.val[1] >= interval2.val[1],
                    interval1.val[1] >= interval2.val[0] && interval1.val[0] <= interval2.val[1]
                ],
                def: [true, true]
            }
        },

        and: function(interval1, interval2){
            if((interval1 instanceof Array) && (interval2 instanceof Array)){
                return [interval1[0] && interval2[0], interval1[1] && interval2[1]];
            }else{
                return {
                    val: [interval1.val[0] && interval2.val[0], interval1.val[1] && interval2.val[1]],
                    def: [interval1.def[0] && interval2.def[0], interval1.def[1] && interval2.def[1]]
                };
            }
        },

        not: function(interval){
            return {val: [!interval.val[1], !interval.val[0]], def: interval.def};
        },

        sin: function(interval){
            var l = Math.sin(interval.val[0]);
            var t = Math.sin(interval.val[1]);
            var min = Math.min(l, t);
            var max = Math.max(l, t);

            if(Math.ceil((2 * interval.val[0]/Math.PI - 1)/4) == Math.floor((2*interval.val[1]/Math.PI -1)/4)){
                max = 1;
            }
            if(Math.ceil((2*interval.val[0]/Math.PI + 1)/4) == Math.floor((2*interval.val[1]/Math.PI + 1)/4)){
                min = -1;
            }
            return {val: [min, max], def: [true, true]};
        },

        cos: function(interval){
            var l = Math.cos(interval.val[0]);
            var t = Math.cos(interval.val[1]);
            var min = Math.min(l, t);
            var max = Math.max(l, t);

            if(Math.ceil( interval.val[0]/2/Math.PI ) == Math.floor( interval.val[1]/2/Math.PI )){
                max = 1;
            }
            if(Math.ceil( (interval.val[0]/Math.PI - 1)/2 ) == Math.floor( (interval.val[1]/Math.PI - 1)/2 )){
                min = -1;
            }

            return {val: [min, max], def: [true, true]};
        },

        tan: function(interval){
            var l = Math.tan(interval.val[0]);
            var t = Math.tan(interval.val[1]);

            if( Math.floor(interval.val[0] / Math.PI + 0.5) == Math.ceil(interval.val[1]/Math.PI - 0.5)){
                // domain for tan: k*PI - PI/2 < x0 < x1 < k*PI + PI/2, k = ..., -1, 0, 1, 2, ...
                // or
                //      x1/PI - 0.5 < k < x0/PI + 0.5
                // or
                //      floor(x0/PI + 1/2) == ceil(x1/PI - 1/2)
                return {val: [Math.min(l, t), Math.max(l, t)], def: [true, true]};
            }else {
                return {val: [-Infinity, Infinity], def: [false, true]};
            }
        },

        cot: function(interval){
            return this.divide(this.constantValue(1), this.tan(interval));
        },

        arcsin: function(interval){
            var l = Math.asin(interval.val[0]);
            var t = Math.asin(interval.val[1]);

            var def = interval.def;
            if(isNaN(l) && isNaN(t)) def = [false, false];
            else if (isNaN(l) || isNaN(t)) def = [false, interval.def[1]];
            return {val: [l, t], def: def};
        },

        arccos: function(interval){
            var l = Math.acos(interval.val[1]);
            var t = Math.acos(interval.val[0]);

            var def = interval.def;
            if(isNaN(l) && isNaN(t)) def = [false, false];
            else if (isNaN(l) || isNaN(t)) def = [false, interval.def[1]];
            return {val: [l, t], def: def};
        },

        arctan: function(interval){
            var l = Math.atan(interval.val[0]);
            var t = Math.atan(interval.val[1]);

            var def = interval.def;
            if(isNaN(l) && isNaN(t)) def = [false, false];
            else if (isNaN(l) || isNaN(t)) def = [false, interval.def[1]];
            return {val: [l, t], def: def};
        },

        arccot: function(interval){
            var l = Math.acot(interval.val[1]);
            var t = Math.acot(interval.val[0]);

            var def = interval.def;
            if(isNaN(l) && isNaN(t)) def = [false, false];
            else if (isNaN(l) || isNaN(t)) def = [false, interval.def[1]];
            return {val: [l, t], def: def};
        },

        sec: function (interval){
            interval = this.cos(interval);
            if(this.greaterThan(interval, this.zero()).val.equals([true, true]) || this.greaterThan(this.zero(), interval).val.equals([true, true])){
                return this.divide({val: [1, 1], def: [true, true]}, interval);
            }else{
                return {val: [-Infinity, Infinity], def: [false, true]};
            }
        },

        cosec: function(interval){
            return this.divide(this.constantValue(1), this.sin(interval));
        },

        sgn: function(interval){
            // Never use [] == []!!!
            if(this.greaterThan(interval, {val: [0, 0], def: [true, true]}).val.equals([true, true])){
                return {val: [1, 1], def: [true, true]};
            }else if(this.greaterThan({val: [0, 0], def: [true, true]}, interval).val.equals([true, true])){
                return {val: [-1, -1], def: [true, true]};
            } else if (this.include({val: [0, 0], def: [true, true]}, interval).val.equals([true, true])) {
                return {val: [0, 0], def: [true, true]};
            } else {
                return {val: [-1, 1], def: [true, true]};
            }
        },

        sign: function(interval){
            return this.sgn(interval);
        },

        /// <Summary>
        ///     log_a^([x1, x2]) = [log_a^x1, log_a^x2], for positive intervals[x1, x2] and a > 1
        /// </Summary>
        log: function(base, interval2){
            if(base.val[0] == base.val[1]){
                var a = base.val[0];

                if(a > 1 && interval2.val[0] > 0){
                    return {
                        val: [Math.log(interval2.val[0]) / Math.log(a), Math.log(interval2.val[1]) / Math.log(a)],
                        def: interval2.def
                    };
                }else{
                    throw "Don't know how to compute it yet.";
                }
            }else{
                throw "Don't know how to compute it yet.";
            }
        },

        ln: function(interval){
            var l = Math.ln(interval.val[0]);
            var t = Math.ln(interval.val[1]);

            var def = interval.def;
            if(isNaN(l) && isNaN(t)) def = [false, false];
            else if (isNaN(l) || isNaN(t)) def = [false, interval.def[1]];
            return {val: [l, t], def: def};
        },

        exp: function(interval){
            return {val: [Math.exp(interval.val[0]), Math.exp(interval.val[1])], def: interval.def};
        },

        abs: function (interval){
            var min = Math.abs(interval.val[0]);
            var max = Math.abs(interval.val[1]);

            if(min > max){
                var tmp = min;
                min = max;
                max = tmp;
            }

            if(this.include(interval, this.zero()).val.equals([true, true])){
                min = 0;
            }

            return {val: [min, max], def: interval.def};
        },

        sqrt: function(interval){
            var l = Math.sqrt(interval.val[0]);
            var t = Math.sqrt(interval.val[1]);

            var def = interval.def;
            if(isNaN(l) && isNaN(t)) def = [false, false];
            else if (isNaN(l) || isNaN(t)) def = [false, interval.def[1]];
            return {val: [l, t], def: def};
        },

        // Convert a number with an uncertainty associated to an interval. Assume it is all sanitary
        uNumToInterval: function(value,uncertainty){
			return {val: [value+uncertainty, value-uncertainty], def: [true,true]};
		},

		// Convert an interval to a value and an uncertainty
		// Returns two numbers in an array: [value, uncertainty]
        intervalToUNum: function(interval){
			var uncertainty = Math.abs(interval.val[0]-interval.val[1]);
			return [ (interval.val[0]+interval.val[1])/2, uncertainty ]; // Return [val, uncertainty]
		}
    };
})(window);
