// Simple uncertainty calculating helpers

// A base number class supporting uncertainties
function UNumber(value,uncertainty)
{
	this.value=parseFloat(value?value.toPrecision(12):0);
	// All uncertainties are considered as absolute
	this.uncertainty=Math.abs(parseFloat(uncertainty?uncertainty:0));
	this.toString = function()
	{
		return this.value+'\u00B1'+this.abs_uncertainty();
	}
	this.abs_uncertainty = function(sf)
	{
		sf=sf?sf:2;
		return sigFigs(this.uncertainty,sf);
	}
	this.rel_uncertainty = function(sf)
	{
		sf=sf?sf:2;
		if (this.value===0) {return Infinity;}
		return sigFigs(this.uncertainty/this.value,sf);
	}
	this.per_uncertainty = function(sf)
	{
		sf=sf?sf:2;
		if (this.value===0) {return Infinity;}
		return sigFigs(this.rel_uncertainty(sf)*100,sf);
	}
	this.pythag = function(n1,n2)
	{
		return Math.sqrt(Math.pow(n1,2)+Math.pow(n2,2));
	}
	this.plus = function(raw)
	{
		var number=raw;
		// convert number if needed
		if (typeof number === "number" )
		{
			number=new UNumber(raw);
		}
		// Add abs uncertainties
		var added_unc = this.pythag( number.abs_uncertainty(), this.abs_uncertainty() );
		var added_val = number.value+this.value;
		return new UNumber( added_val, added_unc );
	}
	this.minus = function(raw)
	{
		var number=raw;
		// convert number if needed
		if (typeof number === "number" )
		{
			number=new UNumber(raw);
		}
		// Add abs uncertainties
		var minus_unc = this.pythag( number.abs_uncertainty(), this.abs_uncertainty() );
		var minus_val = this.value-number.value;
		return new UNumber( minus_val, minus_unc );
	}
	this.times = function(raw)
	{
		var number=raw;
		// convert number if needed
		if (typeof number === "number" )
		{
			number=new UNumber(raw);
		}
		// Add rel uncertainties
		var times_unc = this.pythag( number.rel_uncertainty(), this.rel_uncertainty() );
		var times_val=this.value*number.value;
		return new UNumber( times_val, times_unc );
	}
	this.divide = function(raw)
	{
		var number=raw;
		// convert number if needed
		if (typeof number === "number" )
		{
			number=new UNumber(raw);
		}
		// Add rel uncertainties
		var div_unc = this.pythag( number.rel_uncertainty(), this.rel_uncertainty() );
		var div_val = this.value/number.value;
		return new UNumber( div_val, div_unc*div_val );
	}
	this.pow = function(raw)
	{
		var number=raw;
		// convert number if needed
		if (typeof number === "number" )
		{
			number=new UNumber(raw);
		}
		// times relative uncertianty by exponential
		var pow_unc = this.rel_uncertainty()*number.value;
		var pow_val = Math.pow(this.value,number.value);
		return new UNumber( pow_val, pow_unc*pow_val );
	}
	this.sqrt = function(raw)
	{
		return this.pow(new UNumber(0.5));
	}
	this.sin = function()
	{
		var val=Math.sin(this.value);
		var unc=Math.abs(Math.sin(this.value+this.uncertainty)-val);
		return new UNumber(val,unc);
	}
	this.cos = function()
	{
		var val=Math.cos(this.value);
		var unc=Math.abs(Math.cos(this.value+this.uncertainty)-val);
		return new UNumber(val,unc);
	}
	this.tan = function()
	{
		var val=Math.tan(this.value);
		var unc=Math.abs(Math.tan(this.value+this.uncertainty)-val);
		return new UNumber(val,unc);
	}
	this.log = function()
	{
		var val = Math.log(this.value)/Math.LN10;
		var unc = this.uncertainty/(this.value*Math.log(10));
		return new UNumber(val, unc);
	}
	this.ln = function()
	{
		return new UNumber(Math.log(this.value), this.uncertainty/this.value);
	}
}

