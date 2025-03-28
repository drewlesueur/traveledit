package main

import (
	"fmt"
	"strconv"
	"strings"
	"unicode"
)

// removeLeadingZeros removes any extra leading zeros from a string number.
func removeLeadingZeros(s string) string {
	s = strings.TrimLeft(s, "0")
	if s == "" {
		return "0"
	}
	return s
}

// cmpInt compares two nonnegative integer strings.
func cmpInt(a, b string) int {
	a = removeLeadingZeros(a)
	b = removeLeadingZeros(b)
	if len(a) > len(b) {
		return 1
	} else if len(a) < len(b) {
		return -1
	} else {
		if a > b {
			return 1
		} else if a < b {
			return -1
		} else {
			return 0
		}
	}
}

// subInt subtracts b from a (assumes a >= b) using elementary subtraction.
func subInt(a, b string) string {
	ai := []byte(a)
	bi := []byte(b)
	// Pad b with leading zeros.
	if len(bi) < len(ai) {
		padding := strings.Repeat("0", len(ai)-len(bi))
		bi = []byte(padding + b)
	}
	carry := 0
	res := make([]byte, len(ai))
	for i := len(ai) - 1; i >= 0; i-- {
		d1 := int(ai[i] - '0')
		d2 := int(bi[i] - '0')
		diff := d1 - d2 - carry
		if diff < 0 {
			diff += 10
			carry = 1
		} else {
			carry = 0
		}
		res[i] = byte(diff + '0')
	}
	return removeLeadingZeros(string(res))
}

// multiplyAbsStrings multiplies two nonnegative integer strings.
func multiplyAbsStrings(a, b string) string {
	if a == "0" || b == "0" {
		return "0"
	}
	n := len(a)
	m := len(b)
	res := make([]int, n+m)
	// Multiply digit by digit from right to left.
	for i := n - 1; i >= 0; i-- {
		for j := m - 1; j >= 0; j-- {
			d1 := int(a[i] - '0')
			d2 := int(b[j] - '0')
			sum := res[i+j+1] + d1*d2
			res[i+j+1] = sum % 10
			res[i+j] += sum / 10
		}
	}
	// Convert result to a string.
	var sb strings.Builder
	start := 0
	// Skip any leading zeros.
	for start < len(res) && res[start] == 0 {
		start++
	}
	for i := start; i < len(res); i++ {
		sb.WriteByte(byte(res[i] + '0'))
	}
	return sb.String()
}

// Multiply multiplies two (possibly decimal) numbers given as strings.
func Multiply(a, b string) string {
	// Normalize numbers.
	aSign, aInt, aFrac := parse(a)
	bSign, bInt, bFrac := parse(b)

	// Determine result sign.
	resultSign := "+"
	if aSign != bSign {
		// If either operand is zero, the result remains zero.
		if (aInt == "0" && strings.Trim(aFrac, "0") == "") || (bInt == "0" && strings.Trim(bFrac, "0") == "") {
			resultSign = "+"
		} else {
			resultSign = "-"
		}
	}

	// Remove decimals by concatenating integer and fractional parts.
	aDigits := aInt + aFrac
	bDigits := bInt + bFrac

	// Multiply as big integers.
	product := multiplyAbsStrings(aDigits, bDigits)

	// Total number of fractional digits in the result.
	totalFrac := len(aFrac) + len(bFrac)

	// Insert decimal point if needed.
	if totalFrac > 0 {
		// Pad with leading zeros if necessary.
		if len(product) <= totalFrac {
			product = strings.Repeat("0", totalFrac-len(product)+1) + product
		}
		pointPosition := len(product) - totalFrac
		intPart := product[:pointPosition]
		fracPart := product[pointPosition:]
		fracPart = strings.TrimRight(fracPart, "0")
		intPart = removeLeadingZeros(intPart)
		if fracPart != "" {
			product = intPart + "." + fracPart
		} else {
			product = intPart
		}
	} else {
		product = removeLeadingZeros(product)
	}

	if product == "0" {
		return "0"
	}
	if resultSign == "-" {
		product = "-" + product
	}
	return product
}