// Helper function to convert between relative and absolute
function to_absolute(u,v)
{
	return u*v;
}
// Helper function to round to sig sf
function sigFigs(n, sig) {
	if(n===0){return 0;}
    var mult = Math.pow(10, sig - Math.floor(Math.log(n) / Math.LN10) - 1);
    var num = Math.round(n * mult) / mult;
    var str = num.toString();
    if (str.indexOf('.')==-1)
    {
		var sf = str.length;
		var extra = Math.max(0,sig-sf);
		if(extra!==0)
		{
			str+='.';
		}
		for (var i=0; i<extra; i++)
		{
			str+='0';
		}
		return str;
	} else { return num.toString() }
}

// Parse a UNum from a string
// - Take ± as the abs uncertainty
// - Take ±/ as the relative uncertainty
// - Take ±% as the percentage uncertainty
// Otherwise uncertainty=0
function parseUNum(string)
{
	if (string.indexOf('\u00B1')!==-1)
	{
		if (string.indexOf('\u00B1/')!==-1 )
		{
			var parts=string.split('\u00B1/');
			return new UNumber(parseFloat(parts[0]),to_absolute(parseFloat(parts[1]),parseFloat(parts[0])));
		} 
		else if (string.indexOf('\u00B1%')!==-1 )
		{
			var parts=string.split('\u00B1%');
			return new UNumber(parseFloat(parts[0]),to_absolute(parseFloat(parts[1]/100),parseFloat(parts[0])));
		} 
		else 
		{
			var parts=string.split('\u00B1');
			return new UNumber(parseFloat(parts[0]),parseFloat(parts[1]));
		}
	} else {
		return new UNumber(parseFloat(string));
	}
}