// divideInts divides two nonnegative integer strings (as numbers) with rounding.
// It returns the quotient with precision (number of digits after the decimal point).
func divideInts(numer, denom string, precision int) string {
	numer = removeLeadingZeros(numer)
	denom = removeLeadingZeros(denom)
	if denom == "0" {
		return "NaN" // division by zero
	}

	// Compute the integer part.
	intPart := ""
	rem := ""
	for i := 0; i < len(numer); i++ {
		rem += string(numer[i])
		rem = removeLeadingZeros(rem)
		count := 0
		for cmpInt(rem, denom) >= 0 {
			rem = subInt(rem, denom)
			count++
		}
		intPart += fmt.Sprintf("%d", count)
	}
	intPart = removeLeadingZeros(intPart)

	// Process fractional part; compute one extra digit for rounding.
	fracDigits := make([]byte, precision+1)
	for i := 0; i < precision+1; i++ {
		rem += "0"
		rem = removeLeadingZeros(rem)
		count := 0
		for cmpInt(rem, denom) >= 0 {
			rem = subInt(rem, denom)
			count++
		}
		fracDigits[i] = byte(count + '0')
	}

	if fracDigits[precision] >= '5' {
		// Propagate rounding in the fractional digits.
		carry := 1
		for i := precision - 1; i >= 0 && carry > 0; i-- {
			d := int(fracDigits[i]-'0') + carry
			carry = d / 10
			fracDigits[i] = byte((d % 10) + '0')
		}
		// If there’s still a carry, add it to the integer part.
		if carry == 1 {
			intPart = Add(intPart, "1")
			intPart = removeLeadingZeros(intPart)
		}
	}

	// Prepare fraction part up to the desired precision.
	fracPart := string(fracDigits[:precision])
	fracPart = strings.TrimRight(fracPart, "0")

	if fracPart != "" {
		return intPart + "." + fracPart
	}
	return intPart
}

// Divide divides two (possibly decimal) numbers given as strings.
func Divide(a, b string, precision int) string {
	// Normalize numbers.
	aSign, aInt, aFrac := parse(a)
	bSign, bInt, bFrac := parse(b)

	// Divisor is zero.
	if bInt == "0" && strings.Trim(bFrac, "0") == "" {
		return "NaN"
	}

	// Determine result sign.
	resultSign := "+"
	if aSign != bSign {
		resultSign = "-"
	}

	// Convert both numbers to integers by removing their decimal points.
	aDigits := removeLeadingZeros(aInt + aFrac)
	bDigits := removeLeadingZeros(bInt + bFrac)

	// Adjust numerator and denominator to account for decimals.
	numZeros := len(bFrac)
	denomZeros := len(aFrac)
	numerator := aDigits + strings.Repeat("0", numZeros)
	denom := bDigits + strings.Repeat("0", denomZeros)

	quotient := divideInts(numerator, denom, precision)
	quotient = strings.TrimSuffix(quotient, ".")
	if strings.Contains(quotient, ".") {
		parts := strings.SplitN(quotient, ".", 2)
		parts[0] = removeLeadingZeros(parts[0])
		parts[1] = strings.TrimRight(parts[1], "0")
		if parts[1] != "" {
			quotient = parts[0] + "." + parts[1]
		} else {
			quotient = parts[0]
		}
	} else {
		quotient = removeLeadingZeros(quotient)
	}

	if quotient == "0" {
		return "0"
	}
	if resultSign == "-" {
		quotient = "-" + quotient
	}
	return quotient
}

// parse breaks a number string into its sign, integer part, and fractional part.
// Updated to remove any underscores "_" in the input.
func parse(num string) (sign, intPart, fracPart string) {
	num = strings.TrimSpace(num)
	// Remove underscores.
	num = strings.ReplaceAll(num, "_", "")
	if num == "" {
		return "+", "0", ""
	}
	if len(num) > 0 && (num[0] == '-' || num[0] == '+') {
		sign = string(num[0])
		num = num[1:]
	} else {
		sign = "+"
	}
	// Remove any characters except digits and dot.
	num = strings.TrimFunc(num, func(r rune) bool { return !unicode.IsDigit(r) && r != '.' })
	parts := strings.Split(num, ".")
	intPart = parts[0]
	if intPart == "" {
		intPart = "0"
	}
	if len(parts) > 1 {
		fracPart = parts[1]
	}
	// Keep only digit characters in the fractional part.
	fracDigits := ""
	for _, r := range fracPart {
		if unicode.IsDigit(r) {
			fracDigits += string(r)
		}
	}
	fracPart = fracDigits
	return
}

// Add returns the sum of two number strings.
func Add(a, b string) string {
	aSign, aInt, aFrac := parse(a)
	bSign, bInt, bFrac := parse(b)

	// Same sign: add absolute values and reapply sign.
	if aSign == bSign {
		intPart, fracPart := addAbs(aInt, aFrac, bInt, bFrac)
		result := intPart
		if fracPart != "" {
			result += "." + fracPart
		}
		if aSign == "-" && result != "0" {
			result = "-" + result
		}
		return result
	}

	// Different signs: convert addition to subtraction.
	if aSign == "+" {
		if compareAbs(aInt, aFrac, bInt, bFrac) >= 0 {
			intPart, fracPart := subtractAbs(aInt, aFrac, bInt, bFrac)
			result := intPart
			if fracPart != "" {
				result += "." + fracPart
			}
			return result
		} else {
			intPart, fracPart := subtractAbs(bInt, bFrac, aInt, aFrac)
			result := intPart
			if fracPart != "" {
				result += "." + fracPart
			}
			if result != "0" {
				result = "-" + result
			}
			return result
		}
	} else {
		if compareAbs(aInt, aFrac, bInt, bFrac) > 0 {
			intPart, fracPart := subtractAbs(aInt, aFrac, bInt, bFrac)
			result := intPart
			if fracPart != "" {
				result += "." + fracPart
			}
			if result != "0" {
				result = "-" + result
			}
			return result
		} else {
			intPart, fracPart := subtractAbs(bInt, bFrac, aInt, aFrac)
			result := intPart
			if fracPart != "" {
				result += "." + fracPart
			}
			return result
		}
	}
}

// Subtract returns the result of subtracting b from a.
func Subtract(a, b string) string {
	// a - b = a + (-b)
	if len(b) > 0 && b[0] == '-' {
		b = b[1:]
	} else {
		b = "-" + b
	}
	return Add(a, b)
}

// addAbs adds the absolute values given by integer and fractional parts.
func addAbs(aInt, aFrac, bInt, bFrac string) (string, string) {
	// Align fractional parts.
	maxFracLen := len(aFrac)
	if len(bFrac) > maxFracLen {
		maxFracLen = len(bFrac)
	}
	aFrac += strings.Repeat("0", maxFracLen-len(aFrac))
	bFrac += strings.Repeat("0", maxFracLen-len(bFrac))

	carry := 0
	fracRes := make([]byte, maxFracLen)
	// Add fractional digits right-to-left.
	for i := maxFracLen - 1; i >= 0; i-- {
		d1 := int(aFrac[i] - '0')
		d2 := int(bFrac[i] - '0')
		sum := d1 + d2 + carry
		fracRes[i] = byte((sum % 10) + '0')
		carry = sum / 10
	}

	// Align integer parts.
	maxIntLen := len(aInt)
	if len(bInt) > maxIntLen {
		maxIntLen = len(bInt)
	}
	aInt = strings.Repeat("0", maxIntLen-len(aInt)) + aInt
	bInt = strings.Repeat("0", maxIntLen-len(bInt)) + bInt

	intRes := make([]byte, maxIntLen)
	// Add integer digits right-to-left.
	for i := maxIntLen - 1; i >= 0; i-- {
		d1 := int(aInt[i] - '0')
		d2 := int(bInt[i] - '0')
		sum := d1 + d2 + carry
		intRes[i] = byte((sum % 10) + '0')
		carry = sum / 10
	}

	// Prepend any remaining carry.
	intStr := ""
	if carry > 0 {
		intStr = fmt.Sprintf("%d", carry)
	}
	intStr += string(intRes)

	intStr = strings.TrimLeft(intStr, "0")
	if intStr == "" {
		intStr = "0"
	}

	fracStr := strings.TrimRight(string(fracRes), "0")
	return intStr, fracStr
}