// A nicer and more robust parsing algorithm
function parseExpression2(string)
{
	
	function operator_order(operator)
	{
		var ops=['sin','cos','tan','^','\u221A','\u00F7','\u00D7','+','-'].reverse();
		return ops.indexOf(operator)===-1?0:ops.indexOf(operator);
	}
	
	var operands=/\d|\.|\u00B1/;
	var operators=/\+|\-|\u00D7|\u00F7|\^|sin|cos|tan|\u221A|log|ln/;
	var functions=/sin|cos|tan|\u221A|log|ln/;
	
	// Split into tokens - either numbers or operators
	var tokens=[];
	var current='';
	var currently_number=true;
	for (var i=0; i<string.length; i++)
	{
		if(string[i]=='(' || string[i]==')' || string[i]=='\u03C0' || string[i]=='e')
		{
			tokens.push(current);
			current='';
			currently_number=false;
			tokens.push(string[i]);
			continue;
		}
		number=operands.test(string[i]);
		if(number===currently_number && string[i]!='-')
		{
			current+=string[i];
		} else {
			if(current.length)
				tokens.push(current);
			current=string[i];
			currently_number=number;
		}
	}
	if(current.length)
		tokens.push(current);
	// Massage in any negative signs after another operator
	for (var i=0; i<tokens.length; i++)
	{
		if (tokens[i]=='-' && !operands.test(tokens[i-1]))
		{
			// Remove from list
			tokens.splice(i,1);
			// Keep merging back the -ves until we get to a number
			sign='-';
			while (!operands.test(tokens[i])){
				if (i>tokens.length-1){throw 'Invalid Expression'}
				if (sign=='-'){sign='+';}
				else {sign='-';}
				tokens.splice(i,1);
			}
			// If needed apply the sign to the number now at tokens[i]
			if (sign=='-')
			{
				tokens[i]='-'+tokens[i];
			}
		}
		// Sub in pi or e
		if (tokens[i]=='\u03C0')
		{
			tokens[i]=Math.PI.toString();
		} else if (tokens[i]=='e') {
			tokens[i]=Math.E.toString();
		} else if (tokens[i].trim()=="") {
			tokens.splice(i,1);
			i--;	// Move back one index becuase we just removed one
		}
	}
	tokens=tokens.reverse();
	
	var operator_stack=[];
	var number_stack=[];
	
	while (tokens.length!==0)
	{
		var token = tokens.pop();
		
		if (operands.test(token))
		{
			number_stack.push(token);
		}
		
		else if (token=='(' || operator_stack.length===0 || (operator_order(token) > operator_order(operator_stack[operator_stack.length-1])) )
		{
			operator_stack.push(token);
		}
		
		else if (token==')')
		{
			while (operator_stack[operator_stack.length-1]!='(')
			{
				var operator = operator_stack.pop(); 
				if (functions.test(operator))
				{
					var right_operand = number_stack.pop();
					var operand = right_operand +' '+ operator;
				} else {
					var right_operand = number_stack.pop();
					var left_operand = number_stack.pop();
					var operand = left_operand +' '+ right_operand +' '+ operator;
				}
				number_stack.push(operand);
			}
			operator_stack.pop();
		}
		
		else if (operator_order(token) <= operator_order(operator_stack[operator_stack.length-1]))
		{
			while (operator_stack.length!==0 && operator_order(token) <= operator_order(operator_stack[operator_stack.length-1])) 
			{
				var operator = operator_stack.pop();
				if (functions.test(operator))
				{
					var right_operand = number_stack.pop();
					var operand = right_operand +' '+ operator;
				} else {
					var right_operand = number_stack.pop();
					var left_operand = number_stack.pop();
					var operand = left_operand +' '+ right_operand +' '+ operator;
				}
				number_stack.push(operand);
			}
			operator_stack.push(token);
		}
	}
	
	while (operator_stack.length!==0 ) 
	{
		var operator = operator_stack.pop();
		if (functions.test(operator))
		{
			var right_operand = number_stack.pop();
			var operand = right_operand +' '+ operator;
		} else {
			var right_operand = number_stack.pop();
			var left_operand = number_stack.pop();
			var operand = left_operand +' '+ right_operand +' '+ operator;
		}
		number_stack.push(operand);
	}
	// Turn this into a parsable expression
	var exp=number_stack[0];
	var tokens=exp.split(' ');
	for (var i=0; i<tokens.length; i++)
	{
		if(operands.test(tokens[i]))
		{
			// Make UNum
			tokens[i]=parseUNum(tokens[i]);
		}
	}
	return evaluate_expression(tokens.reverse());
	
	
}

// Evalueates an expression in postfix notation
function evaluate_expression(exp)
{
	var operands=/\d|\.|\u00B1/;
	var functions=/sin|cos|tan|\u221A|log|ln/;
	var stack=[];
	while (exp.length)
	{
		token=exp.pop();
		if (operands.test(token))
		{
			stack.push(token);
		} else {
			if (functions.test(token))
			{
				var n1=stack.pop();
				stack.push(performOp(token,n1));
			} else {
				var n1=stack.pop();
				var n2=stack.pop();
				stack.push(performOp(token,n2,n1));
			}
		}
	}
	return stack.pop();
}

// do n1.op(n2)
function performOp(op, num1, num2)
{
	switch (op)
	{
		case ('+'):
			var result=num1.plus(num2);
			break;
		case ('-'):
			var result=num1.minus(num2);
			break;
		case ('\u00D7'):
			var result=num1.times(num2);
			break;
		case ('\u00F7'):
			var result=num1.divide(num2);
			break;
		case ('^'):
			var result=num1.pow(num2);
			break;
		// Here down are the functions (only need one number)
		case ('\u221A'):
			var result=num1.sqrt();
			break;
		case ('sin'):
			var result=num1.sin();
			break;
		case ('cos'):
			var result=num1.cos();
			break;
		case ('tan'):
			var result=num1.tan();
			break;
		case ('log'):
			var result=num1.log();
			break;
		case ('ln'):
			var result=num1.ln();
			break;
		default:
			throw 'Invalid Operator';
			break;
	}
	return result;
}