// subtractAbs subtracts the absolute value b from a (assumes a>=b).
func subtractAbs(aInt, aFrac, bInt, bFrac string) (string, string) {
	// Align fractional parts.
	maxFracLen := len(aFrac)
	if len(bFrac) > maxFracLen {
		maxFracLen = len(bFrac)
	}
	aFrac += strings.Repeat("0", maxFracLen-len(aFrac))
	bFrac += strings.Repeat("0", maxFracLen-len(bFrac))

	borrow := 0
	fracRes := make([]byte, maxFracLen)
	// Subtract fractional parts right-to-left.
	for i := maxFracLen - 1; i >= 0; i-- {
		d1 := int(aFrac[i] - '0')
		d2 := int(bFrac[i] - '0')
		diff := d1 - d2 - borrow
		if diff < 0 {
			diff += 10
			borrow = 1
		} else {
			borrow = 0
		}
		fracRes[i] = byte(diff + '0')
	}

	// Align integer parts.
	maxIntLen := len(aInt)
	if len(bInt) > maxIntLen {
		maxIntLen = len(bInt)
	}
	aInt = strings.Repeat("0", maxIntLen-len(aInt)) + aInt
	bInt = strings.Repeat("0", maxIntLen-len(bInt)) + bInt

	intRes := make([]byte, maxIntLen)
	// Subtract integer parts right-to-left.
	for i := maxIntLen - 1; i >= 0; i-- {
		d1 := int(aInt[i] - '0')
		d2 := int(bInt[i] - '0')
		diff := d1 - d2 - borrow
		if diff < 0 {
			diff += 10
			borrow = 1
		} else {
			borrow = 0
		}
		intRes[i] = byte(diff + '0')
	}

	intStr := strings.TrimLeft(string(intRes), "0")
	if intStr == "" {
		intStr = "0"
	}
	fracStr := strings.TrimRight(string(fracRes), "0")
	return intStr, fracStr
}

// compareAbs compares absolute values represented by integer and fractional parts.
func compareAbs(aInt, aFrac, bInt, bFrac string) int {
	aIntTrim := strings.TrimLeft(aInt, "0")
	bIntTrim := strings.TrimLeft(bInt, "0")
	if aIntTrim == "" {
		aIntTrim = "0"
	}
	if bIntTrim == "" {
		bIntTrim = "0"
	}
	if len(aIntTrim) > len(bIntTrim) {
		return 1
	} else if len(aIntTrim) < len(bIntTrim) {
		return -1
	} else {
		if aIntTrim > bIntTrim {
			return 1
		} else if aIntTrim < bIntTrim {
			return -1
		}
	}
	// Compare fractional parts by padding to equal length.
	maxFracLen := len(aFrac)
	if len(bFrac) > maxFracLen {
		maxFracLen = len(bFrac)
	}
	aFracPadded := aFrac + strings.Repeat("0", maxFracLen-len(aFrac))
	bFracPadded := bFrac + strings.Repeat("0", maxFracLen-len(bFrac))
	if aFracPadded > bFracPadded {
		return 1
	} else if aFracPadded < bFracPadded {
		return -1
	}
	return 0
}

func Pow(base string, expStr string, precision int) string {
	exp, err := strconv.Atoi(expStr)
	if err != nil {
		return ""
	}

	// Handle exponent zero.
	if exp == 0 {
		return "1"
	}
	// For exponent 1, return the base.
	if exp == 1 {
		return base
	}

	negativeExp := false
	if exp < 0 {
		negativeExp = true
		exp = -exp
	}

	result := "1"
	// Use exponentiation by squaring.
	for exp > 0 {
		if exp%2 == 1 {
			result = Multiply(result, base)
		}
		base = Multiply(base, base)
		exp = exp / 2
	}
	// If the original exponent was negative perform 1/result.
	if negativeExp {
		result = Divide("1", result, precision)
	}
	return result
}

// Sqrt computes the square root of a nonnegative number represented as a string,
// with the desired number of digits after the decimal point. For negative inputs, it returns "NaN".
func Sqrt(num string, precision int) string {
	// Parse the number.
	sign, intPart, fracPart := parse(num)
	// Negative input: not defined.
	if sign == "-" {
		return "NaN"
	}
	// If the number is zero, return "0"
	if removeLeadingZeros(intPart) == "0" && strings.Trim(fracPart, "0") == "" {
		return "0"
	}

	// Choose an initial guess.
	// For numbers >= 1, we start with num/2, otherwise we start with "1".
	oneInt, oneFrac := "1", ""
	if compareAbs(intPart, fracPart, oneInt, oneFrac) >= 0 {
		// Use extra precision in intermediate calculations.
		// (precision+5 extra digits are used)
		// It is safe to use Divide here since our functions work with decimal strings.
		guess := Divide(num, "2", precision+5)
		return roundStr(sqrtIter(num, guess, precision+5), precision)
	} else {
		return roundStr(sqrtIter(num, "1", precision+5), precision)
	}
}

// sqrtIter uses Newton's method for finding the square root.
// It iterates until subsequent guesses do not change.
// The "calcPrec" value is the working precision used in intermediate steps.
func sqrtIter(num, guess string, calcPrec int) string {
	maxIter := 100
	for i := 0; i < maxIter; i++ {
		// next = (guess + num/guess) / 2 using extra precision.
		term := Divide(num, guess, calcPrec)
		sum := Add(guess, term)
		next := Divide(sum, "2", calcPrec)
		// If the guess does not change (within our working precision), we consider it converged.
		if next == guess {
			return next
		}
		guess = next
	}
	return guess
}

// roundStr rounds a number given as a string (that may include a decimal point)
// to the specified number of digits after the decimal point. It applies conventional rounding.
func roundStr(num string, precision int) string {
	// If there is no decimal point, nothing to round.
	if !strings.Contains(num, ".") {
		return num
	}
	parts := strings.Split(num, ".")
	intPart := parts[0]
	fracPart := parts[1]
	if precision == 0 {
		// Round the integer part only.
		if len(fracPart) > 0 && fracPart[0] >= '5' {
			intPart = Add(intPart, "1")
		}
		return intPart
	}
	// If the fractional part already has fewer digits than required, return as is.
	if len(fracPart) <= precision {
		return num
	}
	// Otherwise, pick the digit immediately after the desired precision.
	roundDigit := fracPart[precision]
	truncatedFrac := fracPart[:precision]
	result := intPart + "." + truncatedFrac
	if roundDigit >= '5' {
		// Build an increment string "0.00...1"
		increment := "0." + strings.Repeat("0", precision-1) + "1"
		result = Add(result, increment)
	}
	// After addition the fractional part may have extra digits.
	if strings.Contains(result, ".") {
		parts = strings.Split(result, ".")
		intPart = parts[0]
		fracPart = parts[1]
		if len(fracPart) > precision {
			fracPart = fracPart[:precision]
		}
		// Remove insignificant trailing zeros.
		fracPart = strings.TrimRight(fracPart, "0")
		if fracPart == "" {
			return intPart
		}
		return intPart + "." + fracPart
	}
	return result
}










// Below is for fractions with pow
// // way too slow for fractions?
// // Pow raises the number given by base (as a string)
// // to an exponent given as a (possibly decimal) string.
// // When exp does not contain a decimal point, it uses exponentiation‐by‐squaring.
// // Otherwise it uses the identity a^b = exp(b · ln(a)).
// func Pow(base, exp string, precision int) string {
// 	// Check if exponent string is an integer.
// 	if !strings.Contains(exp, ".") {
// 		// Try converting exp to an integer.
// 		// (Assume the exponent is small enough to convert using fmt.Sscan.)
// 		var n int
// 		_, err := fmt.Sscan(exp, &n)
// 		if err == nil {
// 			// Use the original integer power algorithm.
// 			if n == 0 {
// 				return "1"
// 			}
// 			negativeExp := false
// 			if n < 0 {
// 				negativeExp = true
// 				n = -n
// 			}
// 			result := "1"
// 			baseCopy := base
// 			for n > 0 {
// 				if n%2 == 1 {
// 					result = Multiply(result, baseCopy)
// 				}
// 				baseCopy = Multiply(baseCopy, baseCopy)
// 				n = n / 2
// 			}
// 			if negativeExp {
// 				result = Divide("1", result, precision)
// 			}
// 			return result
// 		}
// 		// If conversion fails, fall through to the decimal-exponent method.
// 	}
// 	// For nonintegral exponent use: a^b = exp(b · ln(a))
// 	lnBase := Ln(base, precision+5)
// 	term := Multiply(exp, lnBase)
// 	result := Exp(term, precision+5)
// 	return truncateResult(result, precision)
// }
//   
// // Ln computes the natural logarithm of x (x > 0) using a Taylor‐series
// // expansion. It first scales x by powers of 2 so that it lies in (0,2],
// // then uses the identity:
// //   ln(x) = 2 * [ y + y^3/3 + y^5/5 + … ]
// // with y = (x-1)/(x+1).
// // The computed result is given to the requested precision.
// func Ln(x string, precision int) string {
// 	// We require x > 0.
// 	// Increase working precision.
// 	extraPrec := precision + 5
// 	two := "2"
// 	// zero := "0"
// 	// Scale x down while it is greater than 2.
// 	count := 0
// 	// We use the Divide function to compare since x is a string.
// 	for cmpInt(x, two) > 0 {
// 		x = Divide(x, two, extraPrec)
// 		count++
// 	}
// 	// Now x should be in (0, 2].
// 	one := "1"
// 	// Compute y = (x - 1)/(x + 1)
// 	num := Subtract(x, one)
// 	denom := Add(x, one)
// 	y := Divide(num, denom, extraPrec)
// 	y2 := Multiply(y, y)
// 	
// 	// Initialize the series.
// 	series := y   // current sum = y (first term)
// 	term := y    // current term = y
// 	denomInt := 1
// 	// We'll run series up to, say, 50 terms (which usually gives sufficient precision).
// 	for i := 0; i < 50; i++ {
// 		denomInt += 2
// 		// term = term * y2 / (denomInt)
// 		term = Divide(Multiply(term, y2), fmt.Sprintf("%d", denomInt), extraPrec)
// 		// If the term produces "0" (i.e. is below our working precision), break out.
// 		if term == "0" {
// 			break
// 		}
// 		series = Add(series, term)
// 	}
// 	// ln(x) (of the scaled x) = 2 * series.
// 	lnScaled := Multiply("2", series)
// 	
// 	// We now need to add back the scaling:
// 	// ln(original x) = ln(scaled x) + count * ln(2)
// 	ln2 := Ln2(extraPrec)
// 	scale := Multiply(fmt.Sprintf("%d", count), ln2)
// 	result := Add(lnScaled, scale)
// 	return truncateResult(result, precision)
// }
//   
// // Ln2 returns ln(2) computed via the same series expansion.
// func Ln2(precision int) string {
// 	// Use x = "2". Then y = (2-1)/(2+1) = 1/3.
// 	one := "1"
// 	two := "2"
// 	// three := "3"
// 	extraPrec := precision + 5
// 	y := Divide(Subtract(two, one), Add(two, one), extraPrec) // y = 1/3
// 	y2 := Multiply(y, y)
// 	series := y
// 	term := y
// 	denomInt := 1
// 	for i := 0; i < 50; i++ {
// 		denomInt += 2
// 		term = Divide(Multiply(term, y2), fmt.Sprintf("%d", denomInt), extraPrec)
// 		if term == "0" {
// 			break
// 		}
// 		series = Add(series, term)
// 	}
// 	ln2 := Multiply("2", series)
// 	return truncateResult(ln2, precision)
// }
//   
// // Exp computes exp(x) using its Taylor series expansion.
// // exp(x) = sum_{n=0}^{∞} x^n / n!
// // The summation is performed until the term becomes zero at the working precision.
// func Exp(x string, precision int) string {
// 	extraPrec := precision + 5
// 	sum := "1"  // term for n=0
// 	term := "1" // current term (starts at 1)
// 	n := 1
// 	for i := 0; i < 100; i++ { // limit iterations to 100 terms
// 		// term = term * x / n
// 		term = Divide(Multiply(term, x), fmt.Sprintf("%d", n), extraPrec)
// 		sum = Add(sum, term)
// 		// Break when term is "0" (i.e. too small to affect sum).
// 		if term == "0" {
// 			break
// 		}
// 		n++
// 	}
// 	return truncateResult(sum, precision)
// }
//   
// 
// 
// // truncateResult truncates and rounds the string representation of a number to the desired
// // number of digits after the decimal point. It rounds up if the next digit is 5 or more.
// func truncateResult(num string, precision int) string {
// 	neg := false
// 	if strings.HasPrefix(num, "-") {
// 		neg = true
// 		num = num[1:]
// 	}
// 
// 	parts := strings.SplitN(num, ".", 2)
// 	intPart := removeLeadingZeros(parts[0])
// 	fracPart := ""
// 	if len(parts) > 1 {
// 		fracPart = parts[1]
// 	}
// 
// 	// Pad fraction with zeros if necessary.
// 	if len(fracPart) < precision {
// 		fracPart = fracPart + strings.Repeat("0", precision-len(fracPart))
// 	}
// 
// 	// If we have extra digits beyond the requested precision, decide rounding.
// 	if len(fracPart) > precision {
// 		// Check the first extra digit.
// 		roundDigit := fracPart[precision]
// 		// Truncate fractional part to the desired precision.
// 		fracPart = fracPart[:precision]
// 		if roundDigit >= '5' {
// 			// Prepare the rounding increment.
// 			var increment string
// 			if precision == 0 {
// 				increment = "1"
// 			} else {
// 				// increment is 0.00...01 with exactly precision digits after the decimal point.
// 				increment = "0." + strings.Repeat("0", precision-1) + "1"
// 			}
// 			// Apply rounding increment using Add.
// 			truncated := intPart
// 			if precision > 0 {
// 				truncated += "." + fracPart
// 			}
// 			truncated = Add(truncated, increment)
// 			// Remove any superfluous trailing zeros after the decimal point.
// 			parts = strings.SplitN(truncated, ".", 2)
// 			intPart = removeLeadingZeros(parts[0])
// 			if len(parts) > 1 {
// 				fracPart = parts[1]
// 				// Pad to precision if necessary.
// 				if len(fracPart) < precision {
// 					fracPart = fracPart + strings.Repeat("0", precision-len(fracPart))
// 				} else if len(fracPart) > precision {
// 					fracPart = fracPart[:precision]
// 				}
// 			} else {
// 				fracPart = ""
// 			}
// 		}
// 	}
// 
// 	// Reassemble the result.
// 	var res string
// 	if precision > 0 {
// 		// Remove trailing zeros in the fractional part.
// 		fracPart = strings.TrimRight(fracPart, "0")
// 		if fracPart != "" {
// 			res = intPart + "." + fracPart
// 		} else {
// 			res = intPart
// 		}
// 	} else {
// 		res = intPart
// 	}
// 	if res == "" {
// 		res = "0"
// 	}
// 	if neg && res != "0" {
// 		res = "-" + res
// 	}
// 	return res
// }

// how hard would it be to allow "_" for any number?
// I presume it would have to replace the "_" with "" at some preliminary step
// 
// It's not very hard. Essentially, you’d want to add a preprocessing step—most likely early in the parse function—to remove any "_" characters from the input string. For example, right after trimming white space, you could do something like:
// 
//   num = strings.ReplaceAll(num, "_", "")
// 
// This would remove any underscores before you proceed to extract the sign, integer part, and fractional part of the number.
// 
// One thing to keep in mind is that if you plan to support numbers with underscores for readability (like "1_000_000"), you should make sure that the underscores are only allowed in positions where they won’t change the meaning of the number (for example, not at the beginning or in an exponent part if you ever support that). But for a simple solution, just stripping them out as shown above will work fine.
// 
// So yes, your presumption is correct—it would be a relatively small change.
// 
// To allow underscores in numbers, you would indeed need to preprocess the number strings to remove the underscores before any arithmetic operations. It is common to allow underscores in numbers to make them more readable, similar to how some programming languages allow them, for instance, as thousand separators.
// 
// Here’s a simple approach to allow underscores in your numeric strings:
// 
// 1. Create a helper function that removes underscores from a string.
// 2. Use this function at the beginning of your arithmetic functions (`Add`, `Subtract`, `Multiply`, `Divide`, etc.) to preprocess the input strings.
// 
// Below is a step-by-step implementation:
// 
// 1. **Helper Function to Remove Underscores:**
// 
//    ```go
//    func removeUnderscores(num string) string {
//        return strings.ReplaceAll(num, "_", "")
//    }
//    ```
// 
// 2. **Integration into Arithmetic Functions:**
// 
//    You should call `removeUnderscores` on each input number string at the beginning of each arithmetic function. Here's an example for the `Add` function:
// 
//    ```go
//    func Add(a, b string) string {
//        // Remove underscores from the input number strings
//        a = removeUnderscores(a)
//        b = removeUnderscores(b)
// 
//        aSign, aInt, aFrac := parse(a)
//        bSign, bInt, bFrac := parse(b)
// 
//        // ... rest of the existing code ...
//    }
//    ```
// 
//    Similarly, you'd integrate this preprocessing step into the other major functions like `Subtract`, `Multiply`, and `Divide`.
// 
// 3. **Example Invocation:**
// 
//    With these changes, you can now use numbers with underscores in your calculations:
// 
//    ```go
//    func main() {
//        fmt.Println(Add("1_000", "250"))        // Output: 1250
//        fmt.Println(Multiply("123_456", "2"))   // Output: 246912
//        fmt.Println(Divide("1_000", "4", 2))    // Output: 250.00
//    }
//    ```
// 
// With these adjustments, underscores in numbers will be seamlessly handled. The underscore removal ensures your arithmetic logic remains unaffected while enhancing input readability.